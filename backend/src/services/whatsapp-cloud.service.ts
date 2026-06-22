import axios from 'axios';
import { env } from '../config/env';

const META_API = 'https://graph.facebook.com/v21.0';

export class WhatsAppCloudService {
  static async sendMessage(phone: string, text: string): Promise<void> {
    if (!(env as any).WHATSAPP_ACCESS_TOKEN || !(env as any).WHATSAPP_PHONE_NUMBER_ID) {
      console.warn('⚠️ WhatsApp Cloud API yapılandırılmamış');
      return;
    }
    try {
      await axios.post(
        `${META_API}/${(env as any).WHATSAPP_PHONE_NUMBER_ID}/messages`,
        { messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'text', text: { body: text } },
        { headers: { Authorization: `Bearer ${(env as any).WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' } }
      );
      console.log(`📤 Cloud API mesaj gönderildi → ${phone}`);
    } catch (error: any) {
      console.error('❌ Cloud API mesaj hatası:', error.response?.data?.error?.message || error.message);
    }
  }

  static async sendTaskCompleted(phone: string, title: string, nextDate?: string): Promise<void> {
    let text = `🎉 Tebrikler! Görev tamamlandı:\n\n*${title}*`;
    if (nextDate) text += `\n\n📅 Sonraki tarih: ${nextDate}`;
    await this.sendMessage(phone, text);
  }

  static async sendTaskList(phone: string, tasks: Array<{ title: string; nextDueAt: Date | null }>): Promise<void> {
    if (tasks.length === 0) {
      await this.sendMessage(phone, '📭 Bekleyen göreviniz yok!');
      return;
    }
    let text = `📋 *Görevleriniz*\n\n`;
    tasks.forEach((t, i) => {
      const date = t.nextDueAt ? t.nextDueAt.toLocaleDateString('tr-TR') : 'Tarih yok';
      text += `${i + 1}. ${t.title} — ${date}\n`;
    });
    await this.sendMessage(phone, text);
  }
}
