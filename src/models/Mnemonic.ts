import mongoose, { Schema, Document } from 'mongoose'
import { MnemonicCommand } from '@/types/mnemonic'
import { validateMnemonicName } from '@/lib/validation'

export interface IMnemonic extends Document {
  _id: string
  userId: string
  folderId?: string | null
  name: string
  commands: MnemonicCommand[]
  createdAt: Date
  updatedAt: Date
}
interface IInputStep {
  type: 'text' | 'enter' | 'key'
  value?: string
  key?: string
  invalidate: (field: string, message: string) => void
}

// Schema for InputStep
const InputStepSchema: Schema<IInputStep> = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['text', 'enter', 'key']
  },
  value: {
    type: String,
    required: function(this: IInputStep) {
      return this.type === 'text'
    }
  },
  key: {
    type: String,
    required: function(this: IInputStep) {
      return this.type === 'key'
    },
    enum: ['up', 'down', 'left', 'right', 'space', 'tab', 'backspace']
  }
}, { _id: false })

// Custom validation for InputStep
InputStepSchema.pre('validate', function(this: IInputStep) {
  if (this.type === 'text' && !this.value) {
    this.invalidate('value', 'Value is required for text type')
  }
  if (this.type === 'key' && !this.key) {
    this.invalidate('key', 'Key is required for key type')
  }
  if (this.type === 'enter' && (this.value || this.key)) {
    this.value = undefined
    this.key = undefined
  }
})

// Schema for MnemonicCommand
const MnemonicCommandSchema = new Schema({
  command: {
    type: String,
    required: true,
    trim: true
  },
  inputs: {
    type: [InputStepSchema],
    default: []
  }
}, { _id: false })

// Main Mnemonic schema
const MnemonicSchema = new Schema<IMnemonic>({
  userId: {
    type: String,
    required: true,
    ref: 'User',
  },
  folderId: {
    type: String,
    ref: 'Folder',
    default: null
  },
  name: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(name: string) {
        const validation = validateMnemonicName(name)
        return validation.isValid
      },
      message: function(props: { value: string }) {
        const validation = validateMnemonicName(props.value)
        return validation.error || 'Invalid mnemonic name'
      }
    }
  },
  commands: {
    type: [MnemonicCommandSchema],
    required: true,
    validate: {
      validator: function(commands: MnemonicCommand[]) {
        return commands.length > 0
      },
      message: 'At least one command is required'
    }
  },
}, {
  timestamps: true,
})

// Create compound index for userId and name to ensure unique mnemonic names per user
MnemonicSchema.index({ userId: 1, name: 1 }, { unique: true })

// Remove the existing model if it exists to avoid conflicts
if (mongoose.models.Mnemonic) {
  delete mongoose.models.Mnemonic
}

export default mongoose.model<IMnemonic>('Mnemonic', MnemonicSchema)