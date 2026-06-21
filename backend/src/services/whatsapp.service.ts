import { WhatsAppClientService } from './whatsapp-client.service';

// This service now delegates to WhatsAppClientService (whatsapp-web.js)
// Kept as a thin wrapper for backward compatibility with scheduler etc.

export class WhatsAppService {
  static async sendMessage(phone: string, text: string): Promise<void> {
    await WhatsAppClientService.sendMessage(phone, text);
  }

  static async sendTaskReminder(phone: string, taskTitle: string, isDueToday: boolean): Promise<void> {
    const emoji = isDueToday ? '📋' : '⚠️';
    const status = isDueToday ? 'bugün yapılması gereken' : 'gecikmiş';
    const text = `${emoji} *Hatırlatma*\n\n${status} göreviniz var:\n\n*${taskTitle}*\n\nTamamladığınızda "tamamlandı" yazabilirsiniz.`;

    await this.sendMessage(phone, text);
  }

  static async sendTaskCreated(phone: string, taskTitle: string, repeatInfo?: string): Promise<void> {
    let text = `✅ Görev oluşturuldu!\n\n*${taskTitle}*`;
    if (repeatInfo) {
      text += `\n🔁 ${repeatInfo}`;
    }
    await this.sendMessage(phone, text);
  }

  static async sendTaskCompleted(phone: string, taskTitle: string, nextDate?: string): Promise<void> {
    let text = `🎉 Tebrikler! Görev tamamlandı:\n\n*${taskTitle}*`;
    if (nextDate) {
      text += `\n\n📅 Sonraki tarih: ${nextDate}`;
    }
    await this.sendMessage(phone, text);
  }

  static async sendTaskList(phone: string, tasks: Array<{ title: string; nextDueAt: Date | null }>): Promise<void> {
    if (tasks.length === 0) {
      await this.sendMessage(phone, '📭 Bekleyen göreviniz yok!');
      return;
    }

    let text = `📋 *Görevleriniz*\n\n`;
    tasks.forEach((task, i) => {
      const date = task.nextDueAt
        ? task.nextDueAt.toLocaleDateString('tr-TR')
        : 'Tarih yok';
      text += `${i + 1}. ${task.title} — ${date}\n`;
    });

    await this.sendMessage(phone, text);
  }
}
