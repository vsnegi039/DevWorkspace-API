import { RequestHandler, Response, NextFunction } from 'express';
import joi from 'joi';
import { Types } from 'mongoose';

import Project, { ProjectRole } from '../../models/project.model';
import structuredResp from '../../services/resp.service';
import { BadRequestError, ForbiddenError, NotFound } from '../../errors';
import { IBodyRequest, IAuthenticateRequest } from '../../interfaces/request';

/* ────────────────────────
   Request Types
──────────────────────── */

type ICreateProjectReq = IAuthenticateRequest<
  {},
  {
    name: string;
    description?: string;
  }
>;

type IInviteMemberReq = IAuthenticateRequest<
  {},
  {
    userId: string;
    role: ProjectRole;
  }
>;

type IUpdateProjectReq = IAuthenticateRequest<
  {},
  {
    name?: string;
    description?: string;
    isArchived?: boolean;
  }
>;

/* ────────────────────────
   Validation Schemas
──────────────────────── */

const createProjectBody = joi.object({
  name: joi.string().min(3).required(),
  description: joi.string().optional(),
});

const inviteMemberBody = joi.object({
  userId: joi.string().required(),
  role: joi.string().valid('owner', 'collaborator', 'viewer').required(),
});

const updateProjectBody = joi.object({
  name: joi.string().min(3).optional(),
  description: joi.string().optional(),
  isArchived: joi.boolean().optional(),
});

/* ────────────────────────
   Controllers
──────────────────────── */

/**
 * Create Project
 */
const createProject = async (req: ICreateProjectReq, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createProjectBody.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });

    if (error) {
      return structuredResp(req, res, false, 'validation failed', 400, error.details);
    }

    const project = await Project.create({
      name: value.name,
      description: value.description,
      owner: (req.user as any).id,
      members: [],
    });

    return structuredResp(req, res, true, 'Project created', 201, project);
  } catch (err) {
    next(err);
  }
};

/**
 * Get Project by ID (RBAC enforced)
 */
const getProject = async (req: RequestHandler['arguments'][0], res: Response, next: NextFunction) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return next(new NotFound('Project not found'));
    }

    if (!project.hasAccess(new Types.ObjectId(req.user.id))) {
      return next(new ForbiddenError());
    }

    return structuredResp(req, res, true, 'Project fetched', 200, project);
  } catch (err) {
    next(err);
  }
};

/**
 * Update Project (Owner only)
 */
const updateProject = async (req: IUpdateProjectReq, res: Response, next: NextFunction) => {
  try {
    const { error, value } = updateProjectBody.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });

    if (error) {
      return structuredResp(req, res, false, 'validation failed', 400, error.details);
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return next(new NotFound('Project not found'));
    }

      if (!project.owner.equals((req.user as any).id)) {
      return next(new ForbiddenError('Only owner can update project'));
    }

    Object.assign(project, value);
    await project.save();

    return structuredResp(req, res, true, 'Project updated', 200, project);
  } catch (err) {
    next(err);
  }
};

/**
 * Invite Member (Owner only)
 */
const inviteMember = async (req: IInviteMemberReq, res: Response, next: NextFunction) => {
  try {
    const { error, value } = inviteMemberBody.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });

    if (error) {
      return structuredResp(req, res, false, 'validation failed', 400, error.details);
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return next(new NotFound('Project not found'));
    }

      if (!project.owner.equals((req.user as any).id)) {
      return next(new ForbiddenError('Only owner can invite members'));
    }

    const exists = project.owner.equals(value.userId) || project.members.some((m) => m.user.equals(value.userId));

    if (exists) {
      return next(new BadRequestError('User already part of project'));
    }

    project.members.push({
      user: new Types.ObjectId(value.userId),
      role: value.role,
      invitedAt: new Date(),
    });

    await project.save();

    return structuredResp(req, res, true, 'Member invited', 200, project);
  } catch (err) {
    next(err);
  }
};

/* ────────────────────────
   Export
──────────────────────── */

export default {
  createProject: createProject as RequestHandler,
  getProject: getProject as RequestHandler,
  updateProject: updateProject as RequestHandler,
  inviteMember: inviteMember as RequestHandler,
};
