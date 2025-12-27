import { Queue } from 'bullmq';
import config from '../config/config';

export const jobQueue = new Queue('execution-jobs', {
  connection: {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
  },
});
