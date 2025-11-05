const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger');
const prisma = require('../config/prisma');

// Path ke folder streams output
const STREAMS_DIR = path.join(__dirname, '../../streams');

// Store active FFmpeg processes with health info
const activeProcesses = new Map();

// Health check interval (every 30 seconds)
const HEALTH_CHECK_INTERVAL = 30000;

// Fungsi buat ensure folder exists
const ensureStreamDir = async (streamId) => {
  const streamDir = path.join(STREAMS_DIR, `stream_${streamId}`);
  try {
    await fs.mkdir(streamDir, { recursive: true });
    logger.info(`Stream directory created: ${streamDir}`);
    return streamDir;
  } catch (error) {
    logger.error('Error creating stream directory:', error);
    throw error;
  }
};

// 🆕 LOG ERROR TO DATABASE
const logStreamError = async (streamId, errorType, errorMessage, stackTrace = null) => {
  try {
    await prisma.streamErrorLog.create({
      data: {
        streamId,
        errorType,
        errorMessage,
        stackTrace
      }
    });

    // Update stream error info
    await prisma.stream.update({
      where: { id: streamId },
      data: {
        errorMessage,
        lastError: new Date(),
        errorCount: {
          increment: 1
        },
        status: 'error'
      }
    });

    logger.error(`Error logged for stream ${streamId}: ${errorType} - ${errorMessage}`);
  } catch (dbError) {
    logger.error('Failed to log error to database:', dbError);
  }
};

// 🆕 LOG HEALTH STATUS
const logHealthStatus = async (streamId, status, metrics = {}) => {
  try {
    await prisma.streamHealthLog.create({
      data: {
        streamId,
        status,
        bitrate: metrics.bitrate || null,
        fps: metrics.fps || null,
        uptime: metrics.uptime || 0
      }
    });

    await prisma.stream.update({
      where: { id: streamId },
      data: {
        lastHealthCheck: new Date(),
        bitrate: metrics.bitrate || null,
        fps: metrics.fps || null,
        resolution: metrics.resolution || null
      }
    });
  } catch (error) {
    logger.error('Failed to log health status:', error);
  }
};

// 🆕 PARSE FFMPEG STATS FROM STDERR
const parseFFmpegStats = (data) => {
  const stats = {};
  
  // Parse bitrate: "bitrate=2500.0kbits/s"
  const bitrateMatch = data.match(/bitrate=\s*([\d.]+)kbits\/s/);
  if (bitrateMatch) {
    stats.bitrate = Math.round(parseFloat(bitrateMatch[1]));
  }
  
  // Parse FPS: "fps=30"
  const fpsMatch = data.match(/fps=\s*([\d.]+)/);
  if (fpsMatch) {
    stats.fps = parseFloat(fpsMatch[1]);
  }
  
  // Parse speed: "speed=1.0x"
  const speedMatch = data.match(/speed=\s*([\d.]+)x/);
  if (speedMatch) {
    stats.speed = parseFloat(speedMatch[1]);
  }
  
  return stats;
};

// 🆕 HEALTH CHECK FOR ACTIVE STREAMS
const healthCheck = async (streamId) => {
  const processInfo = activeProcesses.get(streamId);
  if (!processInfo) return;

  try {
    const uptime = Math.floor((Date.now() - processInfo.startTime) / 1000);
    
    // Check if process is still running
    try {
      process.kill(processInfo.pid, 0); // Signal 0 checks if process exists
    } catch (err) {
      // Process not found - stream crashed!
      logger.error(`Health check: Stream ${streamId} process died unexpectedly`);
      await logStreamError(
        streamId,
        'crash',
        'FFmpeg process crashed unexpectedly',
        err.message
      );
      activeProcesses.delete(streamId);
      return;
    }

    // Check if HLS files are being updated
    const streamDir = path.join(STREAMS_DIR, `stream_${streamId}`);
    const m3u8Path = path.join(streamDir, 'stream.m3u8');
    
    try {
      const stats = await fs.stat(m3u8Path);
      const fileAge = Date.now() - stats.mtimeMs;
      
      // If m3u8 hasn't been updated in 30 seconds, something's wrong
      if (fileAge > 30000) {
        logger.warn(`Health check: Stream ${streamId} m3u8 file stale (${Math.floor(fileAge/1000)}s old)`);
        await logHealthStatus(streamId, 'degraded', {
          uptime,
          bitrate: processInfo.lastStats?.bitrate,
          fps: processInfo.lastStats?.fps
        });
        return;
      }
    } catch (statError) {
      logger.error(`Health check: Cannot access m3u8 file for stream ${streamId}:`, statError);
      return;
    }

    // Stream is healthy!
    await logHealthStatus(streamId, 'healthy', {
      uptime,
      bitrate: processInfo.lastStats?.bitrate,
      fps: processInfo.lastStats?.fps,
      resolution: '1280x720' // From FFmpeg args
    });

    // Update uptime in database
    await prisma.stream.update({
      where: { id: streamId },
      data: { uptimeSeconds: uptime }
    });

    logger.debug(`Health check: Stream ${streamId} is healthy (uptime: ${uptime}s)`);
  } catch (error) {
    logger.error(`Health check failed for stream ${streamId}:`, error);
  }
};

// Start FFmpeg process with enhanced error handling
const startFFmpegProcess = async (streamId, rtspUrl) => {
  try {
    const streamDir = await ensureStreamDir(streamId);
    const outputPath = path.join(streamDir, 'stream.m3u8');

    // Clean old segments before starting
    try {
      const files = await fs.readdir(streamDir);
      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.m3u8')) {
          await fs.unlink(path.join(streamDir, file));
        }
      }
      logger.info(`Cleaned old segments for stream ${streamId}`);
    } catch (err) {
      logger.warn(`Could not clean old segments: ${err.message}`);
    }

    // Update status to "starting"
    await prisma.stream.update({
      where: { id: streamId },
      data: { 
        status: 'starting',
        errorMessage: null,
        startedAt: new Date()
      }
    });

    // FFmpeg args (same as before)
    const ffmpegArgs = [
      '-loglevel', 'warning',
      '-rtsp_transport', 'tcp',
      '-timeout', '5000000',
      '-fflags', '+genpts+flush_packets',
      '-flags', 'low_delay',
      '-max_delay', '500000',
      '-analyzeduration', '1000000',
      '-probesize', '5000000',
      '-rtbufsize', '100M',
      '-i', rtspUrl,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-profile:v', 'baseline',
      '-level', '3.0',
      '-s', '1280x720',
      '-b:v', '3000k',
      '-maxrate', '3500k',
      '-bufsize', '1000k',
      '-crf', '23',
      '-g', '30',
      '-keyint_min', '30',
      '-sc_threshold', '0',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ac', '2',
      '-ar', '44100',
      '-f', 'hls',
      '-hls_time', '1',
      '-hls_list_size', '3',
      '-hls_flags', 'delete_segments+append_list+independent_segments',
      '-hls_segment_type', 'mpegts',
      '-hls_segment_filename', path.join(streamDir, 'segment_%03d.ts'),
      '-start_number', '1',
      '-avoid_negative_ts', 'make_zero',
      '-y',
      outputPath
    ];

    logger.info(`Starting FFmpeg for stream ${streamId}`);
    logger.info(`RTSP URL: ${rtspUrl}`);

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

    // Store process info with health tracking
    const processInfo = {
      process: ffmpegProcess,
      pid: ffmpegProcess.pid,
      startTime: Date.now(),
      rtspUrl: rtspUrl,
      lastStats: {},
      healthCheckInterval: null,
      errorBuffer: ''
    };

    activeProcesses.set(streamId, processInfo);

    // 🆕 START HEALTH CHECK
    processInfo.healthCheckInterval = setInterval(() => {
      healthCheck(streamId);
    }, HEALTH_CHECK_INTERVAL);

    // Handle stdout
    ffmpegProcess.stdout.on('data', (data) => {
      logger.debug(`FFmpeg stdout [${streamId}]: ${data}`);
    });

    // Handle stderr (FFmpeg outputs stats here)
    ffmpegProcess.stderr.on('data', (data) => {
      const message = data.toString();
      processInfo.errorBuffer += message;
      
      // Parse stats for health monitoring
      const stats = parseFFmpegStats(message);
      if (Object.keys(stats).length > 0) {
        processInfo.lastStats = { ...processInfo.lastStats, ...stats };
        logger.debug(`FFmpeg stats [${streamId}]:`, stats);
      }
      
      // Log errors
      if (message.includes('error') || message.includes('Error')) {
        logger.error(`FFmpeg error [${streamId}]: ${message}`);
      }
    });

    // Handle process exit
    ffmpegProcess.on('close', async (code) => {
      logger.warn(`FFmpeg process [${streamId}] exited with code ${code}`);
      
      // Clear health check
      if (processInfo.healthCheckInterval) {
        clearInterval(processInfo.healthCheckInterval);
      }
      
      activeProcesses.delete(streamId);
      
      // Log error if crashed
      if (code !== 0) {
        const errorMsg = `FFmpeg exited with code ${code}`;
        const lastErrors = processInfo.errorBuffer.slice(-1000); // Last 1000 chars
        
        await logStreamError(
          streamId,
          'crash',
          errorMsg,
          lastErrors
        );
      }
    });

    // Handle errors
    ffmpegProcess.on('error', async (error) => {
      logger.error(`FFmpeg error [${streamId}]:`, error);
      
      await logStreamError(
        streamId,
        'spawn_error',
        error.message,
        error.stack
      );
      
      if (processInfo.healthCheckInterval) {
        clearInterval(processInfo.healthCheckInterval);
      }
      
      activeProcesses.delete(streamId);
    });

    logger.info(`✅ FFmpeg started for stream ${streamId} (PID: ${ffmpegProcess.pid})`);

    // Wait a bit for FFmpeg to start, then update to active
    setTimeout(async () => {
      try {
        // Check if m3u8 file exists
        await fs.access(outputPath);
        
        await prisma.stream.update({
          where: { id: streamId },
          data: { 
            status: 'active',
            restartCount: { increment: 1 }
          }
        });
        
        logger.info(`Stream ${streamId} is now active`);
      } catch (err) {
        logger.error(`Stream ${streamId} failed to start properly:`, err);
        await logStreamError(streamId, 'startup', 'Failed to create HLS output', err.message);
      }
    }, 3000);

    return {
      process: ffmpegProcess,
      pid: ffmpegProcess.pid,
      outputPath: outputPath,
      streamDir: streamDir
    };
  } catch (error) {
    logger.error('Error starting FFmpeg:', error);
    await logStreamError(streamId, 'startup_error', error.message, error.stack);
    throw error;
  }
};

// Stop FFmpeg process
const stopFFmpegProcess = (processId) => {
  try {
    if (processId) {
      // Try graceful shutdown first
      process.kill(processId, 'SIGTERM');
      logger.info(`Sent SIGTERM to FFmpeg process: ${processId}`);
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        try {
          process.kill(processId, 'SIGKILL');
          logger.warn(`Sent SIGKILL to FFmpeg process: ${processId}`);
        } catch (err) {
          // Process already dead, ignore
        }
      }, 5000);
      
      return true;
    }
    return false;
  } catch (error) {
    if (error.code === 'ESRCH') {
      logger.warn(`Process ${processId} not found (already stopped)`);
      return true;
    }
    logger.error('Error stopping FFmpeg:', error);
    return false;
  }
};

// Stop stream by stream ID
const stopStreamById = async (streamId) => {
  const processInfo = activeProcesses.get(streamId);
  if (processInfo) {
    logger.info(`Stopping stream ${streamId} (PID: ${processInfo.pid})`);
    
    // Clear health check
    if (processInfo.healthCheckInterval) {
      clearInterval(processInfo.healthCheckInterval);
    }
    
    const result = stopFFmpegProcess(processInfo.pid);
    if (result) {
      activeProcesses.delete(streamId);
      
      // Calculate final uptime
      const uptime = Math.floor((Date.now() - processInfo.startTime) / 1000);
      await prisma.stream.update({
        where: { id: streamId },
        data: { 
          uptimeSeconds: uptime,
          status: 'inactive'
        }
      });
    }
    return result;
  }
  logger.warn(`No active process found for stream ${streamId}`);
  return false;
};

// Get stream health info
const getStreamHealth = async (streamId) => {
  try {
    // Get recent health logs (last 24 hours)
    const healthLogs = await prisma.streamHealthLog.findMany({
      where: {
        streamId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Get recent errors (last 7 days)
    const errorLogs = await prisma.streamErrorLog.findMany({
      where: {
        streamId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // Calculate uptime percentage
    const healthyCount = healthLogs.filter(log => log.status === 'healthy').length;
    const uptimePercentage = healthLogs.length > 0 
      ? Math.round((healthyCount / healthLogs.length) * 100) 
      : 0;

    // Get current stream info
    const stream = await prisma.stream.findUnique({
      where: { id: streamId }
    });

    return {
      stream,
      uptimePercentage,
      recentHealth: healthLogs.slice(0, 10),
      recentErrors: errorLogs.slice(0, 10),
      totalErrors24h: errorLogs.filter(
        log => log.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length,
      averageBitrate: healthLogs.length > 0
        ? Math.round(healthLogs.reduce((sum, log) => sum + (log.bitrate || 0), 0) / healthLogs.length)
        : null,
      averageFps: healthLogs.length > 0
        ? (healthLogs.reduce((sum, log) => sum + (log.fps || 0), 0) / healthLogs.length).toFixed(1)
        : null
    };
  } catch (error) {
    logger.error('Error getting stream health:', error);
    throw error;
  }
};

// Get active processes info
const getActiveProcesses = () => {
  const processes = [];
  for (const [streamId, info] of activeProcesses.entries()) {
    processes.push({
      streamId,
      pid: info.pid,
      startTime: info.startTime,
      uptime: Math.floor((Date.now() - info.startTime) / 1000),
      rtspUrl: info.rtspUrl,
      lastStats: info.lastStats
    });
  }
  return processes;
};

// Cleanup all streams on shutdown
const cleanupAllStreams = () => {
  logger.info('Cleaning up all active FFmpeg processes...');
  for (const [streamId, info] of activeProcesses.entries()) {
    if (info.healthCheckInterval) {
      clearInterval(info.healthCheckInterval);
    }
    stopFFmpegProcess(info.pid);
  }
  activeProcesses.clear();
};

// Handle graceful shutdown
process.on('SIGTERM', cleanupAllStreams);
process.on('SIGINT', cleanupAllStreams);

module.exports = {
  startFFmpegProcess,
  stopFFmpegProcess,
  stopStreamById,
  getStreamHealth,
  getActiveProcesses,
  cleanupAllStreams,
  STREAMS_DIR
};