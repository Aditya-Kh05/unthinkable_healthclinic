import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { ApiError } from '../utils/api-error';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from '../utils/jwt';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

export class AuthService {
  async register(input: RegisterInput) {
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw ApiError.conflict('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 12);

    // Create user with PATIENT role
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: 'PATIENT',
        name: input.name,
        phone: input.phone || null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        phone: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      role: user.role,
      email: user.email,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return { user, accessToken, refreshToken };
  }

  async login(input: LoginInput) {
    // Find user
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Check password
    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      role: user.role,
      email: user.email,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        phone: user.phone,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = verifyRefreshToken(token);

      // Verify user still exists
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) {
        throw ApiError.unauthorized('User no longer exists');
      }

      // Generate new tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        role: user.role,
        email: user.email,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      return { accessToken, refreshToken };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        phone: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user;
  }
}

export const authService = new AuthService();
