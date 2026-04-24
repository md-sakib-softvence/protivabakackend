import { Body, Controller, Get, Inject, NotFoundException, Post, Query, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { CreatePaymentDto } from './dto/payment.dto';
import * as admin from 'firebase-admin';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import axios from 'axios';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService, private readonly Prisma: PrismaService, @Inject('FIREBASE_MESSAGING')
  private readonly messaging: admin.messaging.Messaging) { }


  async sentNotification(userId: string, title: string, body: string) {
    const user = await this.Prisma.user.findUnique(
      {
        where: {
          id: userId
        }
      }
    )

    if (!user) throw new NotFoundException("User not found");

    if (user.role === "CLIENT" || user.role === "PROVIDER") {
      if (user.isNotificationEnabled) {
        if (user.fcmToken) {
          await this.messaging.send({
            token: user.fcmToken,
            notification: {
              title: title,
              body: body,
            },
            data: {
              type: "PUSH_NOTIFICATION",
              userId: user.id,
            },
          });
        }
      }
    }

  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UseGuards)
  @Post('make-payment')
  @ApiOperation({ summary: 'Make a payment' })
  async makePayment(@Body() dto: CreatePaymentDto, @GetUser() user: any) {
    const result = await this.paymentService.makePayment(user.id, dto);
    return result;
  }


  @Post('/success')
  @ApiExcludeEndpoint()
  async paymentSuccess(@Body() body: any) {
    const { tran_id, val_id } = body;

    // Validate payment
    const validationUrl = `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${process.env.SSLCOMMERZ_STORE_ID}&store_passwd=${process.env.SSLCOMMERZ_STORE_PASSWORD}&format=json`;

    const response = await axios.get(validationUrl);

    if (response.data.status === 'VALID') {
      await this.Prisma.payment.update({
        where: { transactionId: tran_id },
        data: { status: 'COMPLETED' },
      });

      const findPayment = await this.Prisma.payment.findUnique({
        where: { transactionId: tran_id },
      });

      if (!findPayment) throw new NotFoundException("Invalid paytment transaction");

      await this.Prisma.booking.update({
        where: { id: findPayment?.bookingId },
        data: {
          paymentStatus: "COMPLETED",
          status: "IN_PROGRESS"
        }
      });

      await this.Prisma.notification.create({
        data: {
          userId: findPayment.userId,
          type: 'PAYMENT_SUCCESS',
          title: 'Payment Successful',
          message: `Your payment for booking ID ${findPayment.bookingId} has been successfully processed. Thank you for your payment!`,
        },
      });

      await this.sentNotification(findPayment.userId, "Payment Successful", `Your payment has been successfully processed. Thank you for your payment!`);

    }

    return { message: 'Payment success' };
  }


  @Post('/fail')
  @ApiExcludeEndpoint()
  async paymentFail(@Body() body: any) {
    const payment = await this.Prisma.payment.update({
      where: { transactionId: body.tran_id },
      data: { status: 'FAILED' },
    });

    await this.Prisma.notification.create({
      data: {
        userId: payment.userId,
        type: 'PAYMENT_FAILED',
        title: 'Payment Failed',
        message: `Your payment for booking ID ${payment.bookingId} has failed. Please try again or contact support if the issue persists.`,
      },
    });

    await this.sentNotification(payment.userId, "Payment Failed", `Your payment has failed. Please try again or contact support if the issue persists.`);

    return { message: 'Payment failed' };
  }



  @Post('/cancel')
  @ApiExcludeEndpoint()
  async paymentCancel(@Body() body: any) {
    const payment = await this.Prisma.payment.update({
      where: { transactionId: body.tran_id },
      data: { status: 'CANCELLED' },
    });

    await this.Prisma.notification.create({
      data: {
        userId: payment.userId,
        type: 'PAYMENT_CANCELLED',
        title: 'Payment Cancelled',
        message: `Your payment for booking ID ${payment.bookingId} has been cancelled. If this was a mistake, please try making the payment again.`,
      },
    });

    await this.sentNotification(payment.userId, "Payment Cancelled", `Your payment has been cancelled. If this was a mistake, please try making the payment again.`);

    return { message: 'Payment cancelled' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("my-transactions")
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async myPaymentTransactions(@GetUser() user: any, @Query('page') page = 1, @Query('limit') limit = 10) {
    const result = await this.paymentService.myPaymentTransactions(user.id, page, limit);
    return result;
  }

}
