import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") {
        response.status(status).json({ error: body });
        return;
      }
      response.status(status).json(body);
      return;
    }

    const message =
      exception instanceof Error && exception.message
        ? exception.message
        : "Erro interno do servidor";
    const status =
      message === "Usuário não autenticado" || message === "Não autorizado"
        ? HttpStatus.UNAUTHORIZED
        : HttpStatus.BAD_REQUEST;
    response.status(status).json({ error: message });
  }
}
