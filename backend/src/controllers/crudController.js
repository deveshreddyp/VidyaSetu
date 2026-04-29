const firestoreService = require('../services/firestoreService');

/**
 * Factory that generates standard CRUD handlers for any Firestore collection.
 */
function createCrudController(collectionName) {
  return {
    // POST /
    create: async (req, res) => {
      try {
        const customId = req.body._id; // optional custom document ID
        delete req.body._id;
        const result = await firestoreService.create(collectionName, req.body, customId);
        res.status(201).json(result);
      } catch (error) {
        console.error(`Create ${collectionName} error:`, error);
        res.status(500).json({ error: `Failed to create ${collectionName} document.` });
      }
    },

    // GET /
    getAll: async (req, res) => {
      try {
        // Pass query params as filters (e.g., ?userId=abc&role=student)
        const filters = { ...req.query };
        const results = await firestoreService.getAll(collectionName, filters);
        res.status(200).json(results);
      } catch (error) {
        console.error(`GetAll ${collectionName} error:`, error);
        res.status(500).json({ error: `Failed to retrieve ${collectionName} documents.` });
      }
    },

    // GET /:id
    getById: async (req, res) => {
      try {
        const result = await firestoreService.getById(collectionName, req.params.id);
        if (!result) return res.status(404).json({ error: 'Document not found.' });
        res.status(200).json(result);
      } catch (error) {
        console.error(`GetById ${collectionName} error:`, error);
        res.status(500).json({ error: `Failed to retrieve ${collectionName} document.` });
      }
    },

    // PUT /:id
    update: async (req, res) => {
      try {
        const result = await firestoreService.update(collectionName, req.params.id, req.body);
        if (!result) return res.status(404).json({ error: 'Document not found.' });
        res.status(200).json(result);
      } catch (error) {
        console.error(`Update ${collectionName} error:`, error);
        res.status(500).json({ error: `Failed to update ${collectionName} document.` });
      }
    },

    // DELETE /:id
    remove: async (req, res) => {
      try {
        const success = await firestoreService.remove(collectionName, req.params.id);
        if (!success) return res.status(404).json({ error: 'Document not found.' });
        res.status(200).json({ message: `${collectionName} document deleted successfully.` });
      } catch (error) {
        console.error(`Delete ${collectionName} error:`, error);
        res.status(500).json({ error: `Failed to delete ${collectionName} document.` });
      }
    },
  };
}

module.exports = createCrudController;
