import fastapi
import fastapi.middleware.cors
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid
import asyncio
import subprocess
import os
import signal
from pathlib import Path

app = fastapi.FastAPI()

app.add_middleware(
    fastapi.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for demo purposes
students_db: dict[str, dict] = {
    "1": {
        "id": "1",
        "name": "Ahmed Hassan",
        "studentId": "STU001",
        "department": "Computer Science",
        "email": "ahmed.hassan@university.edu",
        "enrolledAt": "2024-01-15",
        "faceDescriptor": None,
    },
    "2": {
        "id": "2",
        "name": "Sarah Johnson",
        "studentId": "STU002",
        "department": "Information Technology",
        "email": "sarah.johnson@university.edu",
        "enrolledAt": "2024-01-16",
        "faceDescriptor": None,
    },
    "3": {
        "id": "3",
        "name": "Muhammad Ali",
        "studentId": "STU003",
        "department": "Computer Science",
        "email": "muhammad.ali@university.edu",
        "enrolledAt": "2024-01-17",
        "faceDescriptor": None,
    },
    "4": {
        "id": "4",
        "name": "Emily Chen",
        "studentId": "STU004",
        "department": "Software Engineering",
        "email": "emily.chen@university.edu",
        "enrolledAt": "2024-01-18",
        "faceDescriptor": None,
    },
    "5": {
        "id": "5",
        "name": "Omar Farooq",
        "studentId": "STU005",
        "department": "Computer Science",
        "email": "omar.farooq@university.edu",
        "enrolledAt": "2024-01-19",
        "faceDescriptor": None,
    },
}

attendance_db: dict[str, dict] = {}

# Streaming storage
streaming_processes: dict[str, subprocess.Popen] = {}
stream_configs: dict[str, dict] = {}

class StreamStart(BaseModel):
    name: str
    url: str

class StudentCreate(BaseModel):
    name: str
    studentId: str
    department: str
    email: str
    faceDescriptor: Optional[list[float]] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    studentId: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    faceDescriptor: Optional[list[float]] = None


class AttendanceRecord(BaseModel):
    studentId: str
    studentName: str
    timestamp: str
    status: str  # "present" or "late"


class MarkAttendance(BaseModel):
    studentDbId: str
    studentName: str


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


# Student endpoints
@app.get("/students")
async def get_students():
    return {"students": list(students_db.values())}


@app.get("/students/{student_id}")
async def get_student(student_id: str):
    if student_id not in students_db:
        raise fastapi.HTTPException(status_code=404, detail="Student not found")
    return students_db[student_id]


@app.post("/students")
async def create_student(student: StudentCreate):
    new_id = str(uuid.uuid4())
    new_student = {
        "id": new_id,
        "name": student.name,
        "studentId": student.studentId,
        "department": student.department,
        "email": student.email,
        "enrolledAt": datetime.now().strftime("%Y-%m-%d"),
        "faceDescriptor": student.faceDescriptor,
    }
    students_db[new_id] = new_student
    return new_student


@app.put("/students/{student_id}")
async def update_student(student_id: str, student: StudentUpdate):
    if student_id not in students_db:
        raise fastapi.HTTPException(status_code=404, detail="Student not found")
    
    existing = students_db[student_id]
    if student.name is not None:
        existing["name"] = student.name
    if student.studentId is not None:
        existing["studentId"] = student.studentId
    if student.department is not None:
        existing["department"] = student.department
    if student.email is not None:
        existing["email"] = student.email
    if student.faceDescriptor is not None:
        existing["faceDescriptor"] = student.faceDescriptor
    
    return existing


@app.delete("/students/{student_id}")
async def delete_student(student_id: str):
    if student_id not in students_db:
        raise fastapi.HTTPException(status_code=404, detail="Student not found")
    del students_db[student_id]
    return {"message": "Student deleted"}


# Attendance endpoints
@app.get("/attendance")
async def get_attendance(date: Optional[str] = None):
    if date:
        filtered = {k: v for k, v in attendance_db.items() if v["date"] == date}
        return {"attendance": list(filtered.values())}
    return {"attendance": list(attendance_db.values())}


@app.post("/attendance")
async def mark_attendance(record: MarkAttendance):
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    
    # Check if already marked today
    for att in attendance_db.values():
        if att["studentDbId"] == record.studentDbId and att["date"] == today:
            return {"message": "Already marked", "attendance": att}
    
    # Determine status based on time (9:00 AM cutoff)
    hour = now.hour
    status = "present" if hour < 9 else "late"
    
    new_id = str(uuid.uuid4())
    new_attendance = {
        "id": new_id,
        "studentDbId": record.studentDbId,
        "studentName": record.studentName,
        "date": today,
        "time": time_str,
        "status": status,
    }
    attendance_db[new_id] = new_attendance
    return {"message": "Attendance marked", "attendance": new_attendance}


@app.get("/attendance/today")
async def get_today_attendance():
    today = datetime.now().strftime("%Y-%m-%d")
    filtered = {k: v for k, v in attendance_db.items() if v["date"] == today}
    return {"attendance": list(filtered.values()), "date": today}


@app.get("/attendance/stats")
async def get_attendance_stats():
    today = datetime.now().strftime("%Y-%m-%d")
    today_records = [v for v in attendance_db.values() if v["date"] == today]
    
    total_students = len(students_db)
    present_count = len([r for r in today_records if r["status"] == "present"])
    late_count = len([r for r in today_records if r["status"] == "late"])
    absent_count = total_students - present_count - late_count
    
    return {
        "totalStudents": total_students,
        "present": present_count,
        "late": late_count,
        "absent": absent_count,
        "date": today,
    }


# Streaming endpoints
@app.post("/stream/start")
async def start_stream(stream: StreamStart):
    """Start RTSP to HLS conversion for network camera"""
    print(f"Starting stream for {stream.name} with URL: {stream.url}")
    try:
        # Check if this is a test stream
        if stream.url.startswith("test://"):
            # Return a mock stream for testing purposes
            stream_id = f"stream_{uuid.uuid4().hex[:8]}"
            output_dir = Path(f"streams/{stream_id}")
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Create a dummy playlist file for testing
            playlist_content = """#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,
test_segment.ts
#EXT-X-ENDLIST
"""
            
            with open(output_dir / "playlist.m3u8", "w") as f:
                f.write(playlist_content)
            
            with open(output_dir / "test_segment.ts", "w") as f:
                f.write("dummy segment data")
            
            stream_configs[stream_id] = {
                "name": stream.name,
                "url": stream.url,
                "output_dir": str(output_dir),
                "playlist_url": f"/streams/{stream_id}/playlist.m3u8"
            }
            
            return {
                "streamId": stream_id,
                "streamUrl": f"/streams/{stream_id}/playlist.m3u8",
                "name": stream.name
            }
        
        # First test if RTSP connection works
        print(f"Testing RTSP connection to {stream.url}...")
        test_cmd = [
            r"C:\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe",
            "-i", stream.url,
            "-t", "3",  # Test for 3 seconds
            "-f", "null",
            "-"
        ]
        
        test_process = subprocess.Popen(
            test_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0,
            text=True
        )
        
        try:
            stdout, stderr = test_process.communicate(timeout=10)
            if test_process.returncode != 0:
                print(f"RTSP connection test failed. Return code: {test_process.returncode}")
                print(f"FFmpeg stderr: {stderr}")
                raise fastapi.HTTPException(
                    status_code=500, 
                    detail=f"Cannot connect to RTSP stream: {stream.url}. Error: {stderr}"
                )
            print("RTSP connection test successful!")
        except subprocess.TimeoutExpired:
            test_process.kill()
            print("RTSP connection test timed out")
            raise fastapi.HTTPException(
                status_code=500,
                detail=f"RTSP connection timeout: {stream.url}. Please check: 1) Camera is powered on 2) IP address is correct 3) Camera is on same network 4) Port 554 is not blocked"
            )
        
        # Create HLS output directory
        stream_id = f"stream_{uuid.uuid4().hex[:8]}"
        output_dir = Path(f"streams/{stream_id}")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # FFmpeg command for RTSP to HLS conversion
        # Using optimized settings for Imou CCTV and browser compatibility
        ffmpeg_path = r"C:\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"
        ffmpeg_cmd = [
            ffmpeg_path,
            "-rtsp_transport", "tcp",  # Force TCP transport for better reliability
            "-i", stream.url,
            "-c:v", "libx264",
            "-preset", "veryfast",  # Faster encoding for lower latency
            "-tune", "zerolatency",
            "-c:a", "aac",
            "-b:v", "1000k",
            "-b:a", "128k",
            "-vf", "scale=1280:720",
            "-f", "hls",
            "-hls_time", "2",
            "-hls_list_size", "3",
            "-hls_flags", "delete_segments",
            "-hls_segment_filename", str(output_dir / "segment%03d.ts"),
            str(output_dir / "playlist.m3u8")
        ]
        
        # Start FFmpeg process
        # Use Windows-compatible process creation
        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        print(f"Starting FFmpeg with command: {' '.join(ffmpeg_cmd)}")
        process = subprocess.Popen(
            ffmpeg_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=creationflags,
            text=True
        )
        
        # Monitor FFmpeg process for startup and errors
        await asyncio.sleep(3)  # Give FFmpeg more time to initialize
        if process.poll() is not None:
            stdout, stderr = process.communicate()
            print(f"FFmpeg failed to start. Return code: {process.returncode}")
            print(f"FFmpeg stdout: {stdout}")
            print(f"FFmpeg stderr: {stderr}")
            raise fastapi.HTTPException(status_code=500, detail=f"FFmpeg failed: {stderr}")
        
        print(f"FFmpeg process started successfully with PID: {process.pid}")
        playlist_path = output_dir / "playlist.m3u8"

        # Wait briefly for FFmpeg to emit the first HLS playlist before returning.
        # This avoids frontend HLS loader network errors from early 404 responses.
        playlist_ready = False
        for _ in range(20):  # up to 10 seconds
            if process.poll() is not None:
                stdout, stderr = process.communicate()
                raise fastapi.HTTPException(
                    status_code=500,
                    detail=f"FFmpeg exited before playlist generation. Error: {stderr or stdout}"
                )

            if playlist_path.exists() and playlist_path.stat().st_size > 0:
                playlist_ready = True
                break

            await asyncio.sleep(0.5)

        if not playlist_ready:
            raise fastapi.HTTPException(
                status_code=500,
                detail="HLS playlist was not generated in time. Check RTSP URL and FFmpeg output."
            )
        
        # Start a background task to monitor FFmpeg output
        async def monitor_ffmpeg():
            try:
                while True:
                    if process.poll() is not None:
                        stdout, stderr = process.communicate()
                        if process.returncode != 0:
                            print(f"FFmpeg process crashed. Return code: {process.returncode}")
                            print(f"FFmpeg stderr: {stderr}")
                        break
                    await asyncio.sleep(1)
            except Exception as e:
                print(f"Error monitoring FFmpeg: {e}")
        
        # Start monitoring task (fire and forget)
        asyncio.create_task(monitor_ffmpeg())
        
        # Add frame logging to verify FFmpeg is encoding
        async def log_ffmpeg_frames():
            try:
                line_count = 0
                while process.poll() is None and line_count < 10:  # Log first 10 lines
                    output = process.stderr.readline()
                    if output:
                        print(f"FFmpeg output: {output.strip()}")
                        if "frame=" in output:
                            print(f"FFmpeg is encoding frames: {output.strip()}")
                        line_count += 1
                    else:
                        await asyncio.sleep(0.1)
            except Exception as e:
                print(f"Error logging FFmpeg frames: {e}")
        
        # Start frame logging task
        asyncio.create_task(log_ffmpeg_frames())
        
        # Store process and config
        streaming_processes[stream_id] = process
        stream_configs[stream_id] = {
            "name": stream.name,
            "url": stream.url,
            "output_dir": str(output_dir),
            "playlist_url": f"/streams/{stream_id}/playlist.m3u8"
        }
        
        return {
            "streamId": stream_id,
            "streamUrl": f"/streams/{stream_id}/playlist.m3u8",
            "name": stream.name
        }
        
    except fastapi.HTTPException:
        raise
    except Exception as e:
        raise fastapi.HTTPException(status_code=500, detail=f"Failed to start stream: {str(e)}")


@app.post("/stream/stop/{stream_id}")
async def stop_stream(stream_id: str):
    """Stop streaming process"""
    if stream_id not in streaming_processes:
        raise fastapi.HTTPException(status_code=404, detail="Stream not found")
    
    try:
        # Terminate FFmpeg process
        process = streaming_processes[stream_id]
        if os.name == 'nt':
            # Windows: Use taskkill to terminate the process tree
            subprocess.run(['taskkill', '/F', '/T', '/PID', str(process.pid)], check=False)
        else:
            # Unix-like: Use killpg to terminate process group
            os.killpg(os.getpgid(process.pid), signal.SIGTERM)
        process.wait()
        
        # Clean up
        del streaming_processes[stream_id]
        del stream_configs[stream_id]
        
        return {"message": "Stream stopped successfully"}
        
    except Exception as e:
        raise fastapi.HTTPException(status_code=500, detail=f"Failed to stop stream: {str(e)}")


@app.get("/streams/{stream_id}/{file_name}")
async def serve_stream_file(stream_id: str, file_name: str):
    """Serve HLS playlist and segment files"""
    if stream_id not in stream_configs:
        raise fastapi.HTTPException(status_code=404, detail="Stream not found")
    
    file_path = Path(stream_configs[stream_id]["output_dir"]) / file_name
    
    if not file_path.exists():
        raise fastapi.HTTPException(status_code=404, detail="File not found")
    
    # Return file content
    return fastapi.responses.FileResponse(
        file_path,
        media_type="application/vnd.apple.mpegurl" if file_name.endswith(".m3u8") else "video/MP2T"
    )


@app.get("/streams")
async def list_streams():
    """List all active streams"""
    streams = []
    for stream_id, config in stream_configs.items():
        streams.append({
            "streamId": stream_id,
            "name": config["name"],
            "url": config["url"],
            "playlistUrl": config["playlist_url"],
            "active": stream_id in streaming_processes
        })
    return {"streams": streams}
