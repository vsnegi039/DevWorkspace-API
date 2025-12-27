import { Schema, model, Document, Model } from 'mongoose';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface IJob {
  userId: string;
  idempotencyKey: string;
  status: JobStatus;
  input: any;
  result?: any;
  error?: string;
}

export interface IJobDocument extends IJob, Document {}
export type IJobModel = Model<IJobDocument>;

const jobSchema = new Schema<IJobDocument>(
  {
    userId: { type: String, required: true },
    idempotencyKey: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    input: { type: Schema.Types.Mixed, required: true },
    result: { type: Schema.Types.Mixed },
    error: { type: String },
  },
  { timestamps: true },
);

jobSchema.index({ userId: 1 });

export default model<IJobDocument, IJobModel>('Job', jobSchema);
