import express from 'express';

import projectController from '../controllers/project.controller';

const router = express.Router();


router.post('/', projectController.createProject);

router.get('/:id', projectController.getProject);

router.patch('/:id', projectController.updateProject);

router.post('/:id/invite', projectController.inviteMember);

export default router;
