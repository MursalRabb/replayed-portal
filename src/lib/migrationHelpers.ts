// Helper functions to handle migration from old command format to new format

export interface Command {
  command: string
  inputs: string[]
}

export interface LegacyMnemonic {
  _id: string
  folderId: string
  name: string
  commands: string[] // Old format
  createdAt: string
  updatedAt: string
}

export interface NewMnemonic {
  _id: string
  folderId: string
  name: string
  commands: Command[] // New format
  createdAt: string
  updatedAt: string
}

/**
 * Migrate commands from old format (string[]) to new format (Command[])
 */
export function migrateCommands(commands: string[] | Command[]): Command[] {
  if (!commands || commands.length === 0) {
    return [{ command: "", inputs: [] }]
  }

  // Check if it's already in the new format
  if (typeof commands[0] === 'object' && 'command' in commands[0]) {
    return commands as Command[]
  }

  // Convert from old format (string[]) to new format (Command[])
  return (commands as string[]).map(cmd => ({
    command: cmd,
    inputs: []
  }))
}

/**
 * Migrate a mnemonic from old format to new format
 */
export function migrateMnemonic(mnemonic: LegacyMnemonic | NewMnemonic): NewMnemonic {
  return {
    ...mnemonic,
    commands: migrateCommands(mnemonic.commands)
  }
}
