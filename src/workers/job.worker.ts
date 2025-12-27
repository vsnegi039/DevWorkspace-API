import { Worker } from 'bullmq';
import config from '../config/config';
import Job from '../models/job.model';

const worker = new Worker(
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
        error: err.message || 'Execution failed',
      });

      throw err; // 🔁 triggers retry
    }
  },
  {
    connection: {
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
    },
  },
);

export default worker;
