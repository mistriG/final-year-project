import fastapi
import fastapi.middleware.cors
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid

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
