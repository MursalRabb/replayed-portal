import { NextRequest, NextResponse } from "next/server";
import connectMongoDB from "@/lib/mongodb";
import Mnemonic from "@/models/Mnemonic";
import Folder from "@/models/Folder";
import { requireAuth } from "@/lib/session";
import { hybridAuth, handleHybridAuthError } from "@/lib/hybridAuth";
import { MnemonicCommand, isValidInputStep, InputStep } from "@/types/mnemonic";
import { validateMnemonicName } from "@/lib/validation";

// GET /api/mnemonics?folderId=... - Get all mnemonics for a folder
export async function GET(request: NextRequest) {
  try {
    // Use session auth for GET requests (web portal only)
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");

    if (!folderId) {
      return NextResponse.json(
        { success: false, error: "Folder ID is required" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    // Verify the folder belongs to the user
    const folder = await Folder.findOne({
      _id: folderId,
      userId: session.user?.email,
    });

    if (!folder) {
      return NextResponse.json(
        { success: false, error: "Folder not found" },
        { status: 404 }
      );
    }

    const mnemonics = await Mnemonic.find({ folderId }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: mnemonics });
  } catch (error) {
    console.error("Error fetching mnemonics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch mnemonics" },
      {
        status:
          error instanceof Error && error.message === "Unauthorized"
            ? 401
            : 500,
      }
    );
  }
}

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
      if (!cmd.inputs.every((input: unknown) => isValidInputStep(input as InputStep))) {
        return false;
      }
    }

    return true;
  });
}

// POST /api/mnemonics - Create a new mnemonic (supports both web portal and CLI)
export async function POST(request: NextRequest) {
  try {
    // Use hybrid authentication to support both web portal and CLI
    const authResult = await hybridAuth(request);

    if (!authResult.success) {
      return handleHybridAuthError(authResult);
    }

    const { folderId, name, commands } = await request.json();

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

    // Handle folder validation differently for web vs CLI
    if (folderId) {
      // Web portal: folder must exist and belong to user
      const folder = await Folder.findOne({
        _id: folderId,
        userId: authResult.user.email,
      });

      if (!folder) {
        return NextResponse.json(
          { success: false, error: "Folder not found" },
          { status: 404 }
        );
      }
    } else {
      // CLI: folderId is optional, can create mnemonics without folders
      if (authResult.source === "session") {
        // For web portal, folderId is required
        return NextResponse.json(
          { success: false, error: "Folder ID is required for web portal" },
          { status: 400 }
        );
      }
    }

    // Check for duplicate mnemonic names for this user
    const existingMnemonic = await Mnemonic.findOne({
      userId: authResult.user.email,
      name: name.trim(),
    });

    if (existingMnemonic) {
      return NextResponse.json(
        { success: false, error: "Mnemonic name already exists" },
        { status: 409 }
      );
    }

    // Filter out empty commands and normalize the data
    const cleanCommands: MnemonicCommand[] = commands
      .filter((cmd) => cmd.command.trim().length > 0)
      .map((cmd) => ({
        command: cmd.command.trim(),
        inputs: cmd.inputs || [],
      }));

    const mnemonic = new Mnemonic({
      userId: authResult.user.email,
      folderId: folderId || null, // Allow null for CLI-created mnemonics
      name: name.trim(),
      commands: cleanCommands,
    });

    const savedMnemonic = await mnemonic.save();

    return NextResponse.json(
      {
        success: true,
        data: savedMnemonic,
        source: authResult.source, // Indicate which auth method was used
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating mnemonic:", error);

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
      { success: false, error: "Failed to create mnemonic" },
      { status: 500 }
    );
  }
}
