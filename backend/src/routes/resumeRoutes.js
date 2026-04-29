const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');

router.post('/bullets', resumeController.generateBulletPoints);
router.post('/skills', resumeController.suggestSkills);
router.post('/analyze', resumeController.analyzeATS);
router.post('/cover-letter', resumeController.generateCoverLetter);

module.exports = router;
