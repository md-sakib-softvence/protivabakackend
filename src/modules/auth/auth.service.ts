import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    ConflictException,
    NotFoundException,
    Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as admin from 'firebase-admin';
import {
    RegisterDto,
    LoginDto,
    VerifyOtpDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    ResendOtpDto,
} from './dto';

import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

import { IEnv } from 'src/config/env.config';
import { EmailService } from 'src/common/email/email.service';
import { UpdatePermissionDto } from './dto/update.permission.dto';
import { AdminUserDto } from './dto/admin.user.dto';
import { UpdateProfileDto } from './dto/update.profile.dto';
import { AddNewProviderDto } from './dto/add.new.provider.dto';
import { CloudinaryUploadService } from '../../cloudinary/cloudinary.upload.service';

@Injectable()
export class AuthService {
    private readonly OTP_EXPIRY_MINUTES = 10;
    private readonly MAX_LOGIN_ATTEMPTS = 5;
    private readonly LOCK_DURATION_MINUTES = 30;

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
        @Inject('FIREBASE_MESSAGING')
        private readonly messaging: admin.messaging.Messaging,
        private readonly cloudinary: CloudinaryUploadService,
    ) { }

    // ==================== REGISTER ====================
    async register(dto: RegisterDto) {
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [{ email: dto.email }, { phone: dto.phone }],
            },
        });

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
                role: dto.role || UserRole.CLIENT,
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

        // Send OTP Email
        await this.emailService.sendVerificationEmail(user.email, otp, user.firstName);

        return {
            message: 'Registration successful. Please verify your email with the OTP sent.',
            user,
        };
    }

    // ==================== VERIFY OTP ====================
    async verifyOtp(dto: VerifyOtpDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) throw new UnauthorizedException('Invalid email');
        if (!user.otp || !user.otpExpiry) throw new BadRequestException('No OTP found');
        if (new Date() > user.otpExpiry) throw new BadRequestException('OTP has expired');

        if (user.otp !== dto.otp) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { otpAttempts: { increment: 1 } },
            });

            if ((user.otpAttempts || 0) + 1 >= 5) {
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

        await this.prisma.userSetting.create({ data: { userId: user.id } });

        const tokens = await this.generateTokens(user.id, user.email, user.role!);

        return {
            message: 'Email verified successfully',
            user: verifiedUser,
            ...tokens,
        };
    }

    // ==================== RESEND OTP ====================
    async resendOtp(dto: ResendOtpDto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

        if (!user) throw new UnauthorizedException('User not found');
        if (user.emailVerified) throw new BadRequestException('Email already verified');

        const otp = this.generateOTP();
        const otpExpiry = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

        await this.prisma.user.update({
            where: { id: user.id },
            data: { otp, otpExpiry, otpAttempts: 0 },
        });

        await this.emailService.sendVerificationEmail(user.email, otp, user.firstName);

        return { message: 'OTP sent successfully' };
    }

    // ==================== FORGOT PASSWORD ====================
    async forgotPassword(dto: ForgotPasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) {
            // Don't reveal if email exists (security best practice)
            return { message: 'If your email exists, you will receive a reset code.' };
        }

        const otp = this.generateOTP();
        const otpExpiry = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

        await this.prisma.user.update({
            where: { id: user.id },
            data: { otp, otpExpiry, otpAttempts: 0 },
        });

        await this.emailService.sendPasswordResetEmail(user.email, otp, user.firstName);

        return { message: 'If your email exists, you will receive a reset code.' };
    }

    // ==================== RESET PASSWORD ====================
    async resetPassword(email: string, dto: ResetPasswordDto) {
        const user = await this.prisma.user.findUnique({ where: { email } });

        if (!user) throw new NotFoundException('User not found');
        if (!user.otp || !user.otpExpiry) throw new BadRequestException('No reset code found');
        if (new Date() > user.otpExpiry) throw new BadRequestException('Reset code has expired');

        if (user.otp !== dto.otp) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { otpAttempts: { increment: 1 } },
            });
            throw new BadRequestException('Invalid reset code');
        }

        const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                otp: null,
                otpExpiry: null,
                otpAttempts: 0,
            },
        });

        return { message: 'Password reset successfully. You can now login with your new password.' };
    }

    // ==================== CHANGE PASSWORD (Authenticated) ====================
    async changePassword(userId: string, dto: ChangePasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { password: true },
        });

        if (!user) throw new NotFoundException('User not found');

        const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.password!);
        if (!isCurrentPasswordValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword },
        });

        return { message: 'Password changed successfully' };
    }

    // ==================== LOGOUT ALL DEVICES ====================
    async logoutAll(userId: string) {
        await this.prisma.session.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false },
        });

        return { message: 'Logged out from all devices successfully' };
    }

    // ==================== LOGIN ====================
    async login(dto: LoginDto, deviceId: string, ipAddress: string, userAgent: string) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

        if (!user) throw new UnauthorizedException('Invalid credentials');

        if (user.lockedUntil && new Date() < user.lockedUntil) {
            throw new UnauthorizedException('Account is locked. Please try again later.');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password!);
        if (!isPasswordValid) {
            const attempts = (user.loginAttempts || 0) + 1;
            const updateData: any = { loginAttempts: attempts };

            if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
                updateData.lockedUntil = new Date(Date.now() + this.LOCK_DURATION_MINUTES * 60 * 1000);
            }

            await this.prisma.user.update({ where: { id: user.id }, data: updateData });
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.emailVerified) throw new UnauthorizedException('Please verify your email first');
        if (user.status === UserStatus.SUSPENDED) throw new UnauthorizedException('Account is suspended');
        if (user.status === UserStatus.BANNED) throw new UnauthorizedException('Account is banned');

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                loginAttempts: 0,
                lockedUntil: null,
                lastLogin: new Date(),
                lastActive: new Date()
            },
        });

        if (deviceId) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    fcmToken: deviceId
                }
            })
        };

        const tokens = await this.generateTokens(user.id, user.email, user.role!);

        await this.createSession(user.id, deviceId, ipAddress, userAgent, tokens.refreshToken);

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

    // ==================== REFRESH TOKEN & LOGOUT ====================
    async refreshToken(refreshToken: string) {
        const session = await this.prisma.session.findUnique({
            where: { refreshToken },
            include: { user: true },
        });

        if (!session || !session.isActive) throw new UnauthorizedException('Invalid refresh token');
        if (new Date() > session.expiresAt) throw new UnauthorizedException('Refresh token expired');

        const tokens = await this.generateTokens(session.user.id, session.user.email, session.user.role!);

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
            where: { userId, deviceId, isActive: true },
            data: { isActive: false },
        });
        return { message: 'Logged out successfully' };
    }

    // ==================== HELPER METHODS ====================
    private generateOTP(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    private async generateTokens(userId: string, email: string, role: UserRole) {
        const env = this.configService.get<IEnv>('env')!;

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync({ sub: userId, email, role }),
            this.jwtService.signAsync({ sub: userId, email, role }, { expiresIn: '7d' }),
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
    };

    async createAdminUser(userId: string, dto: AdminUserDto) {

        const requestingUser = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!requestingUser || requestingUser.role !== UserRole.SUPER_ADMIN) {
            throw new UnauthorizedException('Only super admins can create admin users');
        }

        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        const isPhoneTaken = await this.prisma.user.findFirst({
            where: { phone: dto.phone },
        });

        if (isPhoneTaken) {
            throw new ConflictException('Phone number already registered');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const adminUser = await this.prisma.user.create({
            data: {
                email: dto.email,
                phone: dto.phone,
                password: hashedPassword,
                firstName: dto.firstName,
                lastName: dto.lastName,
                role: UserRole.SUB_ADMIN,
                status: UserStatus.ACTIVE,
                emailVerified: true,
                phoneVerified: true,
                verificationStatus: "VERIFIED"
            },
        });

        await this.prisma.adminPermission.create({
            data: {
                userId: adminUser.id,
                isViewBooking: dto.isViewBooking,
                isManageBooking: dto.isManageBooking,
                isExportBooking: dto.isExportBooking,
                isViewProvider: dto.isViewProvider,
                isManageProvider: dto.isManageProvider,
                isViewUser: dto.isViewUser,
                isManageUser: dto.isManageUser,
                isViewCategory: dto.isViewCategory,
                isManageCategory: dto.isManageCategory,
                isViewTransaction: dto.isViewTransaction,
                isViewWithdrawal: dto.isViewWithdrawal,
                isManageWithdrawal: dto.isManageWithdrawal,
            },
        });

        await this.prisma.notification.create({
            data: {
                userId: adminUser.id,
                title: 'Admin Account Created',
                message: 'Your admin account has been created successfully. You can now log in with your credentials.',
                type: 'ADMMIN_PERMISSION_GRANTED',
            },
        });


        if (dto.isViewBooking || dto.isManageBooking || dto.isExportBooking) {
            await this.prisma.notification.create({
                data: {
                    userId: adminUser.id,
                    title: 'Booking Permissions Granted',
                    message: 'You have been granted permissions to view, manage, and export bookings.',
                    type: 'ADMMIN_PERMISSION_GRANTED',
                },
            });
        };


        if (dto.isViewProvider || dto.isManageProvider) {
            await this.prisma.notification.create({
                data: {
                    userId: adminUser.id,
                    title: 'Provider Permissions Granted',
                    message: 'You have been granted permissions to view and manage providers.',
                    type: 'ADMMIN_PERMISSION_GRANTED',
                },
            });
        };

        if (dto.isViewUser || dto.isManageUser) {
            await this.prisma.notification.create({
                data: {
                    userId: adminUser.id,
                    title: 'User Permissions Granted',
                    message: 'You have been granted permissions to view and manage users.',
                    type: 'ADMMIN_PERMISSION_GRANTED',
                },
            });
        };


        if (dto.isViewCategory || dto.isManageCategory) {
            await this.prisma.notification.create({
                data: {
                    userId: adminUser.id,
                    title: 'Category Permissions Granted',
                    message: 'You have been granted permissions to view and manage categories.',
                    type: 'ADMMIN_PERMISSION_GRANTED',
                },
            });
        };


        if (dto.isViewTransaction) {
            await this.prisma.notification.create({
                data: {
                    userId: adminUser.id,
                    title: 'Transaction Permissions Granted',
                    message: 'You have been granted permissions to view transactions.',
                    type: 'ADMMIN_PERMISSION_GRANTED',
                },
            });
        };



        if (dto.isViewWithdrawal || dto.isManageWithdrawal) {
            await this.prisma.notification.create({
                data: {
                    userId: adminUser.id,
                    title: 'Withdrawal Permissions Granted',
                    message: 'You have been granted permissions to view and manage withdrawals.',
                    type: 'ADMMIN_PERMISSION_GRANTED',
                },
            });
        };

        if (!dto.isViewBooking && !dto.isManageBooking && !dto.isExportBooking && !dto.isViewProvider && !dto.isManageProvider && !dto.isViewUser && !dto.isManageUser && !dto.isViewCategory && !dto.isManageCategory && !dto.isViewTransaction && !dto.isViewWithdrawal && !dto.isManageWithdrawal) {
            await this.prisma.notification.create({
                data: {
                    userId: adminUser.id,
                    title: 'No Permissions Granted',
                    message: 'You have been created as a sub-admin but no permissions have been granted yet. Please contact a super-admin to assign you permissions.',
                    type: 'ADMMIN_PERMISSION_GRANTED',
                },
            });
        }


        return {
            user: {
                id: adminUser.id,
                email: adminUser.email,
                firstName: adminUser.firstName,
                lastName: adminUser.lastName,
                role: adminUser.role,
                status: adminUser.status,
                emailVerified: adminUser.emailVerified,
                phoneVerified: adminUser.phoneVerified,
                verificationStatus: adminUser.verificationStatus,
            },
        };
    };

    async getSubAdminProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                status: true,
                emailVerified: true,
                phoneVerified: true,
                verificationStatus: true,
                adminPermissions: {
                    select: {
                        isViewBooking: true,
                        isManageBooking: true,
                        isExportBooking: true,
                        isViewProvider: true,
                        isManageProvider: true,
                        isViewUser: true,
                        isManageUser: true,
                        isViewCategory: true,
                        isManageCategory: true,
                        isViewTransaction: true,
                        isViewWithdrawal: true,
                        isManageWithdrawal: true,
                    },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (user.role !== UserRole.SUB_ADMIN) {
            throw new UnauthorizedException('Not a sub-admin user');
        }

        return user;

    };

    async updateAdminUserPermissions(userId: string, dto: UpdatePermissionDto) {
        const requestingUser = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!requestingUser) {
            throw new UnauthorizedException('User not found');
        }

        if (requestingUser.role !== UserRole.SUPER_ADMIN) {
            throw new UnauthorizedException('You are not a super-admin. Only super-admins can update permissions');
        }

        // Implementation for updating permissions would go here
        const result = await this.prisma.adminPermission.update({
            where: { userId: dto.userId },
            data: {
                isViewBooking: dto.isViewBooking,
                isManageBooking: dto.isManageBooking,
                isExportBooking: dto.isExportBooking,
                isViewProvider: dto.isViewProvider,
                isManageProvider: dto.isManageProvider,
                isViewUser: dto.isViewUser,
                isManageUser: dto.isManageUser,
                isViewCategory: dto.isViewCategory,
                isManageCategory: dto.isManageCategory,
                isViewTransaction: dto.isViewTransaction,
                isViewWithdrawal: dto.isViewWithdrawal,
                isManageWithdrawal: dto.isManageWithdrawal,
            },
        });

        return { result };

    };

    async updateUserProfile(userId: string, dto: UpdateProfileDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const allowedFields = ['firstName', 'lastName', 'email', 'phone', 'bio', 'streetAddress', 'city', 'state', 'zipCode'];

        if (!allowedFields.includes(dto.fildName)) {
            throw new BadRequestException('Invalid field name');
        }

        const data: any = {};
        data[dto.fildName] = dto.value;

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data,
        });

        await this.prisma.notification.create({
            data: {
                userId,
                title: 'Profile Updated',
                message: `Your profile has been updated successfully. ${dto.fildName} is now ${dto.value}.`,
                type: 'PROFILE_UPDATE',
            },
        });

        const { password, otp, otpExpiry, refreshToken, ...rest } = updatedUser;

        return rest;

    }


    async updateUserProfilePicture(userId: string, avater: Express.Multer.File) {

        const user = await this.prisma.user.findUnique({ where: { id: userId } });

        if (!user) throw new NotFoundException("User not valid");

        const avaterUp: any = await this.cloudinary.uploadImageFromBuffer(avater.buffer, "avater", `${Date.now()}-${avater.originalname}`);


       const upProfile = await this.prisma.user.update({
            where: {
                id: userId
            },
            data: {
                avatar: avaterUp?.secure_url
            }
        });

        return upProfile?.avatar

    }

    async getMe(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException("User not found");

        const { password, otp, otpExpiry, refreshToken, ...rest } = user;

        return rest

    }

    async addNewProvider(avater: Express.Multer.File, nidImage: Express.Multer.File, data: AddNewProviderDto) {
        const checkEmail = await this.prisma.user.findUnique({ where: { email: data.email } });

        if (checkEmail) throw new BadRequestException("Already use this email");

        const checkPhone = await this.prisma.user.findUnique({ where: { phone: data.phone } });

        if (checkPhone) throw new BadRequestException("Already use this phone number");

        const avaterUp: any = await this.cloudinary.uploadImageFromBuffer(avater.buffer, "avater", `${Date.now()}-${avater.originalname}`);
        const nidImageUp: any = await this.cloudinary.uploadImageFromBuffer(nidImage.buffer, "nidImage", `${Date.now()}-${nidImage.originalname}`);

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const result = await this.prisma.user.create({
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone,
                password: hashedPassword,
                city: data.city,
                nidNumber: data.nidNumber,
                nidImage: nidImageUp.secure_url,
                avatar: avaterUp.secure_url,
                streetAddress: data.serviceLocation,
                yearsOfExprience: data.yearOfExprience,
                bio: data.bio,
                status: "ACTIVE",
                emailVerified: true,
                phoneVerified: true
            }
        });

        return result;
    }

}