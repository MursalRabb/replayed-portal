import mongoose, { Schema, Document } from 'mongoose'

export interface ICommand {
  command: string
  inputs?: string[]
}

export interface IMnemonic extends Document {
  _id: string
  folderId: string
  name: string
  commands: ICommand[]
  createdAt: Date
  updatedAt: Date
}

// Create a more flexible schema that doesn't enforce strict validation on commands
const MnemonicSchema = new Schema({
  folderId: {
    type: String,
    required: true,
    ref: 'Folder',
  },
  name: {
    type: String,
    required: true,
  },
  commands: {
    type: Schema.Types.Mixed, // Completely flexible - allows any structure
    required: true,
  },
}, {
  timestamps: true,
  strict: false, // Allow additional fields
})

// Create compound index for folderId and name to ensure unique mnemonic names per folder
MnemonicSchema.index({ folderId: 1, name: 1 }, { unique: true })

// Remove the existing model if it exists to avoid conflicts
if (mongoose.models.Mnemonic) {
  delete mongoose.models.Mnemonic
}

export default mongoose.model<IMnemonic>('Mnemonic', MnemonicSchema)