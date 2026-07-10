require('dotenv').config();
const express = require('express');
const cors = require('cors');

const tutorRoutes = require('./routes/tutorRoutes');
const generatorRoutes = require('./routes/generatorRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const firestoreRoutes = require('./routes/firestoreRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/pathfinder', tutorRoutes);
app.use('/api/generator', generatorRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/db', firestoreRoutes);
app.use('/api/webhooks', webhookRoutes);

// Health Check
app.get('/', (req, res) => {
  res.status(200).send('<h1>VidyaSetu AI Backend is Running Successfully! 🚀</h1><p>Please return to <a href="http://localhost:5173">http://localhost:5173</a> to use the application.</p>');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'VidyaSetu API is running' });
});

const PORT = process.env.PORT || 5000;

// Only listen if not running on Vercel
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
