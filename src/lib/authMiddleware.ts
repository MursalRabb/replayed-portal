import { NextRequest, NextResponse } from "next/server";
import connectMongoDB from "@/lib/mongodb";
import Token from "@/models/Token";
import User from "@/models/User";
import {
  verifyToken,
  extractTokenFromHeader,
  verifyHashedToken,
} from "@/lib/tokens";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  tokenName: string;
  tokenLastUsed?: Date;
}

export interface AuthResult {
  success: true;
  user: AuthenticatedUser;
}

export interface AuthError {
  success: false;
  error: string;
  status: number;
}

/**
 * Middleware to verify CLI authentication via Bearer token
 * Returns either the authenticated user or an error response
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult | AuthError> {
  try {
    const authorization = request.headers.get("authorization");
    const token = extractTokenFromHeader(authorization || undefined);

    if (!token) {
      return {
        success: false,
        error: "Authorization header required",
        status: 401,
      };
    }

    // Verify JWT token signature and extract payload
    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return {
        success: false,
        error: "Invalid or expired token",
        status: 401,
      };
    }

    await connectMongoDB();

    // Find the specific token in database using tokenId to ensure it hasn't been revoked
    // This handles cases where a user has multiple tokens
    const tokenDoc = await Token.findOne({ 
      userId: payload.userId,
      tokenId: payload.tokenId 
    });

    if (!tokenDoc) {
      return {
        success: false,
        error: "Token has been revoked",
        status: 401,
      };
    }

    // Verify the token matches the hashed version in database
    if (!verifyHashedToken(token, tokenDoc.hashedToken)) {
      return {
        success: false,
        error: "Invalid token",
        status: 401,
      };
    }

    // Update last used timestamp
    tokenDoc.lastUsed = new Date();
    await tokenDoc.save();

    // Find user information
    const user = await User.findOne({ email: payload.userId });

    if (!user) {
      return {
        success: false,
        error: "User not found",
        status: 404,
      };
    }

    // Return authenticated user data
    return {
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        image: user.image,
        tokenName: tokenDoc.name,
        tokenLastUsed: tokenDoc.lastUsed,
      },
    };
  } catch (error) {
    console.error("Error in auth middleware:", error);
    return {
      success: false,
      error: "Authentication failed",
      status: 500,
    };
  }
}

/**
 * Helper function to handle auth errors in routes
 */
export function handleAuthError(authResult: AuthError): NextResponse {
  return NextResponse.json(
    { success: false, error: authResult.error },
    { status: authResult.status }
  );
}
