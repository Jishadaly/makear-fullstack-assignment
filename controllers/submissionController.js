
const Submission = require('../models/Submission');
const faceSwapService = require('../services/faceSwapService');
const { saveImage, generateFilename } = require('../middleware/uploadMiddleware');
const { asyncHandler, AppError } = require('../middleware/errorMiddleware');
const path = require('path');
const fs = require('fs').promises;

class SubmissionController {

  showForm = asyncHandler(async (req, res) => {
    const serviceStatus = await faceSwapService.checkServiceStatus();
    res.render('form', {
      title: 'Face Swap Application',
      pageTitle: 'Submit Your Photo',
      serviceStatus,
      error: null,
      success: null
    });
  });


  submitForm = asyncHandler(async (req, res) => {
    const { name, email, phone } = req.body;

    const uploadedFile = req.files.inputImage?.[0];
    const styleFile = req.files.styleImage?.[0];
    if (!uploadedFile) throw new AppError('Input image is required', 400, 'image');
    if (!styleFile) throw new AppError('Input image is required', 400, 'image');


    const existing = await Submission.findByEmail(email);
    if (existing) throw new AppError('Email already registered', 409, 'email');

    const validation = await faceSwapService.validateImageForSwap(uploadedFile.buffer);
    if (!validation.valid) throw new AppError('Image not suitable for face swap', 400, 'image', validation.issues);

    const originalFilename = generateFilename(uploadedFile.originalname, 'original');
    const originalPath = await saveImage(uploadedFile.buffer, originalFilename);

    // Face swap
    let swappedPath = null;
    let warning = null;
    let swappedImgURL;
    try {

      const { buffer: swappedBuffer, outputUrl } = await faceSwapService.swapFace(
        uploadedFile,
        styleFile);
      swappedImgURL = outputUrl
      const swappedFilename = generateFilename(uploadedFile.originalname, 'swapped');
      swappedPath = await saveImage(swappedBuffer, swappedFilename);
    } catch (err) {
      console.error('Face swap failed:', err.message);
      throw new AppError('Face swap failed, please try again later.', 502, false);
    }

    // Save to DB
    const submission = await Submission.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      terms: true,
      originalImage: {
        filename: originalFilename,
        path: originalPath,
        size: uploadedFile.size,
        mimetype: uploadedFile.mimetype
      },
      swappedImage: swappedPath ? { filename: path.basename(swappedPath), path: swappedPath } : null,
      swappedImgURL: swappedImgURL ? swappedImgURL : null,
      processingStatus: swappedPath ? 'completed' : 'partial',
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Submission successful',
      swappedImgURL,
      submissionId: submission._id,
      processingStatus: submission.processingStatus,
      warning,
      recommendations: validation.recommendations || []
    });
  });


  showSubmissions = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(150, parseInt(req.query.limit) || 100);
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const result = await Submission.findAll({ page, limit, search, sortBy, sortOrder });
    const stats = await Submission.getStats();

    res.render('submissions', {
      title: 'All Submissions',
      pageTitle: 'Submission Records',
      submissions: result.submissions,
      pagination: result.pagination,
      stats,
      search,
      sortBy,
      sortOrder: req.query.sortOrder || 'desc'
    });
  });


  showSubmissionDetails = asyncHandler(async (req, res) => {
    const submission = await Submission.findById(req.params.id);
    if (!submission) throw new AppError('Submission not found', 404);

    res.status(200).json({
      success: true,
      submission: {
        id: submission._id,
        name: submission.name,
        email: submission.email,
        phone: submission.phone,
        originalImage: submission.originalImage,
        swappedImage: submission.swappedImage,
        swappedImgURL: submission.swappedImgURL,
        processingStatus: submission.processingStatus,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt
      }
    });
  });


  downloadImage = asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    if (!['original', 'swapped'].includes(type)) {
      throw new AppError('Invalid image type. Must be "original" or "swapped"', 400);
    }

    const submission = await Submission.findById(id);
    if (!submission) throw new AppError('Submission not found', 404);

    const image = submission[`${type}Image`];
    if (!image) throw new AppError(`${type} image not available`, 404);

    await fs.access(image.path).catch(() => {
      throw new AppError('Image file not found on server', 404);
    });

    res.download(image.path, image.filename);
  });


  getStats = asyncHandler(async (req, res) => {
    const stats = await Submission.getStats();
    const service = await faceSwapService.checkServiceStatus();
    const usage = await faceSwapService.getUsageStats();

    res.json({ submissions: stats, service, usage, timestamp: new Date().toISOString() });
  });

  deleteSubmission = asyncHandler(async (req, res) => {
    const success = await Submission.deleteById(req.params.id);
    if (!success) throw new AppError('Submission not found or already deleted', 404);

    res.json({ success: true, message: 'Submission deleted successfully' });
  });



}

module.exports = SubmissionController;

