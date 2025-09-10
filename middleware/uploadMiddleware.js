/**
 * File upload middleware
 * Secure image uploads with validation and processing
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
const createUploadDir = async () => {
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
};

// Multer config (memory storage → we process before saving)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
 
    const allowed = /jpeg|jpg|png/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only .jpeg, .jpg, .png allowed'));
  },
}).single('image');

// Middleware wrapper for error handling
const uploadMiddleware = (req, res, next) => {
  upload(req, res, err => {

    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// Process and optimize image
const processImage = async (req, res, next) => {
  console.log('processImage',req.file);
  if (!req.file) return next();

  try {
    const processed = await sharp(req.file.buffer)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    req.file.buffer = processed;
    next();
  } catch (err) {
    console.error('Image processing error:', err);
    res.status(400).json({ error: 'Invalid image file' });
  }
};

// Save processed file
const saveImage = async (buffer, originalname) => {
  const dir = await createUploadDir();
  const filename = generateFilename(originalname);
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, buffer);
  return filepath;
};

// Generate safe filename
const generateFilename = (originalname) => {
  const ext = path.extname(originalname).toLowerCase();
  const base = path.basename(originalname, ext).replace(/[^a-z0-9]/gi, '_');
  return `${base}_${Date.now()}${ext}`;
};

// Delete file utility
const deleteFile = async (filepath) => {
  try {
    await fs.unlink(filepath);
  } catch {
    // Ignore errors if file already removed
  }
};

module.exports = {
  uploadMiddleware,
  processImage,
  saveImage,
  deleteFile,
};
