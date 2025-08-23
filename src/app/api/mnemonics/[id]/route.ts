import { NextRequest, NextResponse } from 'next/server'
import connectMongoDB from '@/lib/mongodb'
import Mnemonic from '@/models/Mnemonic'
import Folder from '@/models/Folder'
import { requireAuth } from '@/lib/session'
import { MnemonicCommand, isValidInputStep } from '@/types/mnemonic'

// Validation helper for MnemonicCommand structure
function validateMnemonicCommands(commands: any): commands is MnemonicCommand[] {
  if (!Array.isArray(commands)) {
    return false
  }

  return commands.every(cmd => {
    // Each command must be an object with a 'command' string
    if (typeof cmd !== 'object' || cmd === null) {
      return false
    }
    
    if (typeof cmd.command !== 'string' || cmd.command.trim().length === 0) {
      return false
    }

    // Validate inputs array
    if (cmd.inputs !== undefined) {
      if (!Array.isArray(cmd.inputs)) {
        return false
      }
      if (!cmd.inputs.every((input: any) => isValidInputStep(input))) {
        return false
      }
    }

    return true
  })
}

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

    if (!validateMnemonicCommands(commands)) {
      return NextResponse.json(
        { success: false, error: 'Commands must be an array with valid command strings and InputStep arrays' },
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

    // Filter out empty commands and normalize the data
    const cleanCommands: MnemonicCommand[] = commands
      .filter(cmd => cmd.command.trim().length > 0)
      .map(cmd => ({
        command: cmd.command.trim(),
        inputs: cmd.inputs || []
      }))

    // Use direct update to avoid potential schema conflicts
    const db = mnemonic.db
    const result = await db.collection('mnemonics').updateOne(
      { _id: mnemonic._id },
      { 
        $set: {
          name: name.trim(),
          commands: cleanCommands,
          updatedAt: new Date()
        }
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Mnemonic not found' },
        { status: 404 }
      )
    }

    // Fetch the updated document
    const updatedMnemonic = await Mnemonic.findById(params.id)

    return NextResponse.json({ success: true, data: updatedMnemonic })
  } catch (error: any) {
    console.error('Error updating mnemonic:', error)
    
    // Handle validation errors more gracefully
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message)
      return NextResponse.json(
        { success: false, error: `Validation failed: ${validationErrors.join(', ')}` },
        { status: 400 }
      )
    }
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Mnemonic name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update mnemonic' },
      { status: 500 }
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
      { status: 500 }
    )
  }
}