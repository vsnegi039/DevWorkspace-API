import winston from 'winston';
import config from './config/config';

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(({ level, message, timestamp }) => {
        return `${timestamp} [${level}]: ${message}`;
      }),
    ),
  }),
];

// OPTIONAL: enable file logging ONLY outside Vercel
if (!config.IS_VERCEL) {
  transports.push(
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  );
}

const logger = winston.createLogger({
  level: 'info',
  transports,
});

export default logger;
