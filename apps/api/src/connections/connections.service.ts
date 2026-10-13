import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  createSemanticConnection,
  deleteSemanticConnection,
  getSemanticConnections,
  updateSemanticConnection,
  type CreateSemanticConnectionData,
} from "../domain/actions";

@Injectable()
export class ConnectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: number) {
    return this.prisma.semanticConnection.findMany({ where: { userId } });
  }
}

@Injectable()
export class ConnectionsService {
  constructor(private readonly connections: ConnectionsRepository) {}

  list() {
    return getSemanticConnections();
  }

  create(data: CreateSemanticConnectionData) {
    return createSemanticConnection(data);
  }

  update(id: number, data: CreateSemanticConnectionData) {
    return updateSemanticConnection(id, data);
  }

  remove(id: number) {
    return deleteSemanticConnection(id);
  }
}
