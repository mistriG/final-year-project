'use client'

import { UserCheck, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiUrl } from '@/lib/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface AttendanceRecord {
  id: string
  studentDbId: string
  studentName: string
  date: string
  time: string
  status: 'present' | 'late'
}

export function AttendanceTable() {
  const { data } = useSWR<{ attendance: AttendanceRecord[], date: string }>(
    apiUrl('/attendance/today'),
    fetcher,
    { refreshInterval: 3000 }
  )

  const attendance = data?.attendance ?? []

  return (
    <Card className="flex flex-col">
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="size-5 text-primary" />
          {"Today's Attendance"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[400px]">
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
                    No attendance records for today yet.
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
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
