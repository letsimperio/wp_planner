import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { GeminiService } from './gemini.service';
import { TaskService } from './task.service';
import prisma from '../config/database';

type RepeatType = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'INTERVAL';

let client: Client | null = null;

export class WhatsAppClientService {
  private static isReady = false;
  private static selfChatId = ''; // Self-chat LID
  private static currentQr = '';  // QR code string for frontend
  private static qrTimestamp = 0; // When QR was generated

  static getClient(): Client | null {
    return client;
  }

  static isConnected(): boolean {
    return this.isReady;
  }

  static getStatus(): { connected: boolean; qrAvailable: boolean; qrTimestamp: number } {
    return {
      connected: this.isReady,
      qrAvailable: !!this.currentQr,
      qrTimestamp: this.qrTimestamp,
    };
  }

  static getQrCode(): string {
    return this.currentQr;
  }

  static async initialize(): Promise<void> {
    // Destroy any existing client first
    if (client) {
      try { await client.destroy(); } catch (_) {}
      client = null;
    }

    // Kill leftover Chrome processes and clear session for fresh start
    try {
      const { execSync } = require('child_process');
      execSync("pkill -f '.wwebjs_auth' 2>/dev/null || true", { stdio: 'ignore' });
      execSync("rm -rf .wwebjs_auth 2>/dev/null || true", { stdio: 'ignore' });
      await new Promise(r => setTimeout(r, 1000));
    } catch (_) {}

    client = new Client({
      authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
        ],
      },
      webVersionCache: {
        type: 'none',
      },
    });

    client.on('loading_screen', (percent: number, message: string) => {
      console.log(`⏳ WhatsApp yükleniyor: ${percent}% - ${message}`);
    });

    client.on('qr', (qr: string) => {
      console.log('\n📱 WhatsApp QR Kodu - Telefonunuzla tarayın:\n');
      qrcode.generate(qr, { small: true });
      WhatsAppClientService.currentQr = qr;
      WhatsAppClientService.qrTimestamp = Date.now();
      console.log('\nWhatsApp > Bağlı Cihazlar > Cihaz Bağla\n');
    });

    client.on('ready', async () => {
      WhatsAppClientService.isReady = true;
      // Self-chat ID'sini bul ve sakla
      try {
        const selfChat = await client!.getChatById(client!.info.wid._serialized);
        WhatsAppClientService.selfChatId = selfChat.id._serialized;
        WhatsAppClientService.currentQr = ''; // QR artık gerekli değil
        console.log(`✅ WhatsApp bağlantısı hazır! (self-chat: ${WhatsAppClientService.selfChatId})`);
      } catch {
        WhatsAppClientService.currentQr = '';
        console.log('✅ WhatsApp bağlantısı hazır!');
      }
    });

    client.on('authenticated', () => {
      // ready event bazen tetiklenmiyor, authenticated yeterli
      WhatsAppClientService.isReady = true;
      console.log('🔐 WhatsApp kimlik doğrulama başarılı — bağlantı hazır');
    });

    client.on('auth_failure', (msg: string) => {
      console.error('❌ WhatsApp kimlik doğrulama hatası:', msg);
      WhatsAppClientService.isReady = false;
    });

    client.on('disconnected', (reason: string) => {
      console.log('⚠️ WhatsApp bağlantısı kesildi:', reason);
      WhatsAppClientService.isReady = false;
    });

    // SADECE self-chat mesajlarını işle (kendine attığın mesajlar)
    client.on('message_create', async (message: Message) => {
      // Bot cevapları ve boş mesajları atla
      if (message.body.startsWith('|')) return;
      if (!message.body || message.body.trim().length === 0) return;
      if (message.from === 'status@broadcast') return;
      if (message.from.includes('@g.us')) return;


      // Sadece self-chat: to alanı self-chat LID ile eşleşmeli
      const selfId = WhatsAppClientService.selfChatId;
      if (!selfId || message.to !== selfId) return;

      console.log(`📨 Mesaj: ${message.body}`);
      await WhatsAppClientService.handleMessage(message);
    });

    console.log('🔄 WhatsApp bağlantısı başlatılıyor...');
    await client.initialize();

    // Graceful shutdown — tsx watch restart'larında Chromium düzgün kapansın
    const shutdown = async () => {
      console.log('🛑 WhatsApp kapatılıyor...');
      if (client) {
        try {
          await client.destroy();
        } catch (_) {}
        client = null;
      }
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('exit', () => {
      if (client) {
        try { client.destroy(); } catch (_) {}
      }
    });
  }

  static async destroy(): Promise<void> {
    if (client) {
      try {
        await client.destroy();
        console.log('✅ WhatsApp client kapatıldı');
      } catch (_) {}
      client = null;
      WhatsAppClientService.isReady = false;
    }
  }

  // Pending tasks waiting for interval reply (phone → pending task info)
  private static pendingTasks = new Map<string, {
    title: string;
    date: string | null;
    time: string | null;
    userId: string;
    createdAt: number; // timestamp for timeout
  }>();

  // Conversation history per user (phone → last messages)
  private static conversationHistory = new Map<string, Array<{
    role: 'user' | 'bot';
    text: string;
    timestamp: number;
  }>>();

  private static addToHistory(phone: string, role: 'user' | 'bot', text: string) {
    if (!this.conversationHistory.has(phone)) {
      this.conversationHistory.set(phone, []);
    }
    const history = this.conversationHistory.get(phone)!;
    history.push({ role, text, timestamp: Date.now() });
    // Son 10 mesajı tut
    if (history.length > 10) history.shift();
  }

  private static getHistory(phone: string): string {
    const history = this.conversationHistory.get(phone);
    if (!history || history.length === 0) return '';

    // Son 15 dk'dan eski mesajları temizle
    const cutoff = Date.now() - 15 * 60 * 1000;
    const recent = history.filter(m => m.timestamp > cutoff);
    if (recent.length === 0) return '';

    return recent
      .map(m => `${m.role === 'user' ? 'Kullanıcı' : 'Bot'}: ${m.text}`)
      .join('\n');
  }
  private static async replyAndLog(message: Message, phone: string, text: string) {
    await message.reply(text);
    // Bot cevabını history'ye ekle (| prefix'i olmadan)
    const cleanText = text.startsWith('|') ? text.substring(1) : text;
    WhatsAppClientService.addToHistory(phone, 'bot', cleanText.substring(0, 200));
  }

  private static async handleMessage(message: Message): Promise<void> {
    try {
      // Ignore group messages and status updates
      if (message.from.includes('@g.us') || message.from === 'status@broadcast') {
        return;
      }

      const text = message.body;
      if (!text || text.trim().length === 0) return;

      // Extract phone number (format: 905551234567@c.us)
      const phone = message.from.replace('@c.us', '');

      console.log(`📱 WhatsApp mesajı alındı: ${phone} → ${text}`);

      // Check if there's a pending interval question
      const pending = WhatsAppClientService.pendingTasks.get(phone);
      if (pending) {
        // Timeout check (5 minutes)
        if (Date.now() - pending.createdAt > 5 * 60 * 1000) {
          WhatsAppClientService.pendingTasks.delete(phone);
        } else {
          // Parse the interval response
          const interval = parseIntervalResponse(text);
          if (interval) {
            const nextDueAt = pending.date ? new Date(pending.date) : new Date();
            if (pending.time) {
              const [h, m] = pending.time.split(':').map(Number);
              nextDueAt.setHours(h, m, 0, 0);
            }

            const task = await TaskService.create({
              userId: pending.userId,
              title: pending.title,
              repeatType: interval.repeatType,
              repeatIntervalDays: interval.intervalDays || undefined,
              nextDueAt,
            });

            // Save dueTime if provided
            if (pending.time) {
              await prisma.task.update({
                where: { id: task.id },
                data: { dueTime: pending.time },
              });
            }

            let reply = `|✅ Görev oluşturuldu!\n\n*${task.title}*`;
            reply += `\n🔁 ${getRepeatLabel(interval.repeatType, interval.intervalDays)}`;
            if (pending.time) reply += `\n⏰ Saat: ${pending.time}`;
            await WhatsAppClientService.replyAndLog(message, phone, reply);

            WhatsAppClientService.pendingTasks.delete(phone);
            return;
          } else {
            await message.reply(
              '|❓ Anlamadım. Şunlardan birini yazın:\n\n' +
              '• *tek seferlik*\n• *günlük*\n• *haftalık*\n• *aylık*\n• *X günde bir* (örn: 45 günde bir)'
            );
            return;
          }
        }
      }

      // Find user by phone number
      const userData = await TaskService.findTasksByUserPhone(phone);

      if (!userData) {
        await message.reply(
          '|❌ Bu numara kayıtlı değil. Lütfen önce web uygulamasından kayıt olun ve telefon numaranızı profil ayarlarından ekleyin.'
        );
        return;
      }

      const { user, tasks } = userData;

      // Konuşma geçmişini ve görev listesini hazırla
      const history = WhatsAppClientService.getHistory(phone);
      const taskList = tasks.length > 0
        ? tasks.map((t, i) => {
            const date = t.nextDueAt ? t.nextDueAt.toLocaleDateString('tr-TR') : 'Tarih yok';
            const time = (t as any).dueTime ? ` ⏰${(t as any).dueTime}` : '';
            return `${i + 1}. ${t.title} — ${date}${time}`;
          }).join('\n')
        : '';

      // Kullanıcı mesajını history'ye ekle
      WhatsAppClientService.addToHistory(phone, 'user', text);

      // Parse message with Gemini (use user's API key + conversation context)
      const action = await GeminiService.parseMessage(text, user.geminiApiKey, {
        history: history || undefined,
        taskList: taskList || undefined,
      });
      console.log('🤖 Gemini aksiyonu:', action);

      switch (action.action) {
        case 'create_task': {
          // If needs interval, ask the user
          if (action.needsInterval) {
            WhatsAppClientService.pendingTasks.set(phone, {
              title: action.title,
              date: action.date,
              time: action.time,
              userId: user.id,
              createdAt: Date.now(),
            });

            await message.reply(
              `|📋 *"${action.title}"* — ne sıklıkla tekrar etsin?\n\n` +
              `• *tek seferlik*\n• *günlük*\n• *haftalık*\n• *aylık*\n• *X günde bir* (örn: 45 günde bir)`
            );
            break;
          }

          const repeatType = (action.repeatType || 'ONCE') as RepeatType;
          let nextDueAt: Date;

          // Esnek görev: en boş güne ata
          if (action.isFlexible && action.deadlineDays) {
            nextDueAt = await TaskService.findLeastBusyDay(user.id, action.deadlineDays);
            const deadlineDate = new Date();
            deadlineDate.setDate(deadlineDate.getDate() + action.deadlineDays);

            // Set time if provided
            if (action.time) {
              const [h, m] = action.time.split(':').map(Number);
              nextDueAt.setHours(h, m, 0, 0);
            }

            const task = await TaskService.create({
              userId: user.id,
              title: action.title,
              repeatType,
              repeatIntervalDays: action.repeatIntervalDays || undefined,
              nextDueAt,
            });

            // Save flexible info, dueTime and location
            await prisma.task.update({
              where: { id: task.id },
              data: {
                isFlexible: true,
                deadlineAt: deadlineDate,
                ...(action.time ? { dueTime: action.time } : {}),
                ...(action.location ? { location: action.location } : {}),
              },
            });

            let reply = `|✅ Esnek görev oluşturuldu!\n\n*${task.title}*`;
            reply += `\n📅 En uygun gün: ${nextDueAt.toLocaleDateString('tr-TR')}`;
            reply += `\n⏳ Son tarih: ${deadlineDate.toLocaleDateString('tr-TR')}`;
            if (action.time) reply += `\n⏰ Saat: ${action.time}`;
            await WhatsAppClientService.replyAndLog(message, phone, reply);
            break;
          }

          // Normal görev
          nextDueAt = action.date ? new Date(action.date) : new Date();

          // Set time if provided
          if (action.time) {
            const [h, m] = action.time.split(':').map(Number);
            nextDueAt.setHours(h, m, 0, 0);
          }

          const task = await TaskService.create({
            userId: user.id,
            title: action.title,
            repeatType,
            repeatIntervalDays: action.repeatIntervalDays || undefined,
            nextDueAt,
          });

          // Save dueTime and location if provided
          if (action.time || action.location) {
            await prisma.task.update({
              where: { id: task.id },
              data: {
                ...(action.time ? { dueTime: action.time } : {}),
                ...(action.location ? { location: action.location } : {}),
              },
            });
          }

          let reply = `|✅ Görev oluşturuldu!\n\n*${task.title}*`;
          if (repeatType !== 'ONCE') {
            reply += `\n🔁 ${getRepeatLabel(repeatType, action.repeatIntervalDays)}`;
          }
          if (action.date) {
            reply += `\n📅 ${new Date(action.date).toLocaleDateString('tr-TR')}`;
          }
          if (action.time) {
            reply += `\n⏰ Saat: ${action.time}`;
          }
          if (action.location) {
            reply += `\n📍 Konum: ${action.location}`;
          }
          await WhatsAppClientService.replyAndLog(message, phone, reply);
          break;
        }

        case 'complete_task': {
          const matchingTask = tasks.find(
            (t) =>
              t.title.toLowerCase().includes(action.title.toLowerCase()) ||
              action.title.toLowerCase().includes(t.title.toLowerCase())
          );

          if (!matchingTask) {
            await message.reply(
              `|❓ "${action.title}" ile eşleşen görev bulunamadı. Görevlerinizi görmek için "görevlerimi listele" yazın.`
            );
            break;
          }

          const completed = await TaskService.complete(matchingTask.id, user.id);
          let reply = `|🎉 Tebrikler! Görev tamamlandı:\n\n*${completed.title}*`;
          if (completed.nextDueAt) {
            reply += `\n\n📅 Sonraki tarih: ${completed.nextDueAt.toLocaleDateString('tr-TR')}`;
          }
          await WhatsAppClientService.replyAndLog(message, phone, reply);
          break;
        }

        case 'list_tasks': {
          let tasksToList = tasks;

          if (action.date) {
            const targetDate = new Date(action.date);
            tasksToList = tasks.filter((t) => {
              if (!t.nextDueAt) return false;
              const taskDate = new Date(t.nextDueAt);
              return (
                taskDate.getFullYear() === targetDate.getFullYear() &&
                taskDate.getMonth() === targetDate.getMonth() &&
                taskDate.getDate() === targetDate.getDate()
              );
            });
          }

          if (tasksToList.length === 0) {
            await WhatsAppClientService.replyAndLog(message, phone, '|📭 Bekleyen göreviniz yok!');
            break;
          }

          let reply = `|📋 *Görevleriniz*\n\n`;
          tasksToList.forEach((task, i) => {
            const date = task.nextDueAt
              ? task.nextDueAt.toLocaleDateString('tr-TR')
              : 'Tarih yok';
            const time = (task as any).dueTime ? ` ⏰${(task as any).dueTime}` : '';
            const loc = (task as any).location ? ` 📍${(task as any).location}` : '';
            reply += `${i + 1}. ${task.title} — ${date}${time}${loc}\n`;
          });
          await WhatsAppClientService.replyAndLog(message, phone, reply);
          break;
        }

        case 'update_task': {
          const taskToUpdate = tasks.find((t) =>
            t.title.toLowerCase().includes(action.title.toLowerCase())
          );

          if (!taskToUpdate) {
            await WhatsAppClientService.replyAndLog(message, phone, `|❓ "${action.title}" ile eşleşen görev bulunamadı.`);
            break;
          }

          const updateData: any = {};
          if (action.repeatType) updateData.repeatType = action.repeatType;
          if (action.repeatIntervalDays) updateData.repeatIntervalDays = action.repeatIntervalDays;
          if (action.date) updateData.nextDueAt = new Date(action.date);
          if (action.time) updateData.dueTime = action.time;

          await TaskService.update(taskToUpdate.id, user.id, updateData);
          await WhatsAppClientService.replyAndLog(message, phone, `|✅ "${taskToUpdate.title}" güncellendi.`);
          break;
        }

        case 'query_location': {
          if (!action.location) {
            await WhatsAppClientService.replyAndLog(message, phone, '|❓ Hangi konumdaki görevleri soruyorsunuz?');
            break;
          }

          const locationLower = action.location.toLowerCase();

          // Tüm görevlerden konumu eşleşenleri bul (tamamlanmamış)
          const locationTasks = await prisma.task.findMany({
            where: {
              userId: user.id,
              status: { not: 'COMPLETED' },
            },
          });

          const matchingTasks = locationTasks.filter(t =>
            t.location && t.location.toLowerCase().includes(locationLower)
          );

          if (matchingTasks.length === 0) {
            await WhatsAppClientService.replyAndLog(message, phone,
              `|📭 *${action.location}* konumunda bekleyen göreviniz yok.`
            );
            break;
          }

          // Görevleri bugüne taşı
          const today = new Date();
          today.setHours(12, 0, 0, 0);

          for (const t of matchingTasks) {
            await prisma.task.update({
              where: { id: t.id },
              data: { nextDueAt: today },
            });
          }

          let reply = `|📍 *${action.location}* konumunda ${matchingTasks.length} görev bulundu — bugüne taşındı!\n\n`;
          matchingTasks.forEach((t, i) => {
            const time = t.dueTime ? ` ⏰${t.dueTime}` : '';
            reply += `${i + 1}. ${t.title}${time}\n`;
          });

          await WhatsAppClientService.replyAndLog(message, phone, reply);
          break;
        }

        case 'suggest': {
          // === AKILLI ÖNERİ MOTORU ===
          const now = new Date();
          const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

          // 1. Tüm tamamlanmamış görevleri çek
          const allTasks = await prisma.task.findMany({
            where: { userId: user.id, status: { not: 'COMPLETED' } },
            orderBy: { nextDueAt: 'asc' },
          });

          if (allTasks.length === 0) {
            await WhatsAppClientService.replyAndLog(message, phone,
              '|🎉 *Harika!* Bekleyen göreviniz yok, biraz dinlenin! ☕'
            );
            break;
          }

          // 2. Bugünkü görevler
          const todayTasks = allTasks.filter(t =>
            t.nextDueAt && t.nextDueAt >= todayStart && t.nextDueAt <= todayEnd
          );

          // 3. Esnek görevler (deadline yaklaşanlar önce)
          const flexibleTasks = allTasks.filter(t =>
            t.isFlexible && (!t.nextDueAt || t.nextDueAt > todayEnd)
          ).sort((a, b) => {
            // Deadline'ı yakın olanlar önce
            if (a.deadlineAt && b.deadlineAt) return a.deadlineAt.getTime() - b.deadlineAt.getTime();
            if (a.deadlineAt) return -1;
            return 1;
          });

          // 4. Gecikmiş görevler
          const overdueTasks = allTasks.filter(t =>
            t.nextDueAt && t.nextDueAt < todayStart
          );

          // 5. Konum bazlı gruplama
          const locationGroups = new Map<string, typeof allTasks>();
          for (const t of allTasks) {
            if (t.location) {
              const loc = t.location.toLowerCase();
              if (!locationGroups.has(loc)) locationGroups.set(loc, []);
              locationGroups.get(loc)!.push(t);
            }
          }

          // === Öneri mesajını oluştur ===
          let reply = '|💡 *Akıllı Öneri*\n\n';

          // Gecikmiş görevler (acil!)
          if (overdueTasks.length > 0) {
            reply += `🚨 *${overdueTasks.length} gecikmiş görev:*\n`;
            overdueTasks.slice(0, 3).forEach(t => {
              const loc = t.location ? ` 📍${t.location}` : '';
              reply += `  • ${t.title}${loc}\n`;
            });
            reply += '\n';
          }

          // Bugünkü kalan görevler
          if (todayTasks.length > 0) {
            reply += `📋 *Bugün ${todayTasks.length} görev kaldı:*\n`;
            todayTasks.slice(0, 3).forEach(t => {
              const time = t.dueTime ? ` ⏰${t.dueTime}` : '';
              const loc = t.location ? ` 📍${t.location}` : '';
              reply += `  • ${t.title}${time}${loc}\n`;
            });
            reply += '\n';
          }

          // Konum önerileri (en az 2 görev olan konumlar)
          const locationSuggestions: string[] = [];
          for (const [loc, locTasks] of locationGroups) {
            if (locTasks.length >= 2) {
              const names = locTasks.slice(0, 3).map(t => t.title).join(', ');
              locationSuggestions.push(
                `📍 *${locTasks[0].location}*'da ${locTasks.length} iş var: ${names}` +
                (locTasks.length > 3 ? '...' : '') +
                ` — gitmişken hepsini halledebilirsin!`
              );
            } else if (locTasks.length === 1) {
              locationSuggestions.push(
                `📍 *${locTasks[0].location}*'da: ${locTasks[0].title}`
              );
            }
          }

          if (locationSuggestions.length > 0) {
            reply += `🗺️ *Konum önerileri:*\n`;
            locationSuggestions.forEach(s => { reply += `  ${s}\n`; });
            reply += '\n';
          }

          // Esnek görevler (bugüne çekilebilir)
          if (flexibleTasks.length > 0 && todayTasks.length < 3) {
            reply += `⏳ *Bugün boşluk var! Şunları çekebilirsin:*\n`;
            flexibleTasks.slice(0, 3).forEach(t => {
              const deadline = t.deadlineAt
                ? ` (son: ${t.deadlineAt.toLocaleDateString('tr-TR')})`
                : '';
              const loc = t.location ? ` 📍${t.location}` : '';
              reply += `  • ${t.title}${deadline}${loc}\n`;
            });
            reply += '\n"bugüne çek" yazarak taşıyabilirsin.\n';
          }

          // Hiçbir öneri yoksa
          if (!overdueTasks.length && !todayTasks.length && !locationSuggestions.length && !flexibleTasks.length) {
            reply += '✨ Bugün için herşey temiz görünüyor!';
          }

          await WhatsAppClientService.replyAndLog(message, phone, reply);
          break;
        }

        case 'unknown': {
          await WhatsAppClientService.replyAndLog(message, phone,
            `|🤖 Mesajınızı anlayamadım. Şunları deneyebilirsiniz:\n\n` +
            `📝 *"yarın toplantı var"* — Görev oluşturur\n` +
            `✅ *"toplantı tamamlandı"* — Görevi tamamlar\n` +
            `📋 *"görevlerimi listele"* — Görevleri gösterir\n` +
            `📍 *"Kadıköy'de fatura öde"* — Konumlu görev\n` +
            `💡 *"ne yapabilirim?"* — Akıllı öneri`
          );
          break;
        }
      }
    } catch (error: any) {
      console.error('❌ Mesaj işleme hatası:', error.message);
      try {
        await message.reply('|❌ Bir hata oluştu, lütfen tekrar deneyin.');
      } catch (_) {}
    }
  }

  // Send message to a phone number (used by scheduler)
  static async sendMessage(phone: string, text: string): Promise<void> {
    if (!client || !WhatsAppClientService.isReady) {
      console.warn('⚠️ WhatsApp bağlı değil, mesaj gönderilmedi:', text);
      return;
    }

    try {
      const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
      await client.sendMessage(chatId, text);
      console.log(`✅ WhatsApp mesajı gönderildi: ${phone}`);
    } catch (error: any) {
      console.error('❌ WhatsApp mesaj gönderilemedi:', error.message);
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

function parseIntervalResponse(text: string): { repeatType: RepeatType; intervalDays: number | null } | null {
  const lower = text.toLowerCase().trim();

  if (lower.includes('tek seferlik') || lower === 'tek' || lower === 'once') {
    return { repeatType: 'ONCE', intervalDays: null };
  }
  if (lower.includes('günlük') || lower.includes('her gün') || lower === 'daily') {
    return { repeatType: 'DAILY', intervalDays: null };
  }
  if (lower.includes('haftalık') || lower.includes('her hafta') || lower === 'weekly') {
    return { repeatType: 'WEEKLY', intervalDays: null };
  }
  if (lower.includes('aylık') || lower.includes('her ay') || lower === 'monthly') {
    return { repeatType: 'MONTHLY', intervalDays: null };
  }

  // "45 günde bir", "30 günde", "her 14 gün"
  const intervalMatch = lower.match(/(\d+)\s*gün/);
  if (intervalMatch) {
    return { repeatType: 'INTERVAL', intervalDays: parseInt(intervalMatch[1], 10) };
  }

  return null;
}
