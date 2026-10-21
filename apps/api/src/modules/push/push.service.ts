import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as webpush from 'web-push';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT', 'mailto:admin@kaizenlists.com');

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    }
  }

  getVapidPublicKey(): { publicKey: string } {
    return { publicKey: this.config.get<string>('VAPID_PUBLIC_KEY', '') };
  }

  async subscribe(
    usuarioId: number,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      create: {
        usuarioId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  async unsubscribe(usuarioId: number, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { usuarioId, endpoint },
    });
    return { message: 'Inscrição removida' };
  }

  async sendToUser(
    usuarioId: number,
    payload: { title: string; body: string; url?: string },
  ) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { usuarioId },
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          )
          .catch(async (err: any) => {
            // Remove invalid subscriptions (410 Gone)
            if (err.statusCode === 410 || err.statusCode === 404) {
              await this.prisma.pushSubscription.delete({ where: { id: sub.id } });
            }
            throw err;
          }),
      ),
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    this.logger.debug(`Push enviado para usuário ${usuarioId}: ${sent}/${subscriptions.length}`);
  }
}
