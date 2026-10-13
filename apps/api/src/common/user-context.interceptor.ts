import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { runWithUser, type User } from "../auth/current-user";

@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ user?: User | null }>();
    return new Observable((subscriber) => {
      runWithUser(request.user ?? null, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
