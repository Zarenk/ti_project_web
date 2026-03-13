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
import * as forge from 'node-forge';

import { CreateCompanyDto } from './dto/create-company.dto';
import { TenancyService } from './tenancy.service';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { CurrentTenant } from './tenant-context.decorator';
import { TenantContext } from './tenant-context.interface';
import { CompanySnapshot, TenancySnapshot } from './entities/tenancy.entity';
import { TenantContextGuard } from './tenant-context.guard';
import { TenantContextService } from './tenant-context.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ValidateCompanyDto } from './dto/validate-company.dto';
import { resolveStoragePath } from 'src/utils/path-utils';

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

  @Post('validate')
  validateCompany(
    @Body() dto: ValidateCompanyDto,
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<{ legalNameAvailable: boolean; taxIdAvailable: boolean }> {
    const context = tenant ?? this.tenantContextService.getContext();
    return this.tenancyService.validateCompanyFields(dto, context);
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
          const tmpDir = resolveStoragePath('uploads', 'sunat', 'tmp');
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
    const finalDir = resolveStoragePath(
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
      .relative(resolveStoragePath(), finalPath)
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

  @Post(':id/sunat/upload-pfx')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const tmpDir = resolveStoragePath('uploads', 'sunat', 'tmp');
          fs.mkdirSync(tmpDir, { recursive: true });
          cb(null, tmpDir);
        },
        filename: (_req, file, cb) => {
          const safeName =
            file.originalname?.replace(/\s+/g, '_') || 'certificate.pfx';
          cb(null, `${Date.now()}-${safeName}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadSunatPfx(
    @Param('id', ParseIntPipe) id: number,
    @Query('env', new ParseEnumPipe(SunatUploadEnvironment))
    env: SunatUploadEnvironment,
    @Body('password') password: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<CompanySnapshot> {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo PFX/P12.');
    }
    if (!password) {
      throw new BadRequestException(
        'La contraseña del certificado es obligatoria.',
      );
    }

    // Read the PFX file
    const pfxBuffer = fs.readFileSync(file.path);
    const pfxDer = forge.util.decode64(pfxBuffer.toString('base64'));

    let p12: forge.pkcs12.Pkcs12Pfx;
    try {
      const asn1 = forge.asn1.fromDer(pfxDer);
      p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);
    } catch {
      // Clean up tmp file
      fs.unlinkSync(file.path);
      throw new BadRequestException(
        'No se pudo leer el certificado. Verifique que el archivo sea un PFX/P12 válido y que la contraseña sea correcta.',
      );
    }

    // Extract certificate
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = (certBags[forge.pki.oids.certBag] || [])[0];
    if (!certBag?.cert) {
      fs.unlinkSync(file.path);
      throw new BadRequestException(
        'El archivo PFX no contiene un certificado válido.',
      );
    }

    // Extract private key
    const keyBags = p12.getBags({
      bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
    });
    const keyBag = (keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || [])[0];
    if (!keyBag?.key) {
      fs.unlinkSync(file.path);
      throw new BadRequestException(
        'El archivo PFX no contiene una clave privada.',
      );
    }

    // Convert to PEM format
    const certPem = forge.pki.certificateToPem(certBag.cert);
    const keyPem = forge.pki.privateKeyToPem(keyBag.key);

    // Save files
    const envFolder = env === SunatUploadEnvironment.PROD ? 'prod' : 'beta';
    const finalDir = resolveStoragePath('uploads', 'sunat', String(id), envFolder);
    fs.mkdirSync(finalDir, { recursive: true });

    const ts = Date.now();
    const certPath = path.join(finalDir, `cert-${ts}.pem`);
    const keyPath = path.join(finalDir, `key-${ts}.pem`);
    fs.writeFileSync(certPath, certPem);
    fs.writeFileSync(keyPath, keyPem);

    // Clean up tmp PFX
    fs.unlinkSync(file.path);

    const certRelative = path
      .relative(resolveStoragePath(), certPath)
      .replace(/\\/g, '/');
    const keyRelative = path
      .relative(resolveStoragePath(), keyPath)
      .replace(/\\/g, '/');

    const normalizedEnv = env === SunatUploadEnvironment.PROD ? 'PROD' : 'BETA';
    const context = tenant ?? this.tenantContextService.getContext();

    // Update cert
    await this.tenancyService.updateCompanySunatFile(id, {
      tenant: context,
      environment: normalizedEnv,
      kind: 'cert',
      filePath: certRelative,
      originalName: `${file.originalname} (certificado)`,
    });

    // Update key
    return this.tenancyService.updateCompanySunatFile(id, {
      tenant: context,
      environment: normalizedEnv,
      kind: 'key',
      filePath: keyRelative,
      originalName: `${file.originalname} (clave privada)`,
    });
  }

  @Post(':id/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const tmpDir = resolveStoragePath('uploads', 'company-logos', 'tmp');
          fs.mkdirSync(tmpDir, { recursive: true });
          cb(null, tmpDir);
        },
        filename: (_req, file, cb) => {
          const safeName =
            file.originalname?.replace(/\s+/g, '_') || 'company-logo';
          cb(null, `${Date.now()}-${safeName}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadCompanyLogo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<CompanySnapshot> {
    if (!file) {
      throw new BadRequestException('Debes adjuntar una imagen.');
    }

    const allowedMimeTypes = ['image/png', 'image/jpeg'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      fs.unlink(file.path, () => {});
      throw new BadRequestException('El logo debe ser PNG o JPG.');
    }

    const context = tenant ?? this.tenantContextService.getContext();
    const company = await this.tenancyService.getCompanyById(id, context);

    const orgFolder = `org-${company.organization.id}`;
    const companyFolder = `company-${id}`;
    const finalDir = resolveStoragePath(
      'uploads',
      'company-logos',
      orgFolder,
      companyFolder,
    );
    fs.mkdirSync(finalDir, { recursive: true });

    const ext = file.mimetype === 'image/png' ? '.png' : '.jpg';
    const finalName = `logo-${Date.now()}${ext}`;
    const finalPath = path.join(finalDir, finalName);

    try {
      fs.renameSync(file.path, finalPath);
    } catch (error) {
      fs.unlink(file.path, () => {});
      throw error;
    }

    const relativePath = path
      .relative(resolveStoragePath(), finalPath)
      .replace(/\\/g, '/');

    try {
      const updated = await this.tenancyService.updateCompanyLogo(id, {
        tenant: context,
        filePath: relativePath,
        originalName: file.originalname,
      });

      if (company.logoUrl && company.logoUrl !== relativePath) {
        const isExternal = /^https?:\/\//i.test(company.logoUrl);
        if (!isExternal) {
          const normalizedPrevious = company.logoUrl.replace(/^[/\\]+/, '');
          const previousPath = resolveStoragePath(normalizedPrevious);
          fs.unlink(previousPath, () => {});
        }
      }

      return updated;
    } catch (error) {
      fs.unlink(finalPath, () => {});
      throw error;
    }
  }
}
