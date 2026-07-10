const express = require('express');
const { syncStudentsFromSheet } = require('../controllers/syncController');
const router = express.Router();

// This endpoint will be hit by Google Apps Script whenever the sheet is edited.
// We trigger the sync process.
router.post('/sheets', async (req, res) => {
  // We can add a simple secret token here to verify it came from our script, but for now we'll just trigger it
  console.log("Webhook received from Google Sheets! Triggering sync...");
  
  // We pass req and res so the controller can send the response back to the script
  await syncStudentsFromSheet(req, res);
});

module.exports = router;
