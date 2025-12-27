import crypto from 'crypto';
import { hashOtp } from '../models/otp-request.model';

export const generateOtp = () => {
  const num = crypto.randomInt(0, 999999);
  return num.toString().padStart(6, '0');
};

export const createOtpHash = (otp: string) => hashOtp(otp);
