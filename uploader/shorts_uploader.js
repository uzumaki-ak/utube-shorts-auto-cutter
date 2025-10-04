const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");
const { google } = require("googleapis");
require("dotenv").config();

const ROOT = path.join(__dirname, "..");
const CRED_PATH = path.join(ROOT, "credentials.json");
const TOKEN_PATH = path.join(ROOT, "token.json");

// Credentials setup
if (!fs.existsSync(CRED_PATH)) console.warn("⚠️ credentials.json missing");
if (!fs.existsSync(TOKEN_PATH)) console.warn("⚠️ token.json missing");

const CRED = fs.existsSync(CRED_PATH)
  ? JSON.parse(fs.readFileSync(CRED_PATH))
  : null;
const TOKEN = fs.existsSync(TOKEN_PATH)
  ? JSON.parse(fs.readFileSync(TOKEN_PATH))
  : null;

const clientInfo = CRED ? CRED.installed || CRED.web : null;
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
if (!fs.existsSync(WORK_DIR)) fs.mkdirSync(WORK_DIR, { recursive: true });

// RUNDING PY SCRPT
function runPythonScript(scriptName, args) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, "..", "python", scriptName);
    const pythonProcess = spawn("python", [pythonScript, ...args]);

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      const output = data.toString();
      stdout += output;
      // LogGING  Python output for debugging
      if (output.trim() && !output.startsWith("{") && !output.startsWith("[")) {
        console.log(`[Python] ${output.trim()}`);
      }
    });

    pythonProcess.stderr.on("data", (data) => {
      const error = data.toString();
      stderr += error;
      console.error(`[Python Error] ${error.trim()}`);
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        try {
          if (stdout.trim()) {
            resolve(JSON.parse(stdout));
          } else {
            resolve({});
          }
        } catch (e) {
          console.error(`[Python] JSON parse failed: ${e.message}`);
          resolve({});
        }
      } else {
        console.error(`[Python] Script failed with code ${code}: ${stderr}`);
        reject(new Error(`Python script failed: ${stderr}`));
      }
    });
  });
}
//  TRANSCRIBE VIDEO WITH WHISPER
async function transcribeVideo(videoPath) {
  try {
    console.log("🎯 Transcribing video with Whisper...");
    const result = await runPythonScript("transcribe.py", [videoPath]);
    return result;
  } catch (error) {
    console.error("❌ Transcription failed:", error.message);
    return null;
  }
}

//  GENERATE AI TITLE
async function generateAITitle(transcript) {
  try {
    console.log("🤖 Generating AI title and hashtags...");
    const args = [transcript, process.env.EURi_API_KEY];
    if (process.env.GEMINI_API_KEY) {
      args.push(process.env.GEMINI_API_KEY);
    }

    const result = await runPythonScript("generate_title.py", args);
    return result;
  } catch (error) {
    console.error("❌ AI title generation failed:", error.message);
    return null;
  }
}

//  GENERATE META WITH AI
async function generateMetaWithAI(videoPath, context) {
  try {
    // Step 1: Transcribe video
    const transcription = await transcribeVideo(videoPath);

    if (!transcription || !transcription.transcript) {
      throw new Error("Transcription failed");
    }

    console.log(
      "📝 Transcript:",
      transcription.transcript.substring(0, 200) + "..."
    );

    // Step 2: Generate AI title
    const aiData = await generateAITitle(transcription.transcript);

    const title = aiData?.title || `🎬 ${context}`;
    const hashtags = aiData?.hashtags || "#shorts #live #viral";
    const description =
      aiData?.description || `Auto-generated Short: ${context}`;

    return {
      title: title.length > 60 ? title.substring(0, 57) + "..." : title,
      desc: `${description}\n\n${hashtags}`,
      tags: hashtags
        .replace(/#/g, "")
        .split(" ")
        .filter((tag) => tag.length > 0),
      transcript: transcription.transcript,
      captions: transcription.captions,
    };
  } catch (error) {
    console.error(
      "❌ AI meta generation failed, using fallback:",
      error.message
    );
    return generateMetaFallback(context);
  }
}

function generateMetaFallback(context) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const title = `🎬 ${context} - ${timeStr}`;
  const desc = `Auto-generated Short from live stream\n\n${context}\n\n#shorts #live #viral #trending`;
  const tags = ["shorts", "live", "viral", "trending", "clip"];

  return { title, desc, tags };
}

//  ZOOMED CROP FOR SHORTS (9:16 with zoom effect)
function convertToShorts(inputPath, captions = null) {
  const shortPath = path.join(WORK_DIR, `short_${Date.now()}.mp4`);

  let filterComplex = "";

  if (captions && captions.length > 0) {
    // Create SRT file for captions
    const srtPath = path.join(WORK_DIR, `captions_${Date.now()}.srt`);
    const srtContent = generateSRT(captions);
    fs.writeFileSync(srtPath, srtContent);

    //  ZOOM + CROP + CAPTIONS
    filterComplex = `crop=ih*9/16:ih:iw/2-ih*9/32:0,scale=1080:1920,subtitles='${srtPath}':force_style='Fontname=Arial,Fontsize=24,PrimaryColour=&H00FFFF,OutlineColour=&H000000,Outline=1,Bold=1'`;
  } else {
    //  ZOOM + CROP only
    filterComplex = `crop=ih*9/16:ih:iw/2-ih*9/32:0,scale=1080:1920`;
  }

  const cmd = `ffmpeg -y -i "${inputPath}" -vf "${filterComplex}" -c:a aac -b:a 128k -movflags +faststart "${shortPath}"`;

  console.log("🎯 Converting to Shorts format with zoom effect...");
  console.log("Running:", cmd);

  try {
    execSync(cmd, { stdio: "inherit" });

    // Clean up SRT file
    if (captions) {
      try {
        fs.unlinkSync(srtPath);
      } catch (e) {}
    }

    return shortPath;
  } catch (error) {
    console.error("❌ Shorts conversion failed:", error.message);
    throw error;
  }
}

//  GENERATE SRT FOR CAPTIONS
function generateSRT(captions) {
  let srtContent = "";

  captions.forEach((caption, index) => {
    const start = formatTime(caption.start);
    const end = formatTime(caption.end);

    srtContent += `${index + 1}\n`;
    srtContent += `${start} --> ${end}\n`;
    srtContent += `${caption.text}\n\n`;
  });

  return srtContent;
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms
    .toString()
    .padStart(3, "0")}`;
}

function cutLastSecondsFromFile(obsFilePath, secs = 30) {
  const out = path.join(WORK_DIR, `clip_${Date.now()}.mp4`);
  const cmd = `ffmpeg -y -sseof -${secs} -i "${obsFilePath}" -t ${secs} -c copy "${out}"`;

  console.log("Running:", cmd);
  try {
    execSync(cmd, { stdio: "inherit" });
    return out;
  } catch (error) {
    console.error("❌ FFmpeg failed:", error.message);
    throw error;
  }
}

async function uploadToYouTube(filePath, meta, isShort = false) {
  if (!youtube) throw new Error("YouTube client not initialized");

  const requestBody = {
    snippet: {
      title: meta.title,
      description: meta.desc,
      tags: meta.tags,
      categoryId: "22",
    },
    status: {
      privacyStatus: "public",
      selfDeclaredMadeForKids: false,
    },
  };

  // Add Shorts indicator
  if (isShort && !requestBody.snippet.title.includes("#Shorts")) {
    requestBody.snippet.title += " #Shorts";
  }

  const res = await youtube.videos.insert(
    {
      part: ["snippet", "status"],
      requestBody: requestBody,
      media: { body: fs.createReadStream(filePath) },
    },
    { maxBodyLength: 1024 * 1024 * 1024 }
  );

  return res.data;
}

//  UPDATED MAIN HANDLER WITH AI
async function handleShorts({
  clipPath = null,
  obsFilePath = null,
  secs = null,
  context = null,
  makeShort = false,
} = {}) {
  try {
    let finalClipPath = clipPath;

    if (!finalClipPath) {
      if (!obsFilePath)
        throw new Error("Either clipPath or obsFilePath required");
      finalClipPath = cutLastSecondsFromFile(obsFilePath, secs || undefined);
    }

    //  GENERATE AI METADATA FIRST (needs the clip path)
    console.log(" Generating AI metadata...");
    const meta = await generateMetaWithAI(finalClipPath, context);

    // Convert to Shorts format if requested
    if (makeShort) {
      console.log(" Converting to YouTube Shorts format...");
      const shortPath = convertToShorts(finalClipPath, meta.captions);

      // Delete original clip, keep Shorts version
      try {
        fs.unlinkSync(finalClipPath);
      } catch (e) {}
      finalClipPath = shortPath;
    }

    console.log("📤 Uploading file:", finalClipPath);
    console.log("📝 AI-Generated Metadata:", meta);

    const uploaded = await uploadToYouTube(finalClipPath, meta, makeShort);
    const url = `https://youtu.be/${uploaded.id}`;

    console.log("✅ Uploaded:", url);
    console.log("💾 Files saved:");
    console.log("   - Original clip:", clipPath);
    console.log("   - Shorts version:", finalClipPath);

    return {
      success: true,
      url,
      id: uploaded.id,
      filePath: finalClipPath,
      aiTitle: meta.title,
      transcript: meta.transcript,
    };
  } catch (err) {
    console.error("❌ handleShorts error", err);
    return { success: false, error: (err && err.message) || String(err) };
  }
}

module.exports = { handleShorts };

// Test
if (require.main === module) {
  (async () => {
    const OBS_FILE = process.env.OBS_RECORDING_PATH;
    if (!OBS_FILE) {
      console.error("❌ Set OBS_RECORDING_PATH in .env");
      process.exit(1);
    }
    const res = await handleShorts({
      obsFilePath: OBS_FILE,
      secs: parseInt(process.env.CLIP_SECONDS || "30"),
      context: "AI Test Clip",
      makeShort: true,
    });
    console.log(res);
  })();
}
