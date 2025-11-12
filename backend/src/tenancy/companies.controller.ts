import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';

import { CreateCompanyDto } from './dto/create-company.dto';
import { TenancyService } from './tenancy.service';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { CurrentTenant } from './tenant-context.decorator';
import { TenantContext } from './tenant-context.interface';
import { CompanySnapshot, TenancySnapshot } from './entities/tenancy.entity';
import { TenantContextGuard } from './tenant-context.guard';
import { TenantContextService } from './tenant-context.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { resolveBackendPath } from 'src/utils/path-utils';

enum SunatUploadEnvironment {
  BETA = 'beta',
  PROD = 'prod',
}

enum SunatUploadType {
  CERT = 'cert',
  KEY = 'key',
}

@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly tenancyService: TenancyService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  @Get()
  list(
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<TenancySnapshot[]> {
    const context = tenant ?? this.tenantContextService.getContext();
    return this.tenancyService.listCompanies(context);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<
    CompanySnapshot & {
      organization: {
        id: number;
        name: string;
        code: string | null;
        status: string;
      };
    }
  > {
    const context = tenant ?? this.tenantContextService.getContext();
    return this.tenancyService.getCompanyById(id, context);
  }

  @Post()
  create(
    @Body() dto: CreateCompanyDto,
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<CompanySnapshot> {
    const context = tenant ?? this.tenantContextService.getContext();
    return this.tenancyService.createCompany(dto, context);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyDto,
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<CompanySnapshot> {
    const context = tenant ?? this.tenantContextService.getContext();
    return this.tenancyService.updateCompany(id, dto, context);
  }

  @Get(':id/sunat/transmissions')
  listSunatTransmissions(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    const context = tenant ?? this.tenantContextService.getContext();
    return this.tenancyService.listCompanySunatTransmissions(id, context);
  }

  @Post(':id/sunat/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const tmpDir = resolveBackendPath('uploads', 'sunat', 'tmp');
          fs.mkdirSync(tmpDir, { recursive: true });
          cb(null, tmpDir);
        },
        filename: (_req, file, cb) => {
          const safeName =
            file.originalname?.replace(/\s+/g, '_') || 'sunat-file';
          cb(null, `${Date.now()}-${safeName}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadSunatFile(
    @Param('id', ParseIntPipe) id: number,
    @Query('env', new ParseEnumPipe(SunatUploadEnvironment))
    env: SunatUploadEnvironment,
    @Query('type', new ParseEnumPipe(SunatUploadType))
    type: SunatUploadType,
    @UploadedFile() file: Express.Multer.File,
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<CompanySnapshot> {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo.');
    }

    const normalizedEnv = env === SunatUploadEnvironment.PROD ? 'PROD' : 'BETA';
    const envFolder = env === SunatUploadEnvironment.PROD ? 'prod' : 'beta';
    const finalDir = resolveBackendPath(
      'uploads',
      'sunat',
      String(id),
      envFolder,
    );
    fs.mkdirSync(finalDir, { recursive: true });

    const ext =
      path.extname(file.originalname) ||
      (type === SunatUploadType.KEY ? '.key' : '.crt');
    const finalName = `${type}-${Date.now()}${ext}`;
    const finalPath = path.join(finalDir, finalName);
    fs.renameSync(file.path, finalPath);

    const relativePath = path
      .relative(resolveBackendPath(), finalPath)
      .replace(/\\/g, '/');

    const context = tenant ?? this.tenantContextService.getContext();
    return this.tenancyService.updateCompanySunatFile(id, {
      tenant: context,
      environment: normalizedEnv,
      kind: type === SunatUploadType.KEY ? 'key' : 'cert',
      filePath: relativePath,
      originalName: file.originalname,
    });
  }
}
