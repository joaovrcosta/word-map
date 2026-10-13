import { Module } from "@nestjs/common";
import { VaultsController } from "./vaults.controller";
import { VaultsRepository, VaultsService } from "./vaults.service";

@Module({
  controllers: [VaultsController],
  providers: [VaultsRepository, VaultsService],
})
export class VaultsModule {}
