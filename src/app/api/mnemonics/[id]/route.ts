import { NextRequest, NextResponse } from 'next/server'
import connectMongoDB from '@/lib/mongodb'
import Mnemonic from '@/models/Mnemonic'
import Folder from '@/models/Folder'
import { requireAuth } from '@/lib/session'

// PUT /api/mnemonics/[id] - Update a mnemonic
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const { name, commands } = await request.json()

    if (!name || !commands) {
      return NextResponse.json(
        { success: false, error: 'Name and commands are required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(commands) || commands.some(cmd => typeof cmd !== 'string')) {
      return NextResponse.json(
        { success: false, error: 'Commands must be an array of strings' },
        { status: 400 }
      )
    }

    await connectMongoDB()

    const mnemonic = await Mnemonic.findById(params.id)

    if (!mnemonic) {
      return NextResponse.json(
        { success: false, error: 'Mnemonic not found' },
        { status: 404 }
      )
    }

    // Verify the mnemonic belongs to the user through the folder
    const folder = await Folder.findOne({ 
      _id: mnemonic.folderId, 
      userId: session.user?.email 
    })

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    mnemonic.name = name.trim()
    mnemonic.commands = commands.filter(cmd => cmd.trim().length > 0)
    
    const updatedMnemonic = await mnemonic.save()

    return NextResponse.json({ success: true, data: updatedMnemonic })
  } catch (error: any) {
    console.error('Error updating mnemonic:', error)
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Mnemonic name already exists in this folder' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update mnemonic' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// DELETE /api/mnemonics/[id] - Delete a mnemonic
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    await connectMongoDB()

    const mnemonic = await Mnemonic.findById(params.id)

    if (!mnemonic) {
      return NextResponse.json(
        { success: false, error: 'Mnemonic not found' },
        { status: 404 }
      )
    }

    // Verify the mnemonic belongs to the user through the folder
    const folder = await Folder.findOne({ 
      _id: mnemonic.folderId, 
      userId: session.user?.email 
    })

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    await Mnemonic.deleteOne({ _id: params.id })

    return NextResponse.json({ success: true, message: 'Mnemonic deleted successfully' })
  } catch (error) {
    console.error('Error deleting mnemonic:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete mnemonic' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
