import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import { VaultsService } from "./vaults.service";

class CreateVaultDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

class UpdateVaultDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
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

  @Get("public")
  searchPublic(@Query("q") q = "") {
    return this.vaults.searchPublicVaults(q);
  }

  @Post()
  create(@Body() body: CreateVaultDto) {
    return this.vaults.createVault(body.name, { isPublic: body.isPublic });
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateVaultDto
  ) {
    return this.vaults.updateVaultName(id, body.name, { isPublic: body.isPublic });
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
