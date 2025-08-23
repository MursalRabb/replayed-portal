import { NextRequest, NextResponse } from 'next/server'
import connectMongoDB from '@/lib/mongodb'
import Folder from '@/models/Folder'
import Mnemonic from '@/models/Mnemonic'
import { requireAuth } from '@/lib/session'
import { hybridAuth, handleHybridAuthError } from '@/lib/hybridAuth'

// PUT /api/folders/[id] - Update a folder (supports both web portal and CLI)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const folder = await Folder.findOne({ 
      _id: params.id, 
      userId: authResult.user.email 
    })

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 }
      )
    }

    // Check for duplicate folder names for this user (excluding current folder)
    const existingFolder = await Folder.findOne({
      userId: authResult.user.email,
      name: name.trim(),
      _id: { $ne: params.id }
    })

    if (existingFolder) {
      return NextResponse.json(
        { success: false, error: 'Folder name already exists' },
        { status: 409 }
      )
    }

    folder.name = name.trim()
    const updatedFolder = await folder.save()

    return NextResponse.json({ 
      success: true, 
      data: updatedFolder,
      source: authResult.source // Indicate which auth method was used
    })
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
      { status: 500 }
    )
  }
}

// DELETE /api/folders/[id] - Delete a folder and all its mnemonics (supports both web portal and CLI)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Use hybrid authentication to support both web portal and CLI
    const authResult = await hybridAuth(request)
    
    if (!authResult.success) {
      return handleHybridAuthError(authResult)
    }

    await connectMongoDB()

    const folder = await Folder.findOne({ 
      _id: params.id, 
      userId: authResult.user.email 
    })

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 }
      )
    }

    // Delete all mnemonics in this folder
    const deletedMnemonics = await Mnemonic.deleteMany({ folderId: params.id })
    
    // Delete the folder
    await Folder.deleteOne({ _id: params.id })

    return NextResponse.json({ 
      success: true, 
      message: 'Folder deleted successfully',
      deletedMnemonics: deletedMnemonics.deletedCount,
      source: authResult.source // Indicate which auth method was used
    })
  } catch (error) {
    console.error('Error deleting folder:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete folder' },
      { status: 500 }
    )
  }
}
