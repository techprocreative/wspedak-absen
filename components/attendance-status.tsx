"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, User } from "lucide-react"

interface AttendanceStatusProps {
  attendance: {
    type: "masuk" | "keluar"
    time: string
    employee: string
  }
}

export function AttendanceStatus({ attendance }: AttendanceStatusProps) {
  const isClockIn = attendance.type === "masuk"

  return (
    <Card className="bg-emerald-900/20 border-emerald-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          Absensi Berhasil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Karyawan:</span>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            <span className="text-white font-medium">{attendance.employee}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Waktu:</span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="text-white font-medium">{attendance.time}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Status:</span>
          <Badge
            className={
              isClockIn
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : "bg-blue-500/20 text-blue-400 border-blue-500/30"
            }
          >
            {isClockIn ? "Masuk Kerja" : "Pulang Kerja"}
          </Badge>
        </div>

        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
          <p className="text-sm text-slate-300 text-center">
            {isClockIn
              ? "Selamat bekerja! Semoga hari Anda produktif."
              : "Terima kasih atas kerja keras Anda hari ini. Selamat beristirahat!"}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
