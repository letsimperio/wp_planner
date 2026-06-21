import prisma from '../config/database';
type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
type RepeatType = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'INTERVAL';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string;
  priority?: Priority;
  repeatType?: RepeatType;
  repeatIntervalDays?: number;
  nextDueAt?: Date;
}

interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  repeatType?: RepeatType;
  repeatIntervalDays?: number;
  nextDueAt?: Date;
}

export class TaskService {
  static async create(input: CreateTaskInput) {
    const nextDueAt = input.nextDueAt || new Date();

    const task = await prisma.task.create({
      data: {
        userId: input.userId,
        title: input.title,
        description: input.description || null,
        priority: input.priority || 'MEDIUM',
        repeatType: input.repeatType || 'ONCE',
        repeatIntervalDays: input.repeatIntervalDays || null,
        nextDueAt,
      },
    });

    return task;
  }

  static async findAllByUser(userId: string, filters?: {
    status?: TaskStatus;
    priority?: Priority;
    date?: string;
  }) {
    const where: any = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.date) {
      const targetDate = new Date(filters.date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      where.nextDueAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { nextDueAt: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return tasks;
  }

  static async findById(taskId: string, userId: string) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      throw new Error('Görev bulunamadı');
    }

    return task;
  }

  static async update(taskId: string, userId: string, input: UpdateTaskInput) {
    await this.findById(taskId, userId);

    const task = await prisma.task.update({
      where: { id: taskId },
      data: input,
    });

    return task;
  }

  static async complete(taskId: string, userId: string) {
    const task = await this.findById(taskId, userId);
    const now = new Date();

    if (task.repeatType === 'ONCE') {
      return prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          lastCompletedAt: now,
        },
      });
    }

    // Recurring task: calculate next due date
    const nextDueAt = this.calculateNextDueDate(task.repeatType as RepeatType, task.repeatIntervalDays, now);

    return prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'PENDING',
        lastCompletedAt: now,
        nextDueAt,
      },
    });
  }

  static async delete(taskId: string, userId: string) {
    await this.findById(taskId, userId);

    await prisma.task.delete({
      where: { id: taskId },
    });
  }

  static async findTasksDueToday() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.task.findMany({
      where: {
        nextDueAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { not: 'COMPLETED' },
      },
      include: { user: { select: { phone: true, name: true } } },
    });
  }

  static async findOverdueTasks() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    return prisma.task.findMany({
      where: {
        nextDueAt: { lt: startOfDay },
        status: { not: 'COMPLETED' },
      },
      include: { user: { select: { phone: true, name: true } } },
    });
  }

  static async findTasksByUserPhone(phone: string) {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return null;

    return {
      user,
      tasks: await prisma.task.findMany({
        where: { userId: user.id, status: { not: 'COMPLETED' } },
        orderBy: { nextDueAt: 'asc' },
      }),
    };
  }

  static async getTasksByDateRange(userId: string, startDate: Date, endDate: Date) {
    return prisma.task.findMany({
      where: {
        userId,
        nextDueAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { nextDueAt: 'asc' },
    });
  }

  static async getStats(userId: string) {
    const [total, completed, pending, overdue] = await Promise.all([
      prisma.task.count({ where: { userId } }),
      prisma.task.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.task.count({ where: { userId, status: 'PENDING' } }),
      prisma.task.count({
        where: {
          userId,
          status: { not: 'COMPLETED' },
          nextDueAt: { lt: new Date() },
        },
      }),
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const dueToday = await prisma.task.count({
      where: {
        userId,
        status: { not: 'COMPLETED' },
        nextDueAt: { gte: todayStart, lte: todayEnd },
      },
    });

    return { total, completed, pending, overdue, dueToday };
  }

  private static calculateNextDueDate(
    repeatType: RepeatType,
    intervalDays: number | null,
    fromDate: Date
  ): Date {
    const next = new Date(fromDate);

    switch (repeatType) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'INTERVAL':
        next.setDate(next.getDate() + (intervalDays || 1));
        break;
      default:
        break;
    }

    return next;
  }

  // Esnek görevler için: deadline öncesindeki en boş günü bul
  static async findLeastBusyDay(userId: string, deadlineDays: number): Promise<Date> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Deadline'a kadar olan günleri listele (bugün dahil)
    const candidates: Date[] = [];
    for (let i = 0; i < deadlineDays; i++) {
      const day = new Date(today);
      day.setDate(day.getDate() + i);
      candidates.push(day);
    }

    if (candidates.length === 0) {
      return today;
    }

    // Her gün için görev sayısını hesapla
    const dayCounts = await Promise.all(
      candidates.map(async (day) => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const count = await prisma.task.count({
          where: {
            userId,
            status: { not: 'COMPLETED' },
            nextDueAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        });

        return { day, count };
      })
    );

    // En az görev olan günü bul
    dayCounts.sort((a, b) => a.count - b.count);
    return dayCounts[0].day;
  }
}
