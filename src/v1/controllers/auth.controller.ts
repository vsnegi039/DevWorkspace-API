import { RequestHandler, Response, NextFunction, CookieOptions } from 'express';
import moment from 'moment';
import joi from 'joi';

import config from '../../config/config';
import User, { IUser, IUserDocument } from '../../models/user.model';
import { ResendEmail } from '../../services/resend.service';
import structuredResp from '../../services/resp.service';
import { InvalidEmailError, WrongCredentialsError, BadRequestError, ApplicationError } from '../../errors';
import { IBodyRequest } from '../../interfaces/request';
import { JWT } from '../../services/jwt';
import { generateOtp } from '../../services/otp.util';
import { OtpRequest } from '../../models/otp-request.model';
import { createOtpHash } from '../../services/otp.util';

const resendService = new ResendEmail(config.RESEND_API_KEY);
const JWTService = new JWT(config);

type ISignupRequest = IBodyRequest<IUser>;
type ILoginRequest = IBodyRequest<{ email: string; password: string }>;
type IVerifyRequest = IBodyRequest<{ requestId: string; code: string }>;

const loginBody = joi.object({
  email: joi.string().email().required(),
  password: joi.string().min(8).required(),
});

const signupBody = joi.object({
  email: joi.string().email().required(),
  password: joi.string().min(8).required(),
  name: joi.string().min(3).required(),
});

const sendOtp = async (user: IUserDocument) => {
  const now = Date.now();
  const otp = generateOtp();
  const otpHash = createOtpHash(otp);
  const expiresAt = new Date(now + 5 * 60 * 1000); // 5 minutes

  const otpRequest = await OtpRequest.create({
    userId: user.id,
    otpHash,
    expiresAt,
    attempts: 0,
    maxAttempts: 5,
    sendAttempts: 1,
  });

  const res = await resendService.sendSimpleMail({
    from: config.SMTP_FROM_EMAIL,
    to: user.email,
    subject: 'Your verification code',
    html: `<p>Your OTP code is <b>${otp}</b>. It expires in 5 minutes.</p>`,
  });

  if (!res.success) {
    throw new Error('Failed to send OTP email');
  }

  return { requestId: otpRequest._id.toString(), expiresAt };
};

const signup = async (req: ISignupRequest, res: Response, next: NextFunction) => {
  try {
    const { error, value: data } = signupBody.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });

    if (error) {
      return structuredResp(req, res, false, 'validation failed', 400, error.details);
    }

    const now = Date.now();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);

    let user = await User.findOne({ email: data.email });

    if (user && user.emailVerified) {
      return next(new InvalidEmailError()); // User is already verified → cannot signup again
    }

    if (user && !user.emailVerified) {
      const sentCount = await OtpRequest.countDocuments({
        userId: user.id,
        createdAt: { $gte: oneHourAgo },
      });

      if (sentCount >= 3) {
        return next(new BadRequestError('Too many OTP requests. Try again in 1 hour.', 429, 'TOO_MANY_OTP_REQUESTS'));
      }

      const lastOtp = await OtpRequest.findOne({ userId: user.id }).sort({ createdAt: -1 });

      let requestId: string;
      let expiresAt: Date;

      if (!lastOtp || lastOtp.expiresAt.getTime() < now) {
        // OTP expired → create new OTP
        const otpResp = await sendOtp(user);
        requestId = otpResp.requestId;
        expiresAt = otpResp.expiresAt;
      } else {
        if (lastOtp.sendAttempts > 2) {
          return next(new BadRequestError('Too many OTP requests. Try again in 1 hour.', 429, 'TOO_MANY_OTP_REQUESTS'));
        }

        // OTP still valid → generate new OTP anyway (your rule)
        // Reset attempts + refresh expiration
        const otp = generateOtp();
        const otpHash = createOtpHash(otp);

        lastOtp.otpHash = otpHash;
        lastOtp.expiresAt = new Date(now + 5 * 60 * 1000);
        lastOtp.attempts = 0;
        lastOtp.sendAttempts = lastOtp.sendAttempts + 1;
        lastOtp.status = 'PENDING';
        await lastOtp.save();

        // send again
        const mailRes = await resendService.sendSimpleMail({
          from: config.SMTP_FROM_EMAIL,
          to: user.email,
          subject: 'Your verification code',
          html: `<p>Your OTP code is <b>${otp}</b>. It expires in 5 minutes.</p>`,
        });
        if (!mailRes.success) {
          throw new Error('Failed to send OTP email');
        }

        requestId = lastOtp._id.toString();
        expiresAt = lastOtp.expiresAt;
      }

      return structuredResp(req, res, true, 'OTP resent', 200, {
        userId: user.id,
        requestId,
        expiresAt,
      });
    }

    user = new User(data);
    await user.save();

    const otpResp = await sendOtp(user);

    return structuredResp(req, res, true, 'OTP sent', 200, {
      userId: user.id,
      requestId: otpResp.requestId,
      expiresAt: otpResp.expiresAt,
    });
  } catch (err) {
    next(err);
  }
};

const verify = async (req: IVerifyRequest, res: Response, next: NextFunction) => {
  try {
    const { requestId, code } = req.body;
    if (!requestId || !code) {
      return next(new BadRequestError());
    }

    const otpHash = createOtpHash(code);

    // 🔥 Atomic find + validate + update
    const otpReq = await OtpRequest.findOneAndUpdate(
      {
        _id: requestId,
        otpHash,
        status: 'PENDING',
        expiresAt: { $gt: Date.now() },
        attempts: { $lt: 5 },
      },
      {
        $set: { status: 'USED' },
      },
      { new: false },
    );

    if (!otpReq) {
      // If this failed, either incorrect, expired, or reused
      await OtpRequest.findByIdAndUpdate(requestId, { $inc: { attempts: 1 } });
      return next(new BadRequestError('Invalid or expired OTP', 400));
    }

    // Mark user as verified
    await User.findByIdAndUpdate(otpReq.userId, { emailVerified: true });

    const token = await JWTService.signPayload({ id: otpReq.userId });

    const options: CookieOptions = {
      httpOnly: true,
      secure: !config.isDevelopment,
      expires: moment().add(config.ACCESS_TOKEN_LIFETIME_MIN, 'minutes').toDate(),
      sameSite: 'strict',
    };
    res.cookie('Authorization', `Bearer ${token}`, options);
    return structuredResp(req, res, true, 'User verified', 200, null);
  } catch (err) {
    next(err);
  }
};

const login = async (req: ILoginRequest, res: Response, next: NextFunction) => {
  try {
    const { error, value: data } = loginBody.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });

    if (error) {
      return structuredResp(req, res, false, 'validation faild', 400, error.details);
    }

    const { email, password } = data;

    const user = await User.findOne({ email });

    if (!user) {
      return next(new WrongCredentialsError());
    }

    if (!(await user.comparePassword(password))) {
      return next(new WrongCredentialsError());
    }

    const token = await JWTService.signPayload({ id: user.id });

    const options: CookieOptions = {
      httpOnly: true,
      secure: !config.isDevelopment,
      expires: moment().add(config.ACCESS_TOKEN_LIFETIME_MIN, 'minutes').toDate(),
      sameSite: 'strict',
    };
    res.cookie('Authorization', `Bearer ${token}`, options);

    return structuredResp(req, res, true, 'Logged In', 200, { token });
  } catch (err) {
    next(err);
  }
};

export default { verify: verify as RequestHandler, signup: signup as RequestHandler, login: login as RequestHandler };
