const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getAllStreams,
  getStreamById,
  createStream,
  updateStream,
  deleteStream,
  startStream,
  stopStream
} = require('../controllers/streamController');

// Public routes (ga perlu login)
router.get('/', getAllStreams);
router.get('/:id', getStreamById);

// Protected routes (harus login)
router.post('/', authMiddleware, createStream);
router.put('/:id', authMiddleware, updateStream);
router.delete('/:id', authMiddleware, deleteStream);
router.post('/:id/start', authMiddleware, startStream);
router.post('/:id/stop', authMiddleware, stopStream);

module.exports = router;