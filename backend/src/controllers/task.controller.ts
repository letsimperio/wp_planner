import { Response } from 'express';
import { TaskService } from '../services/task.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export class TaskController {
  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { title, description, priority, repeatType, repeatIntervalDays, nextDueAt } = req.body;

      if (!title) {
        res.status(400).json({ error: 'Görev başlığı gerekli' });
        return;
      }

      const task = await TaskService.create({
        userId: req.userId!,
        title,
        description,
        priority,
        repeatType,
        repeatIntervalDays,
        nextDueAt: nextDueAt ? new Date(nextDueAt) : undefined,
      });

      res.status(201).json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async findAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status, priority, date } = req.query;
      const tasks = await TaskService.findAllByUser(req.userId!, {
        status: status as any,
        priority: priority as any,
        date: date as string,
      });
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async findById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const task = await TaskService.findById(req.params.id as string, req.userId!);
      res.json(task);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const task = await TaskService.update(req.params.id as string, req.userId!, req.body);
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async complete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const task = await TaskService.complete(req.params.id as string, req.userId!);
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await TaskService.delete(req.params.id as string, req.userId!);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await TaskService.getStats(req.userId!);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getByDateRange(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { start, end } = req.query;
      if (!start || !end) {
        res.status(400).json({ error: 'Başlangıç ve bitiş tarihi gerekli' });
        return;
      }
      const tasks = await TaskService.getTasksByDateRange(
        req.userId!,
        new Date(start as string),
        new Date(end as string)
      );
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
