import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { env } from '../config/env';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  token: string;
}

export class AuthService {
  private static generateToken(userId: string): string {
    return jwt.sign({ userId }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  static async register(input: RegisterInput): Promise<AuthResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new Error('Bu email adresi zaten kayıtlı');
    }

    if (input.phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone: input.phone },
      });
      if (existingPhone) {
        throw new Error('Bu telefon numarası zaten kayıtlı');
      }
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
        phone: input.phone || null,
      },
    });

    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      token,
    };
  }

  static async login(input: LoginInput): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new Error('Geçersiz email veya şifre');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password);

    if (!isPasswordValid) {
      throw new Error('Geçersiz email veya şifre');
    }

    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      token,
    };
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        geminiApiKey: true,
        dayStartTime: true,
        dayEndTime: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }

    return user;
  }

  static async updateProfile(userId: string, data: { name?: string; phone?: string; geminiApiKey?: string; dayStartTime?: string; dayEndTime?: string }) {
    if (data.phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone: data.phone },
      });
      if (existingPhone && existingPhone.id !== userId) {
        throw new Error('Bu telefon numarası zaten kullanımda');
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        geminiApiKey: true,
        dayStartTime: true,
        dayEndTime: true,
      },
    });

    return user;
  }
}
