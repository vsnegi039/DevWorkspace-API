import { Document, Model, Schema, model } from 'mongoose';
import config from '../config/config';
import { Password } from '../services/password';

const passwordService = new Password(config);

export interface IUser {
  name: string;
  email: string;
  password: string;
  emailVerified: boolean;
}

// Extend Mongoose Document interface with custom methods for IUserDocument
export interface IUserDocument extends Document, IUser {
  comparePassword(password: string): Promise<boolean>;
}

// Define the User model type, which includes methods and static methods
export type IUserModel = Model<IUserDocument>;

const schema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc: IUserDocument, ret: IUser): Omit<IUser, 'password'> {
        ret.password = "";
        delete (ret as any)._id;
        return ret;
      },
    },
  },
);

schema.pre<IUserDocument>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const hashedPassword = await passwordService.hashPassword(this.password);
  this.password = hashedPassword;
  next();
});

schema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return passwordService.comparePassword(password, this.password);
};

const User: IUserModel = model<IUserDocument, IUserModel>('User', schema);

export default User;
