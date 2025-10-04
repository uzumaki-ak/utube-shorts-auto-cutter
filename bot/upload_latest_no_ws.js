const { handleShorts } = require("../uploader/shorts_uploader");
const { newestFileInDir } = require("../utils/fs_utils");
require("dotenv").config();

async function uploadLatestClip(seconds = 30, context = "Live Clip") {
  try {
    const OBS_DIR = process.env.OBS_RECORDING_PATH;
    if (!OBS_DIR) {
      throw new Error("OBS_RECORDING_PATH not set in .env");
    }

    console.log(`📁 Looking for newest file in: ${OBS_DIR}`);
    const newest = newestFileInDir(OBS_DIR);
    if (!newest) {
      throw new Error("No recording files found in OBS directory");
    }

    console.log(`🎬 Found file: ${newest}`);
    console.log(`✂️ Cutting last ${seconds} seconds...`);

    // Use OBS Replay Buffer for accurate timing
    const { saveReplay } = require("../obs_control/obs_save_replay");
    console.log("💾 Saving replay buffer for accurate timing...");
    await saveReplay();

    // Wait for replay to save
    await new Promise((r) => setTimeout(r, 2000));

    // Find the NEWEST file after saving replay
    const replayFile = newestFileInDir(OBS_DIR);
    if (!replayFile) {
      throw new Error("Replay file not found after saving");
    }

    console.log(`🎯 Using replay file: ${replayFile}`);

    const result = await handleShorts({
      obsFilePath: replayFile,
      secs: seconds,
      context: context,
      makeShort: true,
    });

    if (result.success) {
      console.log(`✅ Upload successful: ${result.url}`);
      console.log(`🤖 AI Title: ${result.aiTitle}`);
      if (result.transcript) {
        console.log(
          `📝 Transcript snippet: ${result.transcript.substring(0, 100)}...`
        );
      }
      return result;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("❌ Upload process failed:", error.message);
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
