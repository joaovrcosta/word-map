import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { IsString } from "class-validator";
import { VaultsService } from "./vaults.service";

class CreateVaultDto {
  @IsString()
  name!: string;
}

class UpdateVaultDto {
  @IsString()
  name!: string;
}

class ImportVaultDto {
  @IsString()
  importData!: string;
}

@Controller("vaults")
export class VaultsController {
  constructor(private readonly vaults: VaultsService) {}

  @Get()
  getVaults() {
    return this.vaults.getVaults();
  }

  @Post()
  create(@Body() body: CreateVaultDto) {
    return this.vaults.createVault(body.name);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateVaultDto
  ) {
    return this.vaults.updateVaultName(id, body.name);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.vaults.deleteVault(id);
  }

  @Get(":id/export")
  async exportVault(@Param("id", ParseIntPipe) id: number) {
    const data = await this.vaults.exportVaultWords(id);
    return { data };
  }

  @Post(":id/import")
  importVault(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ImportVaultDto
  ) {
    return this.vaults.importWordsToVault(id, body.importData);
  }
}
