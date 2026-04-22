'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import { 
  ClipboardList, 
  Calendar as CalendarIcon, 
  Download, 
  UserCheck, 
  Clock, 
  UserX,
  TrendingUp 
} from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import { apiUrl } from '@/lib/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface AttendanceRecord {
  id: string
  studentDbId: string
  studentName: string
  date: string
  time: string
  status: 'present' | 'late'
}

interface Student {
  id: string
  name: string
  studentId: string
  department: string
}

export default function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const formattedDate = format(selectedDate, 'yyyy-MM-dd')

  const { data: attendanceData } = useSWR<{ attendance: AttendanceRecord[] }>(
    apiUrl(`/attendance?date=${formattedDate}`),
    fetcher
  )
  const { data: allAttendance } = useSWR<{ attendance: AttendanceRecord[] }>(
    apiUrl('/attendance'),
    fetcher
  )
  const { data: studentsData } = useSWR<{ students: Student[] }>(apiUrl('/students'), fetcher)
  const { data: statsData } = useSWR(apiUrl('/attendance/stats'), fetcher)

  const attendance = attendanceData?.attendance ?? []
  const students = studentsData?.students ?? []
  const allRecords = allAttendance?.attendance ?? []

  const presentCount = attendance.filter(r => r.status === 'present').length
  const lateCount = attendance.filter(r => r.status === 'late').length
  const absentCount = students.length - presentCount - lateCount

  // Pie chart data
  const pieData = [
    { name: 'Present', value: presentCount, color: '#22c55e' },
    { name: 'Late', value: lateCount, color: '#eab308' },
    { name: 'Absent', value: absentCount, color: '#ef4444' },
  ].filter(d => d.value > 0)

  // Weekly attendance data (mock for demo)
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const weeklyData = weekDays.map((day, index) => {
    // Generate some sample data
    const present = Math.floor(Math.random() * 3) + 2
    const late = Math.floor(Math.random() * 2)
    return {
      day,
      Present: present,
      Late: late,
      Absent: students.length - present - late,
    }
  })

  // Get students who are absent today
  const presentStudentIds = new Set(attendance.map(r => r.studentDbId))
  const absentStudents = students.filter(s => !presentStudentIds.has(s.id))

  const downloadCSV = () => {
    const headers = ['Name', 'Student ID', 'Time', 'Status', 'Date']
    const rows = attendance.map(r => {
      const student = students.find(s => s.id === r.studentDbId)
      return [
        r.studentName,
        student?.studentId ?? 'N/A',
        r.time,
        r.status,
        r.date,
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${formattedDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Toaster position="top-right" />
      
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Attendance Reports
            </h1>
            <p className="mt-1 text-muted-foreground">
              View and analyze attendance records
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="size-4" />
                  {format(selectedDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button onClick={downloadCSV} className="gap-2">
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="py-4">
            <CardContent className="flex items-center gap-4 px-4">
              <div className="rounded-xl bg-primary/10 p-3">
                <ClipboardList className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="flex items-center gap-4 px-4">
              <div className="rounded-xl bg-success/10 p-3">
                <UserCheck className="size-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{presentCount}</p>
                <p className="text-sm text-muted-foreground">Present</p>
              </div>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="flex items-center gap-4 px-4">
              <div className="rounded-xl bg-warning/10 p-3">
                <Clock className="size-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lateCount}</p>
                <p className="text-sm text-muted-foreground">Late</p>
              </div>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="flex items-center gap-4 px-4">
              <div className="rounded-xl bg-destructive/10 p-3">
                <UserX className="size-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{absentCount}</p>
                <p className="text-sm text-muted-foreground">Absent</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {/* Pie Chart */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-5 text-primary" />
                Attendance Distribution
              </CardTitle>
              <CardDescription>
                {format(selectedDate, 'MMMM d, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                  No attendance data for this date
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bar Chart */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-5 text-primary" />
                Weekly Overview
              </CardTitle>
              <CardDescription>
                Attendance trends this week
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="Present" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Late" fill="#eab308" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tables Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Attendance Records */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>
                {format(selectedDate, 'MMMM d, yyyy')} - {attendance.length} records
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        No attendance records for this date.
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.studentName}</TableCell>
                        <TableCell className="text-muted-foreground">{record.time}</TableCell>
                        <TableCell>
                          {record.status === 'present' ? (
                            <Badge className="gap-1 bg-success text-success-foreground hover:bg-success/90">
                              <UserCheck className="size-3" />
                              Present
                            </Badge>
                          ) : (
                            <Badge className="gap-1 bg-warning text-warning-foreground hover:bg-warning/90">
                              <Clock className="size-3" />
                              Late
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Absent Students */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle>Absent Students</CardTitle>
              <CardDescription>
                {format(selectedDate, 'MMMM d, yyyy')} - {absentStudents.length} absent
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Department</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absentStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        All students are present!
                      </TableCell>
                    </TableRow>
                  ) : (
                    absentStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="text-muted-foreground">{student.studentId}</TableCell>
                        <TableCell className="text-muted-foreground">{student.department}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
