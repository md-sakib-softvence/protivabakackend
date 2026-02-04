import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('APPLE_CLIENT_ID', ''),
      teamID: configService.get<string>('APPLE_TEAM_ID', ''),
      keyID: configService.get<string>('APPLE_KEY_ID', ''),
      privateKeyString: configService.get<string>('APPLE_PRIVATE_KEY', ''),
      callbackURL: configService.get<string>('APPLE_CALLBACK_URL', ''),
      scope: ['email', 'name'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string | undefined,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<void> {
    try {
      const { email, name } = profile;

      if (!email) {
        return done(new Error('Apple did not provide an email'), null);
      }

      const user = {
        email,
        firstName: name?.firstName || '',
        lastName: name?.lastName || '',
        appleId: profile.id,
      };

      done(null, user);
    } catch (err) {
      done(err);
    }
  }
}