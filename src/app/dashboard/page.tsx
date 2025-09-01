"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Dashboard from "@/components/Dashboard"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }

    // Track new user signup with Reddit Pixel
    if ((session as unknown as { isNewUser: boolean })?.isNewUser && (session as unknown as { userEmail: unknown })?.userEmail) {
      // Use advanced matching for better attribution
      if (typeof window !== 'undefined' && window.rdt) {
        window.rdt('track', 'SignUp', {
          email: (session as unknown as { userEmail: unknown }).userEmail as string
        })
      }
    }

    setIsLoading(false)
  }, [session, status, router])

  if (isLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return <Dashboard />
}
