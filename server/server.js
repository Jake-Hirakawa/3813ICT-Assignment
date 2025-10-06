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

// Load environment variables from .env file
dotenv.config();

// Initialize Express application
// Parse allowed origins from environment variable (space-separated)
// Set HTTP port from environment or default to 3000
const app = express();
const ALLOWED_ORIGINS = process.env.allowed_origins.split(' ');
const HTTP_PORT = process.env.http_port || 3000;

// Static file serving
// Serve uploaded images from /images directory
// Allows client to access avatar and message images
app.use('/images', express.static(path.join(process.cwd(), 'images')));

// CORS configuration
// Dynamic origin validation against whitelist
// Allows GET, POST, DELETE, PUT methods
// Validates origin for security
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
  })
);

// JSON body parser middleware
app.use(express.json());

// Create HTTP server wrapping Express app
// Required for Socket.IO integration
const httpServer = http.createServer(app);

// Configure Socket.IO with CORS
// Same origin validation as Express CORS
// Enables real-time WebSocket communication
// Supports GET, POST, DELETE methods
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'DELETE'],
  },
});

// Initialize Socket.IO connection handling
// Sets up socket event listeners
// Handles real-time chat messages via onMessage handler
async function sockets() {
  io.on('connect', (socket) => {
    onMessage(io, socket);
  });
}
sockets();

// MongoDB initialization and route setup
// Connects to MongoDB database
// Checks database health with ping command
// Creates default super admin user if none exists
// Registers all API route handlers
// Root endpoint returns health check
// Error handling for database connection failures
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

// Start MongoDB setup
// Logs errors to console if initialization fails
mongo().catch(console.dir);

// Start HTTP server
// Listens on configured port
// Logs server URL to console
// Handles both HTTP requests and WebSocket connections
httpServer.listen(HTTP_PORT, () => {
  console.log(`Server running at http://localhost:${HTTP_PORT}`);
});

export { app, httpServer };

