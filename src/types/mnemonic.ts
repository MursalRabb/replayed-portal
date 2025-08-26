// New step-based input structure for mnemonics

export type InputStep =
  | { type: "text"; value: string }
  | { type: "enter" }
  | {
      type: "key";
      key: "up" | "down" | "left" | "right" | "space" | "tab" | "backspace";
    };

export interface MnemonicCommand {
  command: string;
  inputs: InputStep[];
}

export interface Mnemonic {
  _id: string;
  userId: string;
  folderId?: string | null;
  name: string;
  commands: MnemonicCommand[];
  createdAt: Date;
  updatedAt: Date;
}

// Type guards for InputStep validation
export function isTextStep(
  step: InputStep
): step is { type: "text"; value: string } {
  return step && step.type === "text" && typeof step.value === "string";
}

export function isEnterStep(step: InputStep): step is { type: "enter" } {
  return step && step.type === "enter";
}

export function isKeyStep(
  step: InputStep
): step is {
  type: "key";
  key: "up" | "down" | "left" | "right" | "space" | "tab" | "backspace";
} {
  return (
    step &&
    step.type === "key" &&
    typeof step.key === "string" &&
    ["up", "down", "left", "right", "space", "tab", "backspace"].includes(
      step.key
    )
  );
}

export function isValidInputStep(step: InputStep): step is InputStep {
  return isTextStep(step) || isEnterStep(step) || isKeyStep(step);
}

// Key options for the UI
export const KEY_OPTIONS = [
  { value: "up", label: "Up Arrow" },
  { value: "down", label: "Down Arrow" },
  { value: "left", label: "Left Arrow" },
  { value: "right", label: "Right Arrow" },
  { value: "space", label: "Space" },
  { value: "tab", label: "Tab" },
  { value: "backspace", label: "Backspace" },
] as const;

// Input type options for the UI
export const INPUT_TYPE_OPTIONS = [
  { value: "text", label: "Type Text" },
  { value: "enter", label: "Press Enter" },
  { value: "key", label: "Press Key" },
] as const;
