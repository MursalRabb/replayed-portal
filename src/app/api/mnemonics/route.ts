import { NextRequest, NextResponse } from 'next/server'
import connectMongoDB from '@/lib/mongodb'
import Mnemonic, { ICommand } from '@/models/Mnemonic'
import Folder from '@/models/Folder'
import { requireAuth } from '@/lib/session'

// GET /api/mnemonics?folderId=... - Get all mnemonics for a folder
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')

    if (!folderId) {
      return NextResponse.json(
        { success: false, error: 'Folder ID is required' },
        { status: 400 }
      )
    }

    await connectMongoDB()

    // Verify the folder belongs to the user
    const folder = await Folder.findOne({ 
      _id: folderId, 
      userId: session.user?.email 
    })

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 }
      )
    }

    const mnemonics = await Mnemonic.find({ folderId })
      .sort({ createdAt: -1 })

    return NextResponse.json({ success: true, data: mnemonics })
  } catch (error) {
    console.error('Error fetching mnemonics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch mnemonics' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// Validation helper for command structure
function validateCommands(commands: any): commands is ICommand[] {
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

    // If inputs exist, they must be an array of strings
    if (cmd.inputs !== undefined) {
      if (!Array.isArray(cmd.inputs)) {
        return false
      }
      if (!cmd.inputs.every((input: any) => typeof input === 'string')) {
        return false
      }
    }

    return true
  })
}

// POST /api/mnemonics - Create a new mnemonic
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { folderId, name, commands } = await request.json()

    if (!folderId || !name || !commands) {
      return NextResponse.json(
        { success: false, error: 'Folder ID, name, and commands are required' },
        { status: 400 }
      )
    }

    if (!validateCommands(commands)) {
      return NextResponse.json(
        { success: false, error: 'Commands must be an array of objects with command (string) and optional inputs (string[])' },
        { status: 400 }
      )
    }

    await connectMongoDB()

    // Verify the folder belongs to the user
    const folder = await Folder.findOne({ 
      _id: folderId, 
      userId: session.user?.email 
    })

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 }
      )
    }

    // Filter out empty commands and clean up inputs
    const cleanCommands = commands.filter(cmd => cmd.command.trim().length > 0).map(cmd => ({
      command: cmd.command.trim(),
      inputs: cmd.inputs || []
    }))

    const mnemonic = new Mnemonic({
      folderId,
      name: name.trim(),
      commands: cleanCommands,
    })

    const savedMnemonic = await mnemonic.save()

    return NextResponse.json({ success: true, data: savedMnemonic }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating mnemonic:', error)
    
    // Handle validation errors more gracefully
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { success: false, error: 'Invalid mnemonic data format' },
        { status: 400 }
      )
    }
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Mnemonic name already exists in this folder' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create mnemonic' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}