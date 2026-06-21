import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();

// WhatsApp Cloud API webhook verification
router.get('/whatsapp', WebhookController.verify);

// Receive WhatsApp messages
router.post('/whatsapp', WebhookController.receive);

export default router;
