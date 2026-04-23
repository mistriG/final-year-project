import os, urllib.request, json, traceback
ffmpeg_path = r"C:\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"
print('ffmpeg_exists:', os.path.exists(ffmpeg_path), ffmpeg_path)

payload = {"name": "imou_camera", "url": "rtsp://username:password@<CAMERA_IP>:554/cam/realmonitor?channel=1&subtype=0"}
req = urllib.request.Request('http://127.0.0.1:8000/stream/start', data=json.dumps(payload).encode(), headers={'Content-Type':'application/json'})
try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        print('STATUS', resp.status)
        print(resp.read().decode())
except Exception as e:
    traceback.print_exc()
