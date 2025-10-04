import whisper
import json
import sys
import os
from audio_utils import extract_audio

def transcribe_video(video_path):
    """Transcribe video using Whisper and return captions with timings"""
    try:
        print("[Whisper] Loading model...")
        model = whisper.load_model("base")
        
        # Extract audio first
        audio_path = "temp_audio.wav"
        if not extract_audio(video_path, audio_path):
            return None
            
        print("[Whisper] Transcribing audio...")
        result = model.transcribe(audio_path, word_timestamps=True)
        
        # Clean up temp file
        try:
            os.remove(audio_path)
        except:
            pass
            
        # Format captions with timings
        captions = []
        for segment in result['segments']:
            captions.append({
                'start': segment['start'],
                'end': segment['end'],
                'text': segment['text'].strip()
            })
            
        print(f"[Whisper] Transcription complete: {len(captions)} segments")
        return {
            'transcript': ' '.join([seg['text'] for seg in captions]),
            'captions': captions,
            'language': result['language']
        }
        
    except Exception as e:
        print(f"[Whisper] Transcription failed: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python transcribe.py <video_path>")
        sys.exit(1)
        
    video_path = sys.argv[1]
    result = transcribe_video(video_path)
    
    if result:
        print(json.dumps(result, ensure_ascii=False))
    else:
        print("{}")