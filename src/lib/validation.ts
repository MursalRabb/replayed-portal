// Validation utilities

export const MNEMONIC_NAME_REGEX = /^[a-z][a-z0-9-_]{0,49}$/;

export function validateMnemonicName(name: string): { isValid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return {
      isValid: false,
      error: 'Mnemonic name is required'
    };
  }

  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return {
      isValid: false,
      error: 'Mnemonic name cannot be empty'
    };
  }

  if (!MNEMONIC_NAME_REGEX.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Mnemonic name must start with a lowercase letter and contain only lowercase letters, numbers, hyphens, and underscores. Maximum 50 characters.'
    };
  }

  return { isValid: true };
}
