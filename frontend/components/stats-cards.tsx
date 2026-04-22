'use client'

import { Users, UserCheck, Clock, UserX } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { apiUrl } from '@/lib/api'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function StatsCards() {
  const { data: stats } = useSWR(apiUrl('/attendance/stats'), fetcher, {
    refreshInterval: 5000
  })

  const cards = [
    {
      label: 'Total Students',
      value: stats?.totalStudents ?? 0,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Present',
      value: stats?.present ?? 0,
      icon: UserCheck,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Late',
      value: stats?.late ?? 0,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Absent',
      value: stats?.absent ?? 0,
      icon: UserX,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="py-4">
          <CardContent className="flex items-center gap-4 px-4">
            <div className={`rounded-xl p-3 ${card.bgColor}`}>
              <card.icon className={`size-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm text-muted-foreground">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
