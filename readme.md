# yts-auto-shorts (dev starter)

Quick dev starter to capture a short clip from OBS (Replay Buffer or recording), and auto-upload to YouTube.

## Prereqs
- Node.js (16+)
- npm
- ffmpeg in PATH
- OBS Studio (v28+) with Replay Buffer enabled (recommended) OR set OBS to record to a file
- Google Cloud project with YouTube Data API enabled and OAuth 2.0 Client ID JSON downloaded as `credentials.json` (placed in project root)

## Install
```bash
npm install
# if you didn't already: npm i googleapis express obs-websocket-js dotenv
