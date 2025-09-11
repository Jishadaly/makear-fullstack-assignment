
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
      swappedImgURL: outputUrl ? outputUrl : null,
      processingStatus: swappedPath ? 'completed' : 'partial',
      clientIP: req.clientIP,
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
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
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

    res.render('submission-details', {
      title: 'Submission Details',
      pageTitle: `Submission by ${submission.name}`,
      submission
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


  retryFaceSwap = asyncHandler(async (req, res) => {
    const submission = await Submission.findById(req.params.id);
    if (!submission) throw new AppError('Submission not found', 404);
    if (submission.swappedImage) throw new AppError('Face swap already completed', 400);

    // Read original image
    const originalBuffer = await fs.readFile(submission.originalImage.path);
    const inputFile = {
      buffer: originalBuffer,
      mimetype: submission.originalImage.mimetype,
      originalname: submission.originalImage.filename
    };

    // Get style image
    if (!submission.styleImage || !submission.styleImage.path) {
      throw new AppError('Style image not found for retry', 400);
    }
    const styleBuffer = await fs.readFile(submission.styleImage.path);
    const styleFile = {
      buffer: styleBuffer,
      mimetype: submission.styleImage.mimetype || 'image/jpeg',
      originalname: submission.styleImage.filename
    };

    // Retry face swap
    let swappedBuffer, outputUrl;
    try {
      swappedBuffer = await faceSwapService.swapFace(inputFile, styleFile);
      // Save locally
      const swappedFilename = generateFilename(submission.originalImage.filename, 'swapped');
      const swappedPath = await saveImage(swappedBuffer, swappedFilename);

      // Update submission
      submission.swappedImage = {
        filename: swappedFilename,
        path: swappedPath,
        url: null // you can set URL if you have a hosted path
      };
      submission.processingStatus = 'completed';
      await submission.save();

      res.json({
        success: true,
        message: 'Face swap retried successfully',
        swappedImage: submission.swappedImage
      });
    } catch (err) {
      console.error('Face swap retry failed:', err.message);
      throw new AppError('Face swap retry failed, please try again later.', 502);
    }
  });


}

module.exports = SubmissionController;

