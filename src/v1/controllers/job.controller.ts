import { RequestHandler, Response, NextFunction } from 'express';
import joi from 'joi';

import Job from '../../models/job.model';
import structuredResp from '../../services/resp.service';
import { BadRequestError, NotFound } from '../../errors';
import { IAuthenticateRequest } from '../../interfaces/request';
import { jobQueue } from '../../queues/job.queue';

/* ────────────────────────
   Types
──────────────────────── */

type IExecuteJobReq = IAuthenticateRequest<{
  payload: any;
}>;

/* ────────────────────────
   Validation
──────────────────────── */

const executeJobBody = joi.object({
  payload: joi.any().required(),
});

/* ────────────────────────
   Controllers
──────────────────────── */

/**
 * POST /jobs/execute
 * Idempotent job creation
 */
const executeJob = async (req: IExecuteJobReq, res: Response, next: NextFunction) => {
  try {
    const { error, value } = executeJobBody.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });

    if (error) {
      return structuredResp(req, res, false, 'validation failed', 400, error.details);
    }

    const idempotencyKey = req.headers['idempotency-key'];

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return next(new BadRequestError('Idempotency-Key header missing'));
    }

    // 🔒 Idempotency check
    let job = await Job.findOne({ idempotencyKey });

    if (job) {
      return structuredResp(req, res, true, 'Job already exists', 200, job);
    }

    job = await Job.create({
      userId: (req.user as any).id,
      idempotencyKey,
      input: value.payload,
      status: 'PENDING',
    });

    await jobQueue.add(
      'execute',
      {
        jobId: job.id,
        payload: value.payload,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return structuredResp(req, res, true, 'Job queued', 202, job);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /jobs/:id
 */
const getJobStatus = async (req: RequestHandler['arguments'][0], res: Response, next: NextFunction) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return next(new NotFound('Job not found'));
    }

    if (job.userId !== req.user.id) {
      return next(new BadRequestError('Access denied'));
    }

    return structuredResp(req, res, true, 'Job status', 200, job);
  } catch (err) {
    next(err);
  }
};

export default {
  executeJob: executeJob as RequestHandler,
  getJobStatus: getJobStatus as RequestHandler,
};
