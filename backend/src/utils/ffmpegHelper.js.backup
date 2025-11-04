const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger');

// Path ke folder streams output
const STREAMS_DIR = path.join(__dirname, '../../streams');

// Store active FFmpeg processes
const activeProcesses = new Map();

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

// ✨ OPTIMIZED ZERO-LATENCY FFmpeg Configuration
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

    // 🚀 ULTRA LOW LATENCY SETTINGS
    const ffmpegArgs = [
      // Input optimization
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
      
      // Video encoding - ULTRA FAST for low latency
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
      '-g', '30',  // GOP size = FPS
      '-keyint_min', '30',
      '-sc_threshold', '0',
      
      // Audio encoding
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ac', '2',
      '-ar', '44100',
      
      // HLS output - MINIMUM LATENCY
      '-f', 'hls',
      '-hls_time', '1',  // 1 second segments (was 2)
      '-hls_list_size', '3',  // Only keep 3 segments
      '-hls_flags', 'delete_segments+append_list+independent_segments',
      '-hls_segment_type', 'mpegts',
      '-hls_segment_filename', path.join(streamDir, 'segment_%03d.ts'),
      '-start_number', '1',
      '-avoid_negative_ts', 'make_zero',
      '-y',  // Overwrite output
      outputPath
    ];

    logger.info(`Starting ZERO-LATENCY FFmpeg for stream ${streamId}`);
    logger.info(`RTSP URL: ${rtspUrl}`);
    logger.info(`Output: ${outputPath}`);
    logger.debug(`FFmpeg args: ${ffmpegArgs.join(' ')}`);

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

    // Store process info
    activeProcesses.set(streamId, {
      process: ffmpegProcess,
      pid: ffmpegProcess.pid,
      startTime: new Date(),
      rtspUrl: rtspUrl
    });

    // Handle stdout
    ffmpegProcess.stdout.on('data', (data) => {
      logger.debug(`FFmpeg stdout [${streamId}]: ${data}`);
    });

    // Handle stderr (FFmpeg outputs progress info to stderr)
    let errorBuffer = '';
    ffmpegProcess.stderr.on('data', (data) => {
      const message = data.toString();
      errorBuffer += message;
      
      // Log important messages
      if (message.includes('error') || message.includes('Error')) {
        logger.error(`FFmpeg error [${streamId}]: ${message}`);
      } else if (message.includes('speed=')) {
        // Log encoding speed every few seconds
        const speedMatch = message.match(/speed=\s*([\d.]+)x/);
        if (speedMatch) {
          logger.debug(`FFmpeg [${streamId}] encoding speed: ${speedMatch[1]}x`);
        }
      }
    });

    // Handle process exit
    ffmpegProcess.on('close', (code) => {
      logger.warn(`FFmpeg process [${streamId}] exited with code ${code}`);
      activeProcesses.delete(streamId);
      
      // Log last error if crashed
      if (code !== 0 && errorBuffer) {
        logger.error(`FFmpeg [${streamId}] last error output: ${errorBuffer.slice(-500)}`);
      }
    });

    // Handle errors
    ffmpegProcess.on('error', (error) => {
      logger.error(`FFmpeg error [${streamId}]:`, error);
      activeProcesses.delete(streamId);
    });

    logger.info(`✅ FFmpeg started successfully for stream ${streamId} (PID: ${ffmpegProcess.pid})`);

    return {
      process: ffmpegProcess,
      pid: ffmpegProcess.pid,
      outputPath: outputPath,
      streamDir: streamDir
    };
  } catch (error) {
    logger.error('Error starting FFmpeg:', error);
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
const stopStreamById = (streamId) => {
  const processInfo = activeProcesses.get(streamId);
  if (processInfo) {
    logger.info(`Stopping stream ${streamId} (PID: ${processInfo.pid})`);
    const result = stopFFmpegProcess(processInfo.pid);
    if (result) {
      activeProcesses.delete(streamId);
    }
    return result;
  }
  logger.warn(`No active process found for stream ${streamId}`);
  return false;
};

// Check if stream file exists
const checkStreamExists = async (streamId) => {
  try {
    const streamPath = path.join(STREAMS_DIR, `stream_${streamId}`, 'stream.m3u8');
    await fs.access(streamPath);
    return true;
  } catch {
    return false;
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
      rtspUrl: info.rtspUrl
    });
  }
  return processes;
};

// Cleanup all streams on shutdown
const cleanupAllStreams = () => {
  logger.info('Cleaning up all active FFmpeg processes...');
  for (const [streamId, info] of activeProcesses.entries()) {
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
  checkStreamExists,
  getActiveProcesses,
  cleanupAllStreams,
  STREAMS_DIR
};