import { NextRequest, NextResponse } from 'next/server'
import connectMongoDB from '@/lib/mongodb'
import Folder from '@/models/Folder'
import { requireAuth } from '@/lib/session'
import { hybridAuth, handleHybridAuthError } from '@/lib/hybridAuth'

// GET /api/folders - Get all folders for the authenticated user (supports both web portal and CLI)
export async function GET(request: NextRequest) {
  try {
    // Use hybrid authentication to support both web portal and CLI
    const authResult = await hybridAuth(request)
    
    if (!authResult.success) {
      return handleHybridAuthError(authResult)
    }

    await connectMongoDB()

    const folders = await Folder.find({ userId: authResult.user.email })
      .sort({ createdAt: -1 })

    return NextResponse.json({ 
      success: true, 
      data: folders,
      source: authResult.source // Indicate which auth method was used
    })
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch folders' },
      { status: 500 }
    )
  }
}

// POST /api/folders - Create a new folder (supports both web portal and CLI)
export async function POST(request: NextRequest) {
  try {
    // Use hybrid authentication to support both web portal and CLI
    const authResult = await hybridAuth(request)
    
    if (!authResult.success) {
      return handleHybridAuthError(authResult)
    }

    const { name } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Folder name is required' },
        { status: 400 }
      )
    }

    await connectMongoDB()

    // Check for duplicate folder names for this user
    const existingFolder = await Folder.findOne({
      userId: authResult.user.email,
      name: name.trim()
    })

    if (existingFolder) {
      return NextResponse.json(
        { success: false, error: 'Folder name already exists' },
        { status: 409 }
      )
    }

    const folder = new Folder({
      userId: authResult.user.email,
      name: name.trim(),
    })

    const savedFolder = await folder.save()

    return NextResponse.json({ 
      success: true, 
      data: savedFolder,
      source: authResult.source // Indicate which auth method was used
    }, { status: 201 })
  } catch (error) {
    const errorObject = error as { code?: number }
    console.error('Error creating folder:', error)
    
    if (errorObject.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Folder name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create folder' },
      { status: 500 }
    )
  }
}
