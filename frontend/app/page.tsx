'use client'

import { useCallback, useRef } from 'react'
import { mutate } from 'swr'
import { apiUrl } from '@/lib/api'
import { Navigation } from '@/components/navigation'
import { CameraFeed } from '@/components/camera-feed'
import { StatsCards } from '@/components/stats-cards'
import { AttendanceTable } from '@/components/attendance-table'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

export default function DashboardPage() {
  const markedStudents = useRef<Set<string>>(new Set())

  const handleFaceDetected = useCallback(async (studentId: string, studentName: string) => {
    // Prevent marking same student multiple times in quick succession
    if (markedStudents.current.has(studentId)) {
      return
    }
    
    markedStudents.current.add(studentId)
    
    // Clear after 5 seconds to allow re-marking if needed
    setTimeout(() => {
      markedStudents.current.delete(studentId)
    }, 5000)

    try {
      const response = await fetch(apiUrl('/attendance'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentDbId: studentId,
          studentName: studentName,
        }),
      })

      const data = await response.json()
      
      if (data.message === 'Attendance marked') {
        toast.success(`Attendance marked for ${studentName}`, {
          description: `Status: ${data.attendance.status === 'present' ? 'Present' : 'Late'}`,
        })
        
        // Refresh attendance data
        mutate(apiUrl('/attendance/today'))
        mutate(apiUrl('/attendance/stats'))
      }
    } catch (error) {
      console.error('Failed to mark attendance:', error)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Toaster position="top-right" />
      
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Attendance Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Real-time face recognition attendance tracking
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-6">
          <StatsCards />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Camera Feed */}
          <CameraFeed onFaceDetected={handleFaceDetected} />
          
          {/* Today's Attendance */}
          <AttendanceTable />
        </div>
      </main>
    </div>
  )
}
