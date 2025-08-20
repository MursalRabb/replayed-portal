import jwt from 'jsonwebtoken'
import Cryptr from 'cryptr'
import { randomBytes } from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET!
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required')
}

const cryptr = new Cryptr(ENCRYPTION_KEY)

export interface TokenPayload {
  userId: string
  email: string
  tokenId: string
  iat?: number
  exp?: number
}

/**
 * Generate a new JWT token with the given payload
 */
export function generateToken(payload: Omit<TokenPayload, 'tokenId'>): string {
  const tokenId = randomBytes(16).toString('hex')
  
  const tokenPayload: TokenPayload = {
    ...payload,
    tokenId,
  }

  // Generate token with 30-day expiry (optional - can be made permanent)
  return jwt.sign(tokenPayload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '30d',
  })
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as TokenPayload
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

/**
 * Hash a token for secure storage in the database
 */
export function hashToken(token: string): string {
  return cryptr.encrypt(token)
}

/**
 * Verify a token against its hashed version
 */
export function verifyHashedToken(token: string, hashedToken: string): boolean {
  try {
    const decrypted = cryptr.decrypt(hashedToken)
    return decrypted === token
  } catch (error) {
    return false
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authorization?: string): string | null {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null
  }
  
  return authorization.substring(7) // Remove "Bearer " prefix
}

