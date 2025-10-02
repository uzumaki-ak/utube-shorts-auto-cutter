

//!new
const OBSWebSocket = require("obs-websocket-js").default;
require("dotenv").config();

const obs = new OBSWebSocket();

async function saveReplay() {
  const host = process.env.OBS_WEBSOCKET_HOST || "localhost:4455";
  const password = process.env.OBS_WEBSOCKET_PASSWORD || "";

  try {
    console.log(`🔌 Connecting to OBS at ${host}...`);

  
    await obs.connect({
      address: `ws://${host}`,
      password: password,
    });

    console.log(" Connected to OBS");

    // stat reply bufer if n't running
    try {
      await obs.call("StartReplayBuffer");
      console.log(" Started replay buffer");
    } catch (e) {
      console.log("ℹ Replay buffer already running or not supported");
    }

    // sving  replay
    await obs.call("SaveReplayBuffer");
    console.log(
      "💾 SaveReplayBuffer called - OBS should save file to recording path"
    );

    await obs.disconnect();
    console.log(" Replay saved successfully");
  } catch (err) {
    console.error(" OBS control error:", err.message);
    try {
      await obs.disconnect();
    } catch (e) {}
    process.exit(1);
  }
}

if (require.main === module) {
  saveReplay();
}

module.exports = { saveReplay };
