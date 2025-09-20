// server/sockets.js
module.exports = function(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join a channel room
    socket.on('join-channel', (roomName) => {
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined room: ${roomName}`);
    });

    // Receive message and broadcast to channel
    socket.on('send-message', (message) => {
      // Broadcast to everyone in the same channel room
      io.to(message.channelId).emit('new-message', message);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  console.log('Socket.io ready');
};