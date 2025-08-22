# CLI Integration Guide - Updated for Command Inputs

This document explains how to integrate your CLI tool (`relayed`) with the web portal authentication system and the new command input structure.

## Overview

The web portal now provides API endpoints for CLI authentication using JWT tokens and supports **saved inputs** for each command in a mnemonic. Users can generate tokens through the web interface and use them to authenticate their CLI tools.

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

### 5. Get Mnemonic by Name - `GET /api/mnemonics/name/{name}`

**Authentication:** Bearer token

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (Success) - New Format with Inputs:**
```json
{
  "success": true,
  "data": {
    "name": "deploy-prod",
    "commands": [
      {
        "command": "git push origin main",
        "inputs": []
      },
      {
        "command": "npm publish",
        "inputs": ["mySecretToken", "yes"]
      },
      {
        "command": "docker build -t myapp .",
        "inputs": []
      },
      {
        "command": "kubectl apply -f deployment.yaml",
        "inputs": ["production"]
      }
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

## Command Structure

Each command in a mnemonic now has the following structure:

```typescript
interface Command {
  command: string     // The shell command to execute
  inputs: string[]    // Array of inputs to send to stdin (optional)
}
```

**How inputs work:**
- `inputs` array contains strings that will be sent to the command's stdin
- Inputs are sent in order, each followed by a newline
- Empty `inputs` array means no stdin input
- Useful for commands that prompt for passwords, confirmations, etc.

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
import { spawn } from 'child_process'

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

// Execute a command with inputs sent to stdin
async function executeCommandWithInputs(command: string, inputs: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`> ${command}`)
    
    const child = spawn(command, [], {
      shell: true,
      stdio: ['pipe', 'inherit', 'inherit']
    })

    // Send inputs to stdin if provided
    if (inputs && inputs.length > 0) {
      console.log(`  📝 Sending ${inputs.length} input(s) to stdin...`)
      inputs.forEach((input, index) => {
        console.log(`  ${index + 1}. ${input}`)
        child.stdin?.write(input + '\n')
      })
    }

    child.stdin?.end()

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

// Get and execute a mnemonic with input support
export async function runMnemonic(mnemonicName: string) {
  try {
    await verifyAuth() // Ensure we're authenticated
    
    const response = await axios.get(`${API_BASE_URL}/api/mnemonics/name/${encodeURIComponent(mnemonicName)}`, {
      headers: {
        'Authorization': `Bearer ${loadToken()}`
      }
    })

    if (response.data.success) {
      const { name, commands } = response.data.data
      console.log(`\n🚀 Running mnemonic: ${name}`)
      console.log(`📋 ${commands.length} command(s) to execute\n`)
      
      for (let i = 0; i < commands.length; i++) {
        const { command, inputs } = commands[i]
        console.log(`\n[${i + 1}/${commands.length}] ${command}`)
        
        if (inputs && inputs.length > 0) {
          console.log(`  📥 Will send ${inputs.length} input(s) to stdin`)
        }
        
        try {
          await executeCommandWithInputs(command, inputs || [])
          console.log(`  ✅ Command completed successfully`)
        } catch (error) {
          console.error(`  ❌ Command failed: ${error.message}`)
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

// relayed run <mnemonic-name>
export async function runCommand(mnemonicName: string) {
  await runMnemonic(mnemonicName)
}
```

## Web Portal Features

Users can manage their CLI tokens and mnemonics through the web interface:

### Token Management (`/dashboard/tokens`)
- ✅ Create new tokens with custom names
- ✅ View all active tokens
- ✅ See last usage timestamps
- ✅ Revoke tokens when needed
- ✅ Copy tokens to clipboard

### Mnemonic Management (`/dashboard`)
- ✅ Create folders to organize mnemonics
- ✅ Create mnemonics with multiple commands
- ✅ **NEW:** Add saved inputs for each command
- ✅ **NEW:** Visual indication of commands with inputs
- ✅ Edit and delete mnemonics
- ✅ **NEW:** Rich editor with input management

### Input Management Features
- ✅ **Add Input** button for each command
- ✅ **Remove Input** functionality
- ✅ **Input ordering** (sent to stdin in sequence)
- ✅ **Visual feedback** showing input count
- ✅ **Preview** of inputs in mnemonic cards

## Security Notes

1. **Token Storage**: Tokens are stored locally on the user's machine in `~/.relayed/token`
2. **Token Rotation**: Tokens expire after 30 days (configurable)
3. **Revocation**: Users can revoke tokens through the web interface
4. **Hashing**: Only hashed versions of tokens are stored in the database
5. **HTTPS**: Use HTTPS in production for all API calls
6. **Input Security**: Saved inputs are stored in plaintext - avoid saving sensitive data like passwords

## Testing

Test the integration:

1. Start your Next.js dev server: `npm run dev`
2. Go to `http://localhost:3000/dashboard/tokens`
3. Create a test token
4. Create a mnemonic with commands and inputs
5. Test the CLI authentication:

```bash
# Test authentication
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/me

# Test mnemonic retrieval with new structure
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/mnemonics/name/deploy-prod
```

## Migration from Old Format

If you have existing mnemonics in the old format (array of strings), they will be automatically converted to the new format when first loaded. The migration happens at the API level:

**Old format:**
```json
{
  "commands": ["git push", "npm publish"]
}
```

**New format:**
```json
{
  "commands": [
    { "command": "git push", "inputs": [] },
    { "command": "npm publish", "inputs": [] }
  ]
}
```

The CLI should handle both formats gracefully during the transition period.
