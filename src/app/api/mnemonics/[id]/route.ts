import { NextRequest, NextResponse } from "next/server";
import connectMongoDB from "@/lib/mongodb";
import Mnemonic from "@/models/Mnemonic";
import Folder from "@/models/Folder";
import mongoose from "mongoose";

import { hybridAuth, handleHybridAuthError } from "@/lib/hybridAuth";
import { MnemonicCommand, isValidInputStep, InputStep } from "@/types/mnemonic";
import { validateMnemonicName } from "@/lib/validation";

// Validation helper for MnemonicCommand structure
function validateMnemonicCommands(
  commands: unknown
): commands is MnemonicCommand[] {
  if (!Array.isArray(commands)) {
    return false;
  }

  return commands.every((cmd) => {
    // Each command must be an object with a 'command' string
    if (typeof cmd !== "object" || cmd === null) {
      return false;
    }

    if (typeof cmd.command !== "string" || cmd.command.trim().length === 0) {
      return false;
    }

    // Validate inputs array
    if (cmd.inputs !== undefined) {
      if (!Array.isArray(cmd.inputs)) {
        return false;
      }
      if (
        !cmd.inputs.every((input: unknown) =>
          isValidInputStep(input as InputStep)
        )
      ) {
        return false;
      }
    }

    return true;
  });
}

// PUT /api/mnemonics/[id] - Update a mnemonic (supports both web portal and CLI)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params since it's now a Promise in Next.js 15
    const { id } = await params
    
    // Use hybrid authentication to support both web portal and CLI
    const authResult = await hybridAuth(request);

    if (!authResult.success) {
      return handleHybridAuthError(authResult);
    }

    const { name, commands } = await request.json();

    if (!name || !commands) {
      return NextResponse.json(
        { success: false, error: "Name and commands are required" },
        { status: 400 }
      );
    }

    // Validate mnemonic name
    const nameValidation = validateMnemonicName(name);
    if (!nameValidation.isValid) {
      return NextResponse.json(
        { success: false, error: nameValidation.error },
        { status: 400 }
      );
    }

    if (!validateMnemonicCommands(commands)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Commands must be an array with valid command strings and InputStep arrays",
        },
        { status: 400 }
      );
    }

    await connectMongoDB();

    const mnemonic = await Mnemonic.findById(id);

    if (!mnemonic) {
      return NextResponse.json(
        { success: false, error: "Mnemonic not found" },
        { status: 404 }
      );
    }

    // Verify the mnemonic belongs to the user
    if (mnemonic.userId !== authResult.user.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // For web portal users, verify folder ownership if mnemonic has a folder
    if (authResult.source === "session" && mnemonic.folderId) {
      const folder = await Folder.findOne({
        _id: mnemonic.folderId,
        userId: authResult.user.email,
      });

      if (!folder) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 403 }
        );
      }
    }

    // Check for duplicate mnemonic names for this user (excluding current mnemonic)
    if (name.trim() !== mnemonic.name) {
      const existingMnemonic = await Mnemonic.findOne({
        userId: authResult.user.email,
        name: name.trim(),
        _id: { $ne: new mongoose.Types.ObjectId(id) },
      });

      if (existingMnemonic) {
        return NextResponse.json(
          { success: false, error: "Mnemonic name already exists" },
          { status: 409 }
        );
      }
    }

    // Filter out empty commands and normalize the data
    const cleanCommands: MnemonicCommand[] = commands
      .filter((cmd) => cmd.command.trim().length > 0)
      .map((cmd) => ({
        command: cmd.command.trim(),
        inputs: cmd.inputs || [],
      }));

    // Use direct update to avoid potential schema conflicts
    const db = mnemonic.db;
    const result = await db.collection("mnemonics").updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        $set: {
          name: name.trim(),
          commands: cleanCommands,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Mnemonic not found" },
        { status: 404 }
      );
    }

    // Fetch the updated document
    const updatedMnemonic = await Mnemonic.findById(id);

    return NextResponse.json({
      success: true,
      data: updatedMnemonic,
      source: authResult.source, // Indicate which auth method was used
    });
  } catch (error: unknown) {
    console.error("Error updating mnemonic:", error);

    // Handle validation errors more gracefully
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      const validationErrors = Object.values(
        (error as unknown as { errors: { [key: string]: { message: string } } })
          .errors
      ).map((err: { message: string }) => err.message);
      return NextResponse.json(
        {
          success: false,
          error: `Validation failed: ${validationErrors.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { success: false, error: "Mnemonic name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to update mnemonic" },
      { status: 500 }
    );
  }
}

// DELETE /api/mnemonics/[id] - Delete a mnemonic (supports both web portal and CLI)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params since it's now a Promise in Next.js 15
    const { id } = await params
    
    // Use hybrid authentication to support both web portal and CLI
    const authResult = await hybridAuth(request);

    if (!authResult.success) {
      return handleHybridAuthError(authResult);
    }

    await connectMongoDB();

    const mnemonic = await Mnemonic.findById(id);

    if (!mnemonic) {
      return NextResponse.json(
        { success: false, error: "Mnemonic not found" },
        { status: 404 }
      );
    }

    // Verify the mnemonic belongs to the user
    if (mnemonic.userId !== authResult.user.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // For web portal users, verify folder ownership if mnemonic has a folder
    if (authResult.source === "session" && mnemonic.folderId) {
      const folder = await Folder.findOne({
        _id: mnemonic.folderId,
        userId: authResult.user.email,
      });

      if (!folder) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 403 }
        );
      }
    }

    await Mnemonic.deleteOne({ _id: id });

    return NextResponse.json({
      success: true,
      message: "Mnemonic deleted successfully",
      source: authResult.source,
    });
  } catch (error) {
    console.error("Error deleting mnemonic:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete mnemonic" },
      { status: 500 }
    );
  }
}
