import dotenv from 'dotenv';
import path from 'path';

// Single .env lives at the repo root.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const rootUploads = path.resolve(__dirname, '../../../uploads');

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
  /** Separate trust domain from JWT signing: rotating the JWT secret must not
   *  invalidate every outstanding media URL. Falls back to the JWT secret so
   *  existing deployments keep working until the var is set. */
  MEDIA_SIGN_SECRET: process.env.MEDIA_SIGN_SECRET || process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL ?? '15m',
  REFRESH_TOKEN_TTL_DAYS: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  UPLOAD_DIR: process.env.UPLOAD_DIR
    ? path.resolve(__dirname, '../../../', process.env.UPLOAD_DIR)
    : rootUploads,
  FFMPEG_PATH: process.env.FFMPEG_PATH || 'ffmpeg',
  FFPROBE_PATH: process.env.FFPROBE_PATH || 'ffprobe',
};

// Never run production on the default dev JWT secret (admin-token forgery risk).
if (env.NODE_ENV === 'production' && env.JWT_ACCESS_SECRET === 'dev-access-secret') {
  throw new Error('JWT_ACCESS_SECRET must be set to a strong secret in production.');
}
