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

const buildAddressLine = (
  data: AddressData | undefined,
  fallbackText?: string,
) => {
  const parts = [
    data?.direccion,
    data?.urbanizacion,
    data?.provincia,
    data?.distrito,
    data?.departamento,
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return fallbackText ?? '';
};

const appendSimpleAddress = (
  parent: any,
  data: AddressData | undefined,
  fallbackText?: string,
) => {
  if (data?.ubigeo) {
    parent
      .ele('cbc:ID', { schemeAgencyName: 'PE:INEI', schemeName: 'Ubigeos' })
      .txt(data.ubigeo)
      .up();
  }
  const line = buildAddressLine(data, fallbackText);
  if (line) {
    parent.ele('cac:AddressLine').ele('cbc:Line').txt(line).up().up();
  }
};

const appendRegistrationAddress = (
  parent: any,
  data: AddressData | undefined,
  fallbackText?: string,
) => {
  if (data?.ubigeo) {
    parent
      .ele('cbc:ID', { schemeAgencyName: 'PE:INEI', schemeName: 'Ubigeos' })
      .txt(data.ubigeo)
      .up();
  }
  if (data?.urbanizacion)
    parent.ele('cbc:CitySubdivisionName').txt(data.urbanizacion).up();
  if (data?.provincia) parent.ele('cbc:CityName').txt(data.provincia).up();
  if (data?.departamento)
    parent.ele('cbc:CountrySubentity').txt(data.departamento).up();
  if (data?.distrito) parent.ele('cbc:District').txt(data.distrito).up();
  const line = buildAddressLine(data, fallbackText);
  if (line) {
    parent.ele('cac:AddressLine').ele('cbc:Line').txt(line).up().up();
  }
  parent
    .ele('cac:Country')
    .ele('cbc:IdentificationCode', {
      listAgencyName: 'United Nations Economic Commission for Europe',
      listID: 'ISO 3166-1',
      listName: 'Country',
    })
    .txt(data?.paisCodigo ?? 'PE')
    .up()
    .up();
};

export function generateDespatchXML(
  dto: CreateGuideDto,
  serie: string,
  correlativo: string,
): string {
  const issueDateSource = dto.fechaEmision ?? dto.fechaTraslado;
  const issueDate = format(new Date(issueDateSource), 'yyyy-MM-dd');
  const pdfTemplate = process.env.SUNAT_GRE_PDF_TEMPLATE?.trim();
  const disableCtsInfo = process.env.SUNAT_GRE_DISABLE_CTS === 'true';
  const includeCtsInfo = !!pdfTemplate && !disableCtsInfo;
  const refDocId =
    process.env.SUNAT_GRE_REF_DOC_ID?.trim() ?? 'F001-00003232';
  const refDocTypeCode =
    process.env.SUNAT_GRE_REF_DOC_TYPE_CODE?.trim() ?? '01';
  const refDocTypeName =
    process.env.SUNAT_GRE_REF_DOC_TYPE_NAME?.trim() ?? 'Factura';
  const refDocIssuerRuc =
    process.env.SUNAT_GRE_REF_DOC_ISSUER_RUC?.trim() ??
    dto.numeroDocumentoRemitente;
  const customizationId =
    process.env.SUNAT_GRE_CUSTOMIZATION_ID?.trim() ?? '2.0';
  const ublVersionId =
    process.env.SUNAT_GRE_UBL_VERSION_ID?.trim() ?? '2.1';

  const doc = create({ version: '1.0', encoding: 'ISO-8859-1' }).ele(
    'DespatchAdvice',
    {
      'xmlns:ext':
        'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
      'xmlns:cbc':
        'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
      'xmlns:cac':
        'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
      xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2',
      ...(includeCtsInfo
        ? {
            'xmlns:cts':
              'urn:carvajal:names:specification:ubl:peru:schema:xsd:CarvajalAggregateComponents-1',
            'xmlns:ccts': 'urn:un:unece:uncefact:documentation:2',
          }
        : {}),
    },
  );

  // UBLExtensions: 1 para firma, 2 si hay información adicional (CTS)
  const extensions = doc.ele('ext:UBLExtensions');
  const totalExtensions = includeCtsInfo ? 2 : 1;
  for (let i = 0; i < totalExtensions; i++) {
    const extension = extensions.ele('ext:UBLExtension');
    const content = extension.ele('ext:ExtensionContent');
    if (includeCtsInfo && i === 0) {
      const info = content.ele('cts:AdditionalDocumentInformation');
      const header = info.ele('cts:Header');
      header.ele('cts:PDFTemplate').txt(pdfTemplate).up();
      const prop0001 = process.env.SUNAT_GRE_PDF_PROP_0001?.trim();
      const prop0010 = process.env.SUNAT_GRE_PDF_PROP_0010?.trim();
      const prop0011 = process.env.SUNAT_GRE_PDF_PROP_0011?.trim();
      const prop0012 = process.env.SUNAT_GRE_PDF_PROP_0012?.trim();
      if (prop0001) {
        const p = header.ele('cts:AdditionalProperty');
        p.ele('cts:ID').txt('0001').up();
        p.ele('cts:Value').txt(prop0001).up();
        p.up();
      }
      if (prop0010) {
        const p = header.ele('cts:AdditionalProperty');
        p.ele('cts:ID').txt('0010').up();
        p.ele('cts:Value').txt(prop0010).up();
        p.up();
      }
      if (prop0011) {
        const p = header.ele('cts:AdditionalProperty');
        p.ele('cts:ID').txt('0011').up();
        p.ele('cts:Value').txt(prop0011).up();
        p.up();
      }
      if (prop0012) {
        const p = header.ele('cts:AdditionalProperty');
        p.ele('cts:ID').txt('0012').up();
        p.ele('cts:Value').txt(prop0012).up();
        p.up();
      }
      header.up();
      info.up();
    }
    content.up();
    extension.up();
  }

  doc.ele('cbc:UBLVersionID').txt(ublVersionId).up();
  doc.ele('cbc:CustomizationID').txt(customizationId).up();
  doc.ele('cbc:ID').txt(`${serie}-${correlativo}`).up();
  doc.ele('cbc:IssueDate').txt(issueDate).up();
  doc
    .ele('cbc:IssueTime')
    .txt(format(new Date(issueDateSource), 'HH:mm:ss'))
    .up();
  doc
    .ele('cbc:DespatchAdviceTypeCode', {
      listAgencyName: 'PE:SUNAT',
      listName: 'Tipo de Documento',
      listURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01',
    })
    .txt('09')
    .up();
  doc.ele('cbc:Note').txt(dto.motivoTraslado).up();

  const docReference = doc.ele('cac:AdditionalDocumentReference');
  docReference.ele('cbc:ID').txt(refDocId).up();
  docReference
    .ele('cbc:DocumentTypeCode', {
      listAgencyName: 'PE:SUNAT',
      listName: 'Documento relacionado al transporte',
      listURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo61',
    })
    .txt(refDocTypeCode)
    .up();
  docReference.ele('cbc:DocumentType').txt(refDocTypeName).up();
  docReference
    .ele('cac:IssuerParty')
    .ele('cac:PartyIdentification')
    .ele('cbc:ID', {
      schemeAgencyName: 'PE:SUNAT',
      schemeID: '6',
      schemeName: 'Documento de Identidad',
      schemeURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06',
    })
    .txt(refDocIssuerRuc)
    .up()
    .up()
    .up();
  docReference.up();

  const signature = doc.ele('cac:Signature');
  signature.ele('cbc:ID').txt('SignatureSP').up();
  signature
    .ele('cac:SignatoryParty')
    .ele('cac:PartyIdentification')
    .ele('cbc:ID', {
      schemeAgencyName: 'PE:SUNAT',
      schemeID: '6',
      schemeName: 'Documento de Identidad',
      schemeURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06',
    })
    .txt(dto.numeroDocumentoRemitente)
    .up()
    .up()
    .ele('cac:PartyName')
    .ele('cbc:Name')
    .txt(dto.razonSocialRemitente)
    .up()
    .up()
    .up();
  signature
    .ele('cac:DigitalSignatureAttachment')
    .ele('cac:ExternalReference')
    .ele('cbc:URI')
    .txt('#SignatureSP')
    .up()
    .up()
    .up();
  signature.up();

  const supplierParty = doc
    .ele('cac:DespatchSupplierParty')
    .ele('cac:Party');
  supplierParty
    .ele('cac:PartyIdentification')
    .ele('cbc:ID', {
      schemeAgencyName: 'PE:SUNAT',
      schemeID: dto.tipoDocumentoRemitente,
      schemeName: 'Documento de Identidad',
      schemeURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06',
    })
    .txt(dto.numeroDocumentoRemitente)
    .up()
    .up();
  const supplierLegalEntity = supplierParty.ele('cac:PartyLegalEntity');
  supplierLegalEntity
    .ele('cbc:RegistrationName')
    .txt(dto.razonSocialRemitente)
    .up();
  const supplierRegAddress = supplierLegalEntity.ele(
    'cac:RegistrationAddress',
  );
  appendRegistrationAddress(
    supplierRegAddress,
    {
      direccion: dto.puntoPartidaDireccion,
      ubigeo: dto.puntoPartidaUbigeo,
      departamento: dto.puntoPartidaDepartamento,
      provincia: dto.puntoPartidaProvincia,
      distrito: dto.puntoPartidaDistrito,
      urbanizacion: dto.puntoPartidaUrbanizacion,
      paisCodigo: dto.puntoPartidaPaisCodigo,
    },
    dto.puntoPartida,
  );
  supplierRegAddress.up();
  supplierLegalEntity.up();
  supplierParty.up();

  const deliveryCustomerParty = doc
    .ele('cac:DeliveryCustomerParty')
    .ele('cac:Party');
  deliveryCustomerParty
    .ele('cac:PartyIdentification')
    .ele('cbc:ID', {
      schemeAgencyName: 'PE:SUNAT',
      schemeID: dto.destinatario.tipoDocumento,
      schemeName: 'Documento de Identidad',
      schemeURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06',
    })
    .txt(dto.destinatario.numeroDocumento)
    .up()
    .up();
  const deliveryLegalEntity = deliveryCustomerParty.ele('cac:PartyLegalEntity');
  deliveryLegalEntity
    .ele('cbc:RegistrationName')
    .txt(dto.destinatario.razonSocial)
    .up();
  const deliveryRegAddress = deliveryLegalEntity.ele(
    'cac:RegistrationAddress',
  );
  appendRegistrationAddress(
    deliveryRegAddress,
    {
      direccion: dto.puntoLlegadaDireccion,
      ubigeo: dto.puntoLlegadaUbigeo,
      departamento: dto.puntoLlegadaDepartamento,
      provincia: dto.puntoLlegadaProvincia,
      distrito: dto.puntoLlegadaDistrito,
      urbanizacion: dto.puntoLlegadaUrbanizacion,
      paisCodigo: dto.puntoLlegadaPaisCodigo,
    },
    dto.puntoLlegada,
  );
  deliveryRegAddress.up();
  deliveryLegalEntity.up();
  const destinatarioEmail = process.env.SUNAT_GRE_DESTINATARIO_EMAIL?.trim();
  if (destinatarioEmail) {
    deliveryCustomerParty
      .ele('cac:Contact')
      .ele('cbc:ElectronicMail')
      .txt(destinatarioEmail)
      .up()
      .up();
  }
  deliveryCustomerParty.up();

  const shipment = doc.ele('cac:Shipment');
  const shipmentId = process.env.SUNAT_GRE_SHIPMENT_ID?.trim() ?? '1';
  shipment.ele('cbc:ID').txt(shipmentId).up();
  shipment
    .ele('cbc:HandlingCode', {
      listAgencyName: 'PE:SUNAT',
      listName: 'Motivo de Traslado',
      listURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo20',
    })
    .txt(dto.motivoTrasladoCodigo ?? dto.motivoTraslado)
    .up();
  shipment
    .ele('cbc:GrossWeightMeasure', {
      unitCode: dto.pesoBrutoUnidad ?? 'KGM',
    })
    .txt(String(dto.pesoBrutoTotal ?? 1))
    .up();
  shipment.ele('cbc:TotalTransportHandlingUnitQuantity').txt('1').up();

  const shipmentStage = shipment.ele('cac:ShipmentStage');
  shipmentStage
    .ele('cbc:TransportModeCode', {
      listAgencyName: 'PE:SUNAT',
      listName: 'Modalidad de Transporte',
      listURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo18',
    })
    .txt(dto.modalidadTraslado ?? '01')
    .up();
  shipmentStage
    .ele('cac:TransitPeriod')
    .ele('cbc:StartDate')
    .txt(format(new Date(dto.fechaTraslado), 'yyyy-MM-dd'))
    .up()
    .up();
  shipmentStage
    .ele('cac:CarrierParty')
    .ele('cac:PartyIdentification')
    .ele('cbc:ID', {
      schemeAgencyName: 'PE:SUNAT',
      schemeID: dto.transportista.tipoDocumento,
      schemeName: 'Documento de Identidad',
      schemeURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06',
    })
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
  appendSimpleAddress(
    deliveryAddress,
    {
    direccion: dto.puntoLlegadaDireccion,
    ubigeo: dto.puntoLlegadaUbigeo,
    departamento: dto.puntoLlegadaDepartamento,
    provincia: dto.puntoLlegadaProvincia,
    distrito: dto.puntoLlegadaDistrito,
    urbanizacion: dto.puntoLlegadaUrbanizacion,
    paisCodigo: dto.puntoLlegadaPaisCodigo,
    },
    dto.puntoLlegada,
  );
  deliveryAddress.up();
  delivery.up();

  dto.items.forEach((item, index) => {
    doc
      .ele('cac:DespatchLine')
      .ele('cbc:ID')
      .txt((index + 1).toString())
      .up()
      .ele('cbc:DeliveredQuantity', {
        unitCode: item.unidadMedida,
        unitCodeListAgencyName: 'United Nations Economic Commission for Europe',
        unitCodeListID: 'UN/ECE rec 20',
      })
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

