
from faster_whisper import WhisperModel
import sys

if len(sys.argv) < 2:
    print('Usage: python transcribe_clip.py clip.mp4')
    sys.exit(1)

model = WhisperModel('small', device='cpu')
segments, info = model.transcribe(sys.argv[1])
with open('clip.txt','w',encoding='utf8') as f:
    for seg in segments:
        f.write(seg.text.strip() + '\n')
print('Wrote clip.txt')
