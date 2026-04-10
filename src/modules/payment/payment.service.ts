import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaymentDto } from './dto/payment.dto';
import axios from 'axios';
const qs = require('querystring');

@Injectable()
export class PaymentService {
    constructor(private readonly Prisma: PrismaService) { }

    async makePayment(userId: string, createPaymentDto: CreatePaymentDto) {
        const { bookingId, amount } = createPaymentDto;

        const transactionId = `txn_${Date.now()}-${Math.random()}`;

        const findBooking = await this.Prisma.booking.findUnique({
            where: { id: bookingId },
        });

        if (!findBooking) throw new Error("Invalid booking ID");

        if (findBooking.paymentStatus === "COMPLETED") throw new Error("Payment already completed for this booking");
        if (findBooking.paymentStatus === "PENDING") throw new Error("Booking not accepted yet. Please wait for confirmation");
        if (findBooking.status === "CANCELLED") throw new Error("Booking is cancelled. Cannot make payment");
        if (findBooking.status === "COMPLETED") throw new Error("Booking is already completed. Cannot make payment");
        if (findBooking.status === "REJECTED") throw new Error("Booking is rejected. Cannot make payment");


        // 1. Save payment in DB
        const payment = await this.Prisma.payment.create({
            data: {
                transactionId,
                bookingId,
                userId,
                amount,
                status: 'PENDING',
            },
        });

        // 2. Prepare SSLCommerz data
        console.log("Store ID:", process.env.SSLCOMMERZ_STORE_ID);
        console.log("Store Password:", process.env.SSLCOMMERZ_STORE_PASSWORD);
        const data = qs.stringify({
            store_id: process.env.SSLCOMMERZ_STORE_ID,
            store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,
            total_amount: amount,
            currency: 'BDT',
            tran_id: transactionId,

            success_url: `http://localhost:3000/api/v1/payment/success`,
            fail_url: `http://localhost:3000/api/v1/payment/fail`,
            cancel_url: `http://localhost:3000/api/v1/payment/cancel`,
            ipn_url: `http://localhost:3000/api/v1/payment/ipn`,

            product_name: 'Service Payment',
            product_category: 'Service',
            product_profile: 'general',

            cus_name: 'Customer Name',
            cus_email: 'customer@email.com',
            cus_add1: 'Dhaka',
            cus_city: 'Dhaka',
            cus_country: 'Bangladesh',
            cus_phone: '01700000000',

            shipping_method: 'NO',
        });

        const url = process.env.SSLCOMMERZ_IS_LIVE === 'true'
            ? 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'
            : 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php';

        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        return {
            payment,
            gatewayUrl: response.data.GatewayPageURL,
        };
    };


    async myPaymentTransactions(userId: string, page = 1, limit = 10) {
        const result = await this.Prisma.payment.findMany({
            where: { userId },
            skip: (page - 1) * limit,
            take: limit,
        });

        return result

    }

}
