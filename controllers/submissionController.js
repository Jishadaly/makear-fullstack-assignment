const Submission = require('../models/Submission');
const faceSwapService = require('../services/faceSwapService');
const { asyncHandler, AppError } = require('../middleware/errorMiddleware');

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

    res.status(201).json({
      success: true,
      message: 'Submission successful',
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

}

module.exports = SubmissionController;
