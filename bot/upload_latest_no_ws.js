// // bot/upload_latest_no_ws.js
// // Simple dev flow: find newest file in OBS_RECORDING_PATH, cut last N seconds, upload via uploader/shorts_uploader.js
// const path = require('path');
// const fs = require('fs');
// const { execSync } = require('child_process');
// require('dotenv').config();

// const { handleShorts } = require('../uploader/shorts_uploader');
// const { newestFileInDir } = require('../utils/fs_utils');

// const OBS_DIR = process.env.OBS_RECORDING_PATH || 'C:\\Users\\asnoi\\Videos';
// const TMP_DIR = path.join(__dirname, '..', 'tmp');
// if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

// function cutLastSeconds(obsFilePath, secs = parseInt(process.env.CLIP_SECONDS || '30')) {
//   const out = path.join(TMP_DIR, `clip_${Date.now()}.mp4`);
//   // Use ffmpeg fast trim (copy) - works on most mp4/mkv
//   const cmd = `ffmpeg -y -sseof -${secs} -i "${obsFilePath}" -t ${secs} -c copy "${out}"`;
//   console.log('Executing:', cmd);
//   execSync(cmd, { stdio: 'inherit' });
//   return out;
// }

// async function run() {
//   try {
//     console.log('Finding newest file in', OBS_DIR);
//     const newest = newestFileInDir(OBS_DIR);
//     if (!newest) {
//       console.error('No recording files found in', OBS_DIR);
//       process.exit(1);
//     }
//     console.log('Newest file:', newest);

//     // Optional: wait a bit if the file is still being written (tweak if needed)
//     // If OBS is actively writing, ffmpeg -sseof may still work, but if it fails try a short delay:
//     // await new Promise(r => setTimeout(r, 1500));

//     const clip = cutLastSeconds(newest, parseInt(process.env.CLIP_SECONDS || '30'));
//     console.log('Created clip:', clip);

//     // Upload via existing uploader handler
//     const res = await handleShorts({ clipPath: clip, context: 'Dev highlight' });
//     if (res.success) {
//       console.log('Uploaded successfully:', res.url);
//     } else {
//       console.error('Upload failed:', res.error);
//     }
//   } catch (err) {
//     console.error('Error in upload_latest_no_ws:', err && err.message ? err.message : err);
//     process.exit(1);
//   }
// }

// if (require.main === module) run();
// module.exports = { run };

//!new
const { handleShorts } = require("../uploader/shorts_uploader");
const { newestFileInDir } = require("../utils/fs_utils");
require("dotenv").config();

async function uploadLatestClip(seconds = 30, context = "Live Clip") {
  try {
    const OBS_DIR = process.env.OBS_RECORDING_PATH;
    if (!OBS_DIR) {
      throw new Error("OBS_RECORDING_PATH not set in .env");
    }

    console.log(` Looking for newest file in: ${OBS_DIR}`);
    const newest = newestFileInDir(OBS_DIR);
    if (!newest) {
      throw new Error("No recording files found in OBS directory");
    }

    console.log(` Found file: ${newest}`);
    console.log(` Cutting last ${seconds} seconds...`);

    const result = await handleShorts({
      obsFilePath: newest,
      secs: seconds,
      context: context,
    });

    if (result.success) {
      console.log(` Upload successful: ${result.url}`);
      return result;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error(" Upload process failed:", error.message);
    return { success: false, error: error.message };
  }
}

// If run directly
if (require.main === module) {
  (async () => {
    const seconds = parseInt(process.env.CLIP_SECONDS) || 30;
    await uploadLatestClip(seconds, "Test Clip");
  })();
}

module.exports = { uploadLatestClip };
