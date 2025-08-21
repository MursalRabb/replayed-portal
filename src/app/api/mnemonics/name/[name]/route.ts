import { NextRequest, NextResponse } from "next/server";
import connectMongoDB from "@/lib/mongodb";
import Mnemonic from "@/models/Mnemonic";
import Folder from "@/models/Folder";
import { verifyAuth, handleAuthError } from "@/lib/authMiddleware";

// GET /api/mnemonics/name/[name] - Get mnemonic by name for authenticated user
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  const authResult = await verifyAuth(request);

  if (!authResult.success) {
    return handleAuthError(authResult);
  }

  try {
    await connectMongoDB();

    // First, find all folders belonging to the authenticated user
    const userFolders = await Folder.find({ userId: authResult.user.email });
    
    if (userFolders.length === 0) {
      return NextResponse.json(
        { success: false, error: "Mnemonic not found" },
        { status: 404 }
      );
    }

    // Extract folder IDs
    const folderIds = userFolders.map(folder => folder._id);

    // Find mnemonic with the given name in any of the user's folders
    const mnemonic = await Mnemonic.findOne({
      name: params.name,
      folderId: { $in: folderIds }
    });

    if (!mnemonic) {
      return NextResponse.json(
        { success: false, error: "Mnemonic not found" },
        { status: 404 }
      );
    }

    const response = {
      name: mnemonic.name,
      commands: mnemonic.commands,
    }

    console.log(response, "response");

    // Return mnemonic data
    return NextResponse.json({
      success: true,
      data: response,
    });

  } catch (error) {
    console.error("Error fetching mnemonic:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch mnemonic" },
      { status: 500 }
    );
  }
}
