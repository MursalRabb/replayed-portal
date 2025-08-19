import { NextRequest, NextResponse } from 'next/server'
import connectMongoDB from '@/lib/mongodb'
import Folder from '@/models/Folder'
import Mnemonic from '@/models/Mnemonic'
import { requireAuth } from '@/lib/session'

// PUT /api/folders/[id] - Update a folder
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const folder = await Folder.findOne({ 
      _id: params.id, 
      userId: session.user?.email 
    })

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 }
      )
    }

    folder.name = name.trim()
    const updatedFolder = await folder.save()

    return NextResponse.json({ success: true, data: updatedFolder })
  } catch (error: any) {
    console.error('Error updating folder:', error)
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Folder name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update folder' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// DELETE /api/folders/[id] - Delete a folder and all its mnemonics
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    await connectMongoDB()

    const folder = await Folder.findOne({ 
      _id: params.id, 
      userId: session.user?.email 
    })

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 }
      )
    }

    // Delete all mnemonics in this folder
    await Mnemonic.deleteMany({ folderId: params.id })
    
    // Delete the folder
    await Folder.deleteOne({ _id: params.id })

    return NextResponse.json({ success: true, message: 'Folder deleted successfully' })
  } catch (error) {
    console.error('Error deleting folder:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete folder' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
