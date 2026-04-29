const express = require('express');
const router = express.Router();
const multer = require('multer');
const tutorController = require('../controllers/tutorController');

// Multer setup for memory storage
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), tutorController.uploadPDF);
router.post('/chat', tutorController.chat);

module.exports = router;
