const express = require('express');
const { syncStudentsFromSheet } = require('../controllers/syncController');
const router = express.Router();

// This endpoint will be hit to trigger a sync
router.all('/sheets', async (req, res) => {
  console.log("Sync triggered! Processing...");
  
  // We pass req and res so the controller can send the response
  await syncStudentsFromSheet(req, res);
});

module.exports = router;
