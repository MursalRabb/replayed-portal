import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, handleAuthError } from "@/lib/authMiddleware";

// GET /api/me - Authenticate CLI user via Bearer token
export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request);

  if (!authResult.success) {
    return handleAuthError(authResult);
  }

  // Return user information
  return NextResponse.json({
    success: true,
    data: authResult.user,
  });
}