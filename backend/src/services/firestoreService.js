const { db } = require('../config/firebase');

/**
 * Generic Firestore CRUD service.
 * All methods accept a `collection` name string.
 */

// CREATE — add a new document (auto-ID or custom ID)
exports.create = async (collection, data, customId = null) => {
  const ref = customId
    ? db.collection(collection).doc(customId)
    : db.collection(collection).doc();

  const timestamp = new Date().toISOString();
  const record = { ...data, createdAt: timestamp, updatedAt: timestamp };

  await ref.set(record);
  return { id: ref.id, ...record };
};

// READ ONE — get a single document by ID
exports.getById = async (collection, id) => {
  const doc = await db.collection(collection).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

// READ ALL — list documents with optional filters
exports.getAll = async (collection, filters = {}) => {
  let query = db.collection(collection);

  // Apply simple equality filters: { field: value }
  for (const [field, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      query = query.where(field, '==', value);
    }
  }

  // Order by creation date, newest first
  query = query.orderBy('createdAt', 'desc');

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// UPDATE — partial update of a document
exports.update = async (collection, id, data) => {
  const ref = db.collection(collection).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const updatedRecord = { ...data, updatedAt: new Date().toISOString() };
  await ref.update(updatedRecord);
  return { id: ref.id, ...doc.data(), ...updatedRecord };
};

// DELETE — remove a document
exports.remove = async (collection, id) => {
  const ref = db.collection(collection).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;

  await ref.delete();
  return true;
};
