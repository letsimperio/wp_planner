import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';

export interface GeminiTaskAction {
  action: 'create_task' | 'complete_task' | 'list_tasks' | 'update_task' | 'query_location' | 'suggest' | 'unknown';
  title: string;
  repeatType: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'INTERVAL' | '';
  repeatIntervalDays: number | null;
  date: string | null;
  time: string | null;          // "HH:mm" formatında saat
  needsInterval: boolean;       // Tekrar sıklığı belirsizse true
  isFlexible: boolean;          // Esnek görev: en boş güne atanır
  deadlineDays: number | null;  // Kaç gün içinde yapılmalı (margin)
  location: string | null;      // "Kadıköy", "Ofis" — konum
}

const SYSTEM_PROMPT = `Sen bir görev yönetim asistanısın. Kullanıcının WhatsApp mesajlarını analiz edip uygun aksiyonu belirle.

Kurallar:
- Kullanıcı Türkçe veya İngilizce yazabilir, her iki dili de anla.
- Mesajı analiz et ve aşağıdaki JSON formatında yanıt ver.
- Sadece JSON döndür, başka bir şey yazma.
- ÖNEMLİ: Eğer mesaj anlamsızsa, rastgele sayı/harflerden oluşuyorsa, bir selamlama ise (merhaba, selam, hey), ya da görev yönetimiyle ilgili değilse, action olarak "unknown" döndür.
- Sadece NET bir görev talebi olduğunda create_task kullan. "12321", "asdas", "haha", "ok" gibi mesajlar görev DEĞİLDİR.
- Mesajda saat bilgisi varsa (örn: "16:00", "saat 3", "15.30"), time alanına "HH:mm" formatında yaz.
- Mesajda bir görev var AMA tekrar sıklığı belirtilmemişse VE görev doğası gereği tekrarlanabilir görünüyorsa (bakım, kontrol vb), needsInterval: true yap.
- ESNEK GÖREVLER: "bu hafta", "bu hafta içinde", "3 gün içinde", "haftasonuna kadar", "X güne kadar" gibi zaman aralığı belirten ifadeler varsa isFlexible: true yap ve deadlineDays'e kaç gün içinde yapılması gerektiğini hesapla.
  - "bu hafta" veya "bu hafta içinde" → bugünden Pazar gününe kaç gün kaldıysa o (minimum 2)
  - "3 gün içinde" → deadlineDays: 3
  - Eğer zaten haftasonuysa "bu hafta" → sonraki Pazar'a kadar (7 gün)
- KONUM: Mesajda bir yer/semt/şehir/bölge adı geçiyorsa (Kadıköy, ofis, AVM, hastane vb), location alanına yaz. Görev oluştururken konumu çıkar.
- KONUM SORGUSU: Kullanıcı bir yere gideceğini söyleyip orada işi olup olmadığını sorarsa, action olarak "query_location" kullan.
- AKILLi ÖNERİ: Kullanıcı "ne yapabilirim?", "boşum", "işler bitti başka ne var?", "önerir misin?", "bugün ne yapsam?" gibi öneri isterse, action olarak "suggest" kullan.

JSON formatı:
{
  "action": "create_task | complete_task | list_tasks | update_task | query_location | suggest | unknown",
  "title": "görev başlığı",
  "repeatType": "ONCE | DAILY | WEEKLY | MONTHLY | INTERVAL | boş string",
  "repeatIntervalDays": null veya sayı,
  "date": null veya "YYYY-MM-DD" formatında tarih,
  "time": null veya "HH:mm" formatında saat,
  "needsInterval": false,
  "isFlexible": false,
  "deadlineDays": null,
  "location": null
}

Örnekler:

"Kadıköy'de fatura öde" →
{"action":"create_task","title":"Fatura öde","repeatType":"ONCE","repeatIntervalDays":null,"date":null,"time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":"Kadıköy"}

"ofiste sunucu bakımı yap" →
{"action":"create_task","title":"Sunucu bakımı yap","repeatType":"ONCE","repeatIntervalDays":null,"date":null,"time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":"Ofis"}

"Kadıköy'e gidiyorum, orada işim var mı?" →
{"action":"query_location","title":"","repeatType":"","repeatIntervalDays":null,"date":null,"time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":"Kadıköy"}

"yarın ofise gideceğim yapmam gereken var mı" →
{"action":"query_location","title":"","repeatType":"","repeatIntervalDays":null,"date":null,"time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":"Ofis"}

"45 günde bir backup kontrolü yap" →
{"action":"create_task","title":"Backup kontrolü","repeatType":"INTERVAL","repeatIntervalDays":45,"date":null,"time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null}

"yarın 16 da toplantı" →
{"action":"create_task","title":"Toplantı","repeatType":"ONCE","repeatIntervalDays":null,"date":"TOMORROW_DATE","time":"16:00","needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null}

"3 gün içinde mail gönder" →
{"action":"create_task","title":"Mail gönder","repeatType":"ONCE","repeatIntervalDays":null,"date":null,"time":null,"needsInterval":false,"isFlexible":true,"deadlineDays":3,"location":null}

"motoru bu hafta içinde bakıma götür" →
{"action":"create_task","title":"Motoru bakıma götür","repeatType":"ONCE","repeatIntervalDays":null,"date":null,"time":null,"needsInterval":false,"isFlexible":true,"deadlineDays":7,"location":null}

"backup tamamlandı" →
{"action":"complete_task","title":"Backup kontrolü","repeatType":"","repeatIntervalDays":null,"date":null,"time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null}

"görevlerimi listele" →
{"action":"list_tasks","title":"","repeatType":"","repeatIntervalDays":null,"date":null,"time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null}

"bugün neler var" →
{"action":"list_tasks","title":"","repeatType":"","repeatIntervalDays":null,"date":"CURRENT_DATE","time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null}

"bugünkü işler ne" →
{"action":"list_tasks","title":"","repeatType":"","repeatIntervalDays":null,"date":"CURRENT_DATE","time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null}

"yarın ne var" →
{"action":"list_tasks","title":"","repeatType":"","repeatIntervalDays":null,"date":"TOMORROW_DATE","time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null}

"12321" →
{"action":"unknown","title":"","repeatType":"","repeatIntervalDays":null,"date":null,"time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null}

"işler bitti ne yapabilirim?" →
{"action":"suggest","title":"","repeatType":"","repeatIntervalDays":null,"date":null,"time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null}

"boşum önerir misin" →
{"action":"suggest","title":"","repeatType":"","repeatIntervalDays":null,"date":null,"time":null,"needsInterval":false,"isFlexible":false,"deadlineDays":null,"location":null}

Bugünün tarihi: CURRENT_DATE
Bugün haftanın günü: CURRENT_DAY_NAME`;

export class GeminiService {
  private static defaultGenAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

  static async parseMessage(message: string, userApiKey?: string | null, context?: { history?: string; taskList?: string }): Promise<GeminiTaskAction> {
    try {
      const genAI = userApiKey
        ? new GoogleGenerativeAI(userApiKey)
        : this.defaultGenAI;
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      // Haftanın günü
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
        contextText += `\n\nKullanıcının mevcut görevleri:\n${context.taskList}`;
      }

      const result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: prompt }] },
          { role: 'model', parts: [{ text: 'Anladım, mesajları analiz edip JSON döndüreceğim. Konuşma bağlamını ve görev listesini dikkate alacağım.' }] },
          { role: 'user', parts: [{ text: contextText ? `${contextText}\n\nYeni mesaj: ${message}` : message }] },
        ],
      });

      const responseText = result.response.text().trim();

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Gemini yanıtından JSON çıkarılamadı');
      }

      const parsed: GeminiTaskAction = JSON.parse(jsonMatch[0]);

      // Validate the action
      const validActions = ['create_task', 'complete_task', 'list_tasks', 'update_task', 'query_location', 'suggest', 'unknown'];
      if (!validActions.includes(parsed.action)) {
        throw new Error(`Geçersiz aksiyon: ${parsed.action}`);
      }

      // Ensure defaults
      parsed.time = parsed.time || null;
      parsed.needsInterval = parsed.needsInterval || false;
      parsed.isFlexible = parsed.isFlexible || false;
      parsed.deadlineDays = parsed.deadlineDays || null;
      parsed.location = parsed.location || null;

      return parsed;
    } catch (error: any) {
      console.error('Gemini parse error:', error.message);
      return {
        action: 'unknown',
        title: '',
        repeatType: '',
        repeatIntervalDays: null,
        date: null,
        time: null,
        needsInterval: false,
        isFlexible: false,
        deadlineDays: null,
        location: null,
      };
    }
  }
}
