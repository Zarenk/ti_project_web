import { create } from 'xmlbuilder2';
import { CreateGuideDto } from '../dto/create-guide.dto';
import { format } from 'date-fns';

export function generateDespatchXML(
  dto: CreateGuideDto,
  serie: string,
  correlativo: string,
): string {
  const issueDate = format(new Date(dto.fechaTraslado), 'yyyy-MM-dd');
  const despatchDate = format(new Date(dto.fechaTraslado), 'yyyy-MM-dd');

  const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele(
    'DespatchAdvice',
    {
      'xmlns:ext':
        'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
      'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
      'xmlns:cbc':
        'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
      'xmlns:cac':
        'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2',
    },
  );

  // Firma
  doc.import(
    create()
      .ele('ext:UBLExtensions')
      .ele('ext:UBLExtension')
      .ele('ext:ExtensionContent')
      .ele('PlaceholderSignature')
      .up()
      .up()
      .up(),
  );

  doc.ele('cbc:UBLVersionID').txt('2.1').up();
  doc.ele('cbc:CustomizationID').txt('1.0').up();
  doc.ele('cbc:ID').txt(`${serie}-${correlativo}`).up();
  doc.ele('cbc:IssueDate').txt(issueDate).up();
  doc.ele('cbc:DespatchAdviceTypeCode').txt('09').up();
  doc.ele('cbc:Note').txt(dto.motivoTraslado).up();

  doc
    .ele('cac:DespatchSupplierParty')
    .ele('cac:Party')
    .ele('cac:PartyIdentification')
    .ele('cbc:ID')
    .txt(dto.numeroDocumentoRemitente)
    .up()
    .up()
    .ele('cac:PartyLegalEntity')
    .ele('cbc:RegistrationName')
    .txt(dto.razonSocialRemitente)
    .up()
    .up()
    .up()
    .up();

  doc
    .ele('cac:DeliveryCustomerParty')
    .ele('cac:Party')
    .ele('cac:PartyIdentification')
    .ele('cbc:ID')
    .txt(dto.destinatario.numeroDocumento)
    .up()
    .up()
    .ele('cac:PartyLegalEntity')
    .ele('cbc:RegistrationName')
    .txt(dto.destinatario.razonSocial)
    .up()
    .up()
    .up()
    .up();

  const shipment = doc.ele('cac:Shipment');
  shipment.ele('cbc:ID').txt('1').up();
  shipment.ele('cbc:HandlingCode').txt(dto.motivoTraslado).up();
  shipment.ele('cbc:GrossWeightMeasure', { unitCode: 'KGM' }).txt('1.0').up();

  const shipmentStage = shipment.ele('cac:ShipmentStage');
  shipmentStage.ele('cbc:TransportModeCode').txt('01').up();
  shipmentStage
    .ele('cac:CarrierParty')
    .ele('cac:PartyIdentification')
    .ele('cbc:ID')
    .txt(dto.transportista.numeroDocumento)
    .up()
    .up()
    .ele('cac:PartyName')
    .ele('cbc:Name')
    .txt(dto.transportista.razonSocial)
    .up()
    .up()
    .up();

  shipmentStage
    .ele('cac:TransportMeans')
    .ele('cac:RoadTransport')
    .ele('cbc:LicensePlateID')
    .txt(dto.transportista.numeroPlaca ?? '')
    .up()
    .up()
    .up();

  shipment
    .ele('cac:Delivery')
    .ele('cac:DeliveryAddress')
    .ele('cbc:ID')
    .txt(dto.puntoLlegada)
    .up()
    .up()
    .up();

  shipment
    .ele('cac:OriginAddress')
    .ele('cbc:ID')
    .txt(dto.puntoPartida)
    .up()
    .up();

  dto.items.forEach((item, index) => {
    doc
      .ele('cac:DespatchLine')
      .ele('cbc:ID')
      .txt((index + 1).toString())
      .up()
      .ele('cbc:DeliveredQuantity', { unitCode: item.unidadMedida })
      .txt(item.cantidad.toString())
      .up()
      .ele('cac:OrderLineReference')
      .ele('cbc:LineID')
      .txt((index + 1).toString())
      .up()
      .up()
      .ele('cac:Item')
      .ele('cbc:Description')
      .txt(item.descripcion)
      .up()
      .up();
  });

  return doc.end({ prettyPrint: false });
}
