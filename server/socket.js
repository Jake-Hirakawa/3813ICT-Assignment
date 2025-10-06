import { getDB } from './db.js';

// Main socket event handler function
// Sets up listeners for chat-related events
// io: Socket.IO server instance for broadcasting
// socket: Individual client socket connection
function onMessage(io, socket) {
    // Handle user joining a channel
    // Event: 'join-channel'
    // Data: { channelId: string, username: string }
    // Adds socket to room (channelId) for targeted broadcasts
    // Stores username and channelId on socket for later use
    // Notifies other users in channel that user joined
    // Emits system message to all users except sender
    socket.on('join-channel', (data) => {
        const { channelId, username } = data;
        
        socket.join(channelId);
        socket.username = username;
        socket.channelId = channelId;
        
        socket.to(channelId).emit('user-joined', {
            username: username,
            type: 'system',
            timestamp: Date.now()
        });
        
        console.log(`${username} joined channel: ${channelId}`);
    });

    // Handle sending chat messages
    // Event: 'send-message'
    // Data: message object with channelId, username, text, etc.
    // Generates unique message ID with timestamp
    // Saves message to MongoDB messages collection
    // Broadcasts message to all users in the channel (including sender)
    // Error handling logs failures without crashing
    socket.on('send-message', async (message) => {
        try {
            const db = getDB();
            
            const messageDoc = {
                ...message,
                id: `m${Date.now()}${Math.floor(Math.random() * 1000)}`,
                timestamp: Date.now()
            };
                
            console.log('Saving message to DB:', messageDoc); 
            
            await db.collection('messages').insertOne(messageDoc);
            io.to(message.channelId).emit('new-message', messageDoc);
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

    // Handle user disconnection
    // Event: 'disconnect'
    // Automatic Socket.IO event when client disconnects
    // Notifies channel users that user left (if user was in a channel)
    // Emits system message to remaining users
    // Logs disconnection with socket ID
    socket.on('disconnect', () => {
        if (socket.username && socket.channelId) {
            socket.to(socket.channelId).emit('user-left', {
                username: socket.username,
                type: 'system',
                timestamp: Date.now()
            });
        }
        console.log(`Client disconnected: ${socket.id}`);
    });
}

export { onMessage };