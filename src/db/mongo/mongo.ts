import mongoose from 'mongoose';
import config from '../../config/config';

declare global {
  // eslint-disable-next-line no-var
  var mongooseConn:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const cached = global.mongooseConn || { conn: null, promise: null };
global.mongooseConn = cached;

export async function connectMongo() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(config.MONGO_URL, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
