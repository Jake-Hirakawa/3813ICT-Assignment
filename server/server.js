import http from 'http';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { connectDB, getDB, health } from './db.js';
import {
  getUsers,
  addUser,
  deleteUser,
  loginUser,
  promoteToSuperAdmin,
} from './routes/userRoutes.js';
import {
  getGroups,
  getGroup,
  addGroup,
  deleteGroup,
  addUserToGroup,
  removeUserFromGroup,
  promoteToGroupAdmin,
  demoteFromGroupAdmin,
} from './routes/groupRoutes.js';
import {
  addChannelToGroup,
  removeChannelFromGroup,
  addUserToChannel,
  removeUserFromChannel,
} from './routes/channelRoutes.js';
import {
  getJoinRequests,
  requestJoinGroup,
  approveJoinRequest,
  rejectJoinRequest,
} from './routes/joinRequestRoutes.js';
import { getChannelMessages } from './routes/messageRoutes.js';
import { uploadAvatar, uploadMessageImage } from './routes/imageRoutes.js';
import { upload } from './multer.js';
import { onMessage } from './socket.js';

dotenv.config();

const app = express();
const ALLOWED_ORIGINS = process.env.allowed_origins.split(' ');
const HTTP_PORT = process.env.http_port || 3000;

// Serve static images
app.use('/images', express.static(path.join(process.cwd(), 'images')));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
  })
);
app.use(express.json());

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'DELETE'],
  },
});

async function sockets() {
  io.on('connect', (socket) => {
    onMessage(io, socket);
  });
}
sockets();

async function mongo() {
  try {
    await connectDB();
    health();

    // Create default super admin if none exists
    const db = getDB();
    const existingAdmin = await db.collection('users').findOne({
      username: { $regex: /^super$/i },
    });
    if (!existingAdmin) {
      await db.collection('users').insertOne({
        username: 'super',
        email: 'super@admin.com',
        password: '123',
        roles: ['Super Admin'],
        groups: [],
        createdAt: new Date(),
      });
      console.log('Created default super admin user');
    }

    app.get('/', (_req, res) => res.send({ ok: true }));

    // Auth routes
    loginUser(app);

    // User routes
    getUsers(app);
    addUser(app);
    deleteUser(app);
    promoteToSuperAdmin(app);

    // Group routes
    getGroups(app);
    getGroup(app);
    addGroup(app);
    deleteGroup(app);
    addUserToGroup(app);
    removeUserFromGroup(app);
    promoteToGroupAdmin(app);
    demoteFromGroupAdmin(app);

    // Channel routes
    addChannelToGroup(app);
    removeChannelFromGroup(app);
    addUserToChannel(app);
    removeUserFromChannel(app);

    // Message routes
    getChannelMessages(app);

    // Join request routes
    getJoinRequests(app);
    requestJoinGroup(app);
    approveJoinRequest(app);
    rejectJoinRequest(app);

    // Image routes
    uploadMessageImage(app, upload);
    uploadAvatar(app, upload);
  } catch (error) {
    console.error('Database setup failed:', error);
  }
}
mongo().catch(console.dir);

export { app, httpServer };

httpServer.listen(HTTP_PORT, () => {
  console.log(`Server running at http://localhost:${HTTP_PORT}`);
});

