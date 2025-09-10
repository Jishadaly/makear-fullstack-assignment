const express = require("express");
const router = express.Router();

const SubmissionController = require("../controllers/submissionController");

const { uploadMiddleware, processImage } = require("../middleware/uploadMiddleware");
const { 
  submissionValidationRules, 
  handleValidationErrors, 
  validateFile,
  validateObjectId 
} = require("../middleware/validationMiddleware");

const submissionController = new SubmissionController();

router.get("/", submissionController.showForm);
router.post(
  "/submit",
  uploadMiddleware,          
  validateFile,             
  submissionValidationRules(), 
  handleValidationErrors,   
  processImage,              
  submissionController.submitForm
);

// Show all submissions (with pagination, search, etc.)
router.get("/submissions", submissionController.showSubmissions);
router.get("/submissions/:id", validateObjectId, submissionController.showSubmissionDetails);

module.exports = router;
