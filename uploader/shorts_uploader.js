// // uploader/shorts_uploader.js
// const fs = require("fs");
// const path = require("path");
// const { execSync } = require("child_process");
// const { google } = require("googleapis");
// require("dotenv").config();

// const ROOT = path.join(__dirname, "..");
// const CRED_PATH = path.join(ROOT, "credentials.json");
// const TOKEN_PATH = path.join(ROOT, "token.json");

// if (!fs.existsSync(CRED_PATH))
//   console.warn("Warning: credentials.json missing in project root");
// if (!fs.existsSync(TOKEN_PATH))
//   console.warn(
//     "Warning: token.json missing in project root — run get_token.js first"
//   );

// const CRED = fs.existsSync(CRED_PATH)
//   ? JSON.parse(fs.readFileSync(CRED_PATH))
//   : null;
// const TOKEN = fs.existsSync(TOKEN_PATH)
//   ? JSON.parse(fs.readFileSync(TOKEN_PATH))
//   : null;

// const clientInfo = CRED ? CRED.installed || CRED.web : null;
// if (!clientInfo)
//   console.warn(
//     "No client info — uploads will fail until credentials.json is added"
//   );

// const oauth2Client = clientInfo
//   ? new google.auth.OAuth2(
//       clientInfo.client_id,
//       clientInfo.client_secret,
//       process.env.REDIRECT_URI
//     )
//   : null;
// if (TOKEN && oauth2Client) oauth2Client.setCredentials(TOKEN);
// const youtube = oauth2Client
//   ? google.youtube({ version: "v3", auth: oauth2Client })
//   : null;

// const WORK_DIR = path.join(ROOT, "tmp");
// if (!fs.existsSync(WORK_DIR)) fs.mkdirSync(WORK_DIR);

// function generateMeta(context) {
//   const now = new Date();
//   const iso = now.toISOString().replace("T", " ").split(".")[0];
//   const title = context ? `${context} • ${iso}` : `Live Clip • ${iso}`;
//   const desc = `Auto-uploaded short from live stream at ${iso}`;
//   const tags = ["live", "clip", "shorts"];
//   return { title, desc, tags };
// }

// function cutLastSecondsFromFile(
//   obsFilePath,
//   secs = parseInt(process.env.CLIP_SECONDS || "30")
// ) {
//   const out = path.join(WORK_DIR, `clip_${Date.now()}.mp4`);
//   const cmd = `ffmpeg -y -sseof -${secs} -i "${obsFilePath}" -t ${secs} -c copy "${out}"`;
//   console.log("Running:", cmd);
//   execSync(cmd, { stdio: "inherit" });
//   return out;
// }

// async function uploadToYouTube(filePath, meta) {
//   if (!youtube)
//     throw new Error(
//       "YouTube client not initialized. Ensure credentials.json and token.json exist."
//     );
//   const res = await youtube.videos.insert(
//     {
//       part: ["snippet", "status"],
//       requestBody: {
//         snippet: {
//           title: meta.title,
//           description: meta.desc,
//           tags: meta.tags,
//           categoryId: "22",
//         },
//         status: { privacyStatus: "unlisted" },
//       },
//       media: { body: fs.createReadStream(filePath) },
//     },
//     { maxBodyLength: 1024 * 1024 * 1024 }
//   );
//   return res.data;
// }

// // exported handler
// async function handleShorts({
//   clipPath = null,
//   obsFilePath = null,
//   secs = null,
//   context = null,
// } = {}) {
//   try {
//     if (!clipPath) {
//       if (!obsFilePath)
//         throw new Error("Either clipPath or obsFilePath required");
//       clipPath = cutLastSecondsFromFile(obsFilePath, secs || undefined);
//     }
//     const meta = generateMeta(context);
//     console.log("Uploading file:", clipPath, " with meta:", meta);
//     const uploaded = await uploadToYouTube(clipPath, meta);
//     const url = `https://youtu.be/${uploaded.id}`;
//     console.log("Uploaded:", url);
//     return { success: true, url, id: uploaded.id };
//   } catch (err) {
//     console.error("handleShorts error", err);
//     return { success: false, error: (err && err.message) || String(err) };
//   }
// }

// module.exports = { handleShorts };

// // If run directly, run a quick test (edit obsFilePath or use .env)
// if (require.main === module) {
//   (async () => {
//     const OBS_FILE =
//       process.env.OBS_RECORDING_PATH ||
//       "C:\\path\\to\\your\\current_stream.mkv";
//     const res = await handleShorts({
//       obsFilePath: OBS_FILE,
//       secs: parseInt(process.env.CLIP_SECONDS || "30"),
//       context: "Dev test",
//     });
//     console.log(res);
//   })();
// }

////!new
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { google } = require("googleapis");
require("dotenv").config();

const ROOT = path.join(__dirname, "..");
const CRED_PATH = path.join(ROOT, "credentials.json");
const TOKEN_PATH = path.join(ROOT, "token.json");

if (!fs.existsSync(CRED_PATH))
  console.warn("Warning: credentials.json missing in project root");
if (!fs.existsSync(TOKEN_PATH))
  console.warn(
    "Warning: token.json missing in project root — run get_token.js first"
  );

const CRED = fs.existsSync(CRED_PATH)
  ? JSON.parse(fs.readFileSync(CRED_PATH))
  : null;
const TOKEN = fs.existsSync(TOKEN_PATH)
  ? JSON.parse(fs.readFileSync(TOKEN_PATH))
  : null;

const clientInfo = CRED ? CRED.installed || CRED.web : null;
if (!clientInfo)
  console.warn(
    "No client info — uploads will fail until credentials.json is added"
  );

const oauth2Client = clientInfo
  ? new google.auth.OAuth2(
      clientInfo.client_id,
      clientInfo.client_secret,
      process.env.REDIRECT_URI
    )
  : null;
if (TOKEN && oauth2Client) oauth2Client.setCredentials(TOKEN);
const youtube = oauth2Client
  ? google.youtube({ version: "v3", auth: oauth2Client })
  : null;

const WORK_DIR = path.join(ROOT, "tmp");
if (!fs.existsSync(WORK_DIR)) fs.mkdirSync(WORK_DIR);

function generateMeta(context) {
  const now = new Date();
  const iso = now.toISOString().replace("T", " ").split(".")[0];
  const title = context ? `${context} • ${iso}` : `Live Clip • ${iso}`;
  const desc = `Auto-uploaded short from live stream at ${iso}`;
  const tags = ["live", "clip", "shorts"];
  return { title, desc, tags };
}

function cutLastSecondsFromFile(
  obsFilePath,
  secs = parseInt(process.env.CLIP_SECONDS || "30")
) {
  const out = path.join(WORK_DIR, `clip_${Date.now()}.mp4`);
  const cmd = `ffmpeg -y -sseof -${secs} -i "${obsFilePath}" -t ${secs} -c copy "${out}"`;
  console.log("Running:", cmd);
  execSync(cmd, { stdio: "inherit" });
  return out;
}

async function uploadToYouTube(filePath, meta) {
  if (!youtube)
    throw new Error(
      "YouTube client not initialized. Ensure credentials.json and token.json exist."
    );
  const res = await youtube.videos.insert(
    {
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: meta.title,
          description: meta.desc,
          tags: meta.tags,
          categoryId: "22",
        },
        status: { privacyStatus: "unlisted" },
      },
      media: { body: fs.createReadStream(filePath) },
    },
    { maxBodyLength: 1024 * 1024 * 1024 }
  );
  return res.data;
}

// exported handler
async function handleShorts({
  clipPath = null,
  obsFilePath = null,
  secs = null,
  context = null,
} = {}) {
  try {
    if (!clipPath) {
      if (!obsFilePath)
        throw new Error("Either clipPath or obsFilePath required");
      clipPath = cutLastSecondsFromFile(obsFilePath, secs || undefined);
    }
    const meta = generateMeta(context);
    console.log("Uploading file:", clipPath, " with meta:", meta);
    const uploaded = await uploadToYouTube(clipPath, meta);
    const url = `https://youtu.be/${uploaded.id}`;
    console.log("Uploaded:", url);
    return { success: true, url, id: uploaded.id };
  } catch (err) {
    console.error("handleShorts error", err);
    return { success: false, error: (err && err.message) || String(err) };
  }
}

module.exports = { handleShorts };

// If run directly, run a quick test (edit obsFilePath or use .env)
if (require.main === module) {
  (async () => {
    const OBS_FILE = process.env.OBS_RECORDING_PATH;
    if (!OBS_FILE) {
      console.error(" Set OBS_RECORDING_PATH in .env");
      process.exit(1);
    }
    const res = await handleShorts({
      obsFilePath: OBS_FILE,
      secs: parseInt(process.env.CLIP_SECONDS || "30"),
      context: "Dev test",
    });
    console.log(res);
  })();
}
