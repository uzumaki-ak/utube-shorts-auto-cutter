
// This file is a simple stub showing how to call handleShorts when you detect a !shorts command
const { handleShorts } = require("../uploader/shorts_uploader");
const { saveReplay } = require("../obs_control/obs_save_replay");
const { newestFileInDir } = require("../utils/fs_utils");
require("dotenv").config();

async function onShortsCommand() {
  try {
    // If using Replay Buffer: tell OBS to save the replay first
    console.log("Triggering OBS SaveReplayBuffer...");
    await saveReplay();
    // wait a small moment for file to land
    await new Promise((r) => setTimeout(r, 1500));

    // find newest file in OBS recording dir
    const OBS_DIR =
      process.env.OBS_RECORDING_PATH || "C:/Users/asnoi/Videos/OBS";
    const newest = newestFileInDir(OBS_DIR);
    if (!newest) return console.error("No recording file found in", OBS_DIR);
    console.log("Found newest recorded file:", newest);

    // Call uploader
    const res = await handleShorts({
      clipPath: newest,
      context: "Viewer highlight",
    });
    if (res.success) console.log("Uploaded URL:", res.url);
    else console.error("Upload failed:", res.error);
  } catch (err) {
    console.error("onShortsCommand error", err);
  }
}

// Simulate a command trigger for local dev
if (require.main === module) {
  onShortsCommand();
}
