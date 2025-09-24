import { getDB } from '../db.js';
import { ObjectId } from 'mongodb';
import { transformDoc, transformDocs } from '../utils/dbHelpers.js';

function getGroups(app) {
    app.get('/api/groups', async (req, res) => {
        try {
            const db = getDB();
            const groups = await db.collection('groups').find({}).toArray();
            res.json({ groups: transformDocs(groups) });
        } catch (error) {
            console.error('Get groups error:', error);
            res.status(500).json({ error: 'Failed to get groups' });
        }
    });
}

function getGroup(app) {
    app.get('/api/groups/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const db = getDB();
            const group = await db.collection('groups').findOne({ _id: new ObjectId(id) });
            
            if (!group) {
                return res.status(404).json({ error: 'Group not found' });
            }
            
            res.json({ group: transformDoc(group) });
        } catch (error) {
            console.error('Get group error:', error);
            res.status(500).json({ error: 'Failed to get group' });
        }
    });
}

function addGroup(app) {
    app.post('/api/groups', async (req, res) => {
        try {
            const { name, ownerUsername } = req.body;
            
            if (!name?.trim()) return res.status(400).json({ error: 'group name required' });
            if (!ownerUsername?.trim()) return res.status(400).json({ error: 'ownerUsername required' });
            
            const db = getDB();
            const owner = await db.collection('users').findOne({ 
                username: { $regex: new RegExp(`^${ownerUsername}$`, 'i') } 
            });
            
            if (!owner) return res.status(404).json({ error: 'owner user not found' });
            
            const canCreate = owner.roles.includes('Group Admin') || owner.roles.includes('Super Admin');
            if (!canCreate) return res.status(403).json({ error: 'only Group Admins or Super Admins can create groups' });
            
            const group = {
                name: name.trim(),
                ownerUsername: ownerUsername.trim(),
                admins: [ownerUsername.trim()],
                members: [ownerUsername.trim()],
                channels: [],
                createdAt: new Date()
            };
            
            const result = await db.collection('groups').insertOne(group);
            const groupId = result.insertedId.toString();
            
            // Add group to user's groups array
            await db.collection('users').updateOne(
                { _id: owner._id },
                { $addToSet: { groups: groupId } }
            );
            
            const createdGroup = await db.collection('groups').findOne({ _id: result.insertedId });
            res.status(201).json({ group: transformDoc(createdGroup) });
        } catch (error) {
            console.error('Add group error:', error);
            res.status(500).json({ error: 'Failed to create group' });
        }
    });
}

function deleteGroup(app) {
    app.delete('/api/groups/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const db = getDB();
            
            // Get group to find channel IDs
            const group = await db.collection('groups').findOne({ _id: new ObjectId(id) });
            if (!group) return res.status(404).json({ error: 'Group not found' });
            
            // Remove group ID from ALL users' groups arrays
            await db.collection('users').updateMany(
                { groups: id },
                { $pull: { groups: id } }
            );
            
            // Remove related join requests
            await db.collection('joinRequests').deleteMany({ gid: id });
            
            // Delete all messages for channels in this group
            if (group.channels && group.channels.length > 0) {
                const channelIds = group.channels.map(c => c.id);
                await db.collection('messages').deleteMany({ 
                    channelId: { $in: channelIds } 
                });
            }
            
            // Delete the group
            await db.collection('groups').deleteOne({ _id: new ObjectId(id) });
            
            res.json({ message: 'Group deleted successfully' });
        } catch (error) {
            console.error('Delete group error:', error);
            res.status(500).json({ error: 'Failed to delete group' });
        }
    });
}

function addUserToGroup(app) {
    app.post('/api/groups/:id/members', async (req, res) => {
        try {
            const { id } = req.params;
            const { username } = req.body;
            
            if (!username?.trim()) return res.status(400).json({ error: 'username required' });
            
            const db = getDB();
            const group = await db.collection('groups').findOne({ _id: new ObjectId(id) });
            const user = await db.collection('users').findOne({ 
                username: { $regex: new RegExp(`^${username}$`, 'i') } 
            });
            
            if (!group) return res.status(404).json({ error: 'Group not found' });
            if (!user) return res.status(404).json({ error: 'User not found' });
            
            // Check if user is already a member
            if (group.members.some(m => m.toLowerCase() === username.toLowerCase())) {
                return res.status(400).json({ error: 'User already a member' });
            }
            
            // Add user to group members and update user's groups array
            await db.collection('groups').updateOne(
                { _id: new ObjectId(id) },
                { $push: { members: username.trim() } }
            );
            
            await db.collection('users').updateOne(
                { _id: user._id },
                { $addToSet: { groups: id } }
            );
            
            res.json({ message: 'User added to group successfully' });
        } catch (error) {
            console.error('Add user to group error:', error);
            res.status(500).json({ error: 'Failed to add user to group' });
        }
    });
}

function removeUserFromGroup(app) {
    app.delete('/api/groups/:id/members/:username', async (req, res) => {
        try {
            const { id, username } = req.params;
            const db = getDB();
            
            // Remove from group members and admins
            await db.collection('groups').updateOne(
                { _id: new ObjectId(id) },
                { 
                    $pull: { 
                        members: { $regex: new RegExp(`^${username}$`, 'i') },
                        admins: { $regex: new RegExp(`^${username}$`, 'i') }
                    } 
                }
            );
            
            // Remove group from user's groups array
            await db.collection('users').updateOne(
                { username: { $regex: new RegExp(`^${username}$`, 'i') } },
                { $pull: { groups: id } }
            );
            
            res.json({ message: 'User removed from group successfully' });
        } catch (error) {
            console.error('Remove user from group error:', error);
            res.status(500).json({ error: 'Failed to remove user from group' });
        }
    });
}

function promoteToGroupAdmin(app) {
    app.post('/api/groups/:id/admins', async (req, res) => {
        try {
            const { id } = req.params;
            const { username } = req.body;
            
            if (!username?.trim()) return res.status(400).json({ error: 'username required' });
            
            const db = getDB();
            
            // 1. First, update the user's global roles to include "Group Admin"
            const user = await db.collection('users').findOne({ 
                username: { $regex: new RegExp(`^${username}$`, 'i') } 
            });
            
            if (!user) return res.status(404).json({ error: 'User not found' });
            
            // Add "Group Admin" to user's roles if not already there
            if (!user.roles.includes('Group Admin')) {
                await db.collection('users').updateOne(
                    { username: { $regex: new RegExp(`^${username}$`, 'i') } },
                    { $addToSet: { roles: 'Group Admin' } }
                );
            }
            
            // 2. Then, add user to this specific group's admin list
            const group = await db.collection('groups').findOne({ _id: new ObjectId(id) });
            if (!group) return res.status(404).json({ error: 'Group not found' });
            
            if (!group.members.some(m => m.toLowerCase() === username.toLowerCase())) {
                return res.status(400).json({ error: 'User must be a member of the group first' });
            }
            
            if (group.admins.some(a => a.toLowerCase() === username.toLowerCase())) {
                return res.status(400).json({ error: 'User is already an admin of this group' });
            }
            
            await db.collection('groups').updateOne(
                { _id: new ObjectId(id) },
                { $push: { admins: username.trim() } }
            );
            
            res.json({ message: `${username} promoted to group admin successfully` });
        } catch (error) {
            console.error('Promote to group admin error:', error);
            res.status(500).json({ error: 'Failed to promote user' });
        }
    });
}

function demoteFromGroupAdmin(app) {
    app.delete('/api/groups/:id/admins/:username', async (req, res) => {
        try {
            const { id, username } = req.params;
            const db = getDB();
            
            const group = await db.collection('groups').findOne({ _id: new ObjectId(id) });
            if (!group) return res.status(404).json({ error: 'Group not found' });
            
            if (group.ownerUsername.toLowerCase() === username.toLowerCase()) {
                return res.status(400).json({ error: 'Cannot remove group owner as admin' });
            }
            
            await db.collection('groups').updateOne(
                { _id: new ObjectId(id) },
                { $pull: { admins: { $regex: new RegExp(`^${username}$`, 'i') } } }
            );
            
            res.json({ message: `${username} removed as group admin successfully` });
        } catch (error) {
            console.error('Demote from group admin error:', error);
            res.status(500).json({ error: 'Failed to demote user' });
        }
    });
}

export { getGroups, getGroup, addGroup, deleteGroup, addUserToGroup, removeUserFromGroup, promoteToGroupAdmin, demoteFromGroupAdmin };