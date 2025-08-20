import { NextRequest, NextResponse } from 'next/server'
import connectMongoDB from '@/lib/mongodb'
import Token from '@/models/Token'
import { requireAuth } from '@/lib/session'

// DELETE /api/tokens/[id] - Revoke a token
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    await connectMongoDB()

    const token = await Token.findOne({ 
      _id: params.id, 
      userId: session.user?.email 
    })

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token not found' },
        { status: 404 }
      )
    }

    await Token.deleteOne({ _id: params.id })

    return NextResponse.json({ 
      success: true, 
      message: 'Token revoked successfully' 
    })
  } catch (error) {
    console.error('Error revoking token:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to revoke token' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// PUT /api/tokens/[id] - Update token name
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const token = await Token.findOne({ 
      _id: params.id, 
      userId: session.user?.email 
    })

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token not found' },
        { status: 404 }
      )
    }

    // Check if new name conflicts with existing tokens
    const existingToken = await Token.findOne({
      userId: session.user?.email,
      name: name.trim(),
      _id: { $ne: params.id } // Exclude current token
    })

    if (existingToken) {
      return NextResponse.json(
        { success: false, error: 'Token name already exists' },
        { status: 409 }
      )
    }

    token.name = name.trim()
    const updatedToken = await token.save()

    return NextResponse.json({ 
      success: true, 
      data: {
        id: updatedToken._id,
        name: updatedToken.name,
        createdAt: updatedToken.createdAt,
        updatedAt: updatedToken.updatedAt,
      }
    })
  } catch (error) {
    console.error('Error updating token:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update token' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

