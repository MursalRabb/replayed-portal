import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { verifyAuth } from '@/lib/authMiddleware'

export interface AuthResult {
  success: true
  user: {
    id: string
    email: string
    name: string
    image?: string
  }
  source: 'session' | 'token'
}

export interface AuthError {
  success: false
  error: string
  status: number
}

/**
 * Hybrid authentication that supports both NextAuth sessions and CLI Bearer tokens
 * Tries session auth first, then falls back to token auth
 */
export async function hybridAuth(request: NextRequest): Promise<AuthResult | AuthError> {
  // First, try NextAuth session (for web portal)
  try {
    const session = await auth()
    if (session?.user?.email) {
      return {
        success: true,
        user: {
          id: session.user.email, // Using email as ID for consistency
          email: session.user.email,
          name: session.user.name || session.user.email,
          image: session.user.image!,
        },
        source: 'session'
      }
    }
  } catch (error) {
    // Session auth failed, continue to token auth
  }

  // Second, try Bearer token auth (for CLI)
  const authResult = await verifyAuth(request)
  if (authResult.success) {
    return {
      success: true,
      user: {
        id: authResult.user.email,
        email: authResult.user.email,
        name: authResult.user.name,
        image: authResult.user.image,
      },
      source: 'token'
    }
  }

  // Both auth methods failed
  return {
    success: false,
    error: 'Authentication required. Please login via web portal or provide a valid Bearer token.',
    status: 401
  }
}

/**
 * Helper function to handle auth errors consistently
 */
export function handleHybridAuthError(authResult: AuthError) {
  return new Response(
    JSON.stringify({ success: false, error: authResult.error }),
    { 
      status: authResult.status,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}
