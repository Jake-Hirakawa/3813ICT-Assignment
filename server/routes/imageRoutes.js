import { getDB } from '../db.js';
import { ObjectId } from 'mongodb';

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