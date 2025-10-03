"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FaceRecognitionCamera } from '@/components/face-recognition-camera'
import { FaceEmbedding } from '@/lib/face-recognition'
import { faceService } from '@/lib/face-service'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle } from 'lucide-react'

interface FaceEnrollmentModalProps {
  userId: string
  userName?: string
  onClose: () => void
  targetSamples?: number
}

export function FaceEnrollmentModal({ userId, userName, onClose, targetSamples = 3 }: FaceEnrollmentModalProps) {
  const [saved, setSaved] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleEnrolled = async (embedding: FaceEmbedding) => {
    setError(null)
    const ok = await faceService.enrollFace(embedding)
    if (!ok) {
      setError('Gagal menyimpan embedding ke server. Coba lagi.')
      return
    }
    setSaved((n) => {
      const next = n + 1
      if (next >= targetSamples) setDone(true)
      return next
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="bg-transparent border-0">
          <CardHeader>
            <CardTitle className="text-white">
              Enroll Wajah {userName ? `- ${userName}` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-slate-300 text-sm">
              Ambil {targetSamples} sampel wajah berkualitas baik untuk meningkatkan akurasi.
            </div>

            <div className="text-slate-300 text-sm">Progress: {saved} / {targetSamples}</div>

            {error && (
              <Alert className="border-red-500 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            {done ? (
              <Alert className="border-green-500 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-400">Enrollment selesai.</AlertDescription>
              </Alert>
            ) : null}

            {!done && (
              <FaceRecognitionCamera
                mode="enrollment"
                userId={userId}
                onEnrolled={handleEnrolled}
                enableHardwareOptimizations={true}
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                {done ? 'Tutup' : 'Batal'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

