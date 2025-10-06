import { getDB } from '../db.js';

// Get messages for a specific channel
// GET /api/groups/:groupId/channels/:channelId/messages
// Query params: limit (optional, default: 20)
// Returns: { messages: [] } array of messages or error
// Retrieves most recent messages up to limit
// Sorts by timestamp descending (newest first in query)
// Reverses array to display oldest first for chat UI
// Used to load chat history when user joins a channel
function getChannelMessages(app) {
    app.get('/api/groups/:groupId/channels/:channelId/messages', async (req, res) => {
        try {
            const { channelId } = req.params;
            const limit = parseInt(req.query.limit) || 20;
            
            const db = getDB();
            const messages = await db.collection('messages')
                .find({ channelId })
                .sort({ timestamp: -1 })
                .limit(limit)
                .toArray();
            
            // Reverse to show oldest first
            messages.reverse();
            res.json({ messages });
        } catch (error) {
            console.error('Get messages error:', error);
            res.status(500).json({ error: 'Failed to get messages' });
        }
    });
}

export { getChannelMessages };