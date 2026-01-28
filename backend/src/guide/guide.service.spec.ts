import { of } from 'rxjs';
import { GuideService } from './guide.service';
import { extractCdrStatus } from './utils/extract-cdr-status';
import type { CreateGuideDto } from './dto/create-guide.dto';

jest.mock('./utils/extract-cdr-status', () => ({
  extractCdrStatus: jest.fn(),
}));

describe('GuideService integration (mocked SUNAT)', () => {
  const baseDto: CreateGuideDto = {
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

  it('generarGuia uses mocked SUNAT and persists result', async () => {
    (extractCdrStatus as jest.Mock).mockResolvedValue({
      accepted: true,
      code: '0',
      description: 'ACEPTADO',
    });

    const prismaService = {
      shippingGuide: {
        create: jest.fn().mockResolvedValue({ id: 1, serie: 'T001' }),
      },
    } as any;

    const firmadorJavaService = {
      firmarXmlConJava: jest.fn().mockResolvedValue('<Signed/>'),
    } as any;

    const httpService = {
      post: jest
        .fn()
        .mockReturnValueOnce(of({ data: { access_token: 'token' } }))
        .mockReturnValueOnce(
          of({ data: { applicationResponse: Buffer.from('cdr').toString('base64') } }),
        ),
    } as any;

    const service = new GuideService(prismaService, firmadorJavaService, httpService);
    const result = await service.generarGuia(baseDto);

    expect(firmadorJavaService.firmarXmlConJava).toHaveBeenCalled();
    expect(prismaService.shippingGuide.create).toHaveBeenCalled();
    expect(result.estadoSunat).toBe('ACEPTADO');
  });

  it('validateGuide returns preview without sending to SUNAT', async () => {
    const prismaService = {
      shippingGuide: {
        create: jest.fn(),
      },
    } as any;

    const firmadorJavaService = {
      firmarXmlConJava: jest.fn().mockResolvedValue('<Signed/>'),
    } as any;

    const httpService = {
      post: jest.fn(),
    } as any;

    const service = new GuideService(prismaService, firmadorJavaService, httpService);
    const result = await service.validateGuide(baseDto);

    expect(result.zipSize).toBeGreaterThan(0);
    expect(result.xmlPreview).toContain('<Signed/>');
  });

  it('validateGuide throws when required fields are missing', async () => {
    const prismaService = {
      shippingGuide: {
        create: jest.fn(),
      },
    } as any;

    const firmadorJavaService = {
      firmarXmlConJava: jest.fn(),
    } as any;

    const httpService = {
      post: jest.fn(),
    } as any;

    const service = new GuideService(prismaService, firmadorJavaService, httpService);

    await expect(service.validateGuide({} as CreateGuideDto)).rejects.toThrow(
      'Datos incompletos para la guía',
    );
  });
});
