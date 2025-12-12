```markdown
# 🎬 yts-auto-shorts

**Automate YouTube Shorts creation and upload from your OBS live streams with AI-powered transcription and metadata generation.**

[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green?logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.x-blue?logo=python)](https://www.python.org/)
[![OBS Studio](https://img.shields.io/badge/OBS%20Studio-v28%2B-purple?logo=obs-studio)](https://obsproject.com/)
[![YouTube Data API](https://img.shields.io/badge/YouTube%20API-v3-red?logo=youtube)](https://developers.google.com/youtube/v3)
[![AI Powered](https://img.shields.io/badge/AI%20Powered-Whisper%2C%20ElevenLabs%2C%20Euri%2C%20Gemini-orange)](https://openai.com/whisper)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌟 Overview

`yts-auto-shorts` is a powerful automation tool designed for live streamers and content creators using OBS Studio. It streamlines the process of turning memorable live stream moments into engaging YouTube Shorts.

This project integrates with OBS Studio's Replay Buffer to capture recent clips, leverages AI for accurate audio transcription (using OpenAI Whisper or ElevenLabs), and generates compelling titles, descriptions, and hashtags using advanced language models (Euri or Google Gemini). Clips can be triggered manually or via specific commands in your YouTube Live Chat, making it easy to create and upload content on the fly.

## ✨ Features

*   **OBS Studio Integration**: Automatically saves and processes clips from your OBS Replay Buffer or recording directory.
*   **YouTube Live Chat Bot**: Monitors your live stream chat for designated commands (e.g., `!shorts`) to trigger clip creation and upload.
*   **Automated YouTube Shorts Upload**: Handles the entire upload process to your YouTube channel, including setting privacy and metadata.
*   **AI-Powered Transcription**: Utilizes either local OpenAI Whisper or the ElevenLabs Speech-to-Text API for highly accurate audio transcription of your clips.
*   **AI-Generated Metadata**: Generates catchy YouTube Shorts titles, relevant hashtags, and concise descriptions using Euri or Google Gemini APIs, optimizing for discoverability.
*   **Configurable Clip Length**: Define the duration of the clip to be extracted from your replay buffer.
*   **Secure Authentication**: Uses OAuth2 for secure access to YouTube Data API.
*   **Flexible AI Backends**: Choose between different AI models for transcription and metadata generation based on your preferences and API access.

## 🚀 Tech Stack

*   **Backend**: Node.js
*   **AI/ML**: Python
*   **Video/Audio Processing**: FFmpeg
*   **Key Node.js Libraries**:
    *   `googleapis`: For YouTube Data API interaction (upload, live chat).
    *   `obs-websocket-js`: For controlling OBS Studio via WebSocket.
    *   `dotenv`: For environment variable management.
    *   `express`: For handling OAuth2 callback.
*   **Key Python Libraries**:
    *   `openai-whisper`: For local speech-to-text transcription.
    *   `ffmpeg-python`: Pythonic wrapper for FFmpeg.
    *   `requests`: For interacting with external APIs (ElevenLabs, Euri).
    *   `pydub`: For audio manipulation (though `ffmpeg-python` handles most here).
    *   `google-generativeai`: For Google Gemini API interaction.
*   **External APIs**:
    *   YouTube Data API v3
    *   OBS WebSocket API v5
    *   ElevenLabs Speech-to-Text API
    *   Euri API (for AI text generation)
    *   Google Gemini API (for AI text generation)

## 🛠️ Installation

### Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js** (v16 or higher) & **npm**
*   **Python** (v3.8 or higher) & **pip**
*   **FFmpeg**: Must be installed and accessible in your system's PATH.
    *   [Download FFmpeg](https://ffmpeg.org/download.html)
*   **OBS Studio** (v28 or higher):
    *   Enable **Replay Buffer** in OBS settings (Output -> Replay Buffer).
    *   Ensure OBS WebSocket Server is enabled (Tools -> WebSocket Server Settings) and note the port (default 4455) and password (if set).
    *   Configure your OBS recording path (File -> Settings -> Output -> Recording -> Recording Path).

### Steps

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/yts-auto-shorts.git
    cd yts-auto-shorts
    ```

2.  **Install Node.js dependencies**:
    ```bash
    npm install
    ```

3.  **Install Python dependencies**:
    ```bash
    pip install -r python/requirements.txt
    ```

4.  **Google Cloud Project Setup**:
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   Create a new project or select an existing one.
    *   Enable the **YouTube Data API v3** for your project.
    *   Go to "APIs & Services" -> "Credentials".
    *   Create an **OAuth 2.0 Client ID**:
        *   Application type: "Desktop app" or "Web application" (if using a custom redirect URI).
        *   If "Web application", add `http://localhost:3000/oauth2callback` (or your chosen `REDIRECT_URI`) to "Authorized redirect URIs".
    *   Download the client configuration JSON file. Rename it to `credentials.json` and place it in the root directory of this project.

5.  **Environment Variables**:
    *   Create a `.env` file in the project root based on the `Configuration` section below.

6.  **Authorize YouTube API Access**:
    *   Run the token generation script:
        ```bash
        npm run get-token
        ```
    *   This will start a local web server and provide a URL. Open the URL in your browser, authorize access to your YouTube account, and grant the requested permissions.
    *   Upon successful authorization, a `token.json` file will be created in the project root. This file stores your OAuth tokens.

## ⚙️ Configuration

Create a `.env` file in the root of your project with the following variables:

```env
# --- OBS Studio Settings ---
OBS_WEBSOCKET_HOST=localhost:4455 # OBS WebSocket server address (default: localhost:4455)
OBS_WEBSOCKET_PASSWORD=            # OBS WebSocket password (if set in OBS)
OBS_RECORDING_PATH=C:/Users/asnoi/Videos/OBS # Path where OBS saves recordings/replay buffer files

# --- YouTube API Settings ---
REDIRECT_URI=http://localhost:3000/oauth2callback # Must match one of your authorized redirect URIs in Google Cloud Console

# --- Bot Settings ---
ALLOWED_USERS=your_channel_id,another_user_name # Comma-separated list of YouTube channel IDs or display names allowed to trigger commands. Streamer and moderators are always allowed.
CLIP_SECONDS=30 # Default duration in seconds for clips generated from replay buffer

# --- AI API Keys (Choose your preferred services) ---
# ElevenLabs for Transcription (Optional, if not using local Whisper)
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Euri for AI Title/Description Generation (Optional, if not using Gemini)
EURI_API_KEY=your_euri_api_key

# Google Gemini for AI Title/Description Generation (Optional, if not using Euri)
GEMINI_API_KEY=your_gemini_api_key
```

**Important Notes:**
*   `credentials.json` and `token.json` are generated and managed by the OAuth flow. Do **not** commit them to version control. They are already included in `.gitignore`.
*   `OBS_RECORDING_PATH` should point to the directory where OBS saves your replay buffer files.

## 🚀 Usage

### Starting the YouTube Live Chat Bot

To start the bot that monitors your YouTube Live Chat for commands:

```bash
npm start
```

Once running, the bot will connect to your active live stream. When an allowed user (streamer, moderator, or user in `ALLOWED_USERS`) types `!shorts` in chat, the bot will trigger the clip creation and upload process.

### Manually Uploading the Latest Clip

You can manually trigger an upload of the latest clip from your OBS recording directory (using the `CLIP_SECONDS` from your `.env`):

```bash
npm run test-upload
```

### Testing OBS WebSocket Connection

To test if the project can connect to OBS and save a replay buffer:

```bash
npm run test-obs
```

This will attempt to connect to OBS and trigger the `SaveReplayBuffer` action.

## 📁 Project Structure

```
.
├── .gitignore               # Specifies intentionally untracked files to ignore
├── bot                      # Contains the YouTube Live Chat bot logic
│   ├── chat_stub.js         # Example of how to call shorts_uploader and obs_control
│   ├── live_chat.js         # Main YouTube Live Chat monitoring and command processing
│   └── upload_latest_no_ws.js # Orchestrates clip upload, including OBS replay save
├── obs_control              # OBS Studio interaction scripts
│   └── obs_save_replay.js   # Connects to OBS via WebSocket and saves replay buffer
├── package.json             # Node.js project metadata and dependencies
├── python                   # Python scripts for AI-powered tasks
│   ├── audio_utils.py       # Utility for extracting audio from video using FFmpeg
│   ├── generate_title.py    # Generates titles, descriptions, and hashtags using AI (Euri/Gemini)
│   ├── requirements.txt     # Python dependencies
│   ├── transcribe.py        # Transcribes audio using OpenAI Whisper (local)
│   └── transcribe_elevenlabs.py # Transcribes audio using ElevenLabs API
├── readme.md                #
