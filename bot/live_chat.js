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
    this.allowedUsers = process.env.ALLOWED_USERS
      ? process.env.ALLOWED_USERS.split(",").map((u) => u.trim())
      : [];
  }

  async initialize() {
    try {
      console.log("🔑 Initializing YouTube client...");

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

      console.log("✅ YouTube client initialized");
      console.log(`🔒 Allowed users: ${this.allowedUsers.join(", ")}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize YouTube client:", error.message);
      return false;
    }
  }

  async findActiveLiveStream() {
    try {
      console.log("🔍 Searching for active live stream...");

      const response = await this.youtube.liveBroadcasts.list({
        part: ["snippet", "status"],
        broadcastStatus: "active",
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error("No active live stream found");
      }

      const broadcast = response.data.items[0];
      this.liveChatId = broadcast.snippet.liveChatId;

      console.log(`🎥 Found live stream: "${broadcast.snippet.title}"`);
      console.log(`💬 Live Chat ID: ${this.liveChatId}`);

      return this.liveChatId;
    } catch (error) {
      console.error("❌ Error finding live stream:", error.message);
      throw error;
    }
  }

  // 🔒 CHECK IF USER IS ALLOWED
  isUserAllowed(authorDetails) {
    const username = authorDetails.displayName;
    const channelId = authorDetails.channelId;

    // Allow streamer (chat owner) automatically
    if (authorDetails.isChatOwner) {
      console.log(`✅ Streamer detected: ${username}`);
      return true;
    }

    // Allow moderators
    if (authorDetails.isChatModerator) {
      console.log(`✅ Moderator detected: ${username}`);
      return true;
    }

    // Check allowed users list
    const isAllowed = this.allowedUsers.some(
      (allowedUser) =>
        username.toLowerCase().includes(allowedUser.toLowerCase()) ||
        channelId === allowedUser
    );

    if (!isAllowed) {
      console.log(`🚫 User not allowed: ${username}`);
    }

    return isAllowed;
  }

  async processChatMessage(message) {
    const text = message.snippet.displayMessage;
    const author = message.authorDetails.displayName;

    console.log(`💬 ${author}: ${text}`);

    // Check for !shorts command
    if (text.startsWith("!shorts")) {
      // 🔒 SECURITY: Check if user is allowed
      if (!this.isUserAllowed(message.authorDetails)) {
        await this.postToChat(
          `❌ ${author}, you are not authorized to use this command.`
        );
        return;
      }

      const seconds =
        parseInt(text.replace("!shorts", "").trim()) ||
        parseInt(process.env.CLIP_SECONDS) ||
        30;

      console.log(
        `🚀 !shorts command detected from ${author} for ${seconds} seconds`
      );

      try {
        // Process in background
        setTimeout(async () => {
          try {
            // 🎯 Get stream context for better titles
            const streamInfo = await this.getStreamInfo();
            const context = `${streamInfo.title} - Clip by ${author}`;

            const result = await uploadLatestClip(seconds, context);

            if (result.success) {
              console.log(`✅ Clip uploaded: ${result.url}`);
              console.log(`🤖 AI Title: ${result.aiTitle}`);
              await this.postToChat(`🎬 ${result.aiTitle} - ${result.url}`);
            } else {
              console.error(`❌ Failed to upload clip: ${result.error}`);
              await this.postToChat(
                `❌ Failed to create clip: ${result.error}`
              );
            }
          } catch (error) {
            console.error("❌ Error processing clip:", error);
            await this.postToChat(`❌ Error: ${error.message}`);
          }
        }, 100);
      } catch (error) {
        console.error("❌ Error processing shorts command:", error);
      }
    }
  }

  async getStreamInfo() {
    try {
      const response = await this.youtube.liveBroadcasts.list({
        part: ["snippet"],
        broadcastStatus: "active",
      });

      if (response.data.items && response.data.items.length > 0) {
        return {
          title: response.data.items[0].snippet.title,
          description: response.data.items[0].snippet.description,
        };
      }
    } catch (error) {
      console.error("❌ Error getting stream info:", error.message);
    }

    return { title: "Live Stream", description: "" };
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
      console.log(`📨 Posted to chat: ${messageText}`);
    } catch (error) {
      console.error("❌ Failed to post to chat:", error.message);
    }
  }

  async startListening() {
    try {
      if (!this.liveChatId) {
        await this.findActiveLiveStream();
      }

      console.log("\n👂 Started listening to live chat...");
      console.log("💡 Commands:");
      console.log("   !shorts30 - Create 30 second clip");
      console.log("   !shorts15 - Create 15 second clip");
      console.log("   !shorts60 - Create 60 second clip");
      console.log(
        `🔒 Restricted to: ${this.allowedUsers.join(
          ", "
        )} + streamer + moderators\n`
      );

      this.isRunning = true;
      await this.pollChat();
    } catch (error) {
      console.error("❌ Failed to start chat listener:", error.message);
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

      for (const message of messages) {
        await this.processChatMessage(message);
      }

      const pollingInterval = response.data.pollingIntervalMillis || 5000;
      setTimeout(() => this.pollChat(this.nextPageToken), pollingInterval);
    } catch (error) {
      console.error("❌ Error polling chat:", error.message);
      setTimeout(() => this.pollChat(pageToken), 10000);
    }
  }

  stop() {
    this.isRunning = false;
    console.log("🛑 Chat listener stopped");
  }
}

// 🚀 START THE BOT
(async () => {
  const bot = new YouTubeLiveBot();

  console.log("🤖 YouTube Live Shorts Bot Starting...");
  console.log("=======================================");

  if (await bot.initialize()) {
    await bot.startListening();
  } else {
    console.log("❌ Bot failed to start");
    process.exit(1);
  }
})();

process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down bot...");
  process.exit(0);
});
