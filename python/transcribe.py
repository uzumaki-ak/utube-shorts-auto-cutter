import whisper
import json
import sys
import os
from audio_utils import extract_audio

def transcribe_video(video_path):
    """Transcribe video using Whisper and return captions with timings"""
    try:
        print("[Whisper] Loading model...", file=sys.stderr)
        # Use small model - better accuracy, still fast
        model = whisper.load_model("small")
        
        # Extract audio first
        audio_path = "temp_audio.wav"
        if not extract_audio(video_path, audio_path):
            print("[Whisper] Audio extraction failed", file=sys.stderr)
            return None
            
        print("[Whisper] Transcribing audio...", file=sys.stderr)
        # Don't force translation - let it detect language naturally
        result = model.transcribe(
            audio_path,
            language=None,  # Auto-detect
            word_timestamps=False  # Disable for stability
        )
        
        # Clean up temp file
        try:
            os.remove(audio_path)
        except:
            pass
            
        # Format captions with timings
        captions = []
        for segment in result.get('segments', []):
            caption_text = segment['text'].strip()
            if len(caption_text) > 1:  # Skip empty
                captions.append({
                    'start': segment['start'],
                    'end': segment['end'],
                    'text': caption_text
                })
            
        transcript = ' '.join([seg['text'] for seg in captions])
        
        if not transcript.strip():
            print("[Whisper] WARNING: Empty transcript", file=sys.stderr)
            
        print(f"[Whisper] Complete: {len(captions)} segments", file=sys.stderr)
        print(f"[Whisper] Language: {result.get('language', 'unknown')}", file=sys.stderr)
        
        return {
            'transcript': transcript,
            'captions': captions,
            'language': result.get('language', 'unknown')
        }
        
    except Exception as e:
        print(f"[Whisper] Failed: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python transcribe.py <video_path>", file=sys.stderr)
        sys.exit(1)
        
    video_path = sys.argv[1]
    result = transcribe_video(video_path)
    
    if result:
        print(json.dumps(result, ensure_ascii=False))
    else:
        print(json.dumps({"transcript": "", "captions": [], "language": "unknown"}))