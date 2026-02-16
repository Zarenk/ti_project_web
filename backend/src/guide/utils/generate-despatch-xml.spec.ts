import { generateDespatchXML } from './generate-despatch-xml';
import { CreateGuideDto } from '../dto/create-guide.dto';

const baseDto: CreateGuideDto = {
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

describe('generateDespatchXML', () => {
  it('includes basic identifiers and issue date', () => {
    const xml = generateDespatchXML({ ...baseDto, fechaEmision: '2026-01-23' }, 'T001', '00000001');
    expect(xml).toContain('<cbc:ID>T001-00000001</cbc:ID>');
    expect(xml).toContain('<cbc:IssueDate>2026-01-23</cbc:IssueDate>');
    expect(xml).toContain('<cbc:DespatchAdviceTypeCode>09</cbc:DespatchAdviceTypeCode>');
  });

  it('uses peso bruto from dto when provided', () => {
    const xml = generateDespatchXML(
      { ...baseDto, pesoBrutoUnidad: 'KGM', pesoBrutoTotal: 5 },
      'T001',
      '00000002',
    );
    expect(xml).toContain('GrossWeightMeasure');
    expect(xml).toContain('unitCode="KGM"');
    expect(xml).toContain('>5<');
  });

  it('includes seller item identification', () => {
    const xml = generateDespatchXML(baseDto, 'T001', '00000003');
    expect(xml).toContain('<cac:SellersItemIdentification>');
    expect(xml).toContain('<cbc:ID>ITEM-001</cbc:ID>');
  });
});
