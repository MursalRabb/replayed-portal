import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function getServerSession() {
  return await auth()
}

export async function requireAuth() {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }
  
  return session
}
