import { Module } from "@nestjs/common";
import { ConnectionsController } from "./connections.controller";
import {
  ConnectionsRepository,
  ConnectionsService,
} from "./connections.service";

@Module({
  controllers: [ConnectionsController],
  providers: [ConnectionsRepository, ConnectionsService],
})
export class ConnectionsModule {}
