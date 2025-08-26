import { NextRequest, NextResponse } from 'next/server'
import connectMongoDB from '@/lib/mongodb'
import Token from '@/models/Token'
import { requireAuth } from '@/lib/session'
import { generateToken, hashToken, verifyToken } from '@/lib/tokens'

// GET /api/tokens - Get all tokens for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    await connectMongoDB()

    const tokens = await Token.find({ userId: session.user?.email })
      .select('-hashedToken') // Don't return the hashed token for security
      .sort({ createdAt: -1 })

    return NextResponse.json({ success: true, data: tokens })
  } catch (error) {
    console.error('Error fetching tokens:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tokens' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// POST /api/tokens - Create a new token
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { name } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Token name is required' },
        { status: 400 }
      )
    }

    await connectMongoDB()

    // Check if token name already exists for this user
    const existingToken = await Token.findOne({ 
      userId: session.user?.email,
      name: name.trim()
    })

    if (existingToken) {
      return NextResponse.json(
        { success: false, error: 'Token name already exists' },
        { status: 409 }
      )
    }

    // Generate new JWT token
    const token = generateToken({
      userId: session.user?.email!,
      email: session.user?.email!,
    })

    // Extract tokenId from the generated token for database storage
    const payload = verifyToken(token)

    // Hash the token for storage
    const hashedToken = hashToken(token)

    // Save token to database
    console.log('payload', payload)
    const tokenDoc = new Token({
      userId: session.user?.email,
      name: name.trim(),
      tokenId: payload.tokenId,
      hashedToken,
    })

    const savedToken = await tokenDoc.save()

    // Return the raw token only once (for CLI to save)
    return NextResponse.json({ 
      success: true, 
      data: {
        id: savedToken._id,
        name: savedToken.name,
        token, // Raw token - only returned once
        createdAt: savedToken.createdAt,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating token:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create token' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

