import { NextRequest, NextResponse } from 'next/server'
import connectMongoDB from '@/lib/mongodb'
import Folder from '@/models/Folder'
import { requireAuth } from '@/lib/session'

// GET /api/folders - Get all folders for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    await connectMongoDB()

    const folders = await Folder.find({ userId: session.user?.email })
      .sort({ createdAt: -1 })

    return NextResponse.json({ success: true, data: folders })
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch folders' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// POST /api/folders - Create a new folder
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { name } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Folder name is required' },
        { status: 400 }
      )
    }

    await connectMongoDB()

    const folder = new Folder({
      userId: session.user?.email,
      name: name.trim(),
    })

    const savedFolder = await folder.save()

    return NextResponse.json({ success: true, data: savedFolder }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating folder:', error)
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Folder name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create folder' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
