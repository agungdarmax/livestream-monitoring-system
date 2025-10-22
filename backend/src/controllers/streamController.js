const prisma = require('../config/prisma');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// Get all streams
const getAllStreams = async (req, res) => {
  try {
    const streams = await prisma.stream.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: streams
    });
  } catch (error) {
    console.error('Get streams error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch streams',
      message: error.message 
    });
  }
};

// Get stream by ID
const getStreamById = async (req, res) => {
  try {
    const { id } = req.params;

    const stream = await prisma.stream.findUnique({
      where: { id: parseInt(id) }
    });

    if (!stream) {
      return res.status(404).json({ 
        error: 'Stream not found' 
      });
    }

    res.json({
      success: true,
      data: stream
    });
  } catch (error) {
    console.error('Get stream error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stream',
      message: error.message 
    });
  }
};

// Create new stream
const createStream = async (req, res) => {
  try {
    const { name, description, rtspUrl, latitude, longitude } = req.body;

    // Validasi input
    if (!name || !rtspUrl || !latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Name, RTSP URL, latitude, and longitude are required' 
      });
    }

    // Bikin stream di database
    const stream = await prisma.stream.create({
      data: {
        name,
        description: description || '',
        rtspUrl,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        status: 'inactive'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Stream created successfully',
      data: stream
    });
  } catch (error) {
    console.error('Create stream error:', error);
    res.status(500).json({ 
      error: 'Failed to create stream',
      message: error.message 
    });
  }
};

// Update stream
const updateStream = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, rtspUrl, latitude, longitude } = req.body;

    // Cek apakah stream exist
    const existingStream = await prisma.stream.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingStream) {
      return res.status(404).json({ 
        error: 'Stream not found' 
      });
    }

    // Update stream
    const updatedStream = await prisma.stream.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingStream.name,
        description: description !== undefined ? description : existingStream.description,
        rtspUrl: rtspUrl || existingStream.rtspUrl,
        latitude: latitude ? parseFloat(latitude) : existingStream.latitude,
        longitude: longitude ? parseFloat(longitude) : existingStream.longitude
      }
    });

    res.json({
      success: true,
      message: 'Stream updated successfully',
      data: updatedStream
    });
  } catch (error) {
    console.error('Update stream error:', error);
    res.status(500).json({ 
      error: 'Failed to update stream',
      message: error.message 
    });
  }
};

// Delete stream
const deleteStream = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah stream exist
    const stream = await prisma.stream.findUnique({
      where: { id: parseInt(id) }
    });

    if (!stream) {
      return res.status(404).json({ 
        error: 'Stream not found' 
      });
    }

    // TODO: Stop FFmpeg process kalo lagi jalan (nanti kita implement)

    // Delete stream dari database
    await prisma.stream.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Stream deleted successfully'
    });
  } catch (error) {
    console.error('Delete stream error:', error);
    res.status(500).json({ 
      error: 'Failed to delete stream',
      message: error.message 
    });
  }
};

// Start stream (trigger FFmpeg)
const startStream = async (req, res) => {
  try {
    const { id } = req.params;

    const stream = await prisma.stream.findUnique({
      where: { id: parseInt(id) }
    });

    if (!stream) {
      return res.status(404).json({ 
        error: 'Stream not found' 
      });
    }

    // Check if already active
    if (stream.status === 'active' && stream.processId) {
      return res.status(400).json({
        error: 'Stream is already running'
      });
    }

    // Import FFmpeg helper
    const { startFFmpegProcess } = require('../utils/ffmpegHelper');

    // Start FFmpeg process
    const ffmpegInfo = await startFFmpegProcess(stream.id, stream.rtspUrl);

    // Update stream di database
    const updatedStream = await prisma.stream.update({
      where: { id: parseInt(id) },
      data: { 
        status: 'active',
        processId: ffmpegInfo.pid.toString(),
        hlsPath: `/streams/stream_${stream.id}/stream.m3u8`
      }
    });

    res.json({
      success: true,
      message: 'Stream started successfully',
      data: updatedStream
    });
  } catch (error) {
    console.error('Start stream error:', error);
    
    // Update status jadi error
    try {
      await prisma.stream.update({
        where: { id: parseInt(req.params.id) },
        data: { status: 'error' }
      });
    } catch (dbError) {
      console.error('Failed to update stream status:', dbError);
    }

    res.status(500).json({ 
      error: 'Failed to start stream',
      message: error.message 
    });
  }
};

// Stop stream
const stopStream = async (req, res) => {
  try {
    const { id } = req.params;

    const stream = await prisma.stream.findUnique({
      where: { id: parseInt(id) }
    });

    if (!stream) {
      return res.status(404).json({ 
        error: 'Stream not found' 
      });
    }

    if (stream.status === 'inactive') {
      return res.status(400).json({
        error: 'Stream is not running'
      });
    }

    // Stop FFmpeg process
    const { stopFFmpegProcess } = require('../utils/ffmpegHelper');
    
    if (stream.processId) {
      stopFFmpegProcess(parseInt(stream.processId));
    }

    // Update stream di database
    const updatedStream = await prisma.stream.update({
      where: { id: parseInt(id) },
      data: { 
        status: 'inactive',
        processId: null
      }
    });

    res.json({
      success: true,
      message: 'Stream stopped successfully',
      data: updatedStream
    });
  } catch (error) {
    console.error('Stop stream error:', error);
    res.status(500).json({ 
      error: 'Failed to stop stream',
      message: error.message 
    });
  }
};

module.exports = {
  getAllStreams,
  getStreamById,
  createStream,
  updateStream,
  deleteStream,
  startStream,
  stopStream
};