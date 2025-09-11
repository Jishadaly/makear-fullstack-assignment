const express = require("express");
const router = express.Router();

const SubmissionController = require("../controllers/submissionController");

const { uploadMiddleware, processImages } = require("../middleware/uploadMiddleware");
const { 
  submissionValidationRules, 
  handleValidationErrors, 
  validateFile,
  validateObjectId 
} = require("../middleware/validationMiddleware");

const submissionController = new SubmissionController();


router.post(
  "/submit",
  uploadMiddleware,          
  validateFile,             
  submissionValidationRules(), 
  handleValidationErrors,   
  processImages,              
  submissionController.submitForm
);

router.get("/", submissionController.showForm);
router.get("/submissions", submissionController.showSubmissions);
router.get("/submissions/:id", validateObjectId, submissionController.showSubmissionDetails);

module.exports = router;
