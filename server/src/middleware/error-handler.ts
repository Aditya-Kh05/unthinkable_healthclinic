import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';
import { ApiResponse } from '../utils/api-response';
import { config } from '../config';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // Log the error
  if (config.env === 'development') {
    console.error('Error:', err);
  } else {
    console.error('Error:', err.message);
  }

  // Handle known API errors
  if (err instanceof ApiError) {
    ApiResponse.error(res, err.statusCode, err.message);
    return;
  }

  // Handle Prisma unique constraint violations
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      ApiResponse.error(res, 409, 'A record with this data already exists');
      return;
    }
    if (prismaError.code === 'P2025') {
      ApiResponse.error(res, 404, 'Record not found');
      return;
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    ApiResponse.error(res, 401, 'Invalid token');
    return;
  }
  if (err.name === 'TokenExpiredError') {
    ApiResponse.error(res, 401, 'Token expired');
    return;
  }

  // Fallback — unknown error
  ApiResponse.error(
    res,
    500,
    config.env === 'development' ? err.message : 'Internal server error'
  );
}
