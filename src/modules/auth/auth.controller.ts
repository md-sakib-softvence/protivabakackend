import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Req,
  Headers,
  UseGuards,
  Patch,
  UploadedFiles,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProperty,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';

import {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  ResendOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,

} from './dto';
import { GetUser, Public } from 'src/common/decorators';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { AdminUserDto } from './dto/admin.user.dto';
import { UpdatePermissionDto } from './dto/update.permission.dto';
import { UpdateProfileDto } from './dto/update.profile.dto';
import { AddNewProviderDto } from './dto/add.new.provider.dto';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email or phone already exists' })
  async register(@Body() dto: RegisterDto) {


    return this.authService.register(dto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and activate account' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Headers('device-id') deviceId: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    return this.authService.login(dto, deviceId || 'web', ipAddress, userAgent);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({ status: 200, description: 'OTP sent if email exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  async resetPassword(@Body() dto: ResetPasswordDto & { email: string }) {
    return this.authService.resetPassword(dto.email, dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('change-password')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password (authenticated)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password incorrect' })
  async changePassword(
    @GetUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }

  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout (current device)' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @GetUser('id') userId: string,
    @Headers('device-id') deviceId: string,
  ) {
    return this.authService.logout(userId, deviceId || 'web');
  }

  @Post('logout-all')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  async logoutAll(@GetUser('id') userId: string) {
    return this.authService.logoutAll(userId);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'Current user data' })
  async getMe(@GetUser() user: any) {
    const result = await this.authService.getMe(user.id);
    return result;

  }


  @Patch('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async updateUserProfile(@GetUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    const result = await this.authService.updateUserProfile(userId, dto);
    return {
      success: true,
      message: 'User profile updated successfully',
      data: { ...result }
    }
  };


  @Patch("updateUserProfile")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update User own profile picture" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("avatar"))
  async updateUserOwnProfilePicture(
    @GetUser("id") userId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    return await this.authService.updateUserProfilePicture(userId, file);
  }


  @Post('admin/user/create')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create admin user (Only for super admins)' })
  @ApiResponse({ status: 201, description: 'Admin user created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createAdminUser(@Body() dto: AdminUserDto, @GetUser('id') userId: string) {
    const result = await this.authService.createAdminUser(userId, dto);
    return {
      success: true,
      message: 'Admin user created successfully',
      data: { ...result }
    }
  }

  @Get('sub_admin/profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get sub-admin profile' })
  @ApiResponse({ status: 200, description: 'Sub-admin profile data' })
  async getSubAdminProfile(@GetUser('id') userId: string) {
    const user = await this.authService.getSubAdminProfile(userId);
    return { user };
  };


  @Patch('admin/user/permissions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update admin user permissions (Only for super admins)' })
  @ApiResponse({ status: 200, description: 'Admin user permissions updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async updateAdminUserPermissions(@Body() dto: UpdatePermissionDto, @GetUser('id') userId: string) {
    const result = await this.authService.updateAdminUserPermissions(userId, dto);
    return {
      success: true,
      message: 'Admin user permissions updated successfully',
      data: { ...result }
    }
  }

  @Post("register-provider")
  @ApiOperation({ summary: "Provider registration" })
  async registerProvider(@Body() data: AddNewProviderDto) {
    return data;
  }


  @Post('add-provider')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar', maxCount: 1 },
      { name: 'nidImage', maxCount: 1 },
    ]),
  )
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'Jihad' },
        lastName: { type: 'string', example: 'Hasan' },
        email: { type: 'string', example: 'jihad@gmail.com' },
        phone: { type: 'string', example: '01712345678' },
        password: { type: 'string', example: 'StrongPass123' },
        city: { type: 'string', example: 'Dhaka' },
        nidNumber: { type: 'string', example: '1234567890' },
        serviceLocation: { type: 'string', example: 'Dhaka City' },
        yearOfExprience: { type: 'string', example: '3 years' },
        bio: { type: 'string', example: 'Professional cleaner' },
        avatar: {
          type: 'string',
          format: 'binary',
        },
        nidImage: {
          type: 'string',
          format: 'binary',
        },
      },
      required: [
        'firstName',
        'lastName',
        'email',
        'phone',
        'password',
        'city',
        'nidNumber',
        'serviceLocation',
        'yearOfExprience',
        'bio',
        'avatar',
        'nidImage',
      ],
    },
  })
  async addNewProvider(
    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File;
      nidImage?: Express.Multer.File;
    },
    @Body() data: AddNewProviderDto,
  ) {
    const avatar = files.avatar?.[0];
    const nidImage = files.nidImage?.[0];

    return this.authService.addNewProvider(avatar, nidImage, data);
  }

}