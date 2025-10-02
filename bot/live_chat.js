const { google } = require("googleapis");
const { uploadLatestClip } = require("./upload_latest_no_ws");
require("dotenv").config();

class YouTubeLiveBot {
  constructor() {
    this.auth = null;
    this.youtube = null;
    this.liveChatId = null;
    this.nextPageToken = null;
    this.isRunning = false;
  }

  async initialize() {
    try {
      console.log(" Initializing YouTube client...");

      // Loadinf the creds
      const credentials = require("../credentials.json");
      const tokens = require("../token.json");

      const clientInfo = credentials.installed || credentials.web;
      this.auth = new google.auth.OAuth2(
        clientInfo.client_id,
        clientInfo.client_secret,
        process.env.REDIRECT_URI
      );

      this.auth.setCredentials(tokens);
      this.youtube = google.youtube({ version: "v3", auth: this.auth });

      console.log(" YouTube client initialized");
      return true;
    } catch (error) {
      console.error(" Failed to initialize YouTube client:", error.message);
      return false;
    }
  }

  async findActiveLiveStream() {
    try {
      console.log(" Searching for active live stream...");

      const response = await this.youtube.liveBroadcasts.list({
        part: ["snippet", "status"],
        broadcastStatus: "active",
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error("No active live stream found");
      }

      const broadcast = response.data.items[0];
      this.liveChatId = broadcast.snippet.liveChatId;

      console.log(` Found live stream: "${broadcast.snippet.title}"`);
      console.log(` Live Chat ID: ${this.liveChatId}`);

      return this.liveChatId;
    } catch (error) {
      console.error(" Error finding live stream:", error.message);
      throw error;
    }
  }

  async processChatMessage(message) {
    const text = message.snippet.displayMessage;
    const author = message.authorDetails.displayName;

    console.log(` ${author}: ${text}`);

    // cking  for !shorts command
    if (text.startsWith("!shorts")) {
      const seconds =
        parseInt(text.replace("!shorts", "").trim()) ||
        parseInt(process.env.CLIP_SECONDS) ||
        30;

      console.log(
        ` !shorts command detected from ${author} for ${seconds} seconds`
      );

      try {
        // Process in background so ct dont get block
        setTimeout(async () => {
          try {
            const result = await uploadLatestClip(seconds, `Clip by ${author}`);

            if (result.success) {
              console.log(` Clip uploaded: ${result.url}`);
              // Post back to chat
              await this.postToChat(` Shorts created: ${result.url}`);
            } else {
              console.error(` Failed to upload clip: ${result.error}`);
              await this.postToChat(` Failed to create clip: ${result.error}`);
            }
          } catch (error) {
            console.error(" Error processing clip:", error);
            await this.postToChat(`Error: ${error.message}`);
          }
        }, 100);
      } catch (error) {
        console.error(" Error processing shorts command:", error);
      }
    }
  }

  async postToChat(messageText) {
    if (!this.liveChatId) return;

    try {
      await this.youtube.liveChatMessages.insert({
        part: "snippet",
        requestBody: {
          snippet: {
            liveChatId: this.liveChatId,
            type: "textMessageEvent",
            textMessageDetails: {
              messageText: messageText,
            },
          },
        },
      });
      console.log(` Posted to chat: ${messageText}`);
    } catch (error) {
      console.error(" Failed to post to chat:", error.message);
    }
  }

  async startListening() {
    try {
      if (!this.liveChatId) {
        await this.findActiveLiveStream();
      }

      console.log("\n Started listening to live chat...");
      console.log(" Commands:");
      console.log("   !shorts30 - Create 30 second clip");
      console.log("   !shorts15 - Create 15 second clip");
      console.log("   !shorts60 - Create 60 second clip\n");

      this.isRunning = true;
      await this.pollChat();
    } catch (error) {
      console.error("❌ Failed to start chat listener:", error.message);
      // retryiafter 30secs
      setTimeout(() => this.startListening(), 30000);
    }
  }

  async pollChat(pageToken = null) {
    if (!this.isRunning) return;

    try {
      const response = await this.youtube.liveChatMessages.list({
        liveChatId: this.liveChatId,
        part: ["snippet", "authorDetails"],
        pageToken: pageToken,
      });

      const messages = response.data.items;
      this.nextPageToken = response.data.nextPageToken;

      //  new msgs processing
      for (const message of messages) {
        await this.processChatMessage(message);
      }

      // Poll again after some interval
      const pollingInterval = response.data.pollingIntervalMillis || 5000;
      setTimeout(() => this.pollChat(this.nextPageToken), pollingInterval);
    } catch (error) {
      console.error(" Error polling chat:", error.message);
      // trung after 10 sec if not work after 10 seconds on error
      setTimeout(() => this.pollChat(pageToken), 10000);
    }
  }

  stop() {
    this.isRunning = false;
    console.log(" Chat listener stopped");
  }
}

//  starting the boptt
(async () => {
  const bot = new YouTubeLiveBot();

  console.log(" YouTube Live Shorts Bot Starting...");
  console.log("=======================================");

  if (await bot.initialize()) {
    await bot.startListening();
  } else {
    console.log(" Bot failed to start");
    process.exit(1);
  }
})();

//  shutdown
process.on("SIGINT", () => {
  console.log("\n Shutting down bot...");
  process.exit(0);
});
