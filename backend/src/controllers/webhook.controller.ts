import { Request, Response } from 'express';
import { GeminiService } from '../services/gemini.service';
import { TaskService } from '../services/task.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { env } from '../config/env';
import prisma from '../config/database';
type RepeatType = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'INTERVAL';

export class WebhookController {
  // GET /api/webhooks/whatsapp — Meta webhook verification
  static async verify(req: Request, res: Response): Promise<void> {

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
      console.log('✅ Webhook doğrulandı');
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
  }

  // POST /api/webhooks/whatsapp — Receive WhatsApp messages
  static async receive(req: Request, res: Response): Promise<void> {
    try {
      // Always respond 200 to Meta
      console.log(req.body);
      res.status(200).json({ status: 'ok' });

      const body = req.body;

      // Extract message data from WhatsApp Cloud API payload
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (!messages || messages.length === 0) {
        return;
      }

      const message = messages[0];
      const phone = message.from;
      const text = message.text?.body;

      if (!text || !phone) {
        return;
      }

      console.log(`📱 WhatsApp mesajı alındı: ${phone} → ${text}`);

      // Find or log unknown user
      const userData = await TaskService.findTasksByUserPhone(phone);

      if (!userData) {
        await WhatsAppService.sendMessage(
          phone,
          '❌ Bu numara kayıtlı değil. Lütfen önce web uygulamasından kayıt olun ve telefon numaranızı ekleyin.'
        );
        return;
      }

      const { user, tasks } = userData;

      // Parse message with Gemini
      const action = await GeminiService.parseMessage(text);
      console.log(`🤖 Gemini aksiyonu:`, action);

      switch (action.action) {
        case 'create_task': {
          const repeatType = (action.repeatType || 'ONCE') as RepeatType;
          const nextDueAt = action.date ? new Date(action.date) : new Date();

          const task = await TaskService.create({
            userId: user.id,
            title: action.title,
            repeatType,
            repeatIntervalDays: action.repeatIntervalDays || undefined,
            nextDueAt,
          });

          const repeatInfo = repeatType !== 'ONCE'
            ? `Tekrar: ${getRepeatLabel(repeatType, action.repeatIntervalDays)}`
            : undefined;

          await WhatsAppService.sendTaskCreated(phone, task.title, repeatInfo);
          break;
        }

        case 'complete_task': {
          // Find matching task by title (fuzzy)
          const matchingTask = tasks.find(t =>
            t.title.toLowerCase().includes(action.title.toLowerCase()) ||
            action.title.toLowerCase().includes(t.title.toLowerCase())
          );

          if (!matchingTask) {
            await WhatsAppService.sendMessage(
              phone,
              `❓ "${action.title}" ile eşleşen görev bulunamadı. Görevlerinizi görmek için "görevlerimi listele" yazın.`
            );
            break;
          }

          const completed = await TaskService.complete(matchingTask.id, user.id);
          const nextDate = completed.nextDueAt
            ? completed.nextDueAt.toLocaleDateString('tr-TR')
            : undefined;

          await WhatsAppService.sendTaskCompleted(phone, completed.title, nextDate);
          break;
        }

        case 'list_tasks': {
          let tasksToList = tasks;

          if (action.date) {
            const targetDate = new Date(action.date);
            tasksToList = tasks.filter(t => {
              if (!t.nextDueAt) return false;
              const taskDate = new Date(t.nextDueAt);
              return (
                taskDate.getFullYear() === targetDate.getFullYear() &&
                taskDate.getMonth() === targetDate.getMonth() &&
                taskDate.getDate() === targetDate.getDate()
              );
            });
          }

          await WhatsAppService.sendTaskList(phone, tasksToList);
          break;
        }

        case 'update_task': {
          const taskToUpdate = tasks.find(t =>
            t.title.toLowerCase().includes(action.title.toLowerCase())
          );

          if (!taskToUpdate) {
            await WhatsAppService.sendMessage(
              phone,
              `❓ "${action.title}" ile eşleşen görev bulunamadı.`
            );
            break;
          }

          const updateData: any = {};
          if (action.repeatType) updateData.repeatType = action.repeatType;
          if (action.repeatIntervalDays) updateData.repeatIntervalDays = action.repeatIntervalDays;
          if (action.date) updateData.nextDueAt = new Date(action.date);

          await TaskService.update(taskToUpdate.id, user.id, updateData);
          await WhatsAppService.sendMessage(phone, `✅ "${taskToUpdate.title}" güncellendi.`);
          break;
        }
      }
    } catch (error: any) {
      console.error('❌ Webhook hatası:', error.message);
    }
  }
}

function getRepeatLabel(type: RepeatType, intervalDays: number | null): string {
  switch (type) {
    case 'DAILY': return 'Her gün';
    case 'WEEKLY': return 'Her hafta';
    case 'MONTHLY': return 'Her ay';
    case 'INTERVAL': return `Her ${intervalDays} günde bir`;
    default: return 'Tek seferlik';
  }
}
