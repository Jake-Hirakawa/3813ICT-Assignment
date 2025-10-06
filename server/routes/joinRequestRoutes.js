import { getDB } from '../db.js';
import { ObjectId } from 'mongodb';
import { transformDocs } from '../utils/dbHelpers.js';

// Get all join requests
// GET /api/join-requests
// Returns: { joinRequests: [] } array of all join requests or error
// Transforms MongoDB _id to id field for client compatibility
function getJoinRequests(app) {
    app.get('/api/join-requests', async (req, res) => {
        try {
            const db = getDB();
            const joinRequests = await db.collection('joinRequests').find({}).toArray();
            res.json({ joinRequests: transformDocs(joinRequests) });
        } catch (error) {
            console.error('Get join requests error:', error);
            res.status(500).json({ error: 'Failed to get join requests' });
        }
    });
}

// Create a join request for a group
// POST /api/groups/:gid/requests
// Body: { username: string }
// Returns: { request } with generated ID or error
// Validates both user and group exist
// Prevents requests if user is already a member
// Prevents duplicate pending requests (case-insensitive)
// Creates request with 'pending' status and timestamp
function requestJoinGroup(app) {
    app.post('/api/groups/:gid/requests', async (req, res) => {
        try {
            const { gid } = req.params;
            const { username } = req.body;
            
            if (!username?.trim()) return res.status(400).json({ error: 'username required' });
            
            const db = getDB();
            const group = await db.collection('groups').findOne({ _id: new ObjectId(gid) });
            const user = await db.collection('users').findOne({ 
                username: { $regex: new RegExp(`^${username}$`, 'i') } 
            });
            
            if (!group) return res.status(404).json({ error: 'group not found' });
            if (!user) return res.status(404).json({ error: 'user not found' });
            
            if (group.members.some(m => m.toLowerCase() === username.toLowerCase())) {
                return res.status(400).json({ error: 'user already a member' });
            }
            
            const existingRequest = await db.collection('joinRequests').findOne({
                gid: gid,
                username: { $regex: new RegExp(`^${username}$`, 'i') },
                status: 'pending'
            });
            
            if (existingRequest) return res.status(409).json({ error: 'request already pending' });
            
            const request = {
                gid: gid,
                username: username.trim(),
                status: 'pending',
                createdAt: Date.now()
            };
            
            await db.collection('joinRequests').insertOne(request);
            
            // Get the created request with MongoDB _id converted to id
            const createdRequest = await db.collection('joinRequests').findOne({ 
                gid: gid, 
                username: username.trim(), 
                status: 'pending' 
            });
            
            const requestWithId = {
                ...createdRequest,
                id: createdRequest._id.toString(),
                _id: undefined
            };
            
            res.status(201).json({ request: requestWithId });
        } catch (error) {
            console.error('Request join group error:', error);
            res.status(500).json({ error: 'Failed to create join request' });
        }
    });
}

// Approve a join request
// POST /api/join-requests/:id/approve
// Returns: success message or error
// Validates request exists and is pending
// Adds user to group's members array
// Adds group ID to user's groups array
// Updates request status to 'approved'
// Uses $addToSet to prevent duplicates
function approveJoinRequest(app) {
    app.post('/api/join-requests/:id/approve', async (req, res) => {
        try {
            const { id } = req.params;
            const db = getDB();
            
            const request = await db.collection('joinRequests').findOne({ _id: new ObjectId(id) });
            if (!request) return res.status(404).json({ error: 'Join request not found' });
            
            if (request.status !== 'pending') {
                return res.status(400).json({ error: 'Request is not pending' });
            }
            
            // Add user to group members
            await db.collection('groups').updateOne(
                { _id: new ObjectId(request.gid) },
                { $addToSet: { members: request.username } }
            );
            
            // Add group to user's groups array
            await db.collection('users').updateOne(
                { username: { $regex: new RegExp(`^${request.username}$`, 'i') } },
                { $addToSet: { groups: request.gid } }
            );
            
            // Update request status
            await db.collection('joinRequests').updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: 'approved' } }
            );
            
            res.json({ message: 'Join request approved and user added to group' });
        } catch (error) {
            console.error('Approve join request error:', error);
            res.status(500).json({ error: 'Failed to approve join request' });
        }
    });
}

// Reject a join request
// POST /api/join-requests/:id/reject
// Returns: success message or error
// Updates request status to 'rejected'
// Does not modify group or user membership
// Request remains in database for record keeping
function rejectJoinRequest(app) {
    app.post('/api/join-requests/:id/reject', async (req, res) => {
        try {
            const { id } = req.params;
            const db = getDB();
            
            const result = await db.collection('joinRequests').updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: 'rejected' } }
            );
            
            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Join request not found' });
            }
            
            res.json({ message: 'Join request rejected' });
        } catch (error) {
            console.error('Reject join request error:', error);
            res.status(500).json({ error: 'Failed to reject join request' });
        }
    });
}

export { getJoinRequests, requestJoinGroup, approveJoinRequest, rejectJoinRequest };