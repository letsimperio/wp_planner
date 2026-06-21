import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, phone } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({ error: 'İsim, email ve şifre gerekli' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
        return;
      }

      const result = await AuthService.register({ name, email, password, phone });
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email ve şifre gerekli' });
        return;
      }

      const result = await AuthService.login({ email, password });
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await AuthService.getProfile(req.userId!);
      res.json(user);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, phone, geminiApiKey, dayStartTime, dayEndTime } = req.body;
      const user = await AuthService.updateProfile(req.userId!, { name, phone, geminiApiKey, dayStartTime, dayEndTime });
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
