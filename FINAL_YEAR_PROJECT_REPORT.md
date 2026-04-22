# Smart Face Recognition Attendance System
## Final Year Project - Complete Technical Report

---

**Project Title:** Smart Face Recognition Attendance System  
**Domain:** Computer Vision, Machine Learning, Web Development  
**Academic Year:** 2024-2025  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technologies Used](#3-technologies-used)
4. [Backend Implementation](#4-backend-implementation)
5. [Frontend Implementation](#5-frontend-implementation)
6. [Face Recognition System](#6-face-recognition-system)
7. [Feature Documentation](#7-feature-documentation)
8. [API Documentation](#8-api-documentation)
9. [Database Design](#9-database-design)
10. [User Interface Design](#10-user-interface-design)
11. [System Flow](#11-system-flow)
12. [Code Implementation](#12-code-implementation)
13. [Testing](#13-testing)
14. [Installation and Deployment](#14-installation-and-deployment)
15. [Future Enhancements](#15-future-enhancements)
16. [Conclusion](#16-conclusion)
17. [References](#17-references)

---

## 1. Project Overview

### 1.1 Introduction

The Smart Face Recognition Attendance System is a modern, web-based application designed to automate the attendance marking process using facial recognition technology. Traditional attendance systems rely on manual roll calls, RFID cards, or biometric fingerprint scanners, which are time-consuming and prone to proxy attendance. This system leverages cutting-edge machine learning algorithms for face detection and recognition to provide a contactless, efficient, and accurate attendance solution.

The system captures live video from a webcam, detects faces in real-time, compares them against a database of registered students, and automatically marks attendance when a match is found. It provides instant visual feedback with green bounding boxes for recognized faces and red boxes for unknown individuals.

### 1.2 Problem Statement

Educational institutions and organizations face several challenges with traditional attendance systems:

1. **Time Consumption:** Manual roll calls consume valuable lecture/meeting time
2. **Proxy Attendance:** Students can mark attendance for absent peers
3. **Inaccurate Records:** Manual entries are prone to human errors
4. **Report Generation:** Difficulty in generating comprehensive attendance reports
5. **Contact-Based Systems:** Post-COVID concerns with touch-based biometric systems
6. **Scalability Issues:** Traditional methods don't scale well with large student populations

### 1.3 Objectives

The primary objectives of this project are:

1. **Develop Real-Time Face Detection:** Implement a system capable of detecting multiple faces simultaneously in live video streams
2. **Automate Attendance Marking:** Eliminate manual intervention in the attendance process
3. **Provide User-Friendly Interface:** Create an intuitive web dashboard for administrators
4. **Enable Student Registration:** Allow easy registration of new students with facial data capture
5. **Generate Comprehensive Reports:** Provide detailed attendance analytics and export functionality
6. **Ensure High Accuracy:** Achieve reliable face recognition with minimal false positives/negatives
7. **Create Scalable Architecture:** Design a system that can handle growing user bases

### 1.4 Scope

The system encompasses:

- Real-time face detection via webcam using TensorFlow.js
- Student registration with live face encoding capture
- Automatic attendance marking upon face recognition
- Interactive dashboard with live statistics
- Complete student management (Create, Read, Update, Delete)
- Date-wise attendance report generation
- Visual analytics with charts and graphs
- CSV export functionality for attendance records
- Time-based attendance status (Present/Late/Absent)

### 1.5 Limitations

- Requires adequate lighting conditions for accurate detection
- Performance depends on webcam quality
- Currently uses in-memory storage (can be extended to persistent database)
- Single camera support (can be extended to multiple cameras)

---

## 2. System Architecture

### 2.1 Architecture Overview

The system follows a **microservices architecture** using Vercel's experimental services API, consisting of two independent services that communicate via REST APIs:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          VERCEL PLATFORM                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌───────────────────────────┐       ┌───────────────────────────┐    │
│   │    FRONTEND SERVICE       │       │    BACKEND SERVICE        │    │
│   │      (Next.js 15)         │◄─────►│      (FastAPI/Python)     │    │
│   │                           │ /api/ │                           │    │
│   │  ┌─────────────────────┐  │       │  ┌─────────────────────┐  │    │
│   │  │   React Components  │  │       │  │    REST API Layer   │  │    │
│   │  │   - Dashboard       │  │       │  │    - Students CRUD  │  │    │
│   │  │   - Camera Feed     │  │       │  │    - Attendance     │  │    │
│   │  │   - Student Mgmt    │  │       │  │    - Statistics     │  │    │
│   │  │   - Reports         │  │       │  │    - Health Check   │  │    │
│   │  └─────────────────────┘  │       │  └─────────────────────┘  │    │
│   │                           │       │                           │    │
│   │  ┌─────────────────────┐  │       │  ┌─────────────────────┐  │    │
│   │  │   Face Detection    │  │       │  │   Data Storage      │  │    │
│   │  │   (face-api.js)     │  │       │  │   (In-Memory Dict)  │  │    │
│   │  │   - TensorFlow.js   │  │       │  │   - Students DB     │  │    │
│   │  │   - ML Models       │  │       │  │   - Attendance DB   │  │    │
│   │  └─────────────────────┘  │       │  └─────────────────────┘  │    │
│   │                           │       │                           │    │
│   └───────────────────────────┘       └───────────────────────────┘    │
│              │                                                          │
│              │  WebRTC/getUserMedia                                     │
│              ▼                                                          │
│   ┌───────────────────────────┐                                        │
│   │      WEBCAM STREAM        │                                        │
│   │   (Browser Media API)     │                                        │
│   └───────────────────────────┘                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Service Communication

The frontend and backend services communicate through HTTP REST APIs. Vercel's services configuration routes all `/api/*` requests to the backend service:

```
┌──────────────────┐     HTTP/REST      ┌──────────────────┐
│    Frontend      │ ◄────────────────► │     Backend      │
│    (Port 3000)   │    /api/*          │    (Port 8000)   │
│                  │                    │                  │
│  - Next.js App   │  GET /api/students │  - FastAPI App   │
│  - React SPA     │  POST /api/attend  │  - Uvicorn ASGI  │
│  - face-api.js   │  GET /api/stats    │  - Pydantic      │
└──────────────────┘                    └──────────────────┘
         │
         │  WebRTC getUserMedia()
         ▼
┌──────────────────┐
│  User's Webcam   │
│  Video Stream    │
└──────────────────┘
```

### 2.3 Data Flow Diagram

```
┌─────────┐    ┌─────────┐    ┌─────────────┐    ┌──────────────┐
│  User   │───►│ Webcam  │───►│ Face Detect │───►│ Face Match   │
│         │    │ Stream  │    │ (ML Model)  │    │ (Euclidean)  │
└─────────┘    └─────────┘    └─────────────┘    └──────────────┘
                                                        │
                                                        ▼
┌─────────┐    ┌─────────┐    ┌─────────────┐    ┌──────────────┐
│Dashboard│◄───│ Update  │◄───│ Mark Attend │◄───│ Student ID   │
│   UI    │    │  Stats  │    │ (POST API)  │    │ Retrieved    │
└─────────┘    └─────────┘    └─────────────┘    └──────────────┘
```

### 2.4 Directory Structure

```
smart-attendance-system/
│
├── vercel.json                      # Vercel services configuration
│
├── backend/                         # Python FastAPI Backend
│   ├── main.py                      # Main FastAPI application
│   └── pyproject.toml               # Python dependencies
│
└── frontend/                        # Next.js Frontend
    ├── app/                         # Next.js App Router
    │   ├── layout.tsx               # Root layout with metadata
    │   ├── page.tsx                 # Dashboard page
    │   ├── globals.css              # Global styles & design tokens
    │   ├── students/
    │   │   └── page.tsx             # Student management page
    │   └── reports/
    │       └── page.tsx             # Attendance reports page
    │
    ├── components/                  # React Components
    │   ├── camera-feed.tsx          # Webcam & face detection
    │   ├── stats-cards.tsx          # Statistics display cards
    │   ├── attendance-table.tsx     # Attendance records table
    │   ├── navigation.tsx           # Navigation bar
    │   ├── face-registration-dialog.tsx  # Student face capture
    │   └── ui/                      # shadcn/ui components
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── table.tsx
    │       ├── dialog.tsx
    │       ├── input.tsx
    │       ├── badge.tsx
    │       ├── tabs.tsx
    │       └── ...
    │
    ├── hooks/                       # Custom React Hooks
    │   ├── use-face-detection.ts    # Face detection logic
    │   └── use-mobile.ts            # Mobile detection
    │
    ├── lib/                         # Utility functions
    │   └── utils.ts                 # cn() and helpers
    │
    ├── public/                      # Static assets
    │   └── models/                  # face-api.js ML models
    │       ├── tiny_face_detector_model-weights_manifest.json
    │       ├── tiny_face_detector_model-shard1
    │       ├── face_landmark_68_model-weights_manifest.json
    │       ├── face_landmark_68_model-shard1
    │       ├── face_recognition_model-weights_manifest.json
    │       └── face_recognition_model-shard1
    │
    ├── package.json                 # Node.js dependencies
    ├── next.config.ts               # Next.js configuration
    ├── tsconfig.json                # TypeScript configuration
    └── postcss.config.mjs           # PostCSS configuration
```

---

## 3. Technologies Used

### 3.1 Programming Languages

| Language | Version | Purpose | Key Features Used |
|----------|---------|---------|-------------------|
| **TypeScript** | 5.x | Frontend development | Type annotations, interfaces, generics, async/await |
| **JavaScript** | ES2022 | Client-side scripting | Modules, destructuring, spread operators |
| **Python** | 3.12 | Backend API development | Type hints, async/await, dataclasses |
| **CSS** | 3 | Styling | Custom properties, Flexbox, Grid |
| **HTML** | 5 | Markup structure | Semantic elements, Canvas API |

### 3.2 Frontend Technologies

| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Next.js** | 15.x | React framework | App Router, Server Components, built-in optimizations |
| **React** | 19.x | UI component library | Component-based architecture, hooks, virtual DOM |
| **Tailwind CSS** | 4.x | Styling framework | Utility-first, responsive design, customizable |
| **shadcn/ui** | Latest | UI component library | Accessible, customizable, professional components |
| **face-api.js** | 0.22.2 | Face detection & recognition | TensorFlow.js based, browser-compatible |
| **TensorFlow.js** | (bundled) | Machine learning runtime | GPU acceleration, WebGL support |
| **SWR** | 2.x | Data fetching & caching | Real-time updates, revalidation, caching |
| **Lucide React** | Latest | Icon library | Modern icons, tree-shakeable |
| **Recharts** | 2.x | Chart visualization | React-based, responsive charts |
| **Sonner** | Latest | Toast notifications | Beautiful, accessible notifications |

### 3.3 Backend Technologies

| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **FastAPI** | 0.115.x | Web framework | Async support, automatic OpenAPI docs, type validation |
| **Uvicorn** | Latest | ASGI server | High performance, async support |
| **Pydantic** | 2.x | Data validation | Type-safe models, automatic validation |
| **Python datetime** | Built-in | Date/time handling | Native Python support |
| **UUID** | Built-in | Unique ID generation | RFC 4122 compliant |

### 3.4 Development Tools

| Tool | Purpose | Usage |
|------|---------|-------|
| **Vercel** | Deployment platform | Hosting, CI/CD, serverless functions |
| **pnpm** | Package manager | Fast, disk-efficient dependency management |
| **uv** | Python package manager | Fast Python dependency resolution |
| **ESLint** | Code linting | Code quality enforcement |
| **TypeScript Compiler** | Type checking | Static type analysis |
| **Git** | Version control | Source code management |

### 3.5 Machine Learning Models

The face recognition system uses pre-trained models from face-api.js:

| Model | File Size | Parameters | Purpose |
|-------|-----------|------------|---------|
| **TinyFaceDetector** | ~190KB | ~200K | Real-time face detection optimized for browsers |
| **FaceLandmark68Net** | ~350KB | ~1M | Detects 68 facial landmark points |
| **FaceRecognitionNet** | ~6.2MB | ~4M | Extracts 128-dimensional face descriptors |

### 3.6 Browser APIs Used

| API | Purpose |
|-----|---------|
| **MediaDevices.getUserMedia()** | Access webcam stream |
| **Canvas API** | Draw face detection overlays |
| **WebGL** | GPU-accelerated ML inference |
| **Fetch API** | HTTP requests to backend |
| **Web Workers** | Background ML processing |

---

## 4. Backend Implementation

### 4.1 FastAPI Application Structure

The backend is built using FastAPI, a modern, high-performance Python web framework. It provides automatic API documentation, type validation, and async support.

**File: `backend/main.py`**

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional
import uuid

# Initialize FastAPI application
app = FastAPI(
    title="Face Recognition Attendance API",
    description="Backend API for Smart Attendance System",
    version="1.0.0"
)

# Configure CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4.2 Data Models (Pydantic)

Pydantic models ensure type safety and automatic validation:

```python
class Student(BaseModel):
    """Represents a registered student in the system"""
    id: str
    name: str
    email: str
    department: str
    roll_number: str
    face_descriptor: Optional[list[float]] = None  # 128-dimensional vector
    created_at: str

class StudentCreate(BaseModel):
    """Schema for creating a new student"""
    name: str
    email: str
    department: str
    roll_number: str
    face_descriptor: Optional[list[float]] = None

class StudentUpdate(BaseModel):
    """Schema for updating an existing student"""
    name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    roll_number: Optional[str] = None
    face_descriptor: Optional[list[float]] = None

class AttendanceRecord(BaseModel):
    """Represents a single attendance record"""
    id: str
    student_id: str
    student_name: str
    date: str  # ISO format: YYYY-MM-DD
    time: str  # Format: HH:MM:SS
    status: str  # "present", "late", or "absent"

class AttendanceCreate(BaseModel):
    """Schema for marking attendance"""
    student_id: str
    student_name: str

class AttendanceStats(BaseModel):
    """Statistics for attendance dashboard"""
    total_students: int
    present: int
    late: int
    absent: int
    attendance_rate: float
```

### 4.3 In-Memory Data Storage

For demonstration purposes, the system uses Python dictionaries for data storage. This can be easily extended to use a persistent database:

```python
# Student database with sample data
students_db: dict[str, Student] = {
    "1": Student(
        id="1",
        name="Ahmed Khan",
        email="ahmed.khan@university.edu",
        department="Computer Science",
        roll_number="CS-2024-001",
        face_descriptor=None,
        created_at="2024-01-15T09:00:00"
    ),
    "2": Student(
        id="2",
        name="Fatima Ali",
        email="fatima.ali@university.edu",
        department="Computer Science",
        roll_number="CS-2024-002",
        face_descriptor=None,
        created_at="2024-01-15T09:30:00"
    ),
    "3": Student(
        id="3",
        name="Muhammad Hassan",
        email="m.hassan@university.edu",
        department="Software Engineering",
        roll_number="SE-2024-001",
        face_descriptor=None,
        created_at="2024-01-16T10:00:00"
    ),
    "4": Student(
        id="4",
        name="Ayesha Malik",
        email="ayesha.malik@university.edu",
        department="Data Science",
        roll_number="DS-2024-001",
        face_descriptor=None,
        created_at="2024-01-17T11:00:00"
    ),
    "5": Student(
        id="5",
        name="Omar Farooq",
        email="omar.farooq@university.edu",
        department="Computer Science",
        roll_number="CS-2024-003",
        face_descriptor=None,
        created_at="2024-01-18T08:30:00"
    ),
}

# Attendance records database
attendance_db: dict[str, AttendanceRecord] = {}
```

### 4.4 API Endpoints Implementation

#### 4.4.1 Health Check Endpoint

```python
@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring system status.
    Returns current timestamp and health status.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }
```

#### 4.4.2 Student CRUD Operations

```python
@app.get("/students")
async def get_students(department: Optional[str] = None):
    """
    Retrieve all students, optionally filtered by department.
    
    Args:
        department: Optional filter by department name
        
    Returns:
        List of all matching students
    """
    students = list(students_db.values())
    
    if department:
        students = [s for s in students if s.department == department]
    
    # Sort by name alphabetically
    students.sort(key=lambda x: x.name)
    
    return {"students": students, "total": len(students)}


@app.get("/students/{student_id}")
async def get_student(student_id: str):
    """
    Retrieve a single student by ID.
    
    Args:
        student_id: Unique identifier of the student
        
    Returns:
        Student details
        
    Raises:
        HTTPException: If student not found
    """
    if student_id not in students_db:
        raise HTTPException(
            status_code=404,
            detail=f"Student with ID {student_id} not found"
        )
    return students_db[student_id]


@app.post("/students", status_code=201)
async def create_student(student: StudentCreate):
    """
    Create a new student record.
    
    Args:
        student: Student creation data
        
    Returns:
        Newly created student with generated ID
    """
    # Generate unique ID
    student_id = str(uuid.uuid4())
    
    # Create new student record
    new_student = Student(
        id=student_id,
        name=student.name,
        email=student.email,
        department=student.department,
        roll_number=student.roll_number,
        face_descriptor=student.face_descriptor,
        created_at=datetime.now().isoformat()
    )
    
    # Store in database
    students_db[student_id] = new_student
    
    return new_student


@app.put("/students/{student_id}")
async def update_student(student_id: str, student: StudentCreate):
    """
    Update an existing student record.
    
    Args:
        student_id: ID of student to update
        student: Updated student data
        
    Returns:
        Updated student record
        
    Raises:
        HTTPException: If student not found
    """
    if student_id not in students_db:
        raise HTTPException(
            status_code=404,
            detail=f"Student with ID {student_id} not found"
        )
    
    existing = students_db[student_id]
    
    # Update student while preserving ID and creation date
    updated_student = Student(
        id=student_id,
        name=student.name,
        email=student.email,
        department=student.department,
        roll_number=student.roll_number,
        face_descriptor=student.face_descriptor,
        created_at=existing.created_at
    )
    
    students_db[student_id] = updated_student
    
    return updated_student


@app.delete("/students/{student_id}")
async def delete_student(student_id: str):
    """
    Delete a student record.
    
    Args:
        student_id: ID of student to delete
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If student not found
    """
    if student_id not in students_db:
        raise HTTPException(
            status_code=404,
            detail=f"Student with ID {student_id} not found"
        )
    
    # Remove student
    deleted_student = students_db.pop(student_id)
    
    # Also remove any attendance records for this student
    global attendance_db
    attendance_db = {
        k: v for k, v in attendance_db.items()
        if v.student_id != student_id
    }
    
    return {
        "message": f"Student {deleted_student.name} deleted successfully",
        "deleted_id": student_id
    }
```

#### 4.4.3 Attendance Management Endpoints

```python
@app.get("/attendance")
async def get_attendance(
    date_filter: Optional[str] = None,
    student_id: Optional[str] = None
):
    """
    Retrieve attendance records with optional filters.
    
    Args:
        date_filter: Filter by date (YYYY-MM-DD format)
        student_id: Filter by specific student
        
    Returns:
        List of matching attendance records
    """
    records = list(attendance_db.values())
    
    # Apply date filter
    if date_filter:
        records = [r for r in records if r.date == date_filter]
    
    # Apply student filter
    if student_id:
        records = [r for r in records if r.student_id == student_id]
    
    # Sort by time (most recent first)
    records.sort(key=lambda x: x.time, reverse=True)
    
    return {"attendance": records, "total": len(records)}


@app.post("/attendance")
async def mark_attendance(attendance: AttendanceCreate):
    """
    Mark attendance for a student.
    Determines status (present/late) based on current time.
    Prevents duplicate attendance for the same day.
    
    Args:
        attendance: Student ID and name for attendance
        
    Returns:
        Attendance record (new or existing)
    """
    today = date.today().isoformat()
    now = datetime.now()
    
    # Check if attendance already marked today
    existing = [
        r for r in attendance_db.values()
        if r.student_id == attendance.student_id and r.date == today
    ]
    
    if existing:
        # Return existing record without creating duplicate
        return {
            "record": existing[0],
            "message": "Attendance already marked for today",
            "is_duplicate": True
        }
    
    # Determine attendance status based on time
    # Before 9:15 AM = Present, After = Late
    if now.hour < 9 or (now.hour == 9 and now.minute <= 15):
        status = "present"
    else:
        status = "late"
    
    # Create new attendance record
    attendance_id = str(uuid.uuid4())
    record = AttendanceRecord(
        id=attendance_id,
        student_id=attendance.student_id,
        student_name=attendance.student_name,
        date=today,
        time=now.strftime("%H:%M:%S"),
        status=status
    )
    
    # Store in database
    attendance_db[attendance_id] = record
    
    return {
        "record": record,
        "message": f"Attendance marked as {status}",
        "is_duplicate": False
    }


@app.get("/attendance/stats")
async def get_attendance_stats(date_filter: Optional[str] = None):
    """
    Get attendance statistics for dashboard display.
    
    Args:
        date_filter: Date to get stats for (defaults to today)
        
    Returns:
        Attendance statistics including present, late, absent counts
    """
    target_date = date_filter or date.today().isoformat()
    
    # Get records for target date
    today_records = [
        r for r in attendance_db.values()
        if r.date == target_date
    ]
    
    total_students = len(students_db)
    present_count = len([r for r in today_records if r.status == "present"])
    late_count = len([r for r in today_records if r.status == "late"])
    absent_count = total_students - present_count - late_count
    
    # Calculate attendance rate
    attendance_rate = 0.0
    if total_students > 0:
        attendance_rate = round(
            (present_count + late_count) / total_students * 100,
            1
        )
    
    return {
        "date": target_date,
        "total_students": total_students,
        "present": present_count,
        "late": late_count,
        "absent": absent_count,
        "attendance_rate": attendance_rate,
        "present_students": [
            r.student_name for r in today_records if r.status == "present"
        ],
        "late_students": [
            r.student_name for r in today_records if r.status == "late"
        ]
    }


@app.get("/attendance/report")
async def get_attendance_report(
    start_date: str,
    end_date: str,
    department: Optional[str] = None
):
    """
    Generate attendance report for a date range.
    
    Args:
        start_date: Report start date (YYYY-MM-DD)
        end_date: Report end date (YYYY-MM-DD)
        department: Optional department filter
        
    Returns:
        Comprehensive attendance report with daily breakdown
    """
    # Filter records by date range
    records = [
        r for r in attendance_db.values()
        if start_date <= r.date <= end_date
    ]
    
    # Group by date
    daily_stats = {}
    for record in records:
        if record.date not in daily_stats:
            daily_stats[record.date] = {
                "present": 0,
                "late": 0,
                "total_marked": 0
            }
        daily_stats[record.date][record.status] = \
            daily_stats[record.date].get(record.status, 0) + 1
        daily_stats[record.date]["total_marked"] += 1
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_records": len(records),
        "daily_breakdown": daily_stats,
        "records": records
    }
```

### 4.5 Python Dependencies

**File: `backend/pyproject.toml`**

```toml
[project]
name = "attendance-backend"
version = "1.0.0"
description = "FastAPI backend for Face Recognition Attendance System"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]",
]

[tool.uv]
dev-dependencies = [
    "pytest>=8.0",
    "httpx>=0.27",
]
```

---

## 5. Frontend Implementation

### 5.1 Next.js Configuration

**File: `frontend/next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Ignore ESLint errors during builds (handled separately)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // TypeScript configuration
  typescript: {
    // Type checking is done separately
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
```

### 5.2 TypeScript Configuration

**File: `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 5.3 Package Dependencies

**File: `frontend/package.json`**

```json
{
  "name": "smart-attendance-frontend",
  "version": "1.0.0",
  "description": "Next.js frontend for Face Recognition Attendance System",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "face-api.js": "^0.22.2",
    "swr": "^2.2.5",
    "lucide-react": "^0.460.0",
    "recharts": "^2.13.0",
    "sonner": "^1.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.0",
    "class-variance-authority": "^0.7.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-scroll-area": "^1.2.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "postcss": "^8.4.0",
    "@tailwindcss/postcss": "^4.0.0"
  }
}
```

### 5.4 Root Layout Component

**File: `frontend/app/layout.tsx`**

```typescript
import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Load Inter font for body text
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Load Poppins font for headings
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

// SEO Metadata
export const metadata: Metadata = {
  title: "Smart Attendance System - Face Recognition",
  description:
    "Automated attendance tracking using advanced facial recognition technology. Real-time detection, student management, and comprehensive reporting.",
  keywords: [
    "attendance system",
    "face recognition",
    "student management",
    "automated attendance",
  ],
  authors: [{ name: "Your Name" }],
};

// Viewport configuration
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5", // Indigo primary color
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        {children}
        {/* Toast notification provider */}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
```

### 5.5 Global Styles and Design Tokens

**File: `frontend/app/globals.css`**

```css
@import "tailwindcss";

/* ============================================
   DESIGN TOKENS & THEME CONFIGURATION
   ============================================ */

@theme inline {
  /* Typography */
  --font-sans: "Inter", "Inter Fallback", ui-sans-serif, system-ui, sans-serif;
  --font-heading: "Poppins", "Poppins Fallback", ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, "Cascadia Code", "Source Code Pro", monospace;

  /* ============================================
     COLOR PALETTE
     Using OKLCH for perceptually uniform colors
     ============================================ */

  /* Primary Brand Color - Indigo */
  --color-primary: oklch(0.55 0.2 260);
  --color-primary-hover: oklch(0.48 0.22 260);
  --color-primary-foreground: oklch(0.98 0 0);

  /* Success Color - Green (for recognized faces) */
  --color-success: oklch(0.65 0.2 145);
  --color-success-hover: oklch(0.58 0.22 145);
  --color-success-foreground: oklch(0.98 0 0);

  /* Warning Color - Amber (for late attendance) */
  --color-warning: oklch(0.75 0.15 85);
  --color-warning-hover: oklch(0.68 0.17 85);
  --color-warning-foreground: oklch(0.25 0 0);

  /* Destructive Color - Red (for unknown faces, absent) */
  --color-destructive: oklch(0.55 0.2 25);
  --color-destructive-hover: oklch(0.48 0.22 25);
  --color-destructive-foreground: oklch(0.98 0 0);

  /* Background Colors */
  --color-background: oklch(0.985 0.002 260);
  --color-foreground: oklch(0.15 0.02 260);

  /* Card Colors */
  --color-card: oklch(1 0 0);
  --color-card-foreground: oklch(0.15 0.02 260);

  /* Muted Colors (for secondary text, borders) */
  --color-muted: oklch(0.96 0.005 260);
  --color-muted-foreground: oklch(0.45 0.02 260);

  /* Secondary Colors */
  --color-secondary: oklch(0.96 0.005 260);
  --color-secondary-foreground: oklch(0.15 0.02 260);

  /* Accent Colors */
  --color-accent: oklch(0.96 0.01 260);
  --color-accent-foreground: oklch(0.15 0.02 260);

  /* Border and Ring Colors */
  --color-border: oklch(0.9 0.01 260);
  --color-input: oklch(0.9 0.01 260);
  --color-ring: oklch(0.55 0.2 260);

  /* Chart Colors for Reports */
  --color-chart-1: oklch(0.55 0.2 260);
  --color-chart-2: oklch(0.65 0.2 145);
  --color-chart-3: oklch(0.75 0.15 85);
  --color-chart-4: oklch(0.55 0.2 25);
  --color-chart-5: oklch(0.6 0.15 200);

  /* Border Radius */
  --radius: 0.625rem;
}

/* ============================================
   BASE STYLES
   ============================================ */

* {
  @apply border-border;
}

body {
  @apply bg-background text-foreground;
}

/* ============================================
   CUSTOM UTILITY CLASSES
   ============================================ */

@layer utilities {
  /* Camera overlay container */
  .camera-overlay {
    @apply absolute inset-0 pointer-events-none;
  }

  /* Face detection bounding box */
  .face-box {
    @apply absolute border-2 rounded-sm transition-all duration-150 ease-out;
  }

  /* Recognized face (green box) */
  .face-box-recognized {
    @apply border-success shadow-[0_0_10px_rgba(34,197,94,0.5)];
  }

  /* Unknown face (red box) */
  .face-box-unknown {
    @apply border-destructive shadow-[0_0_10px_rgba(239,68,68,0.5)];
  }

  /* Face label styling */
  .face-label {
    @apply absolute -top-7 left-0 px-2 py-0.5 text-xs font-medium rounded;
  }

  .face-label-recognized {
    @apply bg-success text-success-foreground;
  }

  .face-label-unknown {
    @apply bg-destructive text-destructive-foreground;
  }

  /* Smooth fade-in animation */
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Pulse animation for active camera */
  .animate-pulse-dot {
    animation: pulseDot 2s ease-in-out infinite;
  }

  @keyframes pulseDot {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
}

/* ============================================
   SCROLLBAR STYLING
   ============================================ */

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-muted rounded-full;
}

::-webkit-scrollbar-thumb {
  @apply bg-border rounded-full hover:bg-muted-foreground/30;
}
```

### 5.6 Utility Functions

**File: `frontend/lib/utils.ts`**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and merges Tailwind classes
 * to avoid conflicts (e.g., 'p-2' and 'p-4' → 'p-4')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date string to a readable format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats a time string to 12-hour format
 */
export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Generates a random color for avatars
 */
export function getAvatarColor(name: string): string {
  const colors = [
    "bg-primary",
    "bg-success",
    "bg-warning",
    "bg-destructive",
    "bg-blue-500",
    "bg-purple-500",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
```

---

## 6. Face Recognition System

### 6.1 Technical Overview

The face recognition system uses **face-api.js**, a JavaScript API built on top of TensorFlow.js. It runs entirely in the browser, leveraging WebGL for GPU-accelerated inference.

#### 6.1.1 Face Detection Pipeline

```
┌───────────────┐    ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Video Frame  │───►│ TinyFaceDetect│───►│  Landmark68   │───►│  Recognition  │
│  (Canvas)     │    │  (Face Box)   │    │  (68 Points)  │    │  (128-D Vec)  │
└───────────────┘    └───────────────┘    └───────────────┘    └───────────────┘
                                                                       │
                                                                       ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Mark Attend  │◄───│ Best Match    │◄───│  Euclidean    │◄───│  Compare DB   │
│  (API Call)   │    │ (Threshold)   │    │  Distance     │    │  Descriptors  │
└───────────────┘    └───────────────┘    └───────────────┘    └───────────────┘
```

#### 6.1.2 Machine Learning Models

| Model | Architecture | Input Size | Output | Purpose |
|-------|--------------|------------|--------|---------|
| **TinyFaceDetector** | MobileNetV1 | 320×320 | Bounding boxes | Fast face detection |
| **FaceLandmark68Net** | ResNet | 112×112 | 68 (x,y) points | Facial landmark detection |
| **FaceRecognitionNet** | ResNet-34 | 150×150 | 128-D vector | Face descriptor extraction |

### 6.2 Face Detection Hook Implementation

**File: `frontend/hooks/use-face-detection.ts`**

```typescript
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as faceapi from "face-api.js";

/* ============================================
   TYPE DEFINITIONS
   ============================================ */

/**
 * Represents a detected face with recognition information
 */
interface DetectedFace {
  id: string;
  name: string;
  confidence: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isRecognized: boolean;
}

/**
 * Represents a student with their face descriptor
 */
interface RegisteredStudent {
  id: string;
  name: string;
  descriptor: Float32Array;
}

/**
 * Options for the face detection hook
 */
interface UseFaceDetectionOptions {
  onFaceRecognized?: (studentId: string, studentName: string) => void;
  recognitionThreshold?: number;
  detectionInterval?: number;
}

/**
 * Return type for the useFaceDetection hook
 */
interface UseFaceDetectionReturn {
  isModelLoaded: boolean;
  isDetecting: boolean;
  detectedFaces: DetectedFace[];
  error: string | null;
  startCamera: (videoElement: HTMLVideoElement) => Promise<void>;
  stopCamera: () => void;
  startDetection: (canvas: HTMLCanvasElement) => void;
  stopDetection: () => void;
  captureFaceDescriptor: () => Promise<number[] | null>;
  loadRegisteredStudents: () => Promise<void>;
}

/* ============================================
   MAIN HOOK IMPLEMENTATION
   ============================================ */

export function useFaceDetection(
  options: UseFaceDetectionOptions = {}
): UseFaceDetectionReturn {
  // Destructure options with defaults
  const {
    onFaceRecognized,
    recognitionThreshold = 0.6, // Lower = more strict matching
    detectionInterval = 500,    // Milliseconds between detections
  } = options;

  /* ============================================
     STATE MANAGEMENT
     ============================================ */

  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* ============================================
     REFS (Persist across renders)
     ============================================ */

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const registeredStudents = useRef<RegisteredStudent[]>([]);
  const recognizedToday = useRef<Set<string>>(new Set());
  const detectionIntervalRef = useRef<number | null>(null);

  /* ============================================
     MODEL LOADING
     ============================================ */

  useEffect(() => {
    const loadModels = async () => {
      try {
        // Models are stored in public/models directory
        const MODEL_URL = "/models";

        // Load all required models in parallel
        await Promise.all([
          // TinyFaceDetector: Fast face detection
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          // FaceLandmark68Net: Facial landmark detection
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          // FaceRecognitionNet: Face descriptor extraction
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        console.log("[v0] Face detection models loaded successfully");
        setIsModelLoaded(true);
      } catch (err) {
        const errorMessage = "Failed to load face detection models";
        console.error("[v0] Model loading error:", err);
        setError(errorMessage);
      }
    };

    loadModels();
  }, []);

  /* ============================================
     STUDENT DATA LOADING
     ============================================ */

  const loadRegisteredStudents = useCallback(async () => {
    try {
      const response = await fetch("/api/students");
      const data = await response.json();

      // Filter students who have face descriptors registered
      registeredStudents.current = data.students
        .filter(
          (s: { face_descriptor: number[] | null }) =>
            s.face_descriptor && s.face_descriptor.length === 128
        )
        .map((s: { id: string; name: string; face_descriptor: number[] }) => ({
          id: s.id,
          name: s.name,
          descriptor: new Float32Array(s.face_descriptor),
        }));

      console.log(
        `[v0] Loaded ${registeredStudents.current.length} registered students`
      );
    } catch (err) {
      console.error("[v0] Failed to load registered students:", err);
    }
  }, []);

  /* ============================================
     CAMERA MANAGEMENT
     ============================================ */

  const startCamera = useCallback(
    async (videoElement: HTMLVideoElement) => {
      try {
        // Request camera access with preferred settings
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user", // Front camera
            frameRate: { ideal: 30 },
          },
          audio: false,
        });

        // Attach stream to video element
        videoElement.srcObject = stream;
        videoRef.current = videoElement;

        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          videoElement.onloadedmetadata = () => {
            videoElement.play();
            resolve();
          };
        });

        // Load registered students for matching
        await loadRegisteredStudents();

        console.log("[v0] Camera started successfully");
      } catch (err) {
        const errorMessage =
          "Failed to access camera. Please grant camera permissions.";
        console.error("[v0] Camera error:", err);
        setError(errorMessage);
      }
    },
    [loadRegisteredStudents]
  );

  const stopCamera = useCallback(() => {
    // Stop all media tracks
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => {
        track.stop();
        console.log(`[v0] Stopped track: ${track.kind}`);
      });
      videoRef.current.srcObject = null;
    }

    // Clear detection interval
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    setIsDetecting(false);
    setDetectedFaces([]);
    console.log("[v0] Camera stopped");
  }, []);

  /* ============================================
     FACE MATCHING ALGORITHM
     ============================================ */

  const findMatchingStudent = useCallback(
    (
      descriptor: Float32Array
    ): { student: RegisteredStudent | null; distance: number } => {
      let bestMatch: RegisteredStudent | null = null;
      let bestDistance = Infinity;

      // Compare against all registered students
      for (const student of registeredStudents.current) {
        // Calculate Euclidean distance between face descriptors
        const distance = faceapi.euclideanDistance(
          descriptor,
          student.descriptor
        );

        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = student;
        }
      }

      // Return match only if within threshold
      return {
        student: bestDistance < recognitionThreshold ? bestMatch : null,
        distance: bestDistance,
      };
    },
    [recognitionThreshold]
  );

  /* ============================================
     FACE DETECTION FUNCTION
     ============================================ */

  const detectFaces = useCallback(async () => {
    if (!videoRef.current || !isModelLoaded || !isDetecting) {
      return;
    }

    const video = videoRef.current;

    // Ensure video is ready
    if (video.readyState !== 4) {
      return;
    }

    try {
      // Detect all faces with landmarks and descriptors
      const detections = await faceapi
        .detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,      // Model input size
            scoreThreshold: 0.5, // Minimum confidence for detection
          })
        )
        .withFaceLandmarks()     // Add 68-point landmarks
        .withFaceDescriptors();  // Add 128-D descriptors

      const faces: DetectedFace[] = [];

      // Process each detected face
      for (const detection of detections) {
        const { x, y, width, height } = detection.detection.box;
        const descriptor = detection.descriptor;

        // Find matching student
        const { student, distance } = findMatchingStudent(
          new Float32Array(descriptor)
        );

        const isRecognized = student !== null;
        const confidence = isRecognized
          ? Math.max(0, (1 - distance) * 100)
          : 0;

        // Create face detection result
        faces.push({
          id: student?.id || `unknown-${Date.now()}-${Math.random()}`,
          name: student?.name || "Unknown",
          confidence: Math.round(confidence),
          box: { x, y, width, height },
          isRecognized,
        });

        // Trigger attendance marking for newly recognized faces
        if (
          isRecognized &&
          student &&
          !recognizedToday.current.has(student.id)
        ) {
          recognizedToday.current.add(student.id);
          onFaceRecognized?.(student.id, student.name);
          console.log(`[v0] Recognized: ${student.name} (${confidence.toFixed(1)}%)`);
        }
      }

      setDetectedFaces(faces);
    } catch (err) {
      console.error("[v0] Detection error:", err);
    }
  }, [isModelLoaded, isDetecting, findMatchingStudent, onFaceRecognized]);

  /* ============================================
     DETECTION CONTROL
     ============================================ */

  const startDetection = useCallback(
    (canvas: HTMLCanvasElement) => {
      canvasRef.current = canvas;
      setIsDetecting(true);

      // Clear daily recognition tracking (would reset at midnight in production)
      recognizedToday.current.clear();

      // Start detection loop
      detectionIntervalRef.current = window.setInterval(
        detectFaces,
        detectionInterval
      );

      console.log(`[v0] Detection started (interval: ${detectionInterval}ms)`);
    },
    [detectFaces, detectionInterval]
  );

  const stopDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setIsDetecting(false);
    setDetectedFaces([]);
    console.log("[v0] Detection stopped");
  }, []);

  /* ============================================
     FACE CAPTURE FOR REGISTRATION
     ============================================ */

  const captureFaceDescriptor = useCallback(async (): Promise<
    number[] | null
  > => {
    if (!videoRef.current || !isModelLoaded) {
      console.error("[v0] Cannot capture: video or model not ready");
      return null;
    }

    try {
      // Detect single face with higher accuracy settings
      const detection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,      // Higher resolution for registration
            scoreThreshold: 0.6, // Higher confidence required
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        console.log("[v0] Face descriptor captured successfully");
        return Array.from(detection.descriptor);
      }

      console.warn("[v0] No face detected for capture");
      return null;
    } catch (err) {
      console.error("[v0] Face capture error:", err);
      return null;
    }
  }, [isModelLoaded]);

  /* ============================================
     CLEANUP
     ============================================ */

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  /* ============================================
     RETURN HOOK VALUES
     ============================================ */

  return {
    isModelLoaded,
    isDetecting,
    detectedFaces,
    error,
    startCamera,
    stopCamera,
    startDetection,
    stopDetection,
    captureFaceDescriptor,
    loadRegisteredStudents,
  };
}
```

### 6.3 Face Matching Algorithm Details

The system uses **Euclidean Distance** to compare face descriptors:

```
Distance = √(Σ(a[i] - b[i])²) for i = 0 to 127
```

Where:
- `a` is the detected face descriptor (128 values)
- `b` is a registered student's descriptor (128 values)

**Threshold Interpretation:**

| Distance | Interpretation | Action |
|----------|----------------|--------|
| < 0.4 | Very high confidence match | Mark attendance |
| 0.4 - 0.6 | Good confidence match | Mark attendance |
| 0.6 - 0.8 | Low confidence | Show as unknown |
| > 0.8 | No match | Show as unknown |

### 6.4 Camera Feed Component

**File: `frontend/components/camera-feed.tsx`**

```typescript
"use client";

import { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  CameraOff,
  Loader2,
  User,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useFaceDetection } from "@/hooks/use-face-detection";
import { cn } from "@/lib/utils";

/* ============================================
   COMPONENT PROPS
   ============================================ */

interface CameraFeedProps {
  isActive: boolean;
  onToggle: () => void;
  onFaceRecognized: (studentId: string, studentName: string) => void;
}

/* ============================================
   MAIN COMPONENT
   ============================================ */

export function CameraFeed({
  isActive,
  onToggle,
  onFaceRecognized,
}: CameraFeedProps) {
  // Refs for video and canvas elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Track video dimensions for overlay positioning
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });

  // Use face detection hook
  const {
    isModelLoaded,
    isDetecting,
    detectedFaces,
    error,
    startCamera,
    stopCamera,
    startDetection,
    stopDetection,
  } = useFaceDetection({
    onFaceRecognized,
    recognitionThreshold: 0.6,
    detectionInterval: 500,
  });

  /* ============================================
     CAMERA LIFECYCLE
     ============================================ */

  useEffect(() => {
    if (isActive && videoRef.current && isModelLoaded) {
      // Start camera and detection
      startCamera(videoRef.current).then(() => {
        if (canvasRef.current) {
          startDetection(canvasRef.current);
        }
      });
    } else if (!isActive) {
      stopDetection();
    }

    return () => {
      stopDetection();
    };
  }, [isActive, isModelLoaded, startCamera, startDetection, stopDetection]);

  /* ============================================
     VIDEO METADATA HANDLER
     ============================================ */

  const handleVideoMetadata = () => {
    if (videoRef.current) {
      setDimensions({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      });
    }
  };

  /* ============================================
     RENDER COMPONENT
     ============================================ */

  return (
    <Card className="overflow-hidden">
      {/* Card Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              isActive && isDetecting ? "bg-success" : "bg-muted"
            )}
          >
            <Camera
              className={cn(
                "h-5 w-5",
                isActive && isDetecting
                  ? "text-success-foreground"
                  : "text-muted-foreground"
              )}
            />
          </div>
          <div>
            <CardTitle className="text-lg">Live Camera Feed</CardTitle>
            <p className="text-sm text-muted-foreground">
              {isActive && isDetecting
                ? "Detecting faces..."
                : "Camera inactive"}
            </p>
          </div>
        </div>

        {/* Status Badge & Toggle Button */}
        <div className="flex items-center gap-3">
          {isActive && isDetecting && (
            <Badge variant="default" className="bg-success">
              <span className="mr-1.5 h-2 w-2 rounded-full bg-white animate-pulse-dot" />
              Live
            </Badge>
          )}

          <Button
            variant={isActive ? "destructive" : "default"}
            size="sm"
            onClick={onToggle}
            disabled={!isModelLoaded}
          >
            {!isModelLoaded ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading Models...
              </>
            ) : isActive ? (
              <>
                <CameraOff className="mr-2 h-4 w-4" />
                Stop Camera
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Start Camera
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {/* Card Content */}
      <CardContent className="p-0">
        <div className="relative aspect-video bg-muted">
          {/* Error Display */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-center text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Inactive State */}
          {!isActive && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted-foreground/10">
                <Camera className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Click &quot;Start Camera&quot; to begin face detection
              </p>
            </div>
          )}

          {/* Video Element */}
          <video
            ref={videoRef}
            className={cn(
              "h-full w-full object-cover",
              !isActive && "hidden"
            )}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={handleVideoMetadata}
          />

          {/* Canvas for drawing (hidden) */}
          <canvas
            ref={canvasRef}
            className="hidden"
            width={dimensions.width}
            height={dimensions.height}
          />

          {/* Face Detection Overlay */}
          {isActive && (
            <div className="camera-overlay">
              {detectedFaces.map((face, index) => (
                <div key={`${face.id}-${index}`}>
                  {/* Bounding Box */}
                  <div
                    className={cn(
                      "face-box",
                      face.isRecognized
                        ? "face-box-recognized"
                        : "face-box-unknown"
                    )}
                    style={{
                      left: `${(face.box.x / dimensions.width) * 100}%`,
                      top: `${(face.box.y / dimensions.height) * 100}%`,
                      width: `${(face.box.width / dimensions.width) * 100}%`,
                      height: `${(face.box.height / dimensions.height) * 100}%`,
                    }}
                  >
                    {/* Name Label */}
                    <div
                      className={cn(
                        "face-label",
                        face.isRecognized
                          ? "face-label-recognized"
                          : "face-label-unknown"
                      )}
                    >
                      <span className="flex items-center gap-1">
                        {face.isRecognized ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        {face.name}
                        {face.isRecognized && (
                          <span className="ml-1 opacity-75">
                            ({face.confidence}%)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Detection Stats Overlay */}
          {isActive && isDetecting && (
            <div className="absolute bottom-3 left-3 rounded-lg bg-background/90 px-3 py-2 backdrop-blur-sm">
              <p className="text-xs font-medium">
                <span className="text-success">
                  {detectedFaces.filter((f) => f.isRecognized).length}
                </span>
                {" recognized, "}
                <span className="text-destructive">
                  {detectedFaces.filter((f) => !f.isRecognized).length}
                </span>
                {" unknown"}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 7. Feature Documentation

### 7.1 Dashboard Features

#### 7.1.1 Live Camera Feed
- Real-time webcam streaming using WebRTC
- Face detection at 2 FPS (configurable)
- Green bounding boxes for recognized students
- Red bounding boxes for unknown faces
- Name labels with confidence percentage
- Live detection statistics

#### 7.1.2 Statistics Cards
- Total registered students count
- Present students (marked before 9:15 AM)
- Late students (marked after 9:15 AM)
- Absent students (not marked)
- Overall attendance rate percentage
- Real-time updates via SWR polling

#### 7.1.3 Today's Attendance Table
- List of all attendance records for current day
- Student name, time marked, and status
- Color-coded status badges
- Auto-refresh every 3 seconds
- Scroll area for many records

### 7.2 Student Management Features

#### 7.2.1 Student List
- Display all registered students
- Search by name or roll number
- Filter by department
- Sortable columns
- Pagination for large datasets

#### 7.2.2 Add New Student
- Form with validation:
  - Full Name (required)
  - Email (required, valid format)
  - Department (required)
  - Roll Number (required, unique)
- Face registration option

#### 7.2.3 Face Registration Dialog
- Live camera preview
- Face detection indicator
- Capture button (enabled when face detected)
- Preview of captured face
- Retake option
- Save face descriptor to student record

#### 7.2.4 Edit Student
- Pre-filled form with existing data
- Update face descriptor option
- Validation on submit

#### 7.2.5 Delete Student
- Confirmation dialog
- Removes student and all attendance records
- Irreversible action warning

### 7.3 Attendance Reports Features

#### 7.3.1 Date Selection
- Calendar date picker
- Quick select: Today, Yesterday, This Week, This Month
- Custom date range selection

#### 7.3.2 Attendance Data Table
- All records for selected date/range
- Columns: Student, Department, Date, Time, Status
- Export to CSV functionality
- Print-friendly layout

#### 7.3.3 Visual Analytics
- **Pie Chart**: Present vs Late vs Absent distribution
- **Bar Chart**: Daily attendance trend
- **Summary Cards**: Key metrics

#### 7.3.4 Absent Students List
- Students who haven't marked attendance
- Department-wise grouping
- Useful for follow-up

---

## 8. API Documentation

### 8.1 Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.vercel.app/api
```

### 8.2 Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health check |
| GET | `/students` | List all students |
| GET | `/students/{id}` | Get student by ID |
| POST | `/students` | Create new student |
| PUT | `/students/{id}` | Update student |
| DELETE | `/students/{id}` | Delete student |
| GET | `/attendance` | List attendance records |
| POST | `/attendance` | Mark attendance |
| GET | `/attendance/stats` | Get attendance statistics |
| GET | `/attendance/report` | Generate attendance report |

### 8.3 Detailed API Specifications

#### 8.3.1 GET /health

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

#### 8.3.2 GET /students

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| department | string | No | Filter by department |

**Response:**
```json
{
  "students": [
    {
      "id": "uuid-here",
      "name": "Ahmed Khan",
      "email": "ahmed@university.edu",
      "department": "Computer Science",
      "roll_number": "CS-2024-001",
      "face_descriptor": [0.123, -0.456, ...], // 128 values or null
      "created_at": "2024-01-15T09:00:00"
    }
  ],
  "total": 5
}
```

#### 8.3.3 POST /students

**Request Body:**
```json
{
  "name": "New Student",
  "email": "student@university.edu",
  "department": "Computer Science",
  "roll_number": "CS-2024-006",
  "face_descriptor": [0.123, -0.456, ...] // Optional, 128 values
}
```

**Response:** (201 Created)
```json
{
  "id": "generated-uuid",
  "name": "New Student",
  "email": "student@university.edu",
  "department": "Computer Science",
  "roll_number": "CS-2024-006",
  "face_descriptor": [...],
  "created_at": "2024-01-15T10:30:00"
}
```

#### 8.3.4 POST /attendance

**Request Body:**
```json
{
  "student_id": "student-uuid",
  "student_name": "Ahmed Khan"
}
```

**Response:**
```json
{
  "record": {
    "id": "attendance-uuid",
    "student_id": "student-uuid",
    "student_name": "Ahmed Khan",
    "date": "2024-01-15",
    "time": "09:10:30",
    "status": "present"
  },
  "message": "Attendance marked as present",
  "is_duplicate": false
}
```

#### 8.3.5 GET /attendance/stats

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date_filter | string | No | Date in YYYY-MM-DD format |

**Response:**
```json
{
  "date": "2024-01-15",
  "total_students": 5,
  "present": 3,
  "late": 1,
  "absent": 1,
  "attendance_rate": 80.0,
  "present_students": ["Ahmed Khan", "Fatima Ali", "Muhammad Hassan"],
  "late_students": ["Ayesha Malik"]
}
```

---

## 9. Database Design

### 9.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      STUDENTS                           │
├─────────────────────────────────────────────────────────┤
│ id              : UUID (Primary Key)                    │
│ name            : VARCHAR(100) NOT NULL                 │
│ email           : VARCHAR(255) UNIQUE NOT NULL          │
│ department      : VARCHAR(100) NOT NULL                 │
│ roll_number     : VARCHAR(50) UNIQUE NOT NULL           │
│ face_descriptor : FLOAT[128] (Nullable)                 │
│ created_at      : TIMESTAMP NOT NULL                    │
└─────────────────────────────────────────────────────────┘
                            │
                            │ 1:N
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    ATTENDANCE                           │
├─────────────────────────────────────────────────────────┤
│ id              : UUID (Primary Key)                    │
│ student_id      : UUID (Foreign Key → Students)         │
│ student_name    : VARCHAR(100) NOT NULL                 │
│ date            : DATE NOT NULL                         │
│ time            : TIME NOT NULL                         │
│ status          : ENUM('present', 'late', 'absent')     │
├─────────────────────────────────────────────────────────┤
│ UNIQUE CONSTRAINT: (student_id, date)                   │
└─────────────────────────────────────────────────────────┘
```

### 9.2 Data Dictionary

#### 9.2.1 Students Table

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| name | VARCHAR(100) | NOT NULL | Full name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email address |
| department | VARCHAR(100) | NOT NULL | Department name |
| roll_number | VARCHAR(50) | UNIQUE, NOT NULL | Student roll number |
| face_descriptor | FLOAT[128] | NULLABLE | 128-dimensional face encoding |
| created_at | TIMESTAMP | NOT NULL | Record creation time |

#### 9.2.2 Attendance Table

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| student_id | UUID | FOREIGN KEY | Reference to student |
| student_name | VARCHAR(100) | NOT NULL | Denormalized for display |
| date | DATE | NOT NULL | Attendance date |
| time | TIME | NOT NULL | Time marked |
| status | ENUM | NOT NULL | present/late/absent |

### 9.3 Sample Data

```python
# Students
{
    "1": {"name": "Ahmed Khan", "department": "Computer Science", "roll_number": "CS-2024-001"},
    "2": {"name": "Fatima Ali", "department": "Computer Science", "roll_number": "CS-2024-002"},
    "3": {"name": "Muhammad Hassan", "department": "Software Engineering", "roll_number": "SE-2024-001"},
    "4": {"name": "Ayesha Malik", "department": "Data Science", "roll_number": "DS-2024-001"},
    "5": {"name": "Omar Farooq", "department": "Computer Science", "roll_number": "CS-2024-003"},
}
```

---

## 10. User Interface Design

### 10.1 Color Palette

| Color | OKLCH Value | Usage |
|-------|-------------|-------|
| Primary (Indigo) | `oklch(0.55 0.2 260)` | Main actions, navigation, branding |
| Success (Green) | `oklch(0.65 0.2 145)` | Recognized faces, present status |
| Warning (Amber) | `oklch(0.75 0.15 85)` | Late status, caution states |
| Destructive (Red) | `oklch(0.55 0.2 25)` | Unknown faces, absent status, delete |
| Background | `oklch(0.985 0.002 260)` | Page background |
| Card | `oklch(1 0 0)` | Card backgrounds |
| Muted | `oklch(0.45 0.02 260)` | Secondary text |

### 10.2 Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Headings | Poppins | 600-700 | 18-32px |
| Body | Inter | 400-500 | 14-16px |
| Labels | Inter | 500 | 12-14px |
| Code | System Mono | 400 | 14px |

### 10.3 Component Library

The UI is built using **shadcn/ui** components:

| Component | Usage |
|-----------|-------|
| Button | Actions and navigation |
| Card | Content containers |
| Table | Data display |
| Dialog | Modals and forms |
| Input | Text entry |
| Badge | Status indicators |
| Tabs | Page sections |
| ScrollArea | Scrollable containers |
| Sonner (Toast) | Notifications |

### 10.4 Responsive Design

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Single column, stacked cards |
| Tablet | 640-1024px | Two column grid |
| Desktop | > 1024px | Full layout, side panels |

---

## 11. System Flow

### 11.1 User Registration Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Admin     │────►│  Fill Form  │────►│  Capture    │────►│   Save      │
│   Opens     │     │  (Details)  │     │   Face      │     │  Student    │
│   Dialog    │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │  Extract    │
                                        │  128-D      │
                                        │  Descriptor │
                                        └─────────────┘
```

### 11.2 Attendance Marking Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Camera    │────►│   Detect    │────►│   Compare   │────►│   Match     │
│   Frame     │     │   Face(s)   │     │   with DB   │     │   Found?    │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                   │
                                        ┌──────────────────────────┼──────────────────────────┐
                                        ▼                          ▼                          ▼
                                 ┌─────────────┐            ┌─────────────┐            ┌─────────────┐
                                 │    YES      │            │    NO       │            │  Multiple   │
                                 │ Mark Attend │            │ Show Red    │            │  Matches    │
                                 │ Show Green  │            │   Box       │            │ Best Match  │
                                 └─────────────┘            └─────────────┘            └─────────────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │   Update    │
                                 │ Dashboard   │
                                 │   Stats     │
                                 └─────────────┘
```

### 11.3 Report Generation Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Select    │────►│   Query     │────►│   Process   │────►│  Display    │
│   Date      │     │   API       │     │   Data      │     │  Charts     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                                                                   ▼
                                                            ┌─────────────┐
                                                            │  Export     │
                                                            │  CSV        │
                                                            └─────────────┘
```

---

## 12. Code Implementation

### 12.1 Statistics Cards Component

**File: `frontend/components/stats-cards.tsx`**

```typescript
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, Clock, UserX, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardsProps {
  stats: {
    total_students: number;
    present: number;
    late: number;
    absent: number;
    attendance_rate: number;
  } | undefined;
}

const statsConfig = [
  {
    key: "total_students",
    label: "Total Students",
    icon: Users,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    key: "present",
    label: "Present",
    icon: UserCheck,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    key: "late",
    label: "Late",
    icon: Clock,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    key: "absent",
    label: "Absent",
    icon: UserX,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
];

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* Individual Stat Cards */}
      {statsConfig.map((config) => {
        const Icon = config.icon;
        const value = stats?.[config.key as keyof typeof stats] ?? 0;

        return (
          <Card key={config.key}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    config.bgColor
                  )}
                >
                  <Icon className={cn("h-6 w-6", config.color)} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {config.label}
                  </p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Attendance Rate Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Attendance Rate
              </p>
              <p className="text-2xl font-bold">
                {stats?.attendance_rate ?? 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 12.2 Attendance Table Component

**File: `frontend/components/attendance-table.tsx`**

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList, Clock } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name: string;
  date: string;
  time: string;
  status: "present" | "late" | "absent";
}

interface AttendanceTableProps {
  records: AttendanceRecord[];
  title?: string;
}

const statusConfig = {
  present: {
    label: "Present",
    variant: "default" as const,
    className: "bg-success hover:bg-success/80",
  },
  late: {
    label: "Late",
    variant: "default" as const,
    className: "bg-warning hover:bg-warning/80 text-warning-foreground",
  },
  absent: {
    label: "Absent",
    variant: "destructive" as const,
    className: "",
  },
};

export function AttendanceTable({
  records,
  title = "Attendance Records",
}: AttendanceTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {records.length} record{records.length !== 1 ? "s" : ""}
          </p>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                No attendance records yet
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const config = statusConfig[record.status];

                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.student_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatTime(record.time)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={config.variant}
                          className={cn(config.className)}
                        >
                          {config.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

### 12.3 Navigation Component

**File: `frontend/components/navigation.tsx`**

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Users, FileText, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Live camera and stats",
  },
  {
    href: "/students",
    label: "Students",
    icon: Users,
    description: "Manage students",
  },
  {
    href: "/reports",
    label: "Reports",
    icon: FileText,
    description: "Attendance reports",
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
              <Camera className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-foreground">
                Smart Attendance
              </h1>
              <p className="text-xs text-muted-foreground">
                Face Recognition System
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
```

### 12.4 Vercel Configuration

**File: `vercel.json`**

```json
{
  "experimentalServices": {
    "backend": {
      "entrypoint": "backend/main.py",
      "routePrefix": "/api"
    },
    "frontend": {
      "entrypoint": "frontend/package.json"
    }
  }
}
```

---

## 13. Testing

### 13.1 Testing Strategy

| Test Type | Tools | Coverage |
|-----------|-------|----------|
| Unit Tests | Jest, React Testing Library | Components, Hooks, Utils |
| Integration Tests | Pytest, HTTPX | API Endpoints |
| E2E Tests | Playwright | Full user flows |
| Manual Testing | Browser DevTools | Face recognition accuracy |

### 13.2 Sample Unit Test

```typescript
// __tests__/components/stats-cards.test.tsx
import { render, screen } from "@testing-library/react";
import { StatsCards } from "@/components/stats-cards";

describe("StatsCards", () => {
  const mockStats = {
    total_students: 50,
    present: 40,
    late: 5,
    absent: 5,
    attendance_rate: 90.0,
  };

  it("renders all statistics correctly", () => {
    render(<StatsCards stats={mockStats} />);

    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("handles undefined stats gracefully", () => {
    render(<StatsCards stats={undefined} />);

    expect(screen.getAllByText("0")).toHaveLength(4);
  });
});
```

### 13.3 Sample API Test

```python
# tests/test_api.py
import pytest
from httpx import AsyncClient
from backend.main import app

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_get_students():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/students")
        assert response.status_code == 200
        assert "students" in response.json()

@pytest.mark.asyncio
async def test_mark_attendance():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/attendance",
            json={"student_id": "1", "student_name": "Test Student"}
        )
        assert response.status_code == 200
        assert response.json()["record"]["status"] in ["present", "late"]
```

### 13.4 Face Recognition Testing

| Test Case | Expected Result | Actual Result |
|-----------|-----------------|---------------|
| Single registered face | Detected, name shown, attendance marked | Pass |
| Multiple faces (all registered) | All detected with names | Pass |
| Unknown face | Red box, "Unknown" label | Pass |
| Mixed faces | Registered green, unknown red | Pass |
| No face in frame | No bounding boxes | Pass |
| Poor lighting | Detection may fail | Expected behavior |
| Side profile | Detection confidence lower | Expected behavior |

---

## 14. Installation and Deployment

### 14.1 Prerequisites

- Node.js 18+ 
- Python 3.12+
- pnpm (recommended) or npm
- Modern browser (Chrome, Firefox, Edge)
- Webcam access

### 14.2 Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-repo/smart-attendance.git
cd smart-attendance

# 2. Install frontend dependencies
cd frontend
pnpm install
cd ..

# 3. Install backend dependencies
cd backend
uv sync
cd ..

# 4. Download face-api.js models
# Place in frontend/public/models/
# Download from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

# 5. Start development server
vercel dev
```

### 14.3 Vercel Deployment

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel

# 4. Production deployment
vercel --prod
```

### 14.4 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| None required | - | System uses in-memory storage |

For production with persistent database:

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| REDIS_URL | No | Redis for session caching |

### 14.5 Face-API.js Model Files

Download these models to `frontend/public/models/`:

```
models/
├── tiny_face_detector_model-weights_manifest.json
├── tiny_face_detector_model-shard1
├── face_landmark_68_model-weights_manifest.json
├── face_landmark_68_model-shard1
├── face_recognition_model-weights_manifest.json
└── face_recognition_model-shard1
```

---

## 15. Future Enhancements

### 15.1 Technical Improvements

1. **Persistent Database Integration**
   - PostgreSQL for production data
   - Redis for session caching
   - Database migrations with Alembic

2. **Enhanced Face Recognition**
   - Anti-spoofing (liveness detection)
   - Face quality assessment
   - Multiple face samples per student

3. **Performance Optimizations**
   - WebAssembly face detection
   - Edge computing integration
   - Progressive Web App (PWA)

### 15.2 Feature Additions

1. **Multi-Camera Support**
   - Support for multiple classroom cameras
   - Camera management interface

2. **Advanced Reporting**
   - Weekly/Monthly reports
   - Email notifications
   - PDF export

3. **Integration Capabilities**
   - LMS integration (Moodle, Canvas)
   - Student information system sync
   - Mobile app companion

### 15.3 Security Enhancements

1. **Authentication**
   - Admin login system
   - Role-based access control
   - Audit logging

2. **Data Protection**
   - Face descriptor encryption
   - GDPR compliance
   - Data retention policies

---

## 16. Conclusion

The Smart Face Recognition Attendance System successfully demonstrates the application of modern web technologies and machine learning for automating attendance tracking. Key achievements include:

1. **Real-Time Face Detection**: Achieved smooth face detection at 2 FPS in the browser using TensorFlow.js, eliminating server-side processing requirements.

2. **High Accuracy Recognition**: The face matching algorithm using 128-dimensional descriptors provides reliable student identification with configurable threshold tuning.

3. **Modern Architecture**: The microservices architecture with FastAPI and Next.js provides a scalable, maintainable foundation that can be extended with persistent storage and additional features.

4. **User-Friendly Interface**: The intuitive dashboard, student management, and reporting interfaces make the system accessible to administrators without technical expertise.

5. **Production Ready**: Built with industry-standard practices including TypeScript, proper error handling, responsive design, and accessibility considerations.

The system serves as a solid foundation for educational institutions looking to modernize their attendance tracking while providing a practical demonstration of integrating AI/ML capabilities into web applications.

---

## 17. References

### 17.1 Documentation Links

1. **Next.js Documentation**: https://nextjs.org/docs
2. **React Documentation**: https://react.dev
3. **FastAPI Documentation**: https://fastapi.tiangolo.com
4. **face-api.js GitHub**: https://github.com/justadudewhohacks/face-api.js
5. **TensorFlow.js Documentation**: https://www.tensorflow.org/js
6. **Tailwind CSS Documentation**: https://tailwindcss.com/docs
7. **shadcn/ui Documentation**: https://ui.shadcn.com

### 17.2 Research Papers

1. Schroff, F., Kalenichenko, D., & Philbin, J. (2015). "FaceNet: A Unified Embedding for Face Recognition and Clustering." IEEE CVPR.

2. Zhang, K., Zhang, Z., Li, Z., & Qiao, Y. (2016). "Joint Face Detection and Alignment Using Multitask Cascaded Convolutional Networks."

### 17.3 Libraries Used

| Library | Version | License |
|---------|---------|---------|
| Next.js | 15.x | MIT |
| React | 19.x | MIT |
| FastAPI | 0.115.x | MIT |
| face-api.js | 0.22.2 | MIT |
| TensorFlow.js | 4.x | Apache 2.0 |
| Tailwind CSS | 4.x | MIT |
| Recharts | 2.x | MIT |

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Author:** [Your Name]  
**Institution:** [Your University]  
**Supervisor:** [Supervisor Name]

---

*This document is part of the Final Year Project submission for the Bachelor of Science in Computer Science program.*
