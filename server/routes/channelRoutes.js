import { getDB } from '../db.js';
import { ObjectId } from 'mongodb';

// Create a new channel in a group
// POST /api/groups/:id/channels
// Body: { name: string }
// Returns: { channel } with generated ID or error
function addChannelToGroup(app) {
    app.post('/api/groups/:id/channels', async (req, res) => {
        try {
            const { id } = req.params;
            const { name } = req.body;
            
            if (!name?.trim()) return res.status(400).json({ error: 'channel name required' });
            
            const db = getDB();
            const group = await db.collection('groups').findOne({ _id: new ObjectId(id) });
            
            if (!group) return res.status(404).json({ error: 'Group not found' });
            
            if (group.channels.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                return res.status(400).json({ error: 'Channel already exists in this group' });
            }
            
            const channel = {
                id: `c${Date.now()}${Math.floor(Math.random() * 1000)}`,
                name: name.trim(),
                members: []
            };
            
            await db.collection('groups').updateOne(
                { _id: new ObjectId(id) },
                { $push: { channels: channel } }
            );
            
            res.status(201).json({ channel });
        } catch (error) {
            console.error('Add channel error:', error);
            res.status(500).json({ error: 'Failed to add channel' });
        }
    });
}

// Delete a channel from a group
// DELETE /api/groups/:groupId/channels/:channelId
// Also deletes all messages associated with the channel
// Returns: success message or error
function removeChannelFromGroup(app) {
    app.delete('/api/groups/:groupId/channels/:channelId', async (req, res) => {
        try {
            const { groupId, channelId } = req.params;
            const db = getDB();
            
            // Delete all messages for this channel
            await db.collection('messages').deleteMany({ channelId: channelId });
            
            const result = await db.collection('groups').updateOne(
                { _id: new ObjectId(groupId) },
                { $pull: { channels: { id: channelId } } }
            );
            
            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Group not found' });
            }
            
            res.json({ message: 'Channel removed successfully' });
        } catch (error) {
            console.error('Remove channel error:', error);
            res.status(500).json({ error: 'Failed to remove channel' });
        }
    });
}

// Add a user to a channel
// POST /api/groups/:groupId/channels/:channelId/members
// Body: { username: string }
// User must be a group member first
// Returns: success message or error
function addUserToChannel(app) {
    app.post('/api/groups/:groupId/channels/:channelId/members', async (req, res) => {
        try {
            const { groupId, channelId } = req.params;
            const { username } = req.body;
            
            if (!username?.trim()) return res.status(400).json({ error: 'username required' });
            
            const db = getDB();
            const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId) });
            
            if (!group) return res.status(404).json({ error: 'Group not found' });
            
            const channelIndex = group.channels.findIndex(c => c.id === channelId);
            if (channelIndex === -1) return res.status(404).json({ error: 'Channel not found' });
            
            if (!group.members.some(m => m.toLowerCase() === username.toLowerCase())) {
                return res.status(400).json({ error: 'User must be a member of the group first' });
            }
            
            if (group.channels[channelIndex].members.some(m => m.toLowerCase() === username.toLowerCase())) {
                return res.status(400).json({ error: 'User already a member of this channel' });
            }
            
            await db.collection('groups').updateOne(
                { _id: new ObjectId(groupId), "channels.id": channelId },
                { $push: { "channels.$.members": username.trim() } }
            );
            
            res.json({ message: 'User added to channel successfully' });
        } catch (error) {
            console.error('Add user to channel error:', error);
            res.status(500).json({ error: 'Failed to add user to channel' });
        }
    });
}

// Remove a user from a channel
// DELETE /api/groups/:groupId/channels/:channelId/members/:username
// Returns: success message or error
function removeUserFromChannel(app) {
    app.delete('/api/groups/:groupId/channels/:channelId/members/:username', async (req, res) => {
        try {
            const { groupId, channelId, username } = req.params;
            const db = getDB();
            
            await db.collection('groups').updateOne(
                { _id: new ObjectId(groupId), "channels.id": channelId },
                { $pull: { "channels.$.members": { $regex: new RegExp(`^${username}$`, 'i') } } }
            );
            
            res.json({ message: 'User removed from channel successfully' });
        } catch (error) {
            console.error('Remove user from channel error:', error);
            res.status(500).json({ error: 'Failed to remove user from channel' });
        }
    });
}

export { addChannelToGroup, removeChannelFromGroup, addUserToChannel, removeUserFromChannel };