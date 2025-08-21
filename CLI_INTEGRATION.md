# CLI Integration Guide

This document explains how to integrate your CLI tool (`relayed`) with the web portal authentication system.

## Overview

The web portal now provides API endpoints for CLI authentication using JWT tokens. Users can generate tokens through the web interface and use them to authenticate their CLI tools.

## Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# JWT Token Authentication (for CLI)
JWT_SECRET=your-jwt-secret-for-cli-authentication-32-chars-minimum
ENCRYPTION_KEY=your-32-character-encryption-key-exactly
```

**Important:** 
- `JWT_SECRET` should be a strong, random string (minimum 32 characters)
- `ENCRYPTION_KEY` must be exactly 32 characters for AES encryption
- These secrets should be different from your `NEXTAUTH_SECRET`

## API Endpoints

### 1. Generate Token - `POST /api/tokens`

**Authentication:** NextAuth session (web browser)

**Request:**
```json
{
  "name": "My CLI Token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "token_id",
    "name": "My CLI Token",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. List Tokens - `GET /api/tokens`

**Authentication:** NextAuth session (web browser)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "token_id",
      "name": "My CLI Token",
      "lastUsed": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 3. Revoke Token - `DELETE /api/tokens/{id}`

**Authentication:** NextAuth session (web browser)

### 4. Authenticate CLI - `GET /api/me`

**Authentication:** Bearer token

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "image": "https://...",
    "tokenName": "My CLI Token",
    "tokenLastUsed": "2024-01-01T00:00:00.000Z"
  }
}
```

### 5. Get Mnemonic by Name - `GET /api/mnemonics/{name}`

**Authentication:** Bearer token

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "name": "deploy-prod",
    "commands": [
      "npm run build",
      "docker build -t myapp .",
      "docker push myapp:latest",
      "kubectl apply -f deployment.yaml"
    ]
  }
}
```

**Response (Not Found):**
```json
{
  "success": false,
  "error": "Mnemonic not found"
}
```

## CLI Integration Steps

### 1. User Workflow

1. User opens web portal (`http://localhost:3000/dashboard/tokens`)
2. User clicks "New Token" and gives it a name
3. User copies the generated token
4. User runs CLI command to save token: `relayed auth login <token>`

### 2. CLI Implementation

Here's how to integrate this into your Node.js CLI:

```typescript
// CLI Authentication Module
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import os from 'os'

const CONFIG_DIR = path.join(os.homedir(), '.relayed')
const TOKEN_FILE = path.join(CONFIG_DIR, 'token')
const API_BASE_URL = process.env.RELAYED_API_URL || 'http://localhost:3000'

// Save token locally
export async function saveToken(token: string) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
  fs.writeFileSync(TOKEN_FILE, token, 'utf8')
  console.log('Token saved successfully!')
}

// Load token from local storage
export function loadToken(): string | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      return fs.readFileSync(TOKEN_FILE, 'utf8').trim()
    }
  } catch (error) {
    console.error('Error loading token:', error)
  }
  return null
}

// Verify token and get user info
export async function verifyAuth(): Promise<any> {
  const token = loadToken()
  if (!token) {
    throw new Error('No authentication token found. Run: relayed auth login <token>')
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.data.success) {
      return response.data.data
    } else {
      throw new Error(response.data.error || 'Authentication failed')
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new Error('Token is invalid or expired. Please login again.')
    }
    throw error
  }
}

// Remove stored token
export function logout() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      fs.unlinkSync(TOKEN_FILE)
      console.log('Logged out successfully!')
    }
  } catch (error) {
    console.error('Error during logout:', error)
  }
}
```

### 3. CLI Commands

Add these commands to your CLI:

```typescript
// relayed auth login <token>
export async function authLogin(token: string) {
  try {
    // Verify the token works
    const response = await axios.get(`${API_BASE_URL}/api/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (response.data.success) {
      await saveToken(token)
      console.log(`✅ Authenticated as ${response.data.data.name} (${response.data.data.email})`)
    } else {
      console.error('❌ Invalid token')
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error.message)
  }
}

// relayed auth status
export async function authStatus() {
  try {
    const user = await verifyAuth()
    console.log(`✅ Authenticated as ${user.name} (${user.email})`)
    console.log(`Token: ${user.tokenName}`)
    if (user.tokenLastUsed) {
      console.log(`Last used: ${new Date(user.tokenLastUsed).toLocaleString()}`)
    }
  } catch (error) {
    console.log('❌ Not authenticated:', error.message)
  }
}

// relayed auth logout
export async function authLogout() {
  logout()
}
```

### 4. Protected Commands

For commands that require authentication:

```typescript
// Get and execute a mnemonic
export async function runMnemonic(mnemonicName: string) {
  try {
    await verifyAuth() // Ensure we're authenticated
    
    const response = await axios.get(`${API_BASE_URL}/api/mnemonics/${encodeURIComponent(mnemonicName)}`, {
      headers: {
        'Authorization': `Bearer ${loadToken()}`
      }
    })

    if (response.data.success) {
      const { name, commands } = response.data.data
      console.log(`\n🚀 Running mnemonic: ${name}`)
      console.log('📝 Commands:')
      
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i]
        console.log(`\n${i + 1}. ${command}`)
        
        // Execute command using child_process
        const { execSync } = require('child_process')
        try {
          execSync(command, { stdio: 'inherit' })
        } catch (error) {
          console.error(`❌ Command failed: ${command}`)
          throw error
        }
      }
      
      console.log('\n✅ All commands completed successfully!')
    } else {
      console.error(`❌ Mnemonic '${mnemonicName}' not found`)
      process.exit(1)
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.error(`❌ Mnemonic '${mnemonicName}' not found`)
    } else if (error.response?.status === 401) {
      console.error('❌ Authentication failed. Please login again.')
      console.log('Run: relayed auth login <token>')
    } else {
      console.error('❌ Error:', error.message)
    }
    process.exit(1)
  }
}

export async function syncCommand() {
  try {
    const user = await verifyAuth()
    console.log(`Syncing as ${user.name}...`)
    
    // Your sync logic here
    // You can now make authenticated requests to your API
    
  } catch (error) {
    console.error('Authentication required:', error.message)
    console.log('Run: relayed auth login <token>')
    process.exit(1)
  }
}
```

## Security Notes

1. **Token Storage**: Tokens are stored locally on the user's machine in `~/.relayed/token`
2. **Token Rotation**: Tokens expire after 30 days (configurable)
3. **Revocation**: Users can revoke tokens through the web interface
4. **Hashing**: Only hashed versions of tokens are stored in the database
5. **HTTPS**: Use HTTPS in production for all API calls

## Web Portal Features

Users can manage their CLI tokens through the web interface at `/dashboard/tokens`:

- ✅ Create new tokens with custom names
- ✅ View all active tokens
- ✅ See last usage timestamps
- ✅ Revoke tokens when needed
- ✅ Copy tokens to clipboard

## Testing

Test the integration:

1. Start your Next.js dev server: `npm run dev`
2. Go to `http://localhost:3000/dashboard/tokens`
3. Create a test token
4. Test the CLI authentication with curl:

```bash
# Test authentication
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/me

# Test mnemonic retrieval
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/mnemonics/deploy-prod
```

The first command should return your user information, and the second should return the mnemonic data if it exists.

