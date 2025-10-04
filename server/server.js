import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import multer from 'multer';
import { ObjectId } from 'mongodb';
import path from 'path';
import fs from 'fs';
import { connectDB, getDB, health } from './db.js';
import { getUsers, addUser, deleteUser, loginUser, promoteToSuperAdmin } from './routes/userRoutes.js';
import { getGroups, getGroup, addGroup, deleteGroup, addUserToGroup, removeUserFromGroup, promoteToGroupAdmin, demoteFromGroupAdmin } from './routes/groupRoutes.js';
import { addChannelToGroup, removeChannelFromGroup, addUserToChannel, removeUserFromChannel } from './routes/channelRoutes.js';
import { getJoinRequests, requestJoinGroup, approveJoinRequest, rejectJoinRequest } from './routes/joinRequestRoutes.js';
import { getChannelMessages } from './routes/messageRoutes.js';
import { onMessage } from './socket.js';

dotenv.config();

const app = express();
const ALLOWED_ORIGINS = process.env.allowed_origins.split(' ');
const HTTP_PORT = process.env.http_port || 3000;

// Create images directory
const imagesDir = path.join(process.cwd(), 'images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
}

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Serve static images
app.use('/images', express.static(path.join(process.cwd(), 'images')));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
}));
app.use(express.json());

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
            return callback(new Error(`CORS blocked for origin: ${origin}`));
        },
        methods: ['GET', 'POST', 'DELETE'],
    }
});

async function sockets() {
    io.on('connect', (socket) => {
        onMessage(io, socket);
    })
}
sockets();

async function mongo() {
    try {
        await connectDB();
        health();
        
        // Create default super admin if none exists
        const db = getDB();
        const existingAdmin = await db.collection('users').findOne({ 
            username: { $regex: /^super$/i } 
        });
        if (!existingAdmin) {
            await db.collection('users').insertOne({
                username: 'super',
                email: 'super@admin.com',
                password: '123',
                roles: ['Super Admin'],
                groups: [],
                createdAt: new Date()
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

        app.post('/api/upload/message-image', upload.single('image'), (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: 'No file uploaded' });
                }
                
                const imageUrl = `/images/${req.file.filename}`;
                res.json({ imageUrl });
            } catch (error) {
                console.error('Upload error:', error);
                res.status(500).json({ error: 'Failed to upload image' });
            }
        });

        // Upload user avatar
        app.post('/api/users/:id/avatar', upload.single('avatar'), async (req, res) => {
            try {
                const { id } = req.params;
                const db = getDB();
                
                const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
                if (!user) return res.status(404).json({ error: 'User not found' });
                
                if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
                
                const avatarUrl = `/images/${req.file.filename}`;
                
                // Update user's avatar URL
                await db.collection('users').updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { avatarUrl: avatarUrl } }
                );
                
                res.json({ avatarUrl });
            } catch (error) {
                console.error('Upload avatar error:', error);
                res.status(500).json({ error: 'Failed to upload avatar' });
            }
        });
        
    } catch (error) {
        console.error('Database setup failed:', error);
    }
}

mongo().catch(console.dir);

httpServer.listen(HTTP_PORT, () => {
    console.log(`Server running at http://localhost:${HTTP_PORT}`);
});

export { app, httpServer };