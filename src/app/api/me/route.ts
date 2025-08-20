import { NextRequest, NextResponse } from "next/server";
import connectMongoDB from "@/lib/mongodb";
import Token from "@/models/Token";
import User from "@/models/User";
import {
  verifyToken,
  extractTokenFromHeader,
  verifyHashedToken,
} from "@/lib/tokens";

// GET /api/me - Authenticate CLI user via Bearer token
export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const token = extractTokenFromHeader(authorization);

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    // Verify JWT token signature and extract payload
    let payload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    await connectMongoDB();

    // Find the token in database to ensure it hasn't been revoked
    const tokenDoc = await Token.findOne({ userId: payload.userId });

    if (!tokenDoc) {
      return NextResponse.json(
        { success: false, error: "Token has been revoked" },
        { status: 401 }
      );
    }

    // Verify the token matches the hashed version in database
    if (!verifyHashedToken(token, tokenDoc.hashedToken)) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    // Update last used timestamp
    tokenDoc.lastUsed = new Date();
    await tokenDoc.save();

    // Find user information
    const user = await User.findOne({ email: payload.userId });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Return user information
    return NextResponse.json({
      id: user._id,
      email: user.email,
      name: user.name,
      image: user.image,
      tokenName: tokenDoc.name,
      tokenLastUsed: tokenDoc.lastUsed,
    });
  } catch (error) {
    console.error("Error authenticating user:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500 }
    );
  }
}
