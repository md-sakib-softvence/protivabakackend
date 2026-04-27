// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
// import * as compression from 'compression';
// import * as cookieParser from 'cookie-parser';
import * as net from 'net';
import { HttpExceptionFilter } from './common/filters';
import {
  LoggingInterceptor,
  TransformInterceptor,
} from './common/interceptors';
import rateLimit from 'express-rate-limit';
import { Redis } from 'ioredis';
import { IoAdapter } from '@nestjs/platform-socket.io';
import 'dotenv/config';

let apm: any;
try {
  apm = require('elastic-apm-node');
} catch { }

let RedisStore: any;
try {
  RedisStore = require('rate-limit-redis');
} catch { }

async function getAvailablePort(
  startPort: number,
  maxAttempts = 10,
): Promise<number> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryPort = (port: number) => {
      const server = net.createServer();
      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          attempts++;
          if (attempts >= maxAttempts) reject(err);
          else tryPort(port + 1);
        } else reject(err);
      });
      server.once('listening', () => {
        server.close();
        resolve(port);
      });
      server.listen(port);
    };
    tryPort(startPort);
  });
}

function initializeAPM(configService: ConfigService, nodeEnv: string): void {
  if (nodeEnv === 'production' && apm) {
    const apmServerUrl = configService.get('APM_SERVER_URL');
    const apmSecretToken = configService.get('APM_SECRET_TOKEN');
    if (apmServerUrl && apmSecretToken) {
      apm.start({
        serviceName: 'service-marketplace-api',
        secretToken: apmSecretToken,
        serverUrl: apmServerUrl,
        environment: nodeEnv,
        active: true,
      });
    }
  }
}

function setupInMemoryRateLimiting(app: any, windowMs: number, max: number) {
  app.use(
    rateLimit({
      windowMs,
      max,
      skip: (req: any) =>
        ['/health', '/metrics', '/docs'].some((p) => req.url.includes(p)),
    }),
  );
}

function setupRateLimiting(
  app: any,
  configService: ConfigService,
  nodeEnv: string,
): void {
  if (nodeEnv !== 'production') return;

  const windowMs = configService.get<number>(
    'RATE_LIMIT_WINDOW_MS',
    15 * 60 * 1000,
  );
  const max = configService.get<number>('RATE_LIMIT_MAX', 100);
  const redisUrl = configService.get('REDIS_URL');

  if (redisUrl && RedisStore) {
    const redisClient = new Redis(redisUrl);
    app.use(
      rateLimit({
        windowMs,
        max,
        store: new RedisStore({ client: redisClient }),
        skip: (req: any) =>
          ['/health', '/metrics', '/docs'].some((p) => req.url.includes(p)),
      }),
    );
  } else {
    setupInMemoryRateLimiting(app, windowMs, max);
  }
}

// const allowedOrigins = [
//   'http://localhost:3000',
//   'https://protiva502.vercel.app'
// ];

// app.enableCors({
//   origin: allowedOrigins,
//   credentials: true,
// });

function setupSecurity(
  app: any,
  configService: ConfigService,
  nodeEnv: string,
): void {
  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
      crossOriginOpenerPolicy: false,
      crossOriginEmbedderPolicy: false
    }),
  );
  app.enableCors({
    origin: true,
    credentials: true,
  });
}

function setupRequestLogging(app: any, logger: Logger): void {
  app.use((req: any, res: any, next: any) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.log(
        `${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`,
      );
    });
    next();
  });
}

function setupSwagger(app: any, nodeEnv: string, port: number): void {
  // Allow Swagger in production ONLY if explicitly enabled
  if (nodeEnv === 'production' && process.env.ENABLE_SWAGGER !== 'true') {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Service Marketplace API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // You can keep it at /docs
  SwaggerModule.setup('docs', app, document);

  new Logger('Swagger').log(`Swagger: http://localhost:${port}/docs`);
}

// function setupSwagger(app: any, nodeEnv: string, port: number): void {
//   // app: any, configService: ConfigService, nodeEnv: string, port: number
//   const logger = new Logger('Swagger');

//   if (nodeEnv !== 'production') {
//     try {
//       const config = new DocumentBuilder()
//         .setTitle('Service Marketplace API')
//         .setDescription(
//           'Comprehensive API documentation for Service Marketplace Platform\n\n' +
//           '## Authentication\n' +
//           'Most endpoints require JWT authentication. Use the `/auth/login` endpoint to get a token.\n\n' +
//           '## Rate Limiting\n' +
//           'API is rate limited to 100 requests per 15 minutes per IP address.\n\n' +
//           '## Pagination\n' +
//           'List endpoints support pagination using `page` and `limit` query parameters.\n\n' +
//           '## Error Handling\n' +
//           'All errors follow a consistent format: `{ statusCode, message, error, timestamp }`'
//         )
//         .setVersion('1.0.0')
//         .setContact(
//           'Support Team',
//           'https://support.servicemarketplace.com',
//           'support@servicemarketplace.com'
//         )
//         .setLicense('MIT', 'https://opensource.org/licenses/MIT')
//         .addBearerAuth(
//           {
//             type: 'http',
//             scheme: 'bearer',
//             bearerFormat: 'JWT',
//             name: 'JWT',
//             description: 'Enter JWT token',
//             in: 'header',
//           },
//           'JWT-auth',
//         )
//         .addApiKey(
//           {
//             type: 'apiKey',
//             name: 'X-API-Key',
//             in: 'header',
//             description: 'API key for third-party integrations',
//           },
//           'api-key',
//         )
//         .addCookieAuth('refresh_token', {
//           type: 'apiKey',
//           in: 'cookie',
//           description: 'Refresh token cookie for authentication',
//         })
//         .addTag('Authentication', 'User authentication and authorization endpoints')
//         .addTag('Users', 'User management endpoints')
//         .addTag('Providers', 'Service provider management endpoints')
//         .addTag('Jobs', 'Job/Service posting and management')
//         .addTag('Bookings', 'Booking management endpoints')
//         .addTag('Payments', 'Payment processing endpoints')
//         .addTag('Reviews', 'Review and rating endpoints')
//         .addTag('Messages', 'Real-time messaging endpoints')
//         .addTag('Categories', 'Category management endpoints')
//         .addTag('Admin', 'Admin panel endpoints')
//         .addTag('Notifications', 'Notification management')
//         .addTag('Subscriptions', 'Subscription plan management')
//         .addTag('Withdrawals', 'Provider withdrawal management')
//         .addTag('Marketing', 'Marketing and banner management')
//         .addServer(`http://localhost:${port}`, 'Local Development')
//         .addServer(`https://localhost:${port}`, 'Local HTTPS')
//         .addServer('https://api.servicemarketplace.com', 'Production')
//         .addServer('https://api-staging.servicemarketplace.com', 'Staging')
//         .addServer('https://api-test.servicemarketplace.com', 'Testing')
//         .build();

//       const document = SwaggerModule.createDocument(app, config, {
//         deepScanRoutes: true,
//         extraModels: [],
//         ignoreGlobalPrefix: false,
//         operationIdFactory: (controllerKey: string, methodKey: string) =>
//           `${controllerKey.replace('Controller', '')}_${methodKey}`,
//       });

//       SwaggerModule.setup('docs', app, document, {
//         customSiteTitle: 'Service Marketplace API Documentation',
//         customCss: `
//           .swagger-ui .topbar { display: none }
//           .swagger-ui .info { margin: 20px 0 }
//           .swagger-ui .scheme-container { margin: 20px 0 }
//           .swagger-ui .models { display: none }
//           body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif }
//         `,
//         customJs: [
//           'https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui-bundle.js',
//           'https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui-standalone-preset.js',
//         ],
//         customfavIcon: 'https://nestjs.com/img/logo-small.svg',
//         swaggerOptions: {
//           persistAuthorization: true,
//           docExpansion: 'list',
//           filter: true,
//           showRequestDuration: true,
//           tryItOutEnabled: true,
//           displayRequestDuration: true,
//           defaultModelsExpandDepth: 3,
//           defaultModelExpandDepth: 3,
//           showExtensions: true,
//           showCommonExtensions: true,
//           tagsSorter: 'alpha',
//           operationsSorter: 'alpha',
//           validatorUrl: null,
//           syntaxHighlight: {
//             theme: 'arta',
//           },
//           requestInterceptor: (req: any) => {
//             req.headers['X-Requested-With'] = 'SwaggerUI';
//             return req;
//           },
//         },
//         explorer: true,
//         useGlobalPrefix: false,
//       });

//       logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
//       logger.log(`Swagger JSON available at http://localhost:${port}/api/docs-json`);
//     } catch (error) {
//       logger.error('Failed to setup Swagger documentation:', error);
//     }
//   }
// }

export async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get('NODE_ENV', 'development');

  initializeAPM(configService, nodeEnv);

  const port = await getAvailablePort(configService.get<number>('PORT', 3000));

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // app.useWebSocketAdapter(new IoAdapter(app));

  setupSecurity(app, configService, nodeEnv);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.useWebSocketAdapter(new IoAdapter(app));

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  setupRateLimiting(app, configService, nodeEnv);
  setupRequestLogging(app, logger);
  setupSwagger(app, nodeEnv, port);

  const server = await app.listen(port, '0.0.0.0');

  logger.log(`App: http://localhost:${port}`);
  logger.log(`API: http://localhost:${port}/api/v1`);
  logger.log(`Docs: http://localhost:${port}/docs`);
  logger.log(`Health: http://localhost:${port}/api/v1/health`);
  logger.log(`Metrics: http://localhost:${port}/api/v1/metrics`);
  logger.log(`WebSockets → ws://localhost:${port}/messaging`);

  const shutdown = async () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 30000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap();
