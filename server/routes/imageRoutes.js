import { getDB } from '../db.js';
import { ObjectId } from 'mongodb';

// Upload user avatar image
// POST /api/users/:id/avatar
// Requires: multipart/form-data with 'avatar' field
// Returns: { avatarUrl: string } or error
// Validates user exists before upload
// Saves image to /images directory
// Updates user's avatarUrl field in database
// Returns path to uploaded image for client use
function uploadAvatar(app, upload) {
    app.post('/api/users/:id/avatar', upload.single('avatar'), async (req, res) => {
        try {
            const { id } = req.params;
            const db = getDB();
            
            const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
            if (!user) return res.status(404).json({ error: 'User not found' });
            
            if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
            
            const avatarUrl = `/images/${req.file.filename}`;
            
            await db.collection('users').updateOne(
                { _id: new ObjectId(id) },
                { $set: { avatarUrl: avatarUrl } }
            );
            
            res.json({ avatarUrl });
        } catch (error) {
            console.error('Upload avatar error:', error);
            res.status(500).json({ error: 'Failed to upload avatar' });
        }
    });
}

// Upload message image
// POST /api/upload/message-image
// Requires: multipart/form-data with 'image' field
// Returns: { imageUrl: string } or error
// Does not associate with specific message (handled by client)
// Saves image to /images directory
// Returns path to uploaded image for embedding in messages
function uploadMessageImage(app, upload) {
    app.post('/api/upload/message-image', upload.single('image'), (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }
            
            const imageUrl = `/images/${req.file.filename}`;
            res.json({ imageUrl });
        } catch (error) {
            console.error('Upload message image error:', error);
            res.status(500).json({ error: 'Failed to upload image' });
        }
    });
}

export { uploadAvatar, uploadMessageImage };