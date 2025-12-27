import { Document, Model, Schema, model, Types } from 'mongoose';

/**
 * Roles allowed inside a project
 */
export type ProjectRole = 'owner' | 'collaborator' | 'viewer';

/**
 * Project member sub-document
 */
export interface IProjectMember {
  user: Types.ObjectId;
  role: ProjectRole;
  invitedAt: Date;
}

/**
 * Core Project interface
 */
export interface IProject {
  name: string;
  description?: string;
  owner: Types.ObjectId;
  members: IProjectMember[];
  isArchived: boolean;
}

/**
 * Project document with instance methods
 */
export interface IProjectDocument extends Document, IProject {
  hasAccess(userId: Types.ObjectId): boolean;
  getUserRole(userId: Types.ObjectId): ProjectRole | null;
}

/**
 * Project model type
 */
export type IProjectModel = Model<IProjectDocument>;

const projectMemberSchema = new Schema<IProjectMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['owner', 'collaborator', 'viewer'],
      required: true,
    },
    invitedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const projectSchema = new Schema<IProjectDocument>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [projectMemberSchema], default: [] },
    isArchived: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

/**
 * Instance methods
 */
projectSchema.methods.hasAccess = function (userId: Types.ObjectId): boolean {
  if (this.owner.equals(userId)) return true;
  return this.members.some((m: any) => m.user.equals(userId));
};

projectSchema.methods.getUserRole = function (userId: Types.ObjectId): ProjectRole | null {
  if (this.owner.equals(userId)) return 'owner';

  const member = this.members.find((m: any) => m.user.equals(userId));
  return member ? member.role : null;
};

/**
 * Indexes (important, don’t skip this)
 */
projectSchema.index({ owner: 1 });
projectSchema.index({ 'members.user': 1 });

const Project: IProjectModel = model<IProjectDocument, IProjectModel>('Project', projectSchema);

export default Project;
