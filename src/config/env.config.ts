import { registerAs } from '@nestjs/config';

export interface IEnv {
    NODE_ENV: string;
    PORT: number;
    API_PREFIX: string;
    APP_NAME: string;
    APP_URL: string;

    DATABASE_URL: string;
    DATABASE_POOL_MIN: number;
    DATABASE_POOL_MAX: number;

    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    JWT_REFRESH_SECRET: string;
    JWT_REFRESH_EXPIRES_IN: string;

    REDIS_HOST: string;
    REDIS_PORT: number;
    REDIS_PASSWORD?: string;
    REDIS_DB: number;
    REDIS_TTL: number;
    REDIS_QUEUE_DB: number;

    ENABLE_QUEUES: boolean;
    QUEUE_CONCURRENCY: number;

    EMAIL_HOST: string;
    EMAIL_PORT: number;
    EMAIL_USER: string;
    EMAIL_PASSWORD: string;
    EMAIL_FROM: string;
    EMAIL_FROM_NAME: string;

    CLOUDINARY: {
        CLOUDINARY_CLOUD_NAME: string,
        CLOUDINARY_API_KEY: string
        CLOUDINARY_API_SECRET: string
    }

}

const requiredEnv = [
    'NODE_ENV',
    'PORT',
    'API_PREFIX',
    'APP_NAME',
    'APP_URL',

    'DATABASE_URL',

    'JWT_SECRET',
    'JWT_REFRESH_SECRET',

    'REDIS_HOST',
    'REDIS_PORT',

    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'EMAIL_FROM',

    'CLOUDINARY_API_SECRET',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_CLOUD_NAME'
];


// env Checker
function envChecker() {
    requiredEnv.forEach((key) => {
        if (!process.env[key]) {
            throw new Error(`❌ Missing required env: ${key}`);
        }
    });
}

export default registerAs('env', (): IEnv => {
    envChecker();

    return {
        NODE_ENV: process.env.NODE_ENV!,
        PORT: Number(process.env.PORT),
        API_PREFIX: process.env.API_PREFIX!,
        APP_NAME: process.env.APP_NAME!,
        APP_URL: process.env.APP_URL!,

        DATABASE_URL: process.env.DATABASE_URL!,
        DATABASE_POOL_MIN: Number(process.env.DATABASE_POOL_MIN ?? 2),
        DATABASE_POOL_MAX: Number(process.env.DATABASE_POOL_MAX ?? 10),

        JWT_SECRET: process.env.JWT_SECRET!,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '15m',
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
        JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',

        REDIS_HOST: process.env.REDIS_HOST!,
        REDIS_PORT: Number(process.env.REDIS_PORT),
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        REDIS_DB: Number(process.env.REDIS_DB ?? 0),
        REDIS_TTL: Number(process.env.REDIS_TTL ?? 3600),
        REDIS_QUEUE_DB: Number(process.env.REDIS_QUEUE_DB ?? 1),

        ENABLE_QUEUES: process.env.ENABLE_QUEUES === 'true',
        QUEUE_CONCURRENCY: Number(process.env.QUEUE_CONCURRENCY ?? 5),

        EMAIL_HOST: process.env.EMAIL_HOST!,
        EMAIL_PORT: Number(process.env.EMAIL_PORT),
        EMAIL_USER: process.env.EMAIL_USER!,
        EMAIL_PASSWORD: process.env.EMAIL_PASSWORD!,
        EMAIL_FROM: process.env.EMAIL_FROM!,
        EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME ?? 'Service Marketplace',

        CLOUDINARY: {
            CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME as string,
            CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY as string,
            CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET as string
        }

    };
});
