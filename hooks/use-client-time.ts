"use client"

import { useState, useEffect } from "react"

/**
 * Custom hook for client-side only time rendering to prevent hydration mismatches.
 * This hook ensures that time is only rendered on the client side after hydration,
 * preventing the "Text content does not match server-rendered HTML" error.
 */
export function useClientTime() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Set isClient to true only after component mounts on client
    setIsClient(true)
    setCurrentTime(new Date())

    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [])

  // Format functions that handle null state
  const formatDate = (date: Date | null) => {
    if (!date) return ""
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (date: Date | null) => {
    if (!date) return ""
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatTimeWithoutSeconds = (date: Date | null) => {
    if (!date) return ""
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return {
    currentTime,
    isClient,
    formatDate,
    formatTime,
    formatTimeWithoutSeconds,
  }
}