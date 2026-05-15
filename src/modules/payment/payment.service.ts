import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaymentDto } from './dto/payment.dto';
import axios from 'axios';
const qs = require('querystring');
import * as admin from 'firebase-admin';
import { PaymentConfirmDto } from './dto/payment.confirm.dto';

@Injectable()
export class PaymentService {
    constructor(private readonly Prisma: PrismaService, @Inject('FIREBASE_MESSAGING') private readonly messaging: admin.messaging.Messaging) { }

    async makePayment(userId: string, createPaymentDto: CreatePaymentDto) {
        const { bookingId, amount } = createPaymentDto;

        const transactionId = `txn_${Date.now()}-${userId.slice(0, 5)}-${Math.random()}`;

        const findBooking = await this.Prisma.booking.findUnique({
            where: { id: bookingId },
        });

        if (!findBooking) throw new Error("Invalid booking ID");

        // if (findBooking.paymentStatus === "COMPLETED") throw new Error("Payment already completed for this booking");
        // if (findBooking.paymentStatus === "PENDING") throw new Error("Booking not accepted yet. Please wait for confirmation");
        // if (findBooking.status === "CANCELLED") throw new Error("Booking is cancelled. Cannot make payment");
        // if (findBooking.status === "COMPLETED") throw new Error("Booking is already completed. Cannot make payment");
        // if (findBooking.status === "REJECTED") throw new Error("Booking is rejected. Cannot make payment");


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

            success_url: `https://protiva-backend-ukw2.onrender.com/api/v1/payment/success`,
            fail_url: `https://protiva-backend-ukw2.onrender.com/api/v1/payment/fail`,
            cancel_url: `https://protiva-backend-ukw2.onrender.com/api/v1/payment/cancel`,
            ipn_url: `https://protiva-backend-ukw2.onrender.com/api/v1/payment/ipn`,

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
            gatewayUrl: response?.data?.GatewayPageURL,
        };
    };


    async myPaymentTransactions(userId: string, page = 1, limit = 10) {
        const result = await this.Prisma.payment.findMany({
            where: { userId },
            skip: (page - 1) * limit,
            take: limit,
        });

        return result

    };


    async getSdkConfig(userId: string, createPaymentDto: CreatePaymentDto) {
        const { bookingId, amount } = createPaymentDto;

        const booking = await this.Prisma.booking.findUnique({
            where: { id: bookingId },
            include: { client: true }
        });

        if (!booking) throw new BadRequestException('Booking not found');

        // Generate a unique transaction ID (Critical for tracking)
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        // 1. Create a pending payment record in your DB
        const payment = await this.Prisma.payment.create({
            data: {
                transactionId,
                bookingId,
                userId,
                amount,
                status: 'PENDING',
                gateway: 'SSLCOMMERZ',
                currency: 'BDT',
            },
        });

        // 2. Return the config the SDK needs
        return {
            success: true,
            transactionId: transactionId,
            amount: amount,
            // SSLCommerz SDK specific config
            storeId: process.env.SSLCOMMERZ_STORE_ID,
            storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD, // Note: Use secure obfuscation in Flutter
            isSandbox: true,

            // Customer info for the SDK UI
            customerName: booking.client?.firstName || 'Customer',
            customerEmail: booking.client?.email || 'customer@example.com',
            customerPhone: booking.contactPhone || '01700000000',
            customerAddress: booking.locationAddress || 'Dhaka',
        };
    }

    async confirm(body: PaymentConfirmDto) {
        const { val_id, tran_id, amount } = body;

        const payment = await this.Prisma.payment.findUnique({
            where: { transactionId: tran_id },
        });

        if (!payment) throw new BadRequestException('Payment not found');

        // SSL Verify API
        // const url = `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${process.env.SSLCZ_STORE_ID}&store_passwd=${process.env.SSLCZ_STORE_PASSWORD}&format=json`;
        const url = `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${process.env.SSLCOMMERZ_STORE_ID}&store_passwd=${process.env.SSLCOMMERZ_STORE_PASSWORD}&format=json`;
        const { data } = await axios.get(url);

        console.log('SSL VERIFY RESPONSE =>', data);

        if (
            data.status === 'VALID' ||
            data.status === 'VALIDATED'
        ) {
            await this.Prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'COMPLETED',
                    valId: val_id,
                    bankTranId: data.bank_tran_id,
                    cardType: data.card_type,
                    gatewayData: data,
                    gatewayResponse: data,
                },
            });

            const booking = await this.Prisma.booking.findUnique({
                where: { id: payment.bookingId },
            });

            const commissionPercent = Number(process.env.COMMISSIONPERCENT) || 5;

            const amountCalculation =
                amount - (amount * commissionPercent) / 100;

            if (booking) {
                await this.Prisma.wallet.upsert({
                    where: { userId: booking.providerId },
                    update: {
                        amount: { increment: Math.floor(Number(amountCalculation)) },
                    },
                    create: {
                        userId: booking.providerId,
                        amount: Math.floor(Number(amountCalculation)),
                    },
                });
            }

            await this.Prisma.booking.update({
                where: { id: payment.bookingId },
                data: {
                    status: 'COMPLETED',
                },
            });

            return {
                paymentStatus: 'PAID',
            };
        }

        throw new BadRequestException('Payment verification failed');
    }

    async fail(body) {
        const { transactionId, reason, status } = body;

        const payment = await this.Prisma.payment.findUnique({
            where: { transactionId },
        });

        if (!payment) throw new BadRequestException();

        await this.Prisma.payment.update({
            where: { id: payment.id },
            data: {
                status:
                    status === 'CANCELLED'
                        ? 'CANCELLED'
                        : 'FAILED',
            },
        });

        return {
            success: true,
            message: reason,
        };
    }

}