const express = require('express');
const router = express.Router();
const createCrudController = require('../controllers/crudController');

// Define all Firestore collections
const COLLECTIONS = [
  'users',
  'teachers',
  'students',
  'quizzes',
  'worksheets',
  'chat_history',
  'resumes',
  'analytics',
];

// Dynamically register CRUD routes for each collection
COLLECTIONS.forEach((collection) => {
  const controller = createCrudController(collection);

  router.post(`/${collection}`, controller.create);
  router.get(`/${collection}`, controller.getAll);
  router.get(`/${collection}/:id`, controller.getById);
  router.put(`/${collection}/:id`, controller.update);
  router.delete(`/${collection}/:id`, controller.remove);
});

module.exports = router;
