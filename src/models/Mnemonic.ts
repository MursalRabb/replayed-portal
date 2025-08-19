import mongoose, { Schema, Document } from 'mongoose'

export interface IMnemonic extends Document {
  _id: string
  folderId: string
  name: string
  commands: string[]
  createdAt: Date
  updatedAt: Date
}

const MnemonicSchema = new Schema<IMnemonic>({
  folderId: {
    type: String,
    required: true,
    ref: 'Folder',
  },
  name: {
    type: String,
    required: true,
  },
  commands: [{
    type: String,
    required: true,
  }],
}, {
  timestamps: true,
})

// Create compound index for folderId and name to ensure unique mnemonic names per folder
MnemonicSchema.index({ folderId: 1, name: 1 }, { unique: true })

export default mongoose.models.Mnemonic || mongoose.model<IMnemonic>('Mnemonic', MnemonicSchema)
