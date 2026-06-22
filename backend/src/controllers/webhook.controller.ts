import { Request, Response } from 'express';
import { GeminiService, GeminiAction } from '../services/gemini.service';
import { TaskService } from '../services/task.service';
import { WhatsAppCloudService } from '../services/whatsapp-cloud.service';
import { env } from '../config/env';
type RepeatType = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'INTERVAL';

export class WebhookController {
  // GET /api/webhooks/whatsapp — Meta webhook verification
  static async verify(req: Request, res: Response): Promise<void> {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('🔑 Webhook verify isteği:', { mode, token: token ? '***' : 'yok', challenge: challenge ? 'var' : 'yok' });

    if (mode === 'subscribe' && token === (process.env.WHATSAPP_VERIFY_TOKEN || 'wp-planner-verify-2024')) {
      console.log('✅ Webhook doğrulandı');
      res.status(200).send(challenge);
    } else {
      console.log('❌ Webhook doğrulama başarısız');
      res.status(403).send('Forbidden');
    }
  }

  // POST /api/webhooks/whatsapp — Receive WhatsApp messages
  static async receive(req: Request, res: Response): Promise<void> {
    res.status(200).json({ status: 'ok' });

    try {
      const body = req.body;
      console.log('📩 Webhook payload:', JSON.stringify(body, null, 2));

      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (!messages || messages.length === 0) return;

      const message = messages[0];
      const phone = message.from;
      const text = message.text?.body;

      if (!text || !phone) return;

      console.log(`📱 Cloud API mesaj alındı: ${phone} → ${text}`);

      const userData = await TaskService.findTasksByUserPhone(phone);
      if (!userData) {
        await WhatsAppCloudService.sendMessage(phone, '❌ Bu numara kayıtlı değil.');
        return;
      }

      const { user, tasks } = userData;

      await WhatsAppCloudService.sendMessage(phone, '🤔 _Düşünüyorum..._');

      const taskList = tasks.length > 0
        ? tasks.map((t, i) => {
            const date = t.nextDueAt ? t.nextDueAt.toLocaleDateString('tr-TR') : 'Tarih yok';
            return `${i + 1}. ${t.title} — ${date}`;
          }).join('\n')
        : '';

      const response = await GeminiService.parseMessage(text, user.geminiApiKey, {
        taskList: taskList || undefined,
      });

      for (const action of response.actions) {
        await WebhookController.processCloudAction(phone, action, user, tasks);
      }
    } catch (error: any) {
      console.error('❌ Webhook hatası:', error.message);
    }
  }

  private static async processCloudAction(phone: string, action: GeminiAction, user: any, tasks: any[]) {
    switch (action.action) {
      case 'create_task': {
        const repeatType = (action.repeatType || 'ONCE') as RepeatType;
        const nextDueAt = action.date ? new Date(action.date) : new Date();
        if (action.time) {
          const [h, m] = action.time.split(':').map(Number);
          nextDueAt.setHours(h, m, 0, 0);
        }
        const task = await TaskService.create({
          userId: user.id, title: action.title, repeatType,
          repeatIntervalDays: action.repeatIntervalDays || undefined, nextDueAt,
        });
        let msg = `✅ Görev oluşturuldu!\n\n*${task.title}*\n📅 ${nextDueAt.toLocaleDateString('tr-TR')}`;
        if (action.time) msg += `\n⏰ ${action.time}`;
        if (action.location) msg += `\n📍 ${action.location}`;
        await WhatsAppCloudService.sendMessage(phone, msg);
        break;
      }

      case 'complete_task': {
        let matchingTask: any = null;
        if (action.taskNumber && action.taskNumber > 0 && action.taskNumber <= tasks.length) {
          matchingTask = tasks[action.taskNumber - 1];
        }
        if (!matchingTask && action.title) {
          matchingTask = tasks.find(t =>
            t.title.toLowerCase().includes(action.title.toLowerCase()) ||
            action.title.toLowerCase().includes(t.title.toLowerCase())
          );
        }
        if (!matchingTask) {
          await WhatsAppCloudService.sendMessage(phone, '❓ Eşleşen görev bulunamadı.');
          break;
        }
        const completed = await TaskService.complete(matchingTask.id, user.id);
        await WhatsAppCloudService.sendTaskCompleted(phone, completed.title,
          completed.nextDueAt?.toLocaleDateString('tr-TR'));
        break;
      }

      case 'list_tasks': {
        await WhatsAppCloudService.sendTaskList(phone, tasks);
        break;
      }

      case 'chat': {
        if (action.reply) await WhatsAppCloudService.sendMessage(phone, action.reply);
        break;
      }

      case 'ask_clarification': {
        const q = action.question || 'Bu tarihler için ne planladınız?';
        await WhatsAppCloudService.sendMessage(phone, `❓ ${q}`);
        break;
      }

      default: {
        await WhatsAppCloudService.sendMessage(phone, '🤷 Mesajınızı anlayamadım.');
        break;
      }
    }
  }
}
