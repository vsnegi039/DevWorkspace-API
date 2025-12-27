import { Request, Response } from 'express';
import { IQueryRequest, IBodyRequest, IAuthenticateRequest } from '../interfaces/request';

export default function structuredResp(
  req: Request | IQueryRequest<any> | IBodyRequest<any> | IAuthenticateRequest,
  res: Response,
  status: boolean,
  message: string,
  code: number,
  data: any,
) {
  return res.status(code).json({ status, message, data });
}
