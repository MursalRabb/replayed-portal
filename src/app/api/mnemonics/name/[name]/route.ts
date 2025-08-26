import { NextRequest, NextResponse } from "next/server";
import connectMongoDB from "@/lib/mongodb";
import Mnemonic from "@/models/Mnemonic";
import Folder from "@/models/Folder";
import { verifyAuth, handleAuthError } from "@/lib/authMiddleware";

// GET /api/mnemonics/name/[name] - Get mnemonic by name for authenticated user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  // Await params since it's now a Promise in Next.js 15
  const { name } = await params
  
  const authResult = await verifyAuth(request);

  if (!authResult.success) {
    return handleAuthError(authResult);
  }

  try {
    await connectMongoDB();

    // Find mnemonic with the given name belonging to the authenticated user
    const mnemonic = await Mnemonic.findOne({
      name: name,
      userId: authResult.user.email
    });

    if (!mnemonic) {
      return NextResponse.json(
        { success: false, error: "Mnemonic not found" },
        { status: 404 }
      );
    }

    // Return mnemonic data in the new format
    return NextResponse.json({
      success: true,
      data: {
        name: mnemonic.name,
        commands: mnemonic.commands,
      },
    });

  } catch (error) {
    console.error("Error fetching mnemonic:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch mnemonic" },
      { status: 500 }
    );
  }
}