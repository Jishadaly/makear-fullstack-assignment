/**
 * Validation middleware
 * Input validation, sanitization, and error handling
 */

const { body, validationResult } = require('express-validator');

// Validation rules for submissions
const submissionValidationRules = () => [
  body('name')
    .trim()
    .isLength({ min: 4, max: 30 }).withMessage('Name must be 4–30 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Name must contain only letters and spaces'),

  body('email')
    .trim()
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('phone')
    .trim()
    .matches(/^\d{10}$/).withMessage('Phone number must be 10 digits'),

  body('terms')
    .equals('true').withMessage('Terms and conditions must be accepted'),
];

// File validation (basic)
// File validation (for .fields())
const validateFile = (req, res, next) => {
  const inputFile = req.files?.inputImage?.[0]; // main image
  if (!inputFile) {
    return res.status(400).json({ error: 'Input image file is required' });
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!allowedTypes.includes(inputFile.mimetype)) {
    return res.status(400).json({ error: 'Only JPEG, JPG, PNG files allowed' });
  }

  const maxSize = 2 * 1024 * 1024; // 2MB
  if (inputFile.size > maxSize) {
    return res.status(400).json({ error: 'File size must not exceed 2MB' });
  }

  // Optional style image validation
  const styleFile = req.files?.styleImage?.[0];
  if (styleFile) {
    if (!allowedTypes.includes(styleFile.mimetype)) {
      return res.status(400).json({ error: 'Only JPEG, JPG, PNG files allowed for style image' });
    }
    if (styleFile.size > maxSize) {
      return res.status(400).json({ error: 'Style image file size must not exceed 2MB' });
    }
  }

  next();
};


// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

// Validate MongoDB ObjectId
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  if (id && !/^[0-9a-fA-F]{24}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  next();
};

module.exports = {
  submissionValidationRules,
  validateFile,
  handleValidationErrors,
  validateObjectId,
};
