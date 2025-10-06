import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create images directory
// Ensure images directory exists
// Creates 'images/' folder in project root if not present
// Used to store all uploaded avatar and message images
const imagesDir = path.join(process.cwd(), 'images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
}

// Configure multer storage strategy
// destination: saves files to 'images/' directory
// filename: generates unique filename using timestamp + random string + original extension
// Prevents filename conflicts and overwrites
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// Create multer upload middleware with configuration
// storage: uses diskStorage configuration above
// limits: restricts file size to 5MB maximum
// fileFilter: validates only image MIME types are allowed
// Rejects non-image files with error message
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

export { upload, imagesDir };