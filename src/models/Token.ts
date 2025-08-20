import mongoose, { Schema, Document } from 'mongoose'

export interface IToken extends Document {
  _id: string
  userId: string
  name: string
  hashedToken: string
  lastUsed?: Date
  createdAt: Date
  updatedAt: Date
}

const TokenSchema = new Schema<IToken>({
  userId: {
    type: String,
    required: true,
    ref: 'User',
  },
  name: {
    type: String,
    required: true,
  },
  hashedToken: {
    type: String,
    required: true,
    unique: true,
  },
  lastUsed: {
    type: Date,
  },
}, {
  timestamps: true,
})

// Create compound index for userId to efficiently query user's tokens
TokenSchema.index({ userId: 1 })

// Create index on hashedToken for fast lookup during authentication
TokenSchema.index({ hashedToken: 1 })

export default mongoose.models.Token || mongoose.model<IToken>('Token', TokenSchema)

