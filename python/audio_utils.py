import ffmpeg
import os
import sys

def extract_audio(video_path, audio_output):
    """Extract audio from video for Whisper processing"""
    try:
        print(f"[Audio] Extracting audio from: {os.path.basename(video_path)}")
        (
            ffmpeg
            .input(video_path)
            .output(audio_output, acodec='pcm_s16le', ar='16000', ac=1)
            .overwrite_output()
            .run(quiet=True, capture_stderr=True)
        )
        print("[Audio] Audio extraction successful")
        return True
    except ffmpeg.Error as e:
        print(f"[Audio] FFmpeg error: {e.stderr.decode() if e.stderr else 'Unknown error'}")
        return False
    except Exception as e:
        print(f"[Audio] Extraction failed: {e}")
        return False

def convert_to_wav(input_audio, output_wav):
    """Convert any audio to WAV format"""
    try:
        print("[Audio] Converting to WAV...")
        (
            ffmpeg
            .input(input_audio)
            .output(output_wav, acodec='pcm_s16le', ar='16000')
            .overwrite_output()
            .run(quiet=True, capture_stderr=True)
        )
        return True
    except Exception as e:
        print(f"[Audio] Conversion failed: {e}")
        return False