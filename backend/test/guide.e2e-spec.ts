import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { of, throwError } from 'rxjs';
import AdmZip from 'adm-zip';
import path from 'path';

import { GuideModule } from '../src/guide/guide.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { FirmadorJavaService } from '../src/guide/firmador-java.service';
import { HttpService } from '@nestjs/axios';
import { extractCdrStatus } from '../src/guide/utils/extract-cdr-status';

jest.mock('../src/guide/utils/extract-cdr-status', () => ({
  extractCdrStatus: jest.fn(),
}));

describe('GuideController (e2e)', () => {
  let app: INestApplication;

  const baseDto = {
    serie: 'T001',
    correlativo: '00012345',
    tipoDocumentoRemitente: '6',
    numeroDocumentoRemitente: '20519857538',
    razonSocialRemitente: 'TEST SA',
    puntoPartida: 'PUNTO PARTIDA',
    puntoLlegada: 'PUNTO LLEGADA',
    motivoTraslado: 'Traslado entre establecimientos',
    fechaTraslado: '2026-01-23',
    transportista: {
      tipoDocumento: '6',
      numeroDocumento: '20609523957',
      razonSocial: 'TRANSPORTES SA',
      numeroPlaca: 'AAA-123',
    },
    destinatario: {
      tipoDocumento: '6',
      numeroDocumento: '20519857538',
      razonSocial: 'TEST SA',
    },
    items: [
      {
        codigo: 'ITEM-001',
        descripcion: 'Producto de prueba',
        cantidad: 1,
        unidadMedida: 'NIU',
      },
    ],
  };

  const prismaStub = {
    shippingGuide: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  const firmadorStub = {
    firmarXmlConJava: jest.fn().mockResolvedValue('<Signed/>'),
  } as unknown as FirmadorJavaService;

  const httpStub = {
    post: jest.fn(),
  } as unknown as HttpService;

  const parseBinary = (res: any, callback: (err: Error | null, data?: Buffer) => void) => {
    const data: Buffer[] = [];
    res.on('data', (chunk: Buffer) => data.push(chunk));
    res.on('end', () => callback(null, Buffer.concat(data)));
  };

  const getResponseBuffer = (response: request.Response) => {
    if (Buffer.isBuffer(response.body) && response.body.length > 0) {
      return response.body;
    }
    if (typeof response.text === 'string') {
      return Buffer.from(response.text, 'binary');
    }
    return Buffer.from('');
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [GuideModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .overrideProvider(FirmadorJavaService)
      .useValue(firmadorStub)
      .overrideProvider(HttpService)
      .useValue(httpStub)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /guide/send-rest returns accepted with mocked SUNAT', async () => {
    (extractCdrStatus as jest.Mock).mockResolvedValue({
      accepted: true,
      code: '0',
      description: 'ACEPTADO',
    });

    (httpStub.post as jest.Mock)
      .mockReturnValueOnce(of({ data: { access_token: 'token' } }))
      .mockReturnValueOnce(
        of({ data: { applicationResponse: Buffer.from('cdr').toString('base64') } }),
      );

    const response = await request(app.getHttpServer())
      .post('/guide/send-rest')
      .send(baseDto);

    expect(response.status).toBe(201);
    expect(response.body.applicationResponse).toBeDefined();
  });

  it('POST /guide/send-rest returns accepted with valid CDR base64', async () => {
    const cdrXml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>
      <ApplicationResponse xmlns=\"urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2\">
        <cbc:ResponseCode xmlns:cbc=\"urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2\">0</cbc:ResponseCode>
        <cbc:Description xmlns:cbc=\"urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2\">ACEPTADO</cbc:Description>
      </ApplicationResponse>`;
    const cdrZip = new AdmZip();
    cdrZip.addFile('R-20519857538-09-T001-00012345.xml', Buffer.from(cdrXml, 'utf8'));
    const cdrZipBuffer = cdrZip.toBuffer();

    (extractCdrStatus as jest.Mock).mockImplementation(async (buffer: Buffer) => {
      const zip = new AdmZip(buffer);
      const entry = zip.getEntries()[0];
      const xml = entry.getData().toString('utf8');
      return {
        accepted: xml.includes('<cbc:ResponseCode') && xml.includes('>0<'),
        code: '0',
        description: 'ACEPTADO',
      };
    });

    (httpStub.post as jest.Mock)
      .mockReturnValueOnce(of({ data: { access_token: 'token' } }))
      .mockReturnValueOnce(
        of({ data: { applicationResponse: cdrZipBuffer.toString('base64') } }),
      );

    const response = await request(app.getHttpServer())
      .post('/guide/send-rest')
      .send(baseDto);

    expect(response.status).toBe(201);
    expect(response.body.applicationResponse).toBeDefined();
  });

  it('POST /guide/send-rest returns 500 on SUNAT error', async () => {
    (extractCdrStatus as jest.Mock).mockResolvedValue({
      accepted: false,
      code: '99',
      description: 'ERROR',
    });

    (httpStub.post as jest.Mock)
      .mockReturnValueOnce(of({ data: { access_token: 'token' } }))
      .mockReturnValueOnce(
        throwError(() => ({ response: { data: { error: 'SUNAT_ERROR' } } })),
      );

    const response = await request(app.getHttpServer())
      .post('/guide/send-rest')
      .send(baseDto);

    expect(response.status).toBe(500);
  });

  it('POST /guide/validate returns preview and zip size', async () => {
    const response = await request(app.getHttpServer())
      .post('/guide/validate')
      .send(baseDto);

    expect(response.status).toBe(201);
    expect(response.body.zipSize).toBeGreaterThan(0);
    expect(response.body.xmlPreview).toContain('<Signed/>');
  });

  it('GET /guide/:id/files/xml returns file when exists', async () => {
    const fs = await import('fs');
    const baseDir = path.join(process.cwd(), 'temp', 'gre');
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

    const xmlName = '20519857538-09-T001-00012345-TEST.xml';
    const xmlPath = path.join(baseDir, xmlName);
    fs.writeFileSync(xmlPath, '<xml/>', 'utf8');

    prismaStub.shippingGuide.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      xmlName,
      zipName: null,
      cdrAceptado: true,
      cdrCode: '0',
      cdrDescription: 'ACEPTADO',
      serie: 'T001',
      correlativo: '00012345',
      createdAt: new Date(),
    });

    const response = await request(app.getHttpServer())
      .get('/guide/1/files/xml')
      .buffer(true)
      .parse(parseBinary);
    expect(response.status).toBe(200);
    const payload = getResponseBuffer(response).toString('utf8');
    expect(payload).toContain('<xml/>');
  });

  it('GET /guide/:id/files/zip returns 404 when missing', async () => {
    prismaStub.shippingGuide.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      xmlName: null,
      zipName: null,
      cdrAceptado: false,
      cdrCode: null,
      cdrDescription: null,
      serie: 'T001',
      correlativo: '00012345',
      createdAt: new Date(),
    });

    const response = await request(app.getHttpServer()).get('/guide/1/files/zip');
    expect(response.status).toBe(404);
  });

  it('GET /guide/:id/files/cdr returns 404 when missing', async () => {
    prismaStub.shippingGuide.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      xmlName: null,
      zipName: null,
      cdrAceptado: false,
      cdrCode: null,
      cdrDescription: null,
      serie: 'T001',
      correlativo: '00012345',
      createdAt: new Date(),
    });

    const response = await request(app.getHttpServer()).get('/guide/1/files/cdr');
    expect(response.status).toBe(404);
  });

  it('POST /guide/validate returns 400 with missing fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/guide/validate')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Datos incompletos para la guía');
  });

  it('POST /guide returns OBSERVADO when SUNAT rejects XML', async () => {
    (extractCdrStatus as jest.Mock).mockResolvedValue({
      accepted: false,
      code: '1033',
      description: 'UBL inválido',
    });

    (httpStub.post as jest.Mock)
      .mockReturnValueOnce(of({ data: { access_token: 'token' } }))
      .mockReturnValueOnce(
        of({ data: { applicationResponse: Buffer.from('cdr').toString('base64') } }),
      );

    const response = await request(app.getHttpServer())
      .post('/guide')
      .send(baseDto);

    expect(response.status).toBe(201);
    expect(response.body.estadoSunat).toBe('OBSERVADO / RECHAZADO');
    expect(response.body.codigoRespuesta).toBe('1033');
  });

  it('POST /guide/validate returns 400 with invalid fixture', async () => {
    const fs = await import('fs');
    const invalidPayload = JSON.parse(
      fs
        .readFileSync(
          path.join(process.cwd(), 'src', 'guide', 'fixtures', 'gre-beta-invalid.json'),
          'utf8',
        )
        .replace(/^\uFEFF/, ''),
    );

    const response = await request(app.getHttpServer())
      .post('/guide/validate')
      .send(invalidPayload);

    expect(response.status).toBe(400);
  });

  it('POST /guide/send-rest returns 500 on SUNAT timeout', async () => {
    (extractCdrStatus as jest.Mock).mockResolvedValue({
      accepted: false,
      code: '99',
      description: 'TIMEOUT',
    });

    (httpStub.post as jest.Mock)
      .mockReturnValueOnce(of({ data: { access_token: 'token' } }))
      .mockReturnValueOnce(
        throwError(() => ({ message: 'ETIMEDOUT' })),
      );

    const response = await request(app.getHttpServer())
      .post('/guide/send-rest')
      .send(baseDto);

    expect(response.status).toBe(500);
  });

  it('GET /guide/:id/files/zip returns zip when exists', async () => {
    const fs = await import('fs');
    const baseDir = path.join(process.cwd(), 'temp', 'gre');
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

    const zipName = '20519857538-09-T001-00012345-TEST.zip';
    const zipPath = path.join(baseDir, zipName);
    fs.writeFileSync(zipPath, Buffer.from('zip-content'));

    prismaStub.shippingGuide.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      xmlName: null,
      zipName,
      cdrAceptado: true,
      cdrCode: '0',
      cdrDescription: 'ACEPTADO',
      serie: 'T001',
      correlativo: '00012345',
      createdAt: new Date(),
    });

    const response = await request(app.getHttpServer())
      .get('/guide/1/files/zip')
      .buffer(true)
      .parse(parseBinary);
    expect(response.status).toBe(200);
    const payload = getResponseBuffer(response);
    expect(Buffer.compare(payload, Buffer.from('zip-content'))).toBe(0);
  });

  it('GET /guide/:id/files/cdr returns cdr when exists', async () => {
    const fs = await import('fs');
    const baseDir = path.join(process.cwd(), 'temp', 'gre');
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

    const zipName = '20519857538-09-T001-00012345-TEST.zip';
    const cdrName = `R-${zipName}`;
    const cdrPath = path.join(baseDir, cdrName);
    fs.writeFileSync(cdrPath, Buffer.from('cdr-content'));

    prismaStub.shippingGuide.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      xmlName: null,
      zipName,
      cdrAceptado: true,
      cdrCode: '0',
      cdrDescription: 'ACEPTADO',
      serie: 'T001',
      correlativo: '00012345',
      createdAt: new Date(),
    });

    const response = await request(app.getHttpServer())
      .get('/guide/1/files/cdr')
      .buffer(true)
      .parse(parseBinary);
    expect(response.status).toBe(200);
    const payload = getResponseBuffer(response);
    expect(Buffer.compare(payload, Buffer.from('cdr-content'))).toBe(0);
  });
});




