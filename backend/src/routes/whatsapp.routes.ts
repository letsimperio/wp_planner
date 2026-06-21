import { Router, Request, Response } from 'express';
import { WhatsAppClientService } from '../services/whatsapp-client.service';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Tüm route'lar auth gerektirir
router.use(authMiddleware);

// WhatsApp durumu
router.get('/status', (_req: Request, res: Response) => {
  const status = WhatsAppClientService.getStatus();
  res.json(status);
});

// QR kodu al
router.get('/qr', (_req: Request, res: Response) => {
  const qr = WhatsAppClientService.getQrCode();
  if (!qr) {
    res.json({ qr: null, message: WhatsAppClientService.isConnected() ? 'Zaten bağlı' : 'QR henüz oluşturulmadı' });
    return;
  }
  res.json({ qr });
});

// WhatsApp bağlantısını yeniden başlat (yeni QR üret)
router.post('/restart', async (_req: Request, res: Response) => {
  try {
    await WhatsAppClientService.destroy();
    // Kısa bir bekleme
    await new Promise(r => setTimeout(r, 2000));
    WhatsAppClientService.initialize().catch(err => {
      console.error('❌ WhatsApp yeniden başlatılamadı:', err.message);
    });
    res.json({ message: 'WhatsApp yeniden başlatılıyor...' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// WhatsApp bağlantısını kes
router.post('/disconnect', async (_req: Request, res: Response) => {
  try {
    await WhatsAppClientService.destroy();
    res.json({ message: 'WhatsApp bağlantısı kesildi' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
