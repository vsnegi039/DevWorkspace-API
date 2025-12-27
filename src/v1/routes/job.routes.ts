import express from 'express';
import jobController from '../controllers/job.controller';

const router = express.Router();

router.post('/execute', jobController.executeJob);
router.get('/:id', jobController.getJobStatus);

export default router;
