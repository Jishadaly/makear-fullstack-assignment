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
const validateFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required' });
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Only JPEG, JPG, PNG files allowed' });
  }

  const maxSize = 2 * 1024 * 1024; // 2MB
  if (req.file.size > maxSize) {
    return res.status(400).json({ error: 'File size must not exceed 2MB' });
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
