import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserSettingDto } from './dto/update.setting.dto';
import * as admin from 'firebase-admin';

@Injectable()
export class SettingService {

    constructor(readonly prisma: PrismaService, @Inject('FIREBASE_MESSAGING') private readonly messaging: admin.messaging.Messaging) { }

    async sentNotification(userId: string, title: string, body: string) {
        const user = await this.prisma.user.findUnique(
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

    async updateUserSettings(userId: string, settingsData: UpdateUserSettingDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new Error('User not found');
        }

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                isContactInfoPublic: settingsData.isContactInfoPublic,
                isProfilePublic: settingsData.isProfilePublic,
                isNotificationEnabled: settingsData.isNotificationEnabled,
                isBookingReminderEnabled: settingsData.isBookingReminderEnabled
            }
        });


        if (settingsData.isNotificationEnabled) {
            await this.prisma.notification.create({
                data: {
                    userId,
                    type: 'SETTINGS_UPDATE',
                    title: 'Settings Updated',
                    message: 'Your Notifications have been enabled. You will now receive notifications for important updates and reminders.',
                },
            });



        };

        if (settingsData.isBookingReminderEnabled) {
            await this.prisma.notification.create({
                data: {
                    userId,
                    type: 'SETTINGS_UPDATE',
                    title: 'Booking Reminders Enabled',
                    message: 'Your booking reminders have been enabled. You will now receive timely reminders for your upcoming bookings.',
                }
            });


            await this.sentNotification(user.id, "Booking Reminders Enabled", `Your booking reminders have been enabled. You will now receive timely reminders for your upcoming bookings.`)

        };


        if (user.isNotificationEnabled && !settingsData.isNotificationEnabled) {
            await this.prisma.notification.create({
                data: {
                    userId,
                    type: 'SETTINGS_UPDATE',
                    title: 'Notifications Disabled',
                    message: 'Your Notifications have been disabled. You will no longer receive notifications for important updates and reminders.',
                },
            });

            await this.sentNotification(user.id, "Notifications Disabled", `Your Notifications have been disabled. You will no longer receive notifications for important updates and reminders.`)

        };

        if (user.isBookingReminderEnabled && !settingsData.isBookingReminderEnabled) {
            await this.prisma.notification.create({
                data: {
                    userId,
                    type: 'SETTINGS_UPDATE',
                    title: 'Booking Reminders Disabled',
                    message: 'Your booking reminders have been disabled. You will no longer receive timely reminders for your upcoming bookings.',
                }
            });

            await this.sentNotification(user.id, "Booking Reminders Disabled", `Your booking reminders have been disabled. You will no longer receive timely reminders for your upcoming bookings.`)

            return updatedUser;

        };

        if (!settingsData.isNotificationEnabled && !settingsData.isBookingReminderEnabled) {
            await this.prisma.notification.create({
                data: {
                    userId,
                    type: 'SETTINGS_UPDATE',
                    title: 'Notifications and Booking Reminders Disabled',
                    message: 'Your Notifications and Booking Reminders have been disabled. You will no longer receive notifications for important updates, reminders for your upcoming bookings.',
                },
            });

            await this.sentNotification(user.id, "Notifications and Booking Reminders Disabled", `Your Notifications and Booking Reminders have been disabled. You will no longer receive notifications for important updates, reminders for your upcoming bookings.`)

        };

        return updatedUser;

    }
}
