import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import * as bcrypt from 'bcrypt';

import {
    RegisterDto,
    LoginDto,
    VerifyOtpDto,
    ForgotPasswordDto,
    ResetPasswordDto,

} from './dto';

import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole, UserStatus } from '@prisma/client';
import { IEnv } from 'src/config/env.config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
    forgotPassword(dto: ForgotPasswordDto) {
        throw new Error('Method not implemented.');
    }
    resetPassword(email: string, dto: ResetPasswordDto & { email: string; }) {
        throw new Error('Method not implemented.');
    }
    changePassword(userId: string, dto: ChangePasswordDto) {
        throw new Error('Method not implemented.');
    }
    logoutAll(userId: string) {
        throw new Error('Method not implemented.');
    }
    private readonly OTP_EXPIRY_MINUTES = 10;
    private readonly MAX_LOGIN_ATTEMPTS = 5;
    private readonly LOCK_DURATION_MINUTES = 30;

    emailService: any;
    smsService: any;

    constructor(
        // private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        // private readonly emailService: EmailService,
        // private readonly smsService: SmsService,
        private readonly prisma: PrismaService
    ) { }

    async register(dto: RegisterDto) {
        console.log(dto);
        console.log("Hit Service");
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: dto.email },
                    { phone: dto.phone },
                ],
            },
        });

        console.log("Hit");

        if (existingUser) {
            if (existingUser.email === dto.email) {
                throw new ConflictException('Email already registered');
            }
            if (existingUser.phone === dto.phone) {
                throw new ConflictException('Phone number already registered');
            }
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const otp = this.generateOTP();
        const otpExpiry = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                phone: dto.phone,
                password: hashedPassword,
                firstName: dto.firstName,
                lastName: dto.lastName,
                role: dto.role,
                otp,
                otpExpiry,
                status: UserStatus.PENDING,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                createdAt: true,
            },
        });

        // await this.emailService.sendVerificationEmail(user.email, otp, user.firstName);

        // if (dto.phone) {
        //     await this.smsService.sendOTP(dto.phone, otp);
        // }

        return {
            message: 'Registration successful. Please verify your email with the OTP sent.',
            user,
        };
    }

    async verifyOtp(dto: VerifyOtpDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid email');
        }

        if (!user.otp || !user.otpExpiry) {
            throw new BadRequestException('No OTP found. Please request a new one.');
        }

        if (new Date() > user.otpExpiry) {
            throw new BadRequestException('OTP has expired. Please request a new one.');
        }

        if (user.otp !== dto.otp) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { otpAttempts: { increment: 1 } },
            });

            if (user.otpAttempts >= 5) {
                throw new BadRequestException('Too many failed attempts. Please request a new OTP.');
            }

            throw new BadRequestException('Invalid OTP');
        }

        const verifiedUser = await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                status: UserStatus.ACTIVE,
                otp: null,
                otpExpiry: null,
                otpAttempts: 0,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                emailVerified: true,
            },
        });

        await this.prisma.userSetting.create({
            data: { userId: user.id },
        });

        const tokens = await this.generateTokens(user.id, user.email, user.role);

        return {
            message: 'Email verified successfully',
            user: verifiedUser,
            ...tokens,
        };
    }

    async resendOtp(email: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (user.emailVerified) {
            throw new BadRequestException('Email already verified');
        }

        const otp = this.generateOTP();
        const otpExpiry = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                otp,
                otpExpiry,
                otpAttempts: 0,
            },
        });

        await this.emailService.sendVerificationEmail(user.email, otp, user.firstName);

        if (user.phone) {
            await this.smsService.sendOTP(user.phone, otp);
        }

        return {
            message: 'OTP sent successfully',
        };
    }

    async login(dto: LoginDto, deviceId: string, ipAddress: string, userAgent: string) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }


        if (user.lockedUntil && new Date() < user.lockedUntil) {
            throw new UnauthorizedException('Account is locked. Please try again later.');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password!);

        if (!isPasswordValid) {
            const attempts = user.loginAttempts + 1;
            const updateData: any = { loginAttempts: attempts };

            if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
                updateData.lockedUntil = new Date(
                    Date.now() + this.LOCK_DURATION_MINUTES * 60 * 1000,
                );
            }

            await this.prisma.user.update({
                where: { id: user.id },
                data: updateData,
            });

            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.emailVerified) {
            throw new UnauthorizedException('Please verify your email first');
        }

        if (user.status === UserStatus.SUSPENDED) {
            throw new UnauthorizedException('Account is suspended');
        }

        if (user.status === UserStatus.BANNED) {
            throw new UnauthorizedException('Account is banned');
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                loginAttempts: 0,
                lockedUntil: null,
                lastLogin: new Date(),
                lastActive: new Date(),
            },
        });

        const tokens = await this.generateTokens(user.id, user.email, user.role);

        await this.createSession(
            user.id,
            deviceId,
            ipAddress,
            userAgent,
            tokens.refreshToken,
        );

        return {
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                avatar: user.avatar,
            },
            ...tokens,
        };
    }

    async refreshToken(refreshToken: string) {
        const session = await this.prisma.session.findUnique({
            where: { refreshToken },
            include: { user: true },
        });

        if (!session || !session.isActive) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        if (new Date() > session.expiresAt) {
            throw new UnauthorizedException('Refresh token expired');
        }

        const tokens = await this.generateTokens(
            session.user.id,
            session.user.email,
            session.user.role,
        );

        await this.prisma.session.update({
            where: { id: session.id },
            data: {
                refreshToken: tokens.refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                lastUsedAt: new Date(),
            },
        });

        return tokens;
    }

    async logout(userId: string, deviceId: string) {
        await this.prisma.session.updateMany({
            where: {
                userId,
                deviceId,
                isActive: true,
            },
            data: { isActive: false },
        });

        return { message: 'Logged out successfully' };
    }

    private generateOTP(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    private async generateTokens(userId: string, email: string, role: UserRole) {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(
                { sub: userId, email, role },
                {
                    secret: this.configService.get<IEnv>("env")?.JWT_SECRET,
                    expiresIn: "15m",
                },
            ),
            this.jwtService.signAsync(
                { sub: userId, email, role },
                {
                    secret: this.configService.get<IEnv>("env")?.JWT_REFRESH_SECRET,
                    expiresIn: "7d",
                },
            ),
        ]);

        return { accessToken, refreshToken };
    }

    private async createSession(
        userId: string,
        deviceId: string,
        ipAddress: string,
        userAgent: string,
        refreshToken: string,
    ) {
        await this.prisma.session.updateMany({
            where: { userId, deviceId },
            data: { isActive: false },
        });

        return this.prisma.session.create({
            data: {
                userId,
                deviceId,
                ipAddress,
                userAgent,
                refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
    }
}