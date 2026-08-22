import { Response } from 'express';

interface ApiResponseData<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class ApiResponse {
  static success<T>(res: Response, data: T, statusCode = 200, message?: string) {
    const response: ApiResponseData<T> = {
      success: true,
      data,
    };
    if (message) response.message = message;
    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T, message = 'Created successfully') {
    return this.success(res, data, 201, message);
  }

  static noContent(res: Response) {
    return res.status(204).send();
  }

  static error(res: Response, statusCode: number, message: string) {
    const response: ApiResponseData<null> = {
      success: false,
      error: message,
    };
    return res.status(statusCode).json(response);
  }
}
