import mongoose from 'mongoose'

declare global {
  var mongoose: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
  }
  
  interface Window {
    rdt: (command: string, event: string, data?: {
      email?: string
      phoneNumber?: string
      externalId?: string
      idfa?: string
      aaid?: string
    }) => void
  }
}

export {}
