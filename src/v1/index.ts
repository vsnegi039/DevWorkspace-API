import { Router } from 'express';
import authRoutes from './routes/auth.routes';
import jobRoutes from './routes/job.routes';
import projectRoutes from './routes/project.routes';

import authMiddleware from '../middlewares/auth';

const router = Router();

router.use('/auth', authRoutes);
router.use('/job', authMiddleware, jobRoutes);
router.use('/project', authMiddleware, projectRoutes);

export default router;
