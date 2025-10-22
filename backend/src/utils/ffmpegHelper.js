const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// Path ke folder streams output
const STREAMS_DIR = path.join(__dirname, '../../../streams');

// Fungsi buat ensure folder exists
const ensureStreamDir = async (streamId) => {
  const streamDir = path.join(STREAMS_DIR, `stream_${streamId}`);
  try {
    await fs.mkdir(streamDir, { recursive: true });
    return streamDir;
  } catch (error) {
    console.error('Error creating stream directory:', error);
    throw error;
  }
};

// Start FFmpeg process untuk convert RTSP ke HLS
const startFFmpegProcess = async (streamId, rtspUrl) => {
  try {
    const streamDir = await ensureStreamDir(streamId);
    const outputPath = path.join(streamDir, 'stream.m3u8');

    // FFmpeg command
    const ffmpegArgs = [
      '-rtsp_transport', 'tcp',
      '-i', rtspUrl,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '5',
      '-hls_flags', 'delete_segments+append_list',
      '-hls_segment_filename', path.join(streamDir, 'segment_%03d.ts'),
      outputPath
    ];

    console.log(`Starting FFmpeg for stream ${streamId}`);
    console.log(`RTSP URL: ${rtspUrl}`);
    console.log(`Output: ${outputPath}`);

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

    // Handle stdout
    ffmpegProcess.stdout.on('data', (data) => {
      console.log(`FFmpeg stdout [${streamId}]: ${data}`);
    });

    // Handle stderr (FFmpeg outputs progress info to stderr)
    ffmpegProcess.stderr.on('data', (data) => {
      // Uncomment untuk debug
      // console.log(`FFmpeg stderr [${streamId}]: ${data}`);
    });

    // Handle process exit
    ffmpegProcess.on('close', (code) => {
      console.log(`FFmpeg process [${streamId}] exited with code ${code}`);
    });

    // Handle errors
    ffmpegProcess.on('error', (error) => {
      console.error(`FFmpeg error [${streamId}]:`, error);
    });

    return {
      process: ffmpegProcess,
      pid: ffmpegProcess.pid,
      outputPath: outputPath,
      streamDir: streamDir
    };
  } catch (error) {
    console.error('Error starting FFmpeg:', error);
    throw error;
  }
};

// Stop FFmpeg process
const stopFFmpegProcess = (processId) => {
  try {
    if (processId) {
      process.kill(processId, 'SIGTERM');
      console.log(`Stopped FFmpeg process: ${processId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error stopping FFmpeg:', error);
    return false;
  }
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

module.exports = {
  startFFmpegProcess,
  stopFFmpegProcess,
  checkStreamExists,
  STREAMS_DIR
};