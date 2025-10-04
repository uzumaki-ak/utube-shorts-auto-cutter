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


const clientInfo = CRED.web || CRED.installed;
if (!clientInfo) {
  console.error(
    "❌ credentials.json does not contain 'web' or 'installed' client info"
  );
  process.exit(1);
}

const redirectFromCreds =
  Array.isArray(clientInfo.redirect_uris) && clientInfo.redirect_uris.length
    ? clientInfo.redirect_uris[0]
    : null;

const REDIRECT_URI = redirectFromCreds || process.env.REDIRECT_URI || null;

if (!REDIRECT_URI) {
  console.error(
    "❌ No redirect URI available. Add one to credentials.json (web.redirect_uris) or set REDIRECT_URI in .env"
  );
  process.exit(1);
}

// Debug logs to help diagnose 'missing redirect_uri' errors
console.log("Using client id:", clientInfo.client_id);
console.log(
  "Client redirect_uris from credentials.json:",
  clientInfo.redirect_uris || "[]"
);
console.log("Using redirect URI (final):", REDIRECT_URI);
console.log("process.env.REDIRECT_URI:", process.env.REDIRECT_URI);

// Construct oauth2 client with explicit redirect
const oauth2Client = new google.auth.OAuth2(
  clientInfo.client_id,
  clientInfo.client_secret,
  REDIRECT_URI
);

// For uploading and live chat
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/youtube.upload",
];

const app = express();

app.get("/", (req, res) => {
  // Explicit redirect_uri included here to avoid ambiguity.
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    redirect_uri: REDIRECT_URI,
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
    <p style="color:gray; font-size:12px;">Debug: Using redirect URI: ${REDIRECT_URI}</p>
  `);
});

app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    console.warn("No authorization code received. req.query:", req.query);
    return res.send(" No authorization code received");
  }

  try {
    // if dikkat thn pass redirect_uri explicitly to the token exchange to avoid 'Missing required parameter: redirect_uri'
    const getTokenArgs = {
      code,
      redirect_uri: REDIRECT_URI,
    };

    console.log("Exchanging code for token with args:", {
      hasCode: !!code,
      redirect_uri: REDIRECT_URI,
    });

    // oauth2Client.getToken accepts either (code) or ({ code, redirect_uri }) - we pass the object
    const { tokens } = await oauth2Client.getToken(getTokenArgs);

    const tokenPath = path.join(__dirname, "..", "token.json");
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
    res.send(" Token saved! You can close this window and run: npm start");
    console.log(" token.json created with LIVE CHAT + UPLOAD permissions!");
    process.exit(0);
  } catch (error) {
    console.error("Error getting token:", error);
    // If Google returns an error object, include the message for debugging
    if (error.response && error.response.data) {
      console.error("Token exchange response data:", error.response.data);
    }
    res.send(" Error getting token");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Open http://localhost:${PORT} to authorize BOTH scopes`);
});
