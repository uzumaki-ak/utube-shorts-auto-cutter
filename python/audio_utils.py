import ffmpeg
import sys
import os

def extract_audio(video_path, audio_path="temp_audio.wav"):
    """Extract audio from video using ffmpeg"""
    try:
        print(f"[Audio] Extracting audio from: {os.path.basename(video_path)}", file=sys.stderr)
        
        stream = ffmpeg.input(video_path)
        stream = ffmpeg.output(stream, audio_path, acodec='pcm_s16le', ac=2, ar='16k')
        ffmpeg.run(stream, overwrite_output=True, quiet=True, capture_stdout=True, capture_stderr=True)
        
        print(f"[Audio] Audio extraction successful", file=sys.stderr)
        return True
        
    except Exception as e:
        print(f"[Audio] Extraction failed: {e}", file=sys.stderr)
        return False