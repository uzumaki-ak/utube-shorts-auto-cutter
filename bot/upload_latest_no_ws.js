

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
