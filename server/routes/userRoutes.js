import { getDB } from '../db.js';
import { ObjectId } from 'mongodb';
import { transformDoc, transformDocs } from '../utils/dbHelpers.js';

function getUsers(app) {
    app.get('/api/users', async (req, res) => {
        try {
            const db = getDB();
            const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
            res.json({ users: transformDocs(users) });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({ error: 'Failed to get users' });
        }
    });
}

function addUser(app) {
    app.post('/api/users', async (req, res) => {
        try {
            const { username, email, password, role = 'User' } = req.body;
            
            if (!username?.trim()) return res.status(400).json({ error: 'username required' });
            
            const db = getDB();
            const existingUser = await db.collection('users').findOne({ 
                username: { $regex: new RegExp(`^${username}$`, 'i') } 
            });
            
            if (existingUser) return res.status(409).json({ error: 'username taken' });
            
            const user = {
                username: username.trim(),
                email: (email || '').trim(),
                password: password || '',
                roles: [role],
                groups: [],
                createdAt: new Date()
            };
            
            const result = await db.collection('users').insertOne(user);
            const createdUser = await db.collection('users').findOne({ _id: result.insertedId }, { projection: { password: 0 } });
            
            res.status(201).json({ user: transformDoc(createdUser) });
        } catch (error) {
            console.error('Add user error:', error);
            res.status(500).json({ error: 'Failed to create user' });
        }
    });
}

function deleteUser(app) {
    app.delete('/api/users/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const db = getDB();
            
            const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
            if (!user) return res.status(404).json({ error: 'User not found' });
            
            // Remove user from ALL group members AND admins arrays
            await db.collection('groups').updateMany(
                {},
                { 
                    $pull: { 
                        members: { $regex: new RegExp(`^${user.username}$`, 'i') },
                        admins: { $regex: new RegExp(`^${user.username}$`, 'i') }
                    } 
                }
            );
            
            // Remove from channel members too
            await db.collection('groups').updateMany(
                {},
                { $pull: { "channels.$[].members": { $regex: new RegExp(`^${user.username}$`, 'i') } } }
            );
            
            // Remove join requests
            await db.collection('joinRequests').deleteMany({ 
                username: { $regex: new RegExp(`^${user.username}$`, 'i') } 
            });
            
            // Delete the user
            await db.collection('users').deleteOne({ _id: new ObjectId(id) });
            
            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    });
}

function loginUser(app) {
    app.post('/api/auth/login', async (req, res) => {
        try {
            const { username, password } = req.body;
            const db = getDB();
            
            const user = await db.collection('users').findOne({ 
                username: { $regex: new RegExp(`^${username}$`, 'i') } 
            });
            
            if (!user || user.password !== password) {
                return res.status(401).json({ error: 'Invalid username/password' });
            }
            
            const { password: _omit, ...userWithoutPassword } = user;
            res.json({ user: transformDoc(userWithoutPassword) });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    });
}

function promoteToSuperAdmin(app) {
    app.post('/api/users/:id/promote-super-admin', async (req, res) => {
        try {
            const { id } = req.params;
            const db = getDB();
            
            const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
            if (!user) return res.status(404).json({ error: 'User not found' });
            
            if (user.roles.includes('Super Admin')) {
                return res.status(400).json({ error: 'User is already a Super Admin' });
            }
            
            await db.collection('users').updateOne(
                { _id: new ObjectId(id) },
                { $addToSet: { roles: 'Super Admin' } }
            );
            
            res.json({ message: `${user.username} promoted to Super Admin successfully` });
        } catch (error) {
            console.error('Promote to super admin error:', error);
            res.status(500).json({ error: 'Failed to promote user' });
        }
    });
}

export { getUsers, addUser, deleteUser, loginUser, promoteToSuperAdmin };