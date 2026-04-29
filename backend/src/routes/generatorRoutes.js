const express = require('express');
const router = express.Router();
const generatorController = require('../controllers/generatorController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/worksheet', generatorController.generateWorksheet);
router.post('/quiz', generatorController.generateQuiz);
router.post('/parse-pdf', upload.single('pdfFile'), generatorController.parsePdf);
router.post('/mastery-notes', generatorController.generateMasteryNotes);
router.post('/roadmap', generatorController.generateRoadmap);

module.exports = router;
