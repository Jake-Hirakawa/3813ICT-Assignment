import { getDB } from '../db.js';

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