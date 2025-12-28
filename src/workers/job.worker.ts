import { Worker } from 'bullmq';
import config from '../config/config';
import Job from '../models/job.model';
import { connectMongo } from '../db/mongo/mongo';
import logger from '../logger';

let worker: Worker;

async function startWorker() {
  logger.info('Starting execution worker...');

  // 1️⃣ Ensure Mongo is connected BEFORE anything else
  await connectMongo();
  logger.info('MongoDB connected');

  // 2️⃣ Create the BullMQ worker AFTER Mongo is ready
  worker = new Worker(
    'execution-jobs',
    async (job) => {
      const { jobId, payload } = job.data;

      await Job.findByIdAndUpdate(jobId, {
        status: 'PROCESSING',
      });

      try {
        // 🔧 Simulated execution
        await new Promise((res) => setTimeout(res, 3000));

        const result = {
          output: 'Execution successful',
          input: payload,
        };

        await Job.findByIdAndUpdate(jobId, {
          status: 'COMPLETED',
          result,
        });

        return result;
      } catch (err: any) {
        await Job.findByIdAndUpdate(jobId, {
          status: 'FAILED',
          error: err?.message || 'Execution failed',
        });

        throw err; // 🔁 BullMQ retry
      }
    },
    {
      connection: {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
        password: config.REDIS_PASSWORD, // 👈 REQUIRED if using Upstash
        tls: config.REDIS_TLS ? {} : undefined,
      },
      concurrency: 5, // 👈 control parallel jobs
    },
  );

  // 3️⃣ Lifecycle logging (CRITICAL for prod)
  worker.on('ready', () => {
    logger.info('Worker is ready and waiting for jobs');
  });

  worker.on('failed', (job, err) => {
    logger.error('Job failed', {
      jobId: job?.id,
      message: err.message,
      stack: err.stack,
    });
  });

  worker.on('completed', (job) => {
    logger.info('Job completed', { jobId: job.id });
  });
}

// 4️⃣ Explicit bootstrap (Railway-safe)
startWorker().catch((err) => {
  logger.error('Worker crashed during startup', {
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});
