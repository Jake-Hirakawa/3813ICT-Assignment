import { getDB } from './db.js';

function onMessage(io, socket) {
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

    socket.on('send-message', async (message) => {
        try {
            const db = getDB();
            
            const messageDoc = {
                ...message,
                id: `m${Date.now()}${Math.floor(Math.random() * 1000)}`,
                timestamp: Date.now()
            };
            
            await db.collection('messages').insertOne(messageDoc);
            io.to(message.channelId).emit('new-message', messageDoc);
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

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