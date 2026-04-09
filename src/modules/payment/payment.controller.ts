import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { CreatePaymentDto } from './dto/payment.dto';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import axios from 'axios';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService, private readonly Prisma: PrismaService) { }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UseGuards)
  @Post('make-payment')
  @ApiOperation({ summary: 'Make a payment' })
  async makePayment(@Body() dto: CreatePaymentDto, @GetUser() user: any) {
    const result = await this.paymentService.makePayment(user.id, dto);
    return result;
  }


  @Post('/success')
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
    }

    return { message: 'Payment success' };
  }


  @Post('/fail')
  async paymentFail(@Body() body: any) {
    await this.Prisma.payment.update({
      where: { transactionId: body.tran_id },
      data: { status: 'FAILED' },
    });

    return { message: 'Payment failed' };
  }



  @Post('/cancel')
  async paymentCancel(@Body() body: any) {
    await this.Prisma.payment.update({
      where: { transactionId: body.tran_id },
      data: { status: 'CANCELLED' },
    });

    return { message: 'Payment cancelled' };
  }

}
