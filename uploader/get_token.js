

///!new

const fs = require("fs");
const path = require("path");
const express = require("express");
const { google } = require("googleapis");
require("dotenv").config();

const CRED_PATH = path.join(__dirname, "..", "credentials.json");
if (!fs.existsSync(CRED_PATH)) {
  console.error("❌ credentials.json not found. Put it in project root");
  process.exit(1);
}

const CRED = JSON.parse(fs.readFileSync(CRED_PATH));
const clientInfo = CRED.installed || CRED.web;

const oauth2Client = new google.auth.OAuth2(
  clientInfo.client_id,
  clientInfo.client_secret,
  process.env.REDIRECT_URI
);

// For uploading
// For live chat
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/youtube.upload",
];

const app = express();

app.get("/", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
  res.send(`
    <h1>YouTube Auth - REQUIRED SCOPES</h1>
    <p><strong>Scopes being requested:</strong></p>
    <ul>
      <li>YouTube Live Chat access (read/send messages)</li>
      <li>YouTube Upload access</li>
    </ul>
    <a href="${authUrl}" style="font-size: 20px; color: red;"> CLICK HERE TO AUTHORIZE BOTH SCOPES </a>
    <p>After authorization, token.json will be created automatically.</p>
  `);
});

app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.send(" No authorization code received");
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    fs.writeFileSync(
      path.join(__dirname, "..", "token.json"),
      JSON.stringify(tokens, null, 2)
    );
    res.send(" Token saved! You can close this window and run: npm start");
    console.log(" token.json created with LIVE CHAT + UPLOAD permissions!");
    process.exit(0);
  } catch (error) {
    console.error("Error getting token:", error);
    res.send(" Error getting token");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Open http://localhost:${PORT} to authorize BOTH scopes`);
});
