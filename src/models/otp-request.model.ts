import { Schema, model, Document } from 'mongoose';
import crypto from 'crypto';

export interface IOtpRequest extends Document {
  userId: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  sendAttempts: number;
  status: 'PENDING' | 'USED' | 'EXPIRED' | 'BLOCKED';
}

const OtpSchema = new Schema<IOtpRequest>(
  {
    userId: { type: String, required: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    status: { type: String, enum: ['PENDING', 'USED', 'EXPIRED', 'BLOCKED'], default: 'PENDING' },
    sendAttempts: { type: Number, default: 1 },
  },
  { timestamps: true },
);

// TTL — Mongo auto deletes when expiresAt < now
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static helper to hash OTP
export const hashOtp = (otp: string) => crypto.createHash('sha256').update(otp).digest('hex');

export const OtpRequest = model<IOtpRequest>('OtpRequest', OtpSchema);
