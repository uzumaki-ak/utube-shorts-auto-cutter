import sys
import json
import os
import requests
from audio_utils import extract_audio

def transcribe_with_elevenlabs(video_path, api_key):
    """Transcribe using ElevenLabs Speech-to-Text API"""
    try:
        print("[ElevenLabs] Transcribing audio...", file=sys.stderr)
        
        # Extract audio
        audio_path = "temp_audio.wav"
        if not extract_audio(video_path, audio_path):
            return None
        
        # ElevenLabs Speech-to-Text endpoint
        url = "https://api.elevenlabs.io/v1/speech-to-text"
        
        headers = {
            "xi-api-key": api_key
        }
        
        with open(audio_path, "rb") as audio_file:
            files = {"audio": audio_file}
            response = requests.post(url, headers=headers, files=files)
        
        # Clean up
        try:
            os.remove(audio_path)
        except:
            pass
        
        if response.status_code != 200:
            print(f"[ElevenLabs] API Error: {response.status_code}", file=sys.stderr)
            return None
        
        result = response.json()
        
        # ElevenLabs returns simple text, no timestamps
        # We'll need to split into segments manually
        transcript = result.get("text", "")
        
        if not transcript:
            print("[ElevenLabs] Empty transcript", file=sys.stderr)
            return None
        
        # Create basic captions (no precise timestamps from ElevenLabs)
        words = transcript.split()
        captions = []
        duration = 30  # Assume 30 second video
        time_per_word = duration / len(words) if words else 1
        
        for i, word in enumerate(words):
            captions.append({
                'start': i * time_per_word,
                'end': (i + 1) * time_per_word,
                'text': word
            })
        
        print(f"[ElevenLabs] Complete: {len(words)} words", file=sys.stderr)
        
        return {
            'transcript': transcript,
            'captions': captions,
            'language': 'auto'
        }
        
    except Exception as e:
        print(f"[ElevenLabs] Failed: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python transcribe_elevenlabs.py <video_path> <api_key>", file=sys.stderr)
        sys.exit(1)
    
    result = transcribe_with_elevenlabs(sys.argv[1], sys.argv[2])
    
    if result:
        print(json.dumps(result, ensure_ascii=False))
    else:
        print(json.dumps({"transcript": "", "captions": [], "language": "unknown"}))