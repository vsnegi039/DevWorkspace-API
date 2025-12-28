import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import config from './config/config';
import { ApplicationError, NotFoundError } from './errors';
import routes from './routes';
import structuredResp from './services/resp.service';
import logger from './logger';
import { connectMongo } from './db/mongo/mongo';

const app = express();

app.use(
  cors({
    origin: '*',
    credentials: true,
  }),
);
app.use(express.json());
app.use(morgan('dev'));
app.use(compression());
app.use(cookieParser());
app.set('port', config.PORT || 3000);

app.use(async (_req, _res, next) => {
  await connectMongo();
  next();
});

app.use(routes);

app.use((req, res, next) =>
  next(new NotFoundError('We are unable to locate requested API resource', 404, 'API_ENDPOINT_NOT_FOUND')),
);

app.use((err: ApplicationError, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }

  logger.log({
    level: 'error',
    message: err.message,
    stack: err.stack,
  });

  return structuredResp(req, res, false, err.message, err.status || 500, null);
});

export default app;
