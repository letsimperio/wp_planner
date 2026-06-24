import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';

export interface GeminiAction {
  action: 'create_task' | 'complete_task' | 'list_tasks' | 'update_task' | 'ask_clarification' | 'chat' | 'query_location' | 'suggest' | 'unknown';
  title: string;
  taskNumber: number | null;        // "1 bitti" → numaralı görevden eşleş
  repeatType: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'INTERVAL' | '';
  repeatIntervalDays: number | null;
  date: string | null;
  time: string | null;
  needsInterval: boolean;
  isFlexible: boolean;
  deadlineDays: number | null;
  location: string | null;
  question: string | null;          // ask_clarification: kullanıcıya sorulacak soru
  reply: string | null;             // chat: serbest cevap metni
}

export interface GeminiResponse {
  actions: GeminiAction[];
}

// Backward compat alias
export type GeminiTaskAction = GeminiAction;

const SYSTEM_PROMPT = `Sen bir görev yönetim asistanısın. Kullanıcının WhatsApp mesajlarını analiz edip uygun aksiyonları belirle.

ÖNEMLİ KURALLAR:
1. SADECE JSON döndür, başka bir şey yazma.
2. Her zaman bir JSON objesi döndür: { "actions": [...] }
3. actions dizisi 1 veya daha fazla aksiyon içerebilir.

AKSIYON TİPLERİ:

✅ create_task — Görev oluştur
- Net bir görev varsa kullan
- Birden fazla tarih varsa HER TARİH İÇİN AYRI create_task oluştur
- Örn: "1-2-3 temmuz direksiyon eğitimi" → 3 ayrı create_task
- ZAMANSIZ GÖREVLER: "bir ara", "fırsatını bulunca", "bir gün", "zamanı gelince", "ne zaman olsa" gibi belirsiz ifadeler varsa date: null ve time: null bırak. Bu görevler zamansız listesine eklenir.
- Mesajda tarih/saat BELİRTİLMEMİŞ ve görev doğası gereği acil DEĞİLSE (ör: "şuraya git", "bunu al", "şunu araştır") → date: null bırak

✅ complete_task — Görev tamamla
- "1 bitti", "ilk görev tamam", "2. tamamlandı" → taskNumber alanını doldur (1, 2, 3...)
- "toplantı tamamlandı" → title ile eşleş, taskNumber null
- ÖNEMLİ: Kullanıcının mevcut görev listesi sana verilir. "1 bitti" dediğinde listedeki 1. görevi taskNumber:1 ile eşleştir.

✅ list_tasks — Görevleri listele
- "görevlerimi listele", "bugün ne var", "yarın ne var"
- "zamansız görevlerim", "bir ara yapılacaklar", "zamansız listesi" → date alanına "TIMELESS" yaz

✅ ask_clarification — Eksik bilgi sor
- Tarih/saat var ama AÇIKLAMA YOK → "Bu tarihte ne işiniz var?" diye sor
- Sadece "25 haziran 09:00" yazılmışsa → ne olduğu belli değil, SOR
- question alanına soruyu yaz, date ve time alanlarını da doldur (sonra kullanılacak)
- Birden fazla tarih varsa tüm tarihleri date alanına virgülle ayırarak yaz

✅ chat — Sohbet / selamlama / genel soru
- "merhaba", "selam", "nasılsın", "teşekkürler" → doğal cevap ver
- reply alanına Türkçe, samimi bir cevap yaz
- Görev yönetimiyle ilgisi olmayan sorulara da cevap ver

✅ query_location — Konum sorgusu
- "Kadıköy'e gidiyorum, orada işim var mı?"

✅ suggest — Öneri iste
- "ne yapabilirim?", "boşum", "önerir misin?"

❌ unknown — KULLANMA, bunun yerine "chat" kullan ve reply alanında yardımcı ol

JSON FORMATI:
{
  "actions": [
    {
      "action": "create_task | complete_task | list_tasks | update_task | ask_clarification | chat | query_location | suggest",
      "title": "görev başlığı (boş olabilir)",
      "taskNumber": null veya 1-based sayı,
      "repeatType": "ONCE | DAILY | WEEKLY | MONTHLY | INTERVAL | boş",
      "repeatIntervalDays": null veya sayı,
      "date": null veya "YYYY-MM-DD",
      "time": null veya "HH:mm",
      "needsInterval": false,
      "isFlexible": false,
      "deadlineDays": null,
      "location": null,
      "question": null veya "soru metni",
      "reply": null veya "cevap metni"
    }
  ]
}

ÖRNEKLER:

Kullanıcı: "1 bitti"
→ {"actions":[{"action":"complete_task","title":"","taskNumber":1,"repeatType":"","repeatIntervalDays":null,"date":null,"time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null,"question":null,"reply":null}]}

Kullanıcı: "25 haziran saat 09:00, 1-2-3 temmuz saat 09:00"
→ {"actions":[{"action":"ask_clarification","title":"","taskNumber":null,"repeatType":"","repeatIntervalDays":null,"date":"2026-06-25,2026-07-01,2026-07-02,2026-07-03","time":"09:00","needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null,"question":"Bu tarihlerde ne işiniz var?","reply":null}]}

Kullanıcı (önceki soru sonrası): "direksiyon eğitimi"
→ {"actions":[{"action":"create_task","title":"Direksiyon eğitimi","taskNumber":null,"repeatType":"ONCE","repeatIntervalDays":null,"date":"2026-06-25","time":"09:00","needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null,"question":null,"reply":null},{"action":"create_task","title":"Direksiyon eğitimi","taskNumber":null,"repeatType":"ONCE","repeatIntervalDays":null,"date":"2026-07-01","time":"09:00","needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null,"question":null,"reply":null},{"action":"create_task","title":"Direksiyon eğitimi","taskNumber":null,"repeatType":"ONCE","repeatIntervalDays":null,"date":"2026-07-02","time":"09:00","needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null,"question":null,"reply":null},{"action":"create_task","title":"Direksiyon eğitimi","taskNumber":null,"repeatType":"ONCE","repeatIntervalDays":null,"date":"2026-07-03","time":"09:00","needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null,"question":null,"reply":null}]}

Kullanıcı: "1-2-3-7-8-9 temmuz saat 09:00 direksiyon eğitimi"
→ 6 ayrı create_task (her tarih için bir tane)

Kullanıcı: "merhaba"
→ {"actions":[{"action":"chat","title":"","taskNumber":null,"repeatType":"","repeatIntervalDays":null,"date":null,"time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null,"question":null,"reply":"Merhaba! 👋 Size nasıl yardımcı olabilirim? Görev oluşturmak, listelemek veya tamamlamak için yazabilirsiniz."}]}

Kullanıcı: "yarın 16 da toplantı"
→ {"actions":[{"action":"create_task","title":"Toplantı","taskNumber":null,"repeatType":"ONCE","repeatIntervalDays":null,"date":"TOMORROW_DATE","time":"16:00","needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null,"question":null,"reply":null}]}

Kullanıcı: "Kadıköy'de fatura öde"
→ {"actions":[{"action":"create_task","title":"Fatura öde","taskNumber":null,"repeatType":"ONCE","repeatIntervalDays":null,"date":null,"time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":"Kadıköy","question":null,"reply":null}]}

Kullanıcı: "görevlerimi listele"
→ {"actions":[{"action":"list_tasks","title":"","taskNumber":null,"repeatType":"","repeatIntervalDays":null,"date":null,"time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null,"question":null,"reply":null}]}

Kullanıcı: "bir ara Kadıköy'e gidip fatura öde"
→ {"actions":[{"action":"create_task","title":"Kadıköy'e gidip fatura öde","taskNumber":null,"repeatType":"ONCE","repeatIntervalDays":null,"date":null,"time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":"Kadıköy","question":null,"reply":null}]}

Kullanıcı: "fırsatını bulunca araba yıkat"
→ {"actions":[{"action":"create_task","title":"Araba yıkat","taskNumber":null,"repeatType":"ONCE","repeatIntervalDays":null,"date":null,"time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null,"question":null,"reply":null}]}

Kullanıcı: "zamansız görevlerim ne"
→ {"actions":[{"action":"list_tasks","title":"","taskNumber":null,"repeatType":"","repeatIntervalDays":null,"date":"TIMELESS","time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null,"question":null,"reply":null}]}

Bugünün tarihi: CURRENT_DATE
Bugün haftanın günü: CURRENT_DAY_NAME`;

export class GeminiService {
  private static defaultGenAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

  static async parseMessage(message: string, userApiKey?: string | null, context?: { history?: string; taskList?: string }): Promise<GeminiResponse> {
    try {
      const genAI = userApiKey
        ? new GoogleGenerativeAI(userApiKey)
        : this.defaultGenAI;
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      const currentDayName = dayNames[now.getDay()];

      const prompt = SYSTEM_PROMPT
        .replaceAll('CURRENT_DATE', today)
        .replaceAll('TOMORROW_DATE', tomorrow)
        .replaceAll('CURRENT_DAY_NAME', currentDayName);

      // Konuşma bağlamını oluştur
      let contextText = '';
      if (context?.history) {
        contextText += `\n\nÖnceki konuşma:\n${context.history}`;
      }
      if (context?.taskList) {
        contextText += `\n\nKullanıcının mevcut görevleri (numaralı liste):\n${context.taskList}`;
      }

      const result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: prompt }] },
          { role: 'model', parts: [{ text: 'Anladım. Mesajları analiz edip { "actions": [...] } formatında JSON döndüreceğim. Numaralı görev tamamlama, çoklu tarih, bağlam sorma ve doğal sohbet desteklenecek.' }] },
          { role: 'user', parts: [{ text: contextText ? `${contextText}\n\nYeni mesaj: ${message}` : message }] },
        ],
      });

      const responseText = result.response.text().trim();

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Gemini yanıtından JSON çıkarılamadı');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Normalize: eski format (tek action) veya yeni format (actions dizisi)
      let actions: GeminiAction[];
      if (parsed.actions && Array.isArray(parsed.actions)) {
        actions = parsed.actions;
      } else if (parsed.action) {
        // Backward compat: eski tek-action format
        actions = [parsed as GeminiAction];
      } else {
        throw new Error('Geçersiz Gemini yanıtı');
      }

      // Validate & normalize each action
      const validActions = ['create_task', 'complete_task', 'list_tasks', 'update_task', 'ask_clarification', 'chat', 'query_location', 'suggest', 'unknown'];
      
      actions = actions.map(a => ({
        action: validActions.includes(a.action) ? a.action : 'unknown',
        title: a.title || '',
        taskNumber: a.taskNumber || null,
        repeatType: a.repeatType || '',
        repeatIntervalDays: a.repeatIntervalDays || null,
        date: a.date || null,
        time: a.time || null,
        needsInterval: a.needsInterval || false,
        isFlexible: a.isFlexible || false,
        deadlineDays: a.deadlineDays || null,
        location: a.location || null,
        question: a.question || null,
        reply: a.reply || null,
      })) as GeminiAction[];

      return { actions };
    } catch (error: any) {
      console.error('Gemini parse error:', error.message);
      return {
        actions: [{
          action: 'chat',
          title: '',
          taskNumber: null,
          repeatType: '',
          repeatIntervalDays: null,
          date: null,
          time: null,
          needsInterval: false,
          isFlexible: false,
          deadlineDays: null,
          location: null,
          question: null,
          reply: '⚠️ Bir hata oluştu, lütfen tekrar deneyin.',
        }],
      };
    }
  }
}
