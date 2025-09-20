// server/sockets.js
module.exports = function(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

// Handle user joining a channel
    socket.on('join-channel', (data) => {
      const { channelId, username } = data;
      
      socket.join(channelId);
      socket.username = username;
      socket.channelId = channelId;
      
      // Notify others in the channel
      socket.to(channelId).emit('user-joined', {
        username: username
      });
    });

    // Receive message and broadcast to channel
    socket.on('send-message', (message) => {
      // Broadcast to everyone in the same channel room
      io.to(message.channelId).emit('new-message', message);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (socket.username && socket.channelId) {
        // Notify others that user left
        socket.to(socket.channelId).emit('user-left', {
          username: socket.username
        });
        
        console.log(`${socket.username} left channel: ${socket.channelId}`);
      }
    });
  });

  console.log('Socket.io ready');
};