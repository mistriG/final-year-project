'use client'

import { useState, useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import { apiUrl } from '@/lib/api'
import { 
  Users, 
  Plus, 
  Camera, 
  Trash2, 
  Edit, 
  CheckCircle, 
  XCircle,
  Search,
  Loader2 
} from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { FaceRegistrationDialog } from '@/components/face-registration-dialog'
import { useFaceDetection } from '@/hooks/use-face-detection'

interface NetworkCamera {
  id: string
  name: string
  url: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface Student {
  id: string
  name: string
  studentId: string
  department: string
  email: string
  enrolledAt: string
  faceDescriptor: number[] | null
}

export default function StudentsPage() {
  const { data, isLoading } = useSWR<{ students: Student[] }>(apiUrl('/students'), fetcher)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isFaceDialogOpen, setIsFaceDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    department: '',
    email: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load network cameras from localStorage
  useEffect(() => {
    const savedCameras = localStorage.getItem('networkCameras')
    if (savedCameras) {
      try {
        setNetworkCameras(JSON.parse(savedCameras))
      } catch (error) {
        console.error('Failed to parse saved network cameras:', error)
      }
    }
  }, [])

  // Camera selection for face registration
  const [networkCameras, setNetworkCameras] = useState<NetworkCamera[]>([])
  const { selectedDeviceId } = useFaceDetection(networkCameras)

  const students = data?.students ?? []
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.department.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAdd = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(apiUrl('/students'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      if (response.ok) {
        toast.success('Student added successfully')
        mutate(apiUrl('/students'))
        mutate(apiUrl('/attendance/stats'))
        setIsAddDialogOpen(false)
        setFormData({ name: '', studentId: '', department: '', email: '' })
      }
    } catch {
      toast.error('Failed to add student')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedStudent) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch(apiUrl(`/students/${selectedStudent.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      if (response.ok) {
        toast.success('Student updated successfully')
        mutate(apiUrl('/students'))
        setIsEditDialogOpen(false)
        setSelectedStudent(null)
      }
    } catch {
      toast.error('Failed to update student')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedStudent) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch(apiUrl(`/students/${selectedStudent.id}`), {
        method: 'DELETE',
      })
      
      if (response.ok) {
        toast.success('Student deleted successfully')
        mutate(apiUrl('/students'))
        mutate(apiUrl('/attendance/stats'))
        setIsDeleteDialogOpen(false)
        setSelectedStudent(null)
      }
    } catch {
      toast.error('Failed to delete student')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (student: Student) => {
    setSelectedStudent(student)
    setFormData({
      name: student.name,
      studentId: student.studentId,
      department: student.department,
      email: student.email,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (student: Student) => {
    setSelectedStudent(student)
    setIsDeleteDialogOpen(true)
  }

  const openFaceDialog = (student: Student) => {
    setSelectedStudent(student)
    setIsFaceDialogOpen(true)
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
              Student Management
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage enrolled students and face registrations
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="size-4" />
            Add Student
          </Button>
        </div>

        {/* Stats Card */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="py-4">
            <CardContent className="flex items-center gap-4 px-4">
              <div className="rounded-xl bg-primary/10 p-3">
                <Users className="size-6 text-primary" />
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
                <CheckCircle className="size-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {students.filter(s => s.faceDescriptor).length}
                </p>
                <p className="text-sm text-muted-foreground">Face Registered</p>
              </div>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="flex items-center gap-4 px-4">
              <div className="rounded-xl bg-warning/10 p-3">
                <XCircle className="size-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {students.filter(s => !s.faceDescriptor).length}
                </p>
                <p className="text-sm text-muted-foreground">Pending Registration</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Table */}
        <Card>
          <CardHeader className="border-b pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Students List</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Face Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        {searchQuery ? 'No students found matching your search.' : 'No students enrolled yet.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.studentId}</TableCell>
                        <TableCell>{student.department}</TableCell>
                        <TableCell>
                          {student.faceDescriptor ? (
                            <Badge className="gap-1 bg-success text-success-foreground hover:bg-success/90">
                              <CheckCircle className="size-3" />
                              Registered
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <XCircle className="size-3" />
                              Not Registered
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openFaceDialog(student)}
                              title="Register Face"
                            >
                              <Camera className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditDialog(student)}
                              title="Edit"
                            >
                              <Edit className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openDeleteDialog(student)}
                              title="Delete"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Enter the student details below to add them to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="studentId">Student ID</Label>
              <Input
                id="studentId"
                value={formData.studentId}
                onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                placeholder="STU001"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                placeholder="Computer Science"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john.doe@university.edu"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Add Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update the student details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-studentId">Student ID</Label>
              <Input
                id="edit-studentId"
                value={formData.studentId}
                onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-department">Department</Label>
              <Input
                id="edit-department"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedStudent?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Face Registration Dialog */}
      {selectedStudent && (
        <FaceRegistrationDialog
          open={isFaceDialogOpen}
          onOpenChange={setIsFaceDialogOpen}
          student={selectedStudent}
          selectedDeviceId={selectedDeviceId}
          networkCameras={networkCameras}
          onSuccess={() => {
            mutate(apiUrl('/students'))
            setIsFaceDialogOpen(false)
            setSelectedStudent(null)
          }}
        />
      )}
    </div>
  )
}
