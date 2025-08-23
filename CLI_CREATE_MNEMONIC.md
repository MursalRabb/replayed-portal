# CLI Mnemonic Creation Guide

This guide shows how to create and manage mnemonics directly from your CLI tool using the Bearer token authentication.

## API Endpoints for CLI

### Folder Management

#### Get All Folders - `GET /api/folders`

**Authentication:** Bearer token (CLI) or Session (Web Portal)

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "user@example.com",
      "name": "Development",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "source": "token"
}
```

#### Create Folder - `POST /api/folders`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "My Deployment Scripts"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "userId": "user@example.com",
    "name": "My Deployment Scripts",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "source": "token"
}
```

#### Update Folder - `PUT /api/folders/[id]`

**Request Body:**
```json
{
  "name": "Updated Folder Name"
}
```

#### Delete Folder - `DELETE /api/folders/[id]`

**Response:**
```json
{
  "success": true,
  "message": "Folder deleted successfully",
  "deletedMnemonics": 3,
  "source": "token"
}
```

### Create Mnemonic - `POST /api/mnemonics`

**Authentication:** Bearer token (CLI) or Session (Web Portal)

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "git-workflow",
  "folderId": null,
  "commands": [
    {
      "command": "git add .",
      "inputs": []
    },
    {
      "command": "git commit -m",
      "inputs": [
        { "type": "text", "value": "feat: add new feature" },
        { "type": "enter" }
      ]
    },
    {
      "command": "git push",
      "inputs": [
        { "type": "text", "value": "myPassword123" },
        { "type": "enter" }
      ]
    }
  ]
}
```

**Key Differences for CLI:**
- `folderId` is **optional** - can be `null` for CLI-created mnemonics
- `userId` is automatically set from the Bearer token
- Mnemonics are scoped to the authenticated user

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "user@example.com",
    "folderId": null,
    "name": "git-workflow",
    "commands": [
      {
        "command": "git add .",
        "inputs": []
      },
      {
        "command": "git commit -m",
        "inputs": [
          { "type": "text", "value": "feat: add new feature" },
          { "type": "enter" }
        ]
      },
      {
        "command": "git push",
        "inputs": [
          { "type": "text", "value": "myPassword123" },
          { "type": "enter" }
        ]
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "source": "token"
}
```

## CLI Implementation Examples

### Folder Management

#### List Folders

```typescript
// CLI function to list all folders
export async function listFolders() {
  try {
    await verifyAuth() // Ensure we're authenticated
    
    const response = await axios.get(`${API_BASE_URL}/api/folders`, {
      headers: {
        'Authorization': `Bearer ${loadToken()}`
      }
    })

    if (response.data.success) {
      const folders = response.data.data
      console.log(`📁 Found ${folders.length} folders:`)
      folders.forEach(folder => {
        console.log(`   ${folder._id}: ${folder.name}`)
      })
      return folders
    } else {
      console.error('❌ Failed to fetch folders:', response.data.error)
      return []
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.error('❌ Authentication failed. Please login again.')
    } else {
      console.error('❌ Error:', error.message)
    }
    return []
  }
}
```

#### Create Folder

```typescript
// CLI function to create a folder
export async function createFolder(name: string) {
  try {
    await verifyAuth()
    
    const response = await axios.post(`${API_BASE_URL}/api/folders`, {
      name
    }, {
      headers: {
        'Authorization': `Bearer ${loadToken()}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.data.success) {
      console.log(`✅ Created folder: ${response.data.data.name}`)
      console.log(`   ID: ${response.data.data._id}`)
      return response.data.data
    } else {
      console.error('❌ Failed to create folder:', response.data.error)
      return null
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      console.error('❌ Folder name already exists')
    } else if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.error('❌ Authentication failed. Please login again.')
    } else {
      console.error('❌ Error:', error.message)
    }
    return null
  }
}
```

#### Delete Folder

```typescript
// CLI function to delete a folder
export async function deleteFolder(folderId: string) {
  try {
    await verifyAuth()
    
    const response = await axios.delete(`${API_BASE_URL}/api/folders/${folderId}`, {
      headers: {
        'Authorization': `Bearer ${loadToken()}`
      }
    })

    if (response.data.success) {
      console.log(`✅ ${response.data.message}`)
      if (response.data.deletedMnemonics > 0) {
        console.log(`   Also deleted ${response.data.deletedMnemonics} mnemonics`)
      }
      return true
    } else {
      console.error('❌ Failed to delete folder:', response.data.error)
      return false
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.error('❌ Folder not found')
    } else if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.error('❌ Authentication failed. Please login again.')
    } else {
      console.error('❌ Error:', error.message)
    }
    return false
  }
}
```

### Mnemonic Creation with Folders

```typescript
// CLI function to create a mnemonic with optional folder
export async function createMnemonic(
  name: string, 
  commands: Array<{command: string, inputs?: any[]}>,
  folderId?: string | null
) {
  try {
    await verifyAuth() // Ensure we're authenticated
    
    const response = await axios.post(`${API_BASE_URL}/api/mnemonics`, {
      name,
      folderId: folderId || null, // Optional folder assignment
      commands: commands.map(cmd => ({
        command: cmd.command,
        inputs: cmd.inputs || []
      }))
    }, {
      headers: {
        'Authorization': `Bearer ${loadToken()}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.data.success) {
      console.log(`✅ Created mnemonic: ${response.data.data.name}`)
      console.log(`   ID: ${response.data.data._id}`)
      console.log(`   Commands: ${response.data.data.commands.length}`)
      return response.data.data
    } else {
      console.error('❌ Failed to create mnemonic:', response.data.error)
      return null
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.error('❌ Authentication failed. Please login again.')
      console.log('Run: relayed auth login <token>')
    } else {
      console.error('❌ Error:', error.message)
    }
    return null
  }
}
```

### Interactive Mnemonic Builder

```typescript
// Interactive CLI command to build a mnemonic
export async function buildMnemonic() {
  console.log('🔧 Building a new mnemonic...\n')
  
  // Get mnemonic name
  const name = await prompt('Mnemonic name: ')
  if (!name) {
    console.log('❌ Name is required')
    return
  }
  
  const commands = []
  
  while (true) {
    console.log(`\n📝 Command ${commands.length + 1}:`)
    const command = await prompt('Command: ')
    
    if (!command) {
      if (commands.length === 0) {
        console.log('❌ At least one command is required')
        continue
      }
      break // Done adding commands
    }
    
    const inputs = []
    console.log('   Input steps (press enter with empty input to finish):')
    
    let stepNum = 1
    while (true) {
      const stepType = await prompt(`   Step ${stepNum} type (text/enter/key): `)
      
      if (!stepType) break // Done with inputs for this command
      
      let inputStep
      switch (stepType.toLowerCase()) {
        case 'text':
          const text = await prompt('   Text to type: ')
          inputStep = { type: 'text', value: text }
          break
        case 'enter':
          inputStep = { type: 'enter' }
          break
        case 'key':
          const key = await prompt('   Key (up/down/left/right/space/tab/backspace): ')
          inputStep = { type: 'key', key }
          break
        default:
          console.log('   ❌ Invalid type. Use: text, enter, or key')
          continue
      }
      
      inputs.push(inputStep)
      stepNum++
    }
    
    commands.push({ command, inputs })
  }
  
  // Create the mnemonic
  const result = await createMnemonic(name, commands)
  if (result) {
    console.log('\n🎉 Mnemonic created successfully!')
    console.log('Use: relayed run', name)
  }
}
```

### Quick Mnemonic Creation

```typescript
// Quick mnemonic creation with predefined structure
export async function quickMnemonic(name: string, commandStrings: string[]) {
  const commands = commandStrings.map(cmd => ({
    command: cmd,
    inputs: [] // No inputs for quick creation
  }))
  
  return await createMnemonic(name, commands)
}

// Usage examples:
// relayed create git-basics "git add ." "git commit -m 'update'" "git push"
// relayed create npm-workflow "npm install" "npm run build" "npm test"
```

### Advanced Input Step Creation

```typescript
// Helper to create different input step types
export function createInputSteps() {
  return {
    text: (value: string) => ({ type: 'text', value }),
    enter: () => ({ type: 'enter' }),
    key: (key: 'up' | 'down' | 'left' | 'right' | 'space' | 'tab' | 'backspace') => ({ type: 'key', key }),
    
    // Convenience methods
    password: (pwd: string) => [
      { type: 'text', value: pwd },
      { type: 'enter' }
    ],
    confirm: () => [
      { type: 'text', value: 'y' },
      { type: 'enter' }
    ],
    navigate: (direction: 'up' | 'down' | 'left' | 'right', times: number = 1) => 
      Array(times).fill({ type: 'key', key: direction })
  }
}

// Usage example:
const steps = createInputSteps()
await createMnemonic('docker-deploy', [
  {
    command: 'docker login',
    inputs: [
      steps.text('myusername'),
      steps.enter(),
      steps.text('mypassword'),
      steps.enter()
    ]
  },
  {
    command: 'docker push myapp:latest',
    inputs: []
  }
])
```

## CLI Commands to Implement

### Folder Commands
```bash
# List all folders
relayed folders

# Create a new folder
relayed folder create <name>
relayed folder create "My Deployment Scripts"

# Update folder name
relayed folder update <folder-id> <new-name>

# Delete folder (and all mnemonics inside)
relayed folder delete <folder-id>

# List mnemonics in a folder
relayed folder show <folder-id>
```

### Mnemonic Commands
```bash
# Interactive mnemonic builder
relayed create

# Quick creation (no folder)
relayed create <name> <command1> <command2> ...

# Create in specific folder
relayed create <name> --folder <folder-id> <command1> <command2> ...

# From file
relayed create --file mnemonic.json

# With inputs (interactive)
relayed create <name> --interactive

# List all mnemonics
relayed list

# List mnemonics in folder
relayed list --folder <folder-id>

# Show mnemonic details
relayed show <name>

# Update mnemonic
relayed update <name>

# Delete mnemonic
relayed delete <name>

# Run mnemonic (existing functionality)
relayed run <name>
```

## Input Step Types

### Text Input
```json
{ "type": "text", "value": "Hello World" }
```
- Types the exact text without pressing Enter
- Use for passwords, usernames, file paths, etc.

### Enter Key
```json
{ "type": "enter" }
```
- Presses the Enter/Return key
- Use for confirmations, submitting forms

### Special Keys
```json
{ "type": "key", "key": "up" }
{ "type": "key", "key": "down" }
{ "type": "key", "key": "space" }
{ "type": "key", "key": "tab" }
```
- Presses special keys for navigation and control
- Useful for menu navigation, form field jumping

## Best Practices

1. **Naming Convention**
   - Use descriptive names: `git-workflow`, `docker-deploy`
   - Avoid spaces, use hyphens or underscores

2. **Security**
   - Be cautious with passwords in mnemonics
   - Consider using environment variables for sensitive data
   - Tokens are scoped to your user account

3. **Organization**
   - CLI mnemonics don't need folders
   - Use consistent naming schemes
   - Group related commands in one mnemonic

4. **Testing**
   - Test mnemonics in safe environments first
   - Use dry-run modes when available
   - Verify input sequences before saving

## Error Handling

Common error responses:

```json
// Authentication failed
{
  "success": false,
  "error": "Authentication required. Please login via web portal or provide a valid Bearer token.",
  "status": 401
}

// Duplicate name
{
  "success": false,
  "error": "Mnemonic name already exists",
  "status": 409
}

// Invalid input structure
{
  "success": false,
  "error": "Commands must be an array with valid command strings and InputStep arrays",
  "status": 400
}
```

The hybrid authentication system allows seamless mnemonic creation from both the web portal and CLI, giving you flexibility in how you manage your automation workflows!
