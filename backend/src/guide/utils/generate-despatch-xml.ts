import { create } from 'xmlbuilder2';
import { CreateGuideDto } from '../dto/create-guide.dto';
import { format } from 'date-fns';

type AddressData = {
  direccion?: string;
  ubigeo?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  urbanizacion?: string;
  paisCodigo?: string;
};

const appendAddress = (
  parent: any,
  data: AddressData | undefined,
  fallbackText?: string,
) => {
  const hasStructured =
    !!data &&
    (data.direccion ||
      data.ubigeo ||
      data.departamento ||
      data.provincia ||
      data.distrito ||
      data.urbanizacion);

  if (data?.ubigeo) parent.ele('cbc:ID').txt(data.ubigeo).up();
  if (data?.direccion) parent.ele('cbc:StreetName').txt(data.direccion).up();
  if (data?.urbanizacion)
    parent.ele('cbc:CitySubdivisionName').txt(data.urbanizacion).up();
  if (data?.distrito) parent.ele('cbc:District').txt(data.distrito).up();
  if (data?.provincia) parent.ele('cbc:CityName').txt(data.provincia).up();
  if (data?.departamento)
    parent.ele('cbc:CountrySubentity').txt(data.departamento).up();
  parent
    .ele('cac:Country')
    .ele('cbc:IdentificationCode')
    .txt(data?.paisCodigo ?? 'PE')
    .up()
    .up();

  if (!hasStructured && fallbackText) {
    parent
      .ele('cac:AddressLine')
      .ele('cbc:Line')
      .txt(fallbackText)
      .up()
      .up();
  }
};

export function generateDespatchXML(
  dto: CreateGuideDto,
  serie: string,
  correlativo: string,
): string {
  const issueDateSource = dto.fechaEmision ?? dto.fechaTraslado;
  const issueDate = format(new Date(issueDateSource), 'yyyy-MM-dd');

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

  // Firma (ExtensionContent vacío; se reemplaza en el firmado)
  doc.import(
    create()
      .ele('ext:UBLExtensions')
      .ele('ext:UBLExtension')
      .ele('ext:ExtensionContent')
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
    .ele('cbc:ID', { schemeID: dto.tipoDocumentoRemitente })
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
    .ele('cbc:ID', { schemeID: dto.destinatario.tipoDocumento })
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
  shipment.ele('cbc:HandlingCode').txt(dto.motivoTrasladoCodigo ?? dto.motivoTraslado).up();
  shipment
    .ele('cbc:GrossWeightMeasure', {
      unitCode: dto.pesoBrutoUnidad ?? 'KGM',
    })
    .txt(String(dto.pesoBrutoTotal ?? 1))
    .up();
  shipment.ele('cbc:TotalTransportHandlingUnitQuantity').txt('1').up();
  shipment.ele('cbc:HandlingInstructions').txt(dto.motivoTraslado).up();

  const shipmentStage = shipment.ele('cac:ShipmentStage');
  shipmentStage
    .ele('cbc:TransportModeCode')
    .txt(dto.modalidadTraslado ?? '01')
    .up();
  shipmentStage
    .ele('cac:CarrierParty')
    .ele('cac:PartyIdentification')
    .ele('cbc:ID', { schemeID: dto.transportista.tipoDocumento })
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

  const delivery = shipment.ele('cac:Delivery');
  const deliveryAddress = delivery.ele('cac:DeliveryAddress');
  appendAddress(deliveryAddress, {
    direccion: dto.puntoLlegadaDireccion,
    ubigeo: dto.puntoLlegadaUbigeo,
    departamento: dto.puntoLlegadaDepartamento,
    provincia: dto.puntoLlegadaProvincia,
    distrito: dto.puntoLlegadaDistrito,
    urbanizacion: dto.puntoLlegadaUrbanizacion,
    paisCodigo: dto.puntoLlegadaPaisCodigo,
  }, dto.puntoLlegada);
  deliveryAddress.up();
  delivery.up();

  const originAddress = shipment.ele('cac:OriginAddress');
  appendAddress(originAddress, {
    direccion: dto.puntoPartidaDireccion,
    ubigeo: dto.puntoPartidaUbigeo,
    departamento: dto.puntoPartidaDepartamento,
    provincia: dto.puntoPartidaProvincia,
    distrito: dto.puntoPartidaDistrito,
    urbanizacion: dto.puntoPartidaUrbanizacion,
    paisCodigo: dto.puntoPartidaPaisCodigo,
  }, dto.puntoPartida);
  originAddress.up();

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
      .ele('cac:SellersItemIdentification')
      .ele('cbc:ID')
      .txt(item.codigo)
      .up()
      .up()
      .up();
  });

  return doc.end({ prettyPrint: false });
}
