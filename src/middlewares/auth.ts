import { RequestHandler, Response, NextFunction } from 'express';

import config from '../config/config';
import { WrongAuthenticationTokenError, AuthenticationTokenMissingError } from '../errors';
import User from '../models/user.model';
import { IAuthenticateRequest } from '../interfaces/request';
import { JWT } from '../services/jwt';

const JWTService = new JWT(config);

const authMiddleware = async (req: IAuthenticateRequest, res: Response, next: NextFunction) => {
  const cookies = req.cookies;
  const headers = req.headers;

  const bearerToken: string = cookies?.Authorization ?? headers?.authorization;
  if (bearerToken) {
    try {
      const [, token] = bearerToken.split(' ');
      const data = (await JWTService.verifyToken(token)) as { [key: string]: string };
      if (data) {
        const user = await User.findById(data.id);
        if (!user) {
          return next(new WrongAuthenticationTokenError());
        }
        const userJson = user.toJSON();
        req.user = userJson;
        next();
      } else {
        next(new WrongAuthenticationTokenError());
      }
    } catch (error) {
      next(new WrongAuthenticationTokenError());
    }
  } else {
    next(new AuthenticationTokenMissingError());
  }
};

export default authMiddleware as RequestHandler;
