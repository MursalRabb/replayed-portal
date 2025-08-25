import { MnemonicCommand, InputStep } from '@/types/mnemonic';

export interface ImportFormat {
  commands: {
    command: string;
    inputs: InputStep[];
  }[];
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  commands?: MnemonicCommand[];
}

// Validate InputStep structure
function isValidInputStep(step: unknown): step is InputStep {
  if (!step || typeof step !== 'object') {
    return false;
  }

  const stepObj = step as Record<string, unknown>;

  if (stepObj.type === 'text') {
    return typeof stepObj.value === 'string';
  }
  
  if (stepObj.type === 'enter') {
    return true;
  }
  
  if (stepObj.type === 'key') {
    return ['up', 'down', 'left', 'right', 'space', 'tab', 'backspace'].includes(stepObj.key as string);
  }
  
  return false;
}

// Validate command structure
function isValidCommand(cmd: unknown): boolean {
  if (!cmd || typeof cmd !== 'object') {
    return false;
  }
  
  const cmdObj = cmd as Record<string, unknown>;
  
  if (typeof cmdObj.command !== 'string' || cmdObj.command.trim().length === 0) {
    return false;
  }
  
  if (!Array.isArray(cmdObj.inputs)) {
    return false;
  }
  
  return cmdObj.inputs.every(isValidInputStep);
}

// Validate the entire import format
export function validateImportJson(jsonString: string): ValidationResult {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Check if it has the required structure
    if (!parsed || typeof parsed !== 'object') {
      return {
        isValid: false,
        error: 'Invalid JSON: Root must be an object'
      };
    }
    
    if (!Array.isArray(parsed.commands)) {
      return {
        isValid: false,
        error: 'Invalid format: "commands" must be an array'
      };
    }
    
    if (parsed.commands.length === 0) {
      return {
        isValid: false,
        error: 'Invalid format: At least one command is required'
      };
    }
    
    // Validate each command
    for (let i = 0; i < parsed.commands.length; i++) {
      const cmd = parsed.commands[i];
      if (!isValidCommand(cmd)) {
        return {
          isValid: false,
          error: `Invalid command at index ${i}: Command must have "command" (string) and "inputs" (array of InputStep)`
        };
      }
    }
    
    // Convert to MnemonicCommand format
    const commands: MnemonicCommand[] = parsed.commands.map((cmd: Record<string, unknown>) => ({
      command: (cmd.command as string).trim(),
      inputs: (cmd.inputs as unknown[]).map((input: unknown) => {
        const inputObj = input as Record<string, unknown>;
        // Clean up the input step to ensure it matches our type exactly
        if (inputObj.type === 'text') {
          return { type: 'text', value: inputObj.value as string };
        }
        if (inputObj.type === 'enter') {
          return { type: 'enter' };
        }
        if (inputObj.type === 'key') {
          return { type: 'key', key: inputObj.key as 'up' | 'down' | 'left' | 'right' | 'space' | 'tab' | 'backspace' };
        }
        // This shouldn't happen due to validation above, but just in case
        return { type: 'text', value: '' };
      })
    }));
    
    return {
      isValid: true,
      commands
    };
    
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown parsing error'}`
    };
  }
}

// Generate example JSON for user reference
export function getExampleJson(): string {
  const example: ImportFormat = {
    commands: [
      {
        command: "git add .",
        inputs: []
      },
      {
        command: "git commit",
        inputs: [
          { type: "text", value: "Initial commit" },
          { type: "enter" }
        ]
      }
    ]
  };
  
  return JSON.stringify(example, null, 2);
}
