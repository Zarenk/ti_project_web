import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

import { SunatService } from './sunat.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendToSunat } from './utils/sunat-client';
import { firmarDocumentoUBL } from './utils/signer';
import { generateZip } from './utils/zip-generator';
import { generateBoletaXML, generateInvoiceXML } from './utils/xml-generator';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

jest.mock('./utils/xml-generator', () => ({
  generateInvoiceXML: jest.fn(() => '<Invoice/>'),
  generateBoletaXML: jest.fn(() => '<Boleta/>'),
}));

jest.mock('./utils/signer', () => ({
  firmarDocumentoUBL: jest.fn(() => Promise.resolve('<Signed/>')),
}));

jest.mock('./utils/zip-generator', () => ({
  generateZip: jest.fn(() => path.join('/repo', 'tmp', 'signed.zip')),
}));

jest.mock('./utils/sunat-client', () => ({
  sendToSunat: jest.fn(() => Promise.resolve('OK')),
}));

jest.mock('src/utils/path-utils', () => ({
  resolveBackendPath: (...segments: string[]) =>
    path.join('/repo', ...segments),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(() => 'test'),
}));

describe('SunatService', () => {
  let service: SunatService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      company: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          organizationId: 1,
          name: 'Acme',
          taxId: '20100000001',
          sunatEnvironment: 'BETA',
          sunatRuc: null,
          sunatSolUserBeta: 'betaUser',
          sunatSolPasswordBeta: 'betaPass',
          sunatCertPathBeta: 'sunat/beta/cert.crt',
          sunatKeyPathBeta: 'sunat/beta/key.key',
          sunatSolUserProd: 'prodUser',
          sunatSolPasswordProd: 'prodPass',
          sunatCertPathProd: 'sunat/prod/cert.crt',
          sunatKeyPathProd: 'sunat/prod/key.key',
        }),
      },
      invoiceSales: {
        findFirst: jest.fn(),
      },
      sunatTransmission: {
        create: jest.fn().mockResolvedValue({ id: 321 }),
        update: jest.fn().mockResolvedValue(undefined),
      },
    } as unknown as PrismaService;

    service = new SunatService(prisma as PrismaService);
    (firmarDocumentoUBL as jest.Mock).mockResolvedValue('<Signed/>');
    (generateInvoiceXML as jest.Mock).mockReturnValue('<Invoice/>');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('envía documentos usando credenciales beta por defecto', async () => {
    await service.sendDocument({
      documentType: 'invoice',
      documentData: {
        serie: 'F001',
        correlativo: '123',
        emisor: { razonSocial: 'ACME SAC' },
      },
      companyId: 1,
      saleId: 77,
    });

    expect(generateInvoiceXML).toHaveBeenCalled();
    expect(firmarDocumentoUBL).toHaveBeenCalledWith(
      '<Invoice/>',
      path.join('/repo', 'sunat', 'beta', 'key.key'),
      path.join('/repo', 'sunat', 'beta', 'cert.crt'),
    );
    expect(sendToSunat).toHaveBeenCalledWith(
      path.join('/repo', 'tmp', 'signed.zip'),
      expect.stringContaining('20100000001-01-F001-123'),
      'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
      'betaUser',
      'betaPass',
    );
    const transmissionCreate = prisma.sunatTransmission.create as jest.Mock;
    const transmissionUpdate = prisma.sunatTransmission.update as jest.Mock;

    expect(transmissionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 1,
        saleId: 77,
        environment: 'BETA',
        documentType: 'invoice',
        serie: 'F001',
        correlativo: '123',
        payload: expect.any(Object),
      }),
    });
    expect(transmissionUpdate).toHaveBeenLastCalledWith({
      where: { id: 321 },
      data: expect.objectContaining({ status: 'SENT' }),
    });
  });

  it('permite forzar ambiente producción y usa credenciales PROD', async () => {
    await service.sendDocument({
      documentType: 'boleta',
      documentData: {
        serie: 'B001',
        correlativo: '555',
      },
      companyId: 1,
      environmentOverride: 'PROD',
    });

    expect(generateBoletaXML).toHaveBeenCalled();
    expect(sendToSunat).toHaveBeenCalledWith(
      path.join('/repo', 'tmp', 'signed.zip'),
      expect.stringContaining('20100000001-03-B001-555'),
      'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService',
      'prodUser',
      'prodPass',
    );
  });

  it('lanza error si faltan credenciales configuradas', async () => {
    (prisma.company!.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      organizationId: 1,
      name: 'Acme',
      taxId: '20100000001',
      sunatEnvironment: 'BETA',
      sunatSolUserBeta: null,
      sunatSolPasswordBeta: null,
      sunatCertPathBeta: null,
      sunatKeyPathBeta: null,
    });

    const transmissionCreate = prisma.sunatTransmission.create as jest.Mock;
    const transmissionUpdate = prisma.sunatTransmission.update as jest.Mock;

    await expect(
      service.sendDocument({
        documentType: 'invoice',
        documentData: {},
        companyId: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transmissionCreate).not.toHaveBeenCalled();
    expect(transmissionUpdate).not.toHaveBeenCalled();
  });

  it('reintenta una transmisión almacenada', async () => {
    prisma.sunatTransmission.findUnique = jest.fn().mockResolvedValue({
      id: 10,
      companyId: 1,
      organizationId: 5,
      saleId: 44,
      environment: 'BETA',
      documentType: 'invoice',
      payload: { serie: 'F001', correlativo: '500' },
      company: { organizationId: 5 },
    });

    const tenant: TenantContext = {
      organizationId: 5,
      companyId: null,
      organizationUnitId: null,
      userId: 1,
      isGlobalSuperAdmin: true,
      isOrganizationSuperAdmin: true,
      isSuperAdmin: true,
      allowedOrganizationIds: [5],
      allowedCompanyIds: [],
      allowedOrganizationUnitIds: [],
    };

    await service.retryTransmission(10, tenant);

    expect(prisma.sunatTransmission.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { status: 'RETRYING' },
    });
    expect(sendToSunat).toHaveBeenCalled();
  });
});
