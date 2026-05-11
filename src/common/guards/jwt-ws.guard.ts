import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';

export interface AuthenticatedSocket extends Socket {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class JwtWsGuard implements CanActivate {
  private readonly logger = new Logger(JwtWsGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Missing authentication token');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('env')?.JWT_SECRET,
      });

      // Verify user still exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, status: true , verificationStatus : true, emailVerified : true, phoneVerified : true},
      });

      if (!user || user.status !== 'ACTIVE' || user.verificationStatus !== "VERIFIED" || user.phoneVerified !== true || user.emailVerified !== true) {
        throw new WsException('User is not active or does not exist');
      }


      // Attach user to socket
      (client as AuthenticatedSocket).user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      return true;
    } catch (error: any) {
      this.logger.warn(`WebSocket authentication failed: ${error.message}`);
      
      // Provide more specific error messages when possible
      if (error.name === 'TokenExpiredError') {
        throw new WsException('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new WsException('Invalid token');
      }

      throw new WsException('Invalid or expired authentication token');
    }
  }

  private extractToken(client: Socket): string | null {
    // Support both Authorization header and handshake.auth.token
    const authHeader = client.handshake.headers?.authorization as string | undefined;
    
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return (client.handshake.auth?.token as string) ?? null;
  }
}