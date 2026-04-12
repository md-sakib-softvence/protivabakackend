import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    ConflictException,
    NotFoundException,
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
    ResendOtpDto,
} from './dto';

import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminUserDto } from './dto/admin.user.dto';
import { UpdatePermissionDto } from './dto/update.permission.dto';
import { UpdateProfileDto } from './dto/update.profile.dto';

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



    async updateAdminUserPermissions(userId: string, dto: UpdatePermissionDto) {
        const requestingUser = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                adminPermissions: true,
                role: true,
                id: true
            }
        });

        if (!requestingUser) {
            throw new UnauthorizedException('User not found');
        }

        if (requestingUser.role !== UserRole.SUPER_ADMIN) {
            throw new UnauthorizedException('You are not a super-admin. Only super-admins can update permissions');
        };


        if (requestingUser.id === dto.userId) {
            throw new BadRequestException('You cannot update your own permissions');
        };

        //           ADMMIN_PERMISSION_REVOKED
        //   USER_ADMIN_PERMISSION_REVOKED
        //   BOOKING_PERMISSION_REVOKED
        //   CATEGORY_PERMISSION_REVOKED
        //   TRANSACTION_PERMISSION_REVOKED
        //   PROVIDER_PERMISSION_REVOKED
        //   WITHDRAWAL_PERMISSION_REVOKED



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

        if (requestingUser.adminPermissions?.isViewBooking && !dto.isViewBooking || requestingUser.adminPermissions?.isManageBooking && !dto.isManageBooking || requestingUser.adminPermissions?.isExportBooking && !dto.isExportBooking) {
            await this.prisma.notification.create({
                data: {
                    userId: dto.userId,
                    title: 'Booking Permissions Revoked',
                    message: 'Your permissions to view, manage, and export bookings have been revoked.',
                    type: 'BOOKING_PERMISSION_REVOKED',
                },
            });
        };


        if (requestingUser.adminPermissions?.isViewProvider && !dto.isViewProvider || requestingUser.adminPermissions?.isManageProvider && !dto.isManageProvider) {
            await this.prisma.notification.create({
                data: {
                    userId: dto.userId,
                    title: 'Provider Permissions Revoked',
                    message: 'Your permissions to view and manage providers have been revoked.',
                    type: 'PROVIDER_PERMISSION_REVOKED',
                },
            });
        };

        if (requestingUser.adminPermissions?.isViewUser && !dto.isViewUser || requestingUser.adminPermissions?.isManageUser && !dto.isManageUser) {
            await this.prisma.notification.create({
                data: {
                    userId: dto.userId,
                    title: 'User Permissions Revoked',
                    message: 'Your permissions to view and manage users have been revoked.',
                    type: 'USER_ADMIN_PERMISSION_REVOKED',
                },
            });
        };

        if (requestingUser.adminPermissions?.isViewCategory && !dto.isViewCategory || requestingUser.adminPermissions?.isManageCategory && !dto.isManageCategory) {
            await this.prisma.notification.create({
                data: {
                    userId: dto.userId,
                    title: 'Category Permissions Revoked',
                    message: 'Your permissions to view and manage categories have been revoked.',
                    type: 'CATEGORY_PERMISSION_REVOKED',
                },
            });
        };

        if (requestingUser.adminPermissions?.isViewTransaction && !dto.isViewTransaction) {
            await this.prisma.notification.create({
                data: {
                    userId: dto.userId,
                    title: 'Transaction Permissions Revoked',
                    message: 'Your permissions to view transactions have been revoked.',
                    type: 'TRANSACTION_PERMISSION_REVOKED',
                },
            });
        };

        if (requestingUser.adminPermissions?.isViewWithdrawal && !dto.isViewWithdrawal || requestingUser.adminPermissions?.isManageWithdrawal && !dto.isManageWithdrawal) {
            await this.prisma.notification.create({
                data: {
                    userId: dto.userId,
                    title: 'Withdrawal Permissions Revoked',
                    message: 'Your permissions to view and manage withdrawals have been revoked.',
                    type: 'WITHDRAWAL_PERMISSION_REVOKED',
                },
            });
        };

        if (requestingUser.adminPermissions?.isViewBooking && !dto.isViewBooking || requestingUser.adminPermissions?.isManageBooking && !dto.isManageBooking || requestingUser.adminPermissions?.isExportBooking && !dto.isExportBooking) {
            await this.prisma.notification.create({
                data: {
                    userId: dto.userId,
                    title: 'Booking Permissions Updated',
                    message: 'Your permissions to view, manage, and export bookings have been updated.',
                    type: 'BOOKING_PERMISSION_REVOKED',
                },
            });
        };

        if (requestingUser.adminPermissions?.isViewProvider && !dto.isViewProvider || requestingUser.adminPermissions?.isManageProvider && !dto.isManageProvider) {
            await this.prisma.notification.create({
                data: {
                    userId: dto.userId,
                    title: 'Provider Permissions Updated',
                    message: 'Your permissions to view and manage providers have been updated.',
                    type: 'PROVIDER_PERMISSION_REVOKED',
                },
            });
        };


        if (requestingUser.adminPermissions?.isViewUser && !dto.isViewUser || requestingUser.adminPermissions?.isManageUser && !dto.isManageUser) {
            await this.prisma.notification.create({
                data: {
                    userId: dto.userId,
                    title: 'User Permissions Updated',
                    message: 'Your permissions to view and manage users have been updated.',
                    type: 'USER_ADMIN_PERMISSION_REVOKED',
                },
            });
        };

        if (requestingUser.adminPermissions?.isViewCategory && !dto.isViewCategory || requestingUser.adminPermissions?.isManageCategory && !dto.isManageCategory) {
            await this.prisma.notification.create({
                data: {
                    userId: dto.userId,
                    title: 'Category Permissions Updated',
                    message: 'Your permissions to view and manage categories have been updated.',
                    type: 'CATEGORY_PERMISSION_REVOKED',
                },
            });
        };

        if (requestingUser.adminPermissions?.isViewTransaction && !dto.isViewTransaction) {
            await this.prisma.notification.create({
                data: {
                    userId: dto.userId,
                    title: 'Transaction Permissions Updated',
                    message: 'Your permissions to view transactions have been updated.',
                    type: 'TRANSACTION_PERMISSION_REVOKED',
                },
            });
        };

        if (requestingUser.adminPermissions?.isViewWithdrawal && !dto.isViewWithdrawal || requestingUser.adminPermissions?.isManageWithdrawal && !dto.isManageWithdrawal) {
            await this.prisma.notification.create({
                data: {
                    userId: dto.userId,
                    title: 'Withdrawal Permissions Updated',
                    message: 'Your permissions to view and manage withdrawals have been updated.',
                    type: 'WITHDRAWAL_PERMISSION_REVOKED',
                },
            });
        };


        if (requestingUser.adminPermissions?.isViewBooking && !dto.isViewBooking || requestingUser.adminPermissions?.isManageBooking && !dto.isManageBooking || requestingUser.adminPermissions?.isExportBooking && !dto.isExportBooking || requestingUser.adminPermissions?.isViewProvider && !dto.isViewProvider || requestingUser.adminPermissions?.isManageProvider && !dto.isManageProvider || requestingUser.adminPermissions?.isViewUser && !dto.isViewUser || requestingUser.adminPermissions?.isManageUser && !dto.isManageUser || requestingUser.adminPermissions?.isViewCategory && !dto.isViewCategory || requestingUser.adminPermissions?.isManageCategory && !dto.isManageCategory || requestingUser.adminPermissions?.isViewTransaction && !dto.isViewTransaction || requestingUser.adminPermissions?.isViewWithdrawal && !dto.isViewWithdrawal || requestingUser.adminPermissions?.isManageWithdrawal && !dto.isManageWithdrawal) {
            await this.prisma.notification.create({
                data: {
                    userId: dto.userId,
                    title: 'All Permissions Revoked',
                    message: 'All your admin permissions have been revoked. Please contact a super-admin for more information.',
                    type: 'ADMMIN_PERMISSION_REVOKED',
                },
            });
        }

        return { result };

    }

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


}