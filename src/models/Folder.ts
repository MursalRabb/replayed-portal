import mongoose, { Schema, Document } from 'mongoose'

export interface IFolder extends Document {
  _id: string
  userId: string
  name: string
  createdAt: Date
  updatedAt: Date
}

const FolderSchema = new Schema<IFolder>({
  userId: {
    type: String,
    required: true,
    ref: 'User',
  },
  name: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
})

// Create compound index for userId and name to ensure unique folder names per user
FolderSchema.index({ userId: 1, name: 1 }, { unique: true })

export default mongoose.models.Folder || mongoose.model<IFolder>('Folder', FolderSchema)
