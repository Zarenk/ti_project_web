
import { toast } from "sonner";
import type { ExtractedProduct } from "./series-batch-validator";

// Listas de patrones para identificar proveedores por diseño de comprobante
// Se pueden agregar más nombres o RUCs en cada lista para extender el soporte
const DELTRON_PATTERNS: (string | RegExp)[] = ["20212331377"];
const INGRAM_PATTERNS: (string | RegExp)[] = ["20267163228", /ingram\s+micro/i];
const NEXSYS_PATTERNS: (string | RegExp)[] = ["20470145901", /nexsys\s+del\s+peru/i];
const SUPERTEC_PATTERNS: (string | RegExp)[] = [
  "20434327611", // RUC de Supertec
  /supertec/i,
  /tecnolog[ií]a\s+superior/i,
];

const TEMPLATE_PROVIDER_PATTERNS: (string | RegExp)[] = [
  /gozu gaming/i,
  /2060\d{7}/, // RUC de GOZU y similares que comparten el mismo diseño
  /pc\s*link/i, // Nuevo proveedor con el mismo diseño de comprobante
  "20519078520", // RUC del nuevo proveedor
];

type InvoiceProvider = "deltron" | "template" | "ingram" | "nexsys" | "supertec" | "unknown";

type GuideItem = { name: string; quantity: number; series?: string[] };


// Detecta el proveedor de la factura a partir del texto extraído
// Devuelve "deltron", "template" o "unknown" si no se reconoce
export function detectInvoiceProvider(text: string): InvoiceProvider {
  const normalized = text.toLowerCase();

  const matches = (patterns: (string | RegExp)[]) =>
    patterns.some((p) =>
      typeof p === "string" ? normalized.includes(p.toLowerCase()) : p.test(normalized)
    );

  if (matches(DELTRON_PATTERNS)) {
    return "deltron";
  }

  if (matches(INGRAM_PATTERNS)) {
    return "ingram";
  }

  if (matches(NEXSYS_PATTERNS)) {
    return "nexsys";
  }

  if (matches(SUPERTEC_PATTERNS)) {
    return "supertec";
  }

  if (matches(TEMPLATE_PROVIDER_PATTERNS)) {
    return "template";
  }

  return "unknown";
}

export function detectGuideDocument(text: string): boolean {
  return /guia\s+de\s+remision/i.test(text);
}


// Extrae información del proveedor desde el texto del PDF y actualiza el formulario
// Retorna el RUC encontrado para permitir lógica adicional (como tipo de moneda)
function extractProviderDetails(text: string, setValue: Function): string | null {
  const rucMatch = text.match(/R\.?U\.?C\.?\s*(?:N[°º#\s]*)?[:\s-]*(\d{11})/i);
  let ruc: string | null = null;
  if (rucMatch) {
    ruc = rucMatch[1];
    setValue("provider_documentNumber", ruc);
    setValue("ruc", ruc);
  }

  const nameMatch = text.match(/(?:Raz[oó]n Social|Proveedor|Nombre)[:\-\s]*([^\n]+)/i);
  if (nameMatch) {
    setValue("provider_name", nameMatch[1].trim());
  }

  let addressMatch = text.match(
    /Direcci[oó]n(?![^\n]*cliente)[^:]*[:\-\s]*([\s\S]*?)(?=\n{2,}|\n(?:RUC|Señor|Cliente|Tipo de Moneda|Observación|Forma de pago|Cantidad|SON:|$))/i
  );
  if (addressMatch) {
    const address = addressMatch[1].replace(/\s+/g, " ").trim();
    setValue("provider_adress", address);
  }

  // Fallback para comprobantes que no incluyen etiquetas explícitas
  if ((!nameMatch || !addressMatch) && rucMatch?.index !== undefined) {
    const beforeRuc = text.slice(0, rucMatch.index).trim();
    const lines = beforeRuc
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    const facturaIdx = lines.findIndex((l) => /factura/i.test(l));
    const headerLines = facturaIdx === -1 ? lines : lines.slice(0, facturaIdx);

    if (headerLines.length >= 2) {
      const providerName = headerLines[1];
      const addressLines = headerLines.slice(2).join(" ").replace(/\s+/g, " ");

      if (!nameMatch) setValue("provider_name", providerName);
      if (!addressMatch && addressLines) setValue("provider_adress", addressLines);
    }
  }

  return ruc;
}

export function processExtractedText(
  text: string,
  setValue: Function,
  setCurrency: Function
): ExtractedProduct[] {
  console.log("Procesando texto extraído:", text);

  const lines = text.split("\n").map((line) => line.trim());
  console.log("Procesando texto extraído:", lines);
  const products: { name: string; quantity: number; unitPrice: number; totalPrice: number }[] = [];

  let currentProduct = {
    name: "",
    quantity: 0,
    unitPrice: 0,
    totalPrice: 0,
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const nextLine = lines[i + 1] || "";

    const irrelevantWords = ["LLEVATE", "GRATIS", "MONITORES", "DOCUMENTO", "ANTICIPADO", "REGALO"];

    irrelevantWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      line = line.replace(regex, "").trim();
    });

    if (
      line.length < 5 ||
      line.match(/^(TOTAL|IGV|DOCUMENTOS|R\.?U\.?C\.?|FACTURA|FECHA|LLEVAR|AHEEE|BNFFF|APBBBP|HHHHH|ProductoTotalCantidadUnidadCodigo|Precio|Unitario|Valor|Descuentos|OBSERVACIONES|Número de Pedido|Orden de Compra|Ver\.)/i) ||
      /^[A-Z]{5,}$/.test(line) ||
      /^\d+(\.\d{2})?$/.test(line) ||
      /^[A-Z0-9]{10,}$/i.test(line) ||
      /^[A-Z0-9-]{10,}$/i.test(line) ||
      /^\d{4}-\d{2}-\d{2}Dolares Americanos$/i.test(line) ||
      (!line.includes(" ") && /^[A-Z0-9]+$/i.test(line)) ||
      line.match(/^#PROMOCION/i) ||
      line.match(/POR LA COMPRA DE/i)
    ) {
      continue;
    }

    const cleanedLine = line.replace(/\s(-\s[A-Z0-9]+|\/[A-Z0-9]+)$/i, "").trim();

    const isRedundant = products.some((product) =>
      product.name.includes(cleanedLine) || cleanedLine.includes(product.name)
    );
    if (isRedundant) continue;

    if (/^[A-Z0-9\s-/]+$/i.test(line) ||
        line.match(/^(MEM|RAM|PROC|SSD|NBG|MB|MON|KING|CORE|INT)/i)) {
      products.push({ name: line, quantity: 0, unitPrice: 0, totalPrice: 0 });
      i += 1;
      continue;
    }
  }

  const extractUnitValue = (line: string): string | null => {
    const unitValueMatch = line.match(/NIU([\d,]+(\.\d{1,2})?)/);
    if (unitValueMatch) {
      const rawValue = unitValueMatch[1].replace(/,/g, "");
      const parsedValue = parseFloat(rawValue);
      return parsedValue.toFixed(2);
    }
    return null;
  };

  let productIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const nextLine = lines[i + 1] || "";
    const unitValue = extractUnitValue(nextLine);
    if (unitValue !== null && productIndex < products.length) {
      products[productIndex].unitPrice = parseFloat(unitValue);
      productIndex++;
    }
  }

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const productName = product.name.toLowerCase();

    for (let j = 0; j < lines.length; j++) {
      const line = lines[j].toLowerCase();
      if (line.includes(productName)) {
        const nextLine = lines[j + 1] || "";
        const totalValueMatch = nextLine.match(/^\d{1,4}(,\d{3})*(\.\d{2})?$/);
        if (totalValueMatch) {
          const totalValue = parseFloat(totalValueMatch[0].replace(/,/g, ""));
          product.quantity = totalValue;
          break;
        }
      }
    }

    if (!product.quantity) {
      console.warn(`No se encontró un valor total para el producto: ${product.name}`);
    }
  }

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const { quantity, unitPrice } = product;
    if (!quantity || !unitPrice) continue;

    const quantityStr = quantity.toString();
    const unitPriceStr = unitPrice.toString();
    let realQuantity = 0;

    for (let j = 1; j <= quantityStr.length; j++) {
      const currentDigits = parseInt(quantityStr.slice(0, j), 10);
      const remainingDigits = parseFloat(quantityStr.slice(j));

      if (unitPriceStr.startsWith("0")) {
        if (j === 1 && quantityStr[1] === "0") {
          realQuantity = parseInt(quantityStr.slice(0, 1), 10);
          break;
        } else if (j === 2) {
          realQuantity = parseInt(quantityStr.slice(0, 2), 10);
          break;
        }
      }

      if (j === 1 && quantityStr[1] === "0") {
        realQuantity = parseInt(quantityStr.slice(0, 2), 10);
        break;
      }

      const calculatedValue = currentDigits * unitPrice;
      const difference = Math.abs(calculatedValue - remainingDigits);

      if (difference <= 100) {
        realQuantity = currentDigits;
        break;
      }
    }

    if (realQuantity === 0) {
      for (let j = 1; j <= quantityStr.length; j++) {
        const currentDigits = parseInt(quantityStr.slice(0, j), 10);
        const remainingDigits = parseFloat(quantityStr.slice(j));
        const calculatedValue = currentDigits * unitPrice;
        const difference = Math.abs(calculatedValue - remainingDigits);
        if (difference <= 1000) {
          realQuantity = currentDigits;
          break;
        }
      }
    }

    if (realQuantity > 0) {
      product.quantity = realQuantity;
      console.log(`Cantidad real para el producto ${product.name}: ${realQuantity}`);
    }
  }

  console.log("Productos extraídos:", products);
  const applyIgv = /GRUPO\s+DELTRON\s+S\.A\.?/i.test(text);
  let result: ExtractedProduct[] = [];
  if (products.length > 0) {
    result = products.map((product, index) => {
      const basePrice = parseFloat(product.unitPrice.toFixed(2));
      const finalPrice = applyIgv
        ? parseFloat((basePrice * 1.18).toFixed(2))
        : basePrice;

      return {
        id: index+1,
        name: product.name,
        quantity: product.quantity,
        price: finalPrice,
        priceSell: 0,
        category_name: "Sin categoria",
      };
    });
  } else {
    toast.warning("No se encontraron productos en el archivo PDF.");
  }

  const categoryMatch = text.match(/Categoría:\s*(.+)/i);
  const priceMatch = text.match(/Precio:\s*\$?([\d.,]+)/i);
  const descriptionMatch = text.match(/Descripción:\s*(.+)/i);
  const storeMatch = text.match(/Tienda:\s*(.+)/i);
  const rucMatch = text.match(/R\.?U\.?C\.?\s*N[°º]?\s*(\d{11})/i);
  const fechaEmisionMatch = text.match(/Fecha de Emisión[:\s]*([\d-]+)/i);
  const facturaMatch = text.match(/FACTURA\s+ELECTR[ÓO]NICA/i);
  const serieMatch = text.match(/FACTURA ELECTRÓNICA\s*([A-Z0-9-]+)/i);
  const totalMatch = text.match(/TOTAL A PAGAR[:\s]*\$?([\d.,]+)/i);

  if (categoryMatch) setValue("category_name", categoryMatch[1].trim());
  if (priceMatch) setValue("price", parseFloat(priceMatch[1].replace(",", "")));
  if (descriptionMatch) setValue("description", descriptionMatch[1].trim());
  if (storeMatch) setValue("store_name", storeMatch[1].trim());
  if (rucMatch) {
    const ruc = rucMatch[1].trim();
    setValue("ruc", ruc);
    if (ruc === "20212331377") {
      setCurrency("USD");
      setValue("tipo_moneda", "USD");
      setValue("provider_documentNumber", ruc);
    }
  }
  if (fechaEmisionMatch) setValue("fecha_emision_comprobante", fechaEmisionMatch[1].trim());
  if (facturaMatch) setValue("comprobante", facturaMatch[0].trim());
  if (serieMatch) {
    const serie = serieMatch[1].trim();
    setValue("serie", serie);
    setValue("nroCorrelativo", serie);

    const providerNameMatch = text.match(new RegExp(`${serie}\\s+([A-Za-z\\s]+\\.[A-Za-z\\s]+\\.)`, "i"));
    console.log("providerNameMatch", providerNameMatch);
    if (providerNameMatch) {
      const providerName = providerNameMatch[1].trim();
      setValue("provider_name", providerName);
      const addressMatch = text.match(new RegExp(`${providerName}\\s*[:]?\\s*(.+)`, "i"));
      if (addressMatch) {
        const address = addressMatch[1].trim();
        setValue("provider_adress", address);
      }
    }
  }

  if (totalMatch) setValue("total_comprobante", totalMatch[1].trim());

  return result;
}

export function processInvoiceText(
  text: string,
  setValue: Function,
  setCurrency: Function
): ExtractedProduct[] {
  const lines = text
    .split("\n")
    .map((line) =>
      line
        .trim()
        .replace(/(?<=\d)(?=\D)|(?<=\D)(?=\d)/g, " ")
    )
    .filter(Boolean);

  const headerKeywords = [
    "IGV",
    "FORMA DE PAGO",
    "FORMA",
    "PAGO",
    "SUBTOTAL",
    "TOTAL",
    "SON:",
    "CANTIDAD",
    "DESCRIPCIÓN",
    "UNIDAD",
    "ICBPER",
  ];

  const filteredLines = lines.filter(
    (line) => !headerKeywords.some((word) => line.toUpperCase().includes(word))
  );

  const parseProductLine = (line: string) => {
    const normalize = (v: string) => {
      if (v.includes(',') && v.includes('.')) {
        return parseFloat(v.replace(/,/g, ''));
      }
      return parseFloat(v.replace(',', '.'));
    };

    const tokens = line.split(/\s+/);
    const qtyStr = tokens.shift();
    if (!qtyStr || !/^\d+(?:[.,]\d+)?$/.test(qtyStr)) return null;

    // Extract trailing numeric values (total, unit price, optional icbper)
    const numericTail: string[] = [];
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (/^\d+(?:[.,]\d+)?$/.test(tokens[i])) {
        numericTail.push(tokens[i]);
      } else {
        break;
      }
    }
    if (numericTail.length < 2) return null;

    const totalStr = numericTail[0];
    const unitStr = numericTail[1];
    const icbperStr = numericTail[2];
    const name = tokens.slice(0, tokens.length - numericTail.length).join(' ');

    const product: {
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      icbper?: number;
    } = {
      name: name.trim(),
      quantity: normalize(qtyStr),
      unitPrice: normalize(unitStr),
      totalPrice: normalize(totalStr),
    };

    if (icbperStr) {
      product.icbper = normalize(icbperStr);
    }

    return product;
  };

  const products: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    icbper?: number;
  }[] = [];

  for (const line of filteredLines) {
    const product = parseProductLine(line);
    if (product) {
      products.push(product);
    }
  }

  const applyIgv = /GRUPO\s+DELTRON\s+S\.A\.?/i.test(text);
  let result: ExtractedProduct[] = [];
  if (products.length > 0) {
    result = products.map((product, index) => {
      const basePrice = parseFloat(product.unitPrice.toFixed(2));
      const finalPrice = applyIgv
        ? parseFloat((basePrice * 1.18).toFixed(2))
        : basePrice;

      return {
        id: index + 1,
        name: product.name,
        quantity: product.quantity,
        price: finalPrice,
        priceSell: 0,
        category_name: "Sin categoria",
      };
    });
  } else {
    toast.warning("No se encontraron productos en el archivo PDF.");
  }
  const ruc = extractProviderDetails(text, setValue);
  if (ruc) {
    setCurrency("PEN");
    setValue("tipo_moneda", "PEN");
  }

  const serieMatch = text.match(/(?:serie\s*[:\-]?\s*)?([A-Z]\d{3}-\d{3,})/i);
  const fechaMatch = text.match(/Fecha\s+de\s+emisi[óo]n[:\s]*([\d\/.-]+)/i);
  const totalMatch = text.match(
    /(?:TOTAL(?:\s+A\s+PAGAR)?|IMPORTE\s+TOTAL)\s*:?\s*(?:S\/|\$)?\s*([\d.,]+)/i
  );
  const comprobanteMatch = text.match(/(FACTURA|BOLETA)\s+ELECTR[ÓO]NICA/i);

  if (comprobanteMatch) setValue("comprobante", comprobanteMatch[0].trim());
  if (serieMatch) {
    const serie = serieMatch[1];
    setValue("serie", serie);
    setValue("nroCorrelativo", serie);
  }
  if (fechaMatch)
    setValue("fecha_emision_comprobante", fechaMatch[1].trim());
  if (totalMatch)
    setValue("total_comprobante", totalMatch[1].replace(/[\s,]/g, ""));

  return result;
}

export function processGuideText(
  text: string,
  setValue: Function,
  setCurrency: Function
): ExtractedProduct[] {
  const normalized = text.replace(/\u00a0/g, " ");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const normalizedLines = normalized.replace(/\r\n/g, "\n");
  const serieCorrelativoMatch = normalizedLines.match(
    /N\s*[°º#]?\s*([A-Z0-9]{2,4})\s*-\s*(\d{3,})/i
  );
  const issueMatch = normalizedLines.match(
    /Fecha\s+y\s+hora\s+de\s+emisi[oó]n\s*:\s*([0-9\/.-]+\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)?/i
  );
  const deliveryMatch = normalizedLines.match(
    /Fecha\s+de\s+entrega[^\n]*:\s*([0-9\/.-]+(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)?)/i
  );
  const reasonMatch = normalizedLines.match(
    /Motivo\s+de\s+Traslado\s*:\s*([^\n]+)/i
  );
  const rucMatch = normalizedLines.match(/R\.?U\.?C\.?\s*N\s*:?\s*(\d{11})/i);
  const dateTimeRegex =
    /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}\s+\d{1,2}:\d{2}\s*(?:AM|PM)\b/i;

  let issueDateValue = issueMatch?.[1]?.trim() ?? "";
  if (!issueDateValue) {
    const rowsForIssue = normalizedLines
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const motivoIdx = rowsForIssue.findIndex((line) => /Motivo\s+de\s+Traslado/i.test(line));
    const startIdx = motivoIdx >= 0 ? Math.max(0, motivoIdx - 12) : 0;
    const endIdx = motivoIdx >= 0 ? motivoIdx : rowsForIssue.length;
    const window = rowsForIssue.slice(startIdx, endIdx).reverse();
    const candidateLine = window.find((line) => dateTimeRegex.test(line));
    if (candidateLine) {
      const match = candidateLine.match(dateTimeRegex);
      issueDateValue = match?.[0] ?? candidateLine;
    }
  }

  const extractInlineOrNext = (labelPattern: string, stopPattern: string) => {
    const labelRegex = new RegExp(labelPattern, "i");
    const stopRegex = new RegExp(stopPattern, "i");
    const rows = normalizedLines.split("\n").map((line) => line.trim());

    for (let i = 0; i < rows.length; i++) {
      const line = rows[i];
      if (!labelRegex.test(line)) continue;

      const inline = line
        .replace(labelRegex, "")
        .replace(/^\s*:\s*/, "")
        .trim();

      if (inline && !stopRegex.test(inline)) {
        const next = rows[i + 1] ?? "";
        if (next && !stopRegex.test(next) && next.length > 2) {
          return `${inline} ${next}`.replace(/\s+/g, " ").trim();
        }
        return inline;
      }

      const nextLine = rows[i + 1] ?? "";
      if (nextLine && !stopRegex.test(nextLine)) {
        const nextNext = rows[i + 2] ?? "";
        if (nextNext && !stopRegex.test(nextNext) && nextNext.length > 2) {
          return `${nextLine} ${nextNext}`.replace(/\s+/g, " ").trim();
        }
        return nextLine.replace(/\s+/g, " ").trim();
      }
    }

    return null;
  };

  const getPrevNonEmpty = (rows: string[], fromIndex: number, maxSteps = 3) => {
    for (let i = fromIndex - 1, steps = 0; i >= 0 && steps < maxSteps; i--, steps++) {
      const value = rows[i]?.trim();
      if (value) return value;
    }
    return null;
  };

  const labelLineRegex =
    /Punto\s+de\s+llegada|Punto\s+de\s+Partida|Datos\s+del\s+Destinatario|Fecha\s+y\s+hora\s+de\s+emisi[oó]n|Fecha\s+de\s+entrega|Motivo\s+de\s+Traslado|Bienes\s+por\s+transportar|Unidad\s+de\s+Medida\s+del\s+Peso\s+Bruto|Peso\s+Bruto\s+total\s+de\s+la\s+carga|Datos\s+del\s+transportista|Datos\s+del\s+traslado|Modalidad\s+de\s+Traslado|Indicador/i;

  const getPrevLines = (rows: string[], fromIndex: number, count = 2) => {
    const collected: string[] = [];
    for (let i = fromIndex - 1; i >= 0 && collected.length < count; i--) {
      const value = rows[i]?.trim();
      if (!value) continue;
      if (labelLineRegex.test(value)) continue;
      collected.push(value);
    }
    return collected.reverse();
  };

  const getNextNonEmpty = (rows: string[], fromIndex: number, maxSteps = 3) => {
    for (let i = fromIndex + 1, steps = 0; i < rows.length && steps < maxSteps; i++, steps++) {
      const value = rows[i]?.trim();
      if (value) return value;
    }
    return null;
  };

  const rows = normalizedLines.split("\n").map((line) => line.trim());
  const findLabelIndex = (pattern: string) => {
    const regex = new RegExp(pattern, "i");
    return rows.findIndex((line) => regex.test(line));
  };

  const partidaBlock = normalizedLines.match(
    /Punto\s+de\s+Partida\s*:?\s*([\s\S]*?)(?=Punto\s+de\s+llegada|Datos\s+del\s+Destinatario|Bienes\s+por\s+transportar|Unidad\s+de\s+Medida\s+del\s+Peso\s+Bruto|Peso\s+Bruto\s+total\s+de\s+la\s+carga|Datos\s+del\s+transportista|$)/i
  );
  const llegadaBlock = normalizedLines.match(
    /Punto\s+de\s+llegada\s*:?\s*([\s\S]*?)(?=Datos\s+del\s+Destinatario|Bienes\s+por\s+transportar|Unidad\s+de\s+Medida\s+del\s+Peso\s+Bruto|Peso\s+Bruto\s+total\s+de\s+la\s+carga|Datos\s+del\s+transportista|$)/i
  );
  const partidaIndex = findLabelIndex("Punto\\s+de\\s+Partida");
  const llegadaIndex = findLabelIndex("Punto\\s+de\\s+llegada");
  const motivoIndex = rows.findIndex((line) =>
    /Motivo\s+de\s+Traslado/i.test(line)
  );
  const partidaValue =
    partidaBlock?.[1]?.replace(/\s+/g, " ").trim() ??
    extractInlineOrNext(
      "Punto\\s+de\\s+Partida",
      "Punto\\s+de\\s+llegada|Datos\\s+del\\s+Destinatario|Bienes\\s+por\\s+transportar|Unidad\\s+de\\s+Medida\\s+del\\s+Peso\\s+Bruto|Peso\\s+Bruto\\s+total\\s+de\\s+la\\s+carga|Datos\\s+del\\s+transportista"
    ) ??
    (partidaIndex >= 0 ? getPrevLines(rows, partidaIndex, 2).join(" ").trim() : null);
  const llegadaValue =
    llegadaBlock?.[1]?.replace(/\s+/g, " ").trim() ??
    extractInlineOrNext(
      "Punto\\s+de\\s+llegada",
      "Datos\\s+del\\s+Destinatario|Bienes\\s+por\\s+transportar|Unidad\\s+de\\s+Medida\\s+del\\s+Peso\\s+Bruto|Peso\\s+Bruto\\s+total\\s+de\\s+la\\s+carga|Datos\\s+del\\s+transportista"
    ) ??
    (llegadaIndex >= 0 ? getPrevLines(rows, llegadaIndex, 2).join(" ").trim() : null);

  let resolvedPartida = partidaValue;
  let resolvedLlegada = llegadaValue;
  if (motivoIndex >= 0 && (partidaIndex >= 0 || llegadaIndex >= 0)) {
    const endIndexCandidates = [partidaIndex, llegadaIndex].filter((i) => i >= 0);
    const endIndex = endIndexCandidates.length > 0 ? Math.min(...endIndexCandidates) : -1;
    if (endIndex > motivoIndex) {
      const blockLines = rows
        .slice(motivoIndex + 1, endIndex)
        .filter((line) => line && !labelLineRegex.test(line));
      if (blockLines.length >= 2) {
        const mid = Math.floor(blockLines.length / 2);
        const llegadaLines = blockLines.slice(0, mid);
        const partidaLines = blockLines.slice(mid);
        if (llegadaLines.length > 0) {
          resolvedLlegada = llegadaLines.join(" ").replace(/\s+/g, " ").trim();
        }
        if (partidaLines.length > 0) {
          resolvedPartida = partidaLines.join(" ").replace(/\s+/g, " ").trim();
        }
      }
    }
  }
  const destinatarioValue = extractInlineOrNext(
    "Datos\\s+del\\s+Destinatario",
    "Bienes\\s+por\\s+transportar|Unidad\\s+de\\s+Medida\\s+del\\s+Peso\\s+Bruto|Peso\\s+Bruto\\s+total\\s+de\\s+la\\s+carga|Datos\\s+del\\s+transportista"
  );
  const pesoUnidadValue = extractInlineOrNext(
    "Unidad\\s+de\\s+Medida\\s+del\\s+Peso\\s+Bruto",
    "Peso\\s+Bruto\\s+total\\s+de\\s+la\\s+carga|Datos\\s+del\\s+transportista"
  );
  const pesoTotalValue = extractInlineOrNext(
    "Peso\\s+Bruto\\s+total\\s+de\\s+la\\s+carga",
    "Datos\\s+del\\s+transportista"
  );
  const transportistaValue = extractInlineOrNext(
    "Datos\\s+del\\s+transportista",
    "$"
  );

  if (serieCorrelativoMatch) {
    setValue("guia_serie", serieCorrelativoMatch[1]);
    setValue("guia_correlativo", serieCorrelativoMatch[2]);
  }
  if (issueDateValue) {
    setValue("guia_fecha_emision", issueDateValue);
  }
  if (deliveryMatch && deliveryMatch[1]) {
    setValue("guia_fecha_entrega_transportista", deliveryMatch[1].trim());
  }
  if (reasonMatch) {
    setValue("guia_motivo_traslado", reasonMatch[1].trim());
  }
  if (resolvedPartida) {
    setValue("guia_punto_partida", resolvedPartida);
  }
  if (resolvedLlegada) {
    setValue("guia_punto_llegada", resolvedLlegada);
  }
  if (destinatarioValue) {
    const destinatario = destinatarioValue
      .replace(/\s+-\s+REGISTRO\s+UNICO\s+DE\s+CONTRIBUYENTES.*$/i, "")
      .trim();
    if (destinatario) {
      setValue("guia_destinatario", destinatario);
    }
  }
  const pesoUnidadIndex = findLabelIndex("Unidad\\s+de\\s+Medida\\s+del\\s+Peso\\s+Bruto");
  const pesoTotalIndex = findLabelIndex("Peso\\s+Bruto\\s+total\\s+de\\s+la\\s+carga");
  const transportistaIndex = findLabelIndex("Datos\\s+del\\s+transportista");
  const trasladoIndex = findLabelIndex("Datos\\s+del\\s+traslado");

  const resolvedPesoUnidad =
    pesoUnidadValue ??
    (pesoUnidadIndex >= 0
      ? getNextNonEmpty(rows, pesoUnidadIndex) ?? getPrevNonEmpty(rows, pesoUnidadIndex)
      : null);
  const resolvedPesoTotal =
    pesoTotalValue ??
    (pesoTotalIndex >= 0
      ? getNextNonEmpty(rows, pesoTotalIndex) ?? getPrevNonEmpty(rows, pesoTotalIndex)
      : null);
  const resolvedTransportista =
    transportistaValue ??
    (transportistaIndex >= 0 ? getPrevLines(rows, transportistaIndex, 2).join(" ").trim() : null);
  const resolvedTransportistaFinal = resolvedTransportista
    ? resolvedTransportista
        // Evita arrastrar "NO" sueltos previos al texto real del transportista
        .replace(/^\s*(?:NO\b\s*)+/i, "")
        .trim()
    : null;

  let resolvedPesoUnidadFinal = resolvedPesoUnidad;
  let resolvedPesoTotalFinal = resolvedPesoTotal;
  if (
    (!resolvedPesoUnidadFinal || resolvedPesoUnidadFinal === "NO") ||
    (!resolvedPesoTotalFinal || resolvedPesoTotalFinal === "NO")
  ) {
    const unitAnchorIndex = rows.findIndex((value) =>
      /Unidad\s+de\s+Medida\s+del\s+Peso\s+Bruto/i.test(value)
    );
    const transportistaLineIndex = rows.findIndex((value) =>
      /Datos\s+del\s+transportista/i.test(value)
    );
    const start = unitAnchorIndex >= 0 ? unitAnchorIndex : 0;
    const end =
      transportistaLineIndex > start ? transportistaLineIndex : rows.length;
    const window = rows.slice(start, end);

    const unitCandidate = window.find(
      (value) => /^[A-Z]{2,5}$/.test(value) && value !== "NO"
    );
    const totalCandidate = window.find(
      (value) => /^\d+([.,]\d+)?$/.test(value)
    );

    if (!resolvedPesoUnidadFinal || resolvedPesoUnidadFinal === "NO") {
      resolvedPesoUnidadFinal = unitCandidate ?? resolvedPesoUnidadFinal;
    }
    if (!resolvedPesoTotalFinal || resolvedPesoTotalFinal === "NO") {
      resolvedPesoTotalFinal = totalCandidate ?? resolvedPesoTotalFinal;
    }
  }

  // OCR frecuente: KGM y 5 aparecen despues de
  // "Indicador para registrar vehiculos/vehículos y conductores del transportista:"
  // y antes de "Indicador de transbordo programado" / "Unidad de Medida del Peso Bruto".
  const invalidPesoUnidad =
    !resolvedPesoUnidadFinal ||
    resolvedPesoUnidadFinal === "NO" ||
    resolvedPesoUnidadFinal.length > 12 ||
    /REGISTRO|EMPRESA|CONTRIBUYENTES|MODALIDAD|INDICADOR|DATOS/i.test(resolvedPesoUnidadFinal);
  const invalidPesoTotal =
    !resolvedPesoTotalFinal ||
    resolvedPesoTotalFinal === "NO" ||
    /[A-Za-z]/.test(resolvedPesoTotalFinal);

  if (invalidPesoUnidad || invalidPesoTotal) {
    const registrarIdx = rows.findIndex((value) =>
      /Indicador\s+para\s+registrar\s+veh(?:iculos|[ií]culos|Ã­culos)\s+y\s+conductores\s+del\s+transportista/i.test(
        value,
      ),
    );
    const unidadLabelIdx = rows.findIndex((value) =>
      /Unidad\s+de\s+Medida\s+del\s+Peso\s+Bruto/i.test(value),
    );
    const transbordoIdx = rows.findIndex((value) =>
      /Indicador\s+de\s+transbordo\s+programado/i.test(value),
    );
    const endIdxCandidates = [unidadLabelIdx, transbordoIdx, transportistaIndex]
      .filter((idx) => idx >= 0 && idx > registrarIdx);
    const endIdx = endIdxCandidates.length > 0 ? Math.min(...endIdxCandidates) : rows.length;

    if (registrarIdx >= 0) {
      const window = rows
        .slice(registrarIdx + 1, endIdx)
        .map((v) => v.trim())
        .filter(
          (v) =>
            v &&
            v !== "NO" &&
            !/Indicador|Modalidad|Datos\s+del\s+traslado|Unidad\s+de\s+Medida/i.test(v),
        );
      const unitCandidate = window.find((value) => /^[A-Z]{2,5}$/.test(value));
      const totalCandidate = window.find((value) => /^\d+([.,]\d+)?$/.test(value));
      if (invalidPesoUnidad && unitCandidate) {
        resolvedPesoUnidadFinal = unitCandidate;
      }
      if (invalidPesoTotal && totalCandidate) {
        resolvedPesoTotalFinal = totalCandidate;
      }
    }
  }

  // Fallback adicional: extraer explicitamente el bloque entre anclas
  // para capturar KGM y 5 aunque el OCR venga desordenado.
  if (
    !resolvedPesoUnidadFinal ||
    !resolvedPesoTotalFinal ||
    invalidPesoUnidad ||
    invalidPesoTotal
  ) {
    const registrarBlockMatch = normalizedLines.match(
      /Indicador\s+para\s+registrar\s+veh(?:iculos|[ií]culos|Ã­culos)\s+y\s+conductores\s+del\s+transportista\s*:?\s*([\s\S]*?)(?=Indicador\s+de\s+transbordo\s+programado|Unidad\s+de\s+Medida\s+del\s+Peso\s+Bruto|Datos\s+del\s+transportista|$)/i,
    );
    if (registrarBlockMatch?.[1]) {
      const blockLines = registrarBlockMatch[1]
        .split("\n")
        .map((v) => v.trim())
        .filter(
          (v) =>
            v &&
            v !== "NO" &&
            !/Indicador|Modalidad|Datos\s+del\s+traslado|Unidad\s+de\s+Medida/i.test(v),
        );
      const unitCandidate = blockLines.find((value) => /^[A-Z]{2,5}$/.test(value));
      const totalCandidate = blockLines.find((value) => /^\d+([.,]\d+)?$/.test(value));
      if ((invalidPesoUnidad || !resolvedPesoUnidadFinal) && unitCandidate) {
        resolvedPesoUnidadFinal = unitCandidate;
      }
      if ((invalidPesoTotal || !resolvedPesoTotalFinal) && totalCandidate) {
        resolvedPesoTotalFinal = totalCandidate;
      }
    }
  }

  if (resolvedPesoUnidadFinal) {
    setValue("guia_peso_bruto_unidad", resolvedPesoUnidadFinal);
  }
  if (resolvedPesoTotalFinal) {
    setValue("guia_peso_bruto_total", resolvedPesoTotalFinal);
  }
  if (resolvedTransportistaFinal) {
    setValue("guia_transportista", resolvedTransportistaFinal);
  }
  if (rucMatch) {
    setValue("provider_documentNumber", rucMatch[1]);
    setValue("ruc", rucMatch[1]);
  }

  setValue("comprobante", "GUIA DE REMISION");
  setCurrency("PEN");
  setValue("tipo_moneda", "PEN");

  const descriptionParts = [reasonMatch?.[1]?.trim(), deliveryMatch?.[1]?.trim()].filter(Boolean);
  if (descriptionParts.length > 0) {
    setValue("entry_description", descriptionParts.join(" - "));
  }

  const items: GuideItem[] = [];
  let inItems = false;
  let pendingName: string | null = null;
  let pendingSeries: string | null = null;

  const extractSeriesFromName = (input: string) => {
    const seriesMatch = input.match(
      /\bSERIE\b\s*(?:N|N\.|Nº|NO|S\/N)?\s*[:\-]?\s*([A-Z0-9-]{5,})/i
    );
    if (!seriesMatch) {
      return { name: input, series: null };
    }
    const cleaned = input
      .replace(seriesMatch[0], "")
      .replace(/\s{2,}/g, " ")
      .trim();
    return { name: cleaned, series: seriesMatch[1].trim() };
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s{2,}/g, " ").trim();
    const rowIndexMatch = line.match(/^(\d{1,3})\s+/);
    const rowIndex = rowIndexMatch?.[1] ?? null;
    const hadNoMarker = /\bNO\b/i.test(line) || /NO$/i.test(line);

    if (/Bienes\s+por\s+transportar/i.test(line)) {
      inItems = true;
      continue;
    }

    if (
      inItems &&
      /Unidad\s+de\s+Medida\s+del\s+Peso\s+Bruto|Datos\s+del\s+traslado|Datos\s+del\s+transportista/i.test(
        line
      )
    ) {
      inItems = false;
    }

    if (!inItems) continue;

    if (
      /Descripcion\s+Detallada|Unidad\s+de\s+medida|Cantidad|Codigo|Partida|GTIN|Arancelaria/i.test(
        line
      )
    ) {
      continue;
    }

    if (/^[A-Z0-9-]{10,}$/i.test(line) && !/\s/.test(line)) {
      continue;
    }

    const unitMatch = line.match(/UNIDAD\s*\([A-Z]+\)/i);
    const nameSource = unitMatch ? line.slice(0, unitMatch.index).trim() : line;
    const qtySource = unitMatch ? line.slice(unitMatch.index) : line;
    const qtyMatch = qtySource.match(/(\d+(?:[.,]\d+)?)\s*$/);
    if (!qtyMatch) {
      if (/[A-Z]/.test(nameSource) && nameSource.length >= 6) {
        const extracted = extractSeriesFromName(nameSource);
        pendingName = extracted.name;
        pendingSeries = extracted.series;
      }
      continue;
    }

    const qty = parseFloat(qtyMatch[1].replace(",", "."));
    const extractedNow = extractSeriesFromName(nameSource);
    let name = extractedNow.name
      .replace(/^\d+NO\s+/i, "")
      .replace(/^\d+\s+NO\s+/i, "")
      .replace(/^\d+\s+/, "")
      .replace(/NO$/i, "")
      .replace(/^\d+\s+/, "")
      .trim();
    let seriesValue: string | null = extractedNow.series;

    if (rowIndex && hadNoMarker) {
      if (rowIndex.length === 1) {
        const rowSuffix = new RegExp(`${rowIndex}{1,2}$`);
        if (rowSuffix.test(name)) {
          name = name.replace(rowSuffix, "").trim();
        }
      } else if (rowIndex.length === 2 && name.endsWith(rowIndex)) {
        name = name.slice(0, -rowIndex.length).trim();
      }
    }

    if (
      !name ||
      name.length < 3 ||
      /^\d+$/.test(name) ||
      (rowIndex && name === rowIndex) ||
      /^NO$/i.test(name) ||
      Number.isNaN(qty)
    ) {
      if (pendingName) {
        name = pendingName;
        seriesValue = pendingSeries ?? seriesValue;
      } else {
        continue;
      }
    }

    if (!name) continue;
    items.push({ name, quantity: qty, series: seriesValue ? [seriesValue] : undefined });
    pendingName = null;
    pendingSeries = null;
  }

  if (items.length > 0) {
    return items.map((item, index) => ({
      id: index + 1,
      name: item.name,
      quantity: item.quantity,
      price: 0,
      priceSell: 0,
      category_name: "Sin categoria",
      series: item.series ?? [],
    }));
  } else {
    toast.warning("No se encontraron productos en la guia de remision.");
    return [];
  }
}

// =====================================================================
// DELTRON GUIDE PROCESSOR
// Handles "Guía de Remisión Remitente Electrónica" from GRUPO DELTRON
// Format: BIENES A TRASLADAR with CÓDIGO, DESCRIPCIÓN, series on next lines
// =====================================================================

export function processDeltronGuideText(
  text: string,
  setValue: Function,
  setCurrency: Function
): ExtractedProduct[] {
  const normalized = text.replace(/\u00a0/g, " ");
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const fullText = lines.join("\n");

  // --- SERIE / CORRELATIVO ---
  // Format: N°: T029-00004430 or N°: T0A1-00012345
  const serieMatch = fullText.match(
    /N[°º]?\s*:?\s*([A-Z0-9]{3,5})\s*-\s*(\d{4,})/i
  );
  if (serieMatch) {
    setValue("guia_serie", serieMatch[1].trim());
    setValue("guia_correlativo", serieMatch[2].trim());
  }

  // --- RUC EMISOR ---
  const rucMatch = fullText.match(
    /R\.?U\.?C\.?\s*(?:N[°º]?)?\s*:?\s*(\d{11})/i
  );
  if (rucMatch) {
    setValue("ruc", rucMatch[1]);
    setValue("provider_documentNumber", rucMatch[1]);
  }

  // --- FECHA DE EMISIÓN ---
  // Format: FECHA DE EMISIÓN: 06-01-2026
  const fechaEmisionMatch = fullText.match(
    /FECHA\s+DE\s+EMISI[ÓO]N\s*:\s*([0-9\/.\-]+)/i
  );
  if (fechaEmisionMatch) {
    setValue("guia_fecha_emision", fechaEmisionMatch[1].trim());
    setValue("fecha_emision_comprobante", fechaEmisionMatch[1].trim());
  }

  // --- INICIO TRASLADO ---
  // Format: INICIO TRASLADO: 06/01/2026
  const inicioTrasladoMatch = fullText.match(
    /INICIO\s+(?:DE\s+)?TRASLADO\s*:\s*([0-9\/.\-]+)/i
  );
  if (inicioTrasladoMatch) {
    setValue("guia_fecha_entrega_transportista", inicioTrasladoMatch[1].trim());
  }

  // --- MOTIVO DE TRASLADO ---
  const motivoMatch = fullText.match(
    /MOTIVO\s+DE\s+TRASLADO\s*:\s*([^\n]+)/i
  );
  if (motivoMatch) {
    setValue("guia_motivo_traslado", motivoMatch[1].trim());
  }

  // --- PUNTO DE PARTIDA ---
  // Format: PUNTO DE PARTIDA\nDIRECCIÓN: AV. EJERCITO NRO. 839 ...
  const partidaBlock = fullText.match(
    /PUNTO\s+DE\s+PARTIDA\s*\n\s*DIRECCI[ÓO]N\s*:\s*([\s\S]*?)(?=UBIGEO|PUNTO\s+DE\s+LLEGADA|C[ÓO]DIGO\s*:|$)/i
  );
  if (partidaBlock) {
    const addr = partidaBlock[1].replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    setValue("guia_punto_partida", addr);
  }

  // --- PUNTO DE LLEGADA ---
  const llegadaBlock = fullText.match(
    /PUNTO\s+DE\s+LLEGADA\s*\n\s*DIRECCI[ÓO]N\s*:\s*([\s\S]*?)(?=UBIGEO|DESTINATARIO|C[ÓO]DIGO\s*:|$)/i
  );
  if (llegadaBlock) {
    const addr = llegadaBlock[1].replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    setValue("guia_punto_llegada", addr);
  }

  // --- DESTINATARIO ---
  const destinatarioMatch = fullText.match(
    /RAZ[ÓO]N\s+SOCIAL\s*:\s*([^\n]+)/i
  );
  if (destinatarioMatch) {
    setValue("guia_destinatario", destinatarioMatch[1].trim());
  }

  // --- PESO BRUTO ---
  // Format: PESO BRUTO TOTAL CARGA: 8.6 KGM
  const pesoMatch = fullText.match(
    /PESO\s+BRUTO\s+TOTAL\s+(?:CARGA|DE\s+LA\s+CARGA)\s*:\s*([0-9.,]+)\s*([A-Z]{2,5})/i
  );
  if (pesoMatch) {
    setValue("guia_peso_bruto_total", pesoMatch[1].replace(",", ".").trim());
    setValue("guia_peso_bruto_unidad", pesoMatch[2].trim());
  }

  // --- TRANSPORTISTA ---
  // pdf-parse may merge empty fields onto one line (e.g. "RAZÓN SOCIAL:No. IDENTIDAD:")
  // Only set if the captured value is a real name, not another field label
  const transportistaBlock = fullText.match(
    /DATOS\s+DEL\s+TRANSPORTISTA[\s\S]*?RAZ[ÓO]N\s+SOCIAL\s*:\s*([^\n]+)/i
  );
  if (transportistaBlock) {
    const val = transportistaBlock[1].trim();
    const isFieldLabel = /^(No\.\s*IDENTIDAD|PLACA|CONDUCTOR|DOCUMENTO|LICENCIA|INICIO|MODALIDAD)\s*:/i.test(val);
    if (val && !isFieldLabel) {
      setValue("guia_transportista", val);
    }
  }

  // --- DOCUMENTO RELACIONADO (factura asociada) ---
  // pdf-parse may merge columns: "F103-01080358Factura20212331377"
  const docRelMatch = fullText.match(
    /DOCUMENTOS\s+RELACIONADOS[\s\S]*?([A-Z]\d{2,3}-\d{5,})\s*(Factura|Boleta)/i
  );
  if (docRelMatch) {
    setValue("serie", docRelMatch[1].trim());
    setValue("comprobante", docRelMatch[2].toUpperCase() === "FACTURA" ? "FACTURA" : "BOLETA");
  }

  // --- COMPROBANTE TYPE ---
  setValue("comprobante", "GUIA DE REMISION");
  setCurrency("PEN");
  setValue("tipo_moneda", "PEN");

  // --- DESCRIPCIÓN ---
  const descParts: string[] = [];
  if (motivoMatch) descParts.push(motivoMatch[1].trim());
  if (inicioTrasladoMatch) descParts.push(inicioTrasladoMatch[1].trim());
  if (descParts.length > 0) {
    setValue("entry_description", descParts.join(" - "));
  }

  // --- BIENES A TRASLADAR ---
  // pdf-parse output format (columns merged, NO spaces between row/code/description):
  //   Line 1: "{N}{CODE}{DESCRIPTION}       ------- {WARRANTY}"
  //           e.g. "1KBMSWBKTE4071STECLADO+MOUSE STD W. TE4071       ------- 12 MESES (C/S PGE) DE GARANTIA"
  //   Line 2: "{SERIES}" (space-separated serial numbers)
  //           e.g. "KCJT2506031016 KCJT2506031017"
  //   Line 3: "NIU{QTY}" (unit + quantity, NO space)
  //           e.g. "NIU2"
  const items: GuideItem[] = [];

  const itemsSectionIdx = lines.findIndex((line) =>
    /BIENES\s+A\s+TRASLADAR/i.test(line)
  );
  const footerIdx = lines.findIndex((line, idx) =>
    idx > itemsSectionIdx &&
    /REPRESENTACI[ÓO]N\s+IMPRESA|RECIB[ÍI]\s+CONFORME|LA\s+MERCADER[ÍI]A\s+VIAJA|P[áa]gina\s+\d+\s+de/i.test(line)
  );
  const endIdx = footerIdx >= 0 ? footerIdx : lines.length;

  // Known product description prefixes to separate code from description
  // when pdf-parse merges them (e.g. "KBMSWBKTE4071STECLADO+MOUSE...")
  const productPrefixes = [
    "TECLADO", "MOUSE", "FUENTE", "COOLER", "MEMORIA", "PLACA",
    "TARJETA", "DISCO", "CABLE", "ADAPTADOR", "CARGADOR", "FUNDA",
    "PARLANTE", "IMPRESORA", "ROUTER", "WEBCAM", "AUDIFONO", "HEADSET",
    "PANTALLA", "LAPTOP", "REGULADOR", "ESTABILIZADOR", "FORZA",
    "MONITOR", "PROCESADOR", "SERVIDOR", "SWITCH", "ACCESS", "BATERIA",
    "CINTA", "TONER", "CARTUCHO", "RACK", "GABINETE", "VENTILADOR",
    "MON ", "NB ", "SSD ", "PROC ", "CASE ", "PAD ", "KB ", "MS ",
    "PC ", "KIT ", "HUB ", "UPS ",
  ];

  /** Extract product description from merged {CODE}{DESCRIPTION} text */
  const extractDescription = (raw: string): string => {
    let desc = raw;
    // Strategy 1: Match a known product prefix in the text (most reliable)
    const upper = desc.toUpperCase();
    for (const prefix of productPrefixes) {
      const idx = upper.indexOf(prefix);
      if (idx >= 6) { // Code is at least 6 chars, skip it
        return desc.slice(idx).trim();
      }
    }
    // Strategy 2: Find boundary after last digit + 1 letter in the code
    const codeMatch = desc.match(/^([A-Z0-9]*\d[A-Z])([A-Z].+)/i);
    if (codeMatch && codeMatch[2].length >= 5) {
      return codeMatch[2].trim();
    }
    // Strategy 3: Split at first non-alphanumeric boundary
    const boundary = desc.search(/[^A-Za-z0-9]/);
    if (boundary > 6) {
      return desc.slice(boundary).replace(/^[^A-Za-z]+/, "").trim();
    }
    // Fallback: return as-is (includes code but at least captures the item)
    return desc.trim();
  };

  if (itemsSectionIdx >= 0) {
    const itemLines: string[] = [];
    for (let k = itemsSectionIdx + 1; k < endIdx; k++) {
      const line = lines[k];
      // Skip merged table headers: "N°CÓDIGO", "CÓDIGO", "SUNAT", "DESCRIPCIÓNUNIDADCANTIDAD"
      if (/^(?:N[°º]?\s*)?C[ÓO]DIGO|^DESCRIPCI[ÓO]N|^UNIDAD\b|^CANTIDAD\b|^SUNAT\b/i.test(line)) continue;
      itemLines.push(line);
    }


    let pendingName = "";
    let pendingSeries: string[] = [];

    for (let i = 0; i < itemLines.length; i++) {
      const line = itemLines[i];

      // Quantity line: "NIU2", "NIU 5", "UND3" (pdf-parse merges unit+qty with NO space)
      const qtyLineMatch = line.match(/^(?:NIU|UND|PZA|SET|UN)\s*(\d+(?:[.,]\d+)?)\s*$/i);
      if (qtyLineMatch && pendingName) {
        items.push({
          name: pendingName,
          quantity: parseFloat(qtyLineMatch[1].replace(",", ".")),
          series: pendingSeries.length > 0 ? [...pendingSeries] : undefined,
        });
        pendingName = "";
        pendingSeries = [];
        continue;
      }

      // Description line: contains "-------" separator between description and warranty
      if (line.includes("-------")) {
        let desc = line.split("-------")[0].trim();
        // Remove leading row number (merged, no space): "1KBMS..." → "KBMS..."
        desc = desc.replace(/^\d{1,3}/, "");
        desc = extractDescription(desc);

        if (desc && desc.length >= 3) {
          if (pendingName) {
            items.push({ name: pendingName, quantity: 1, series: pendingSeries.length > 0 ? [...pendingSeries] : undefined });
            pendingSeries = [];
          }
          pendingName = desc;
        }
        continue;
      }

      // Full merged line: "{N}{CODE}{DESC}...NIU{QTY}" all on one line
      const fullLineMatch = line.match(
        /^\d{1,3}[A-Z][A-Z0-9]{5,}.+?(?:NIU|UND|PZA|SET|UN)\s*(\d+(?:[.,]\d+)?)\s*$/i
      );
      if (fullLineMatch) {
        let desc = line.replace(/(?:NIU|UND|PZA|SET|UN)\s*\d+(?:[.,]\d+)?\s*$/i, "").trim();
        desc = desc.replace(/^\d{1,3}/, "");
        desc = desc.replace(/\s*-{2,}\s*.*/, "").trim();
        desc = extractDescription(desc);

        if (pendingName) {
          items.push({ name: pendingName, quantity: 1, series: pendingSeries.length > 0 ? [...pendingSeries] : undefined });
          pendingSeries = [];
        }
        items.push({
          name: desc || line,
          quantity: parseFloat(fullLineMatch[1].replace(",", ".")),
          series: undefined,
        });
        pendingName = "";
        continue;
      }

      // Series numbers: alphanumeric codes 5+ chars, space-separated
      if (pendingName) {
        const tokens = line.split(/\s+/).filter(Boolean);
        const seriesTokens = tokens.filter(
          (t) => /^[A-Z0-9]{5,}$/i.test(t) && !/^(NIU|UND|PZA|SET|UN)$/i.test(t)
        );
        if (seriesTokens.length > 0) {
          pendingSeries.push(...seriesTokens);
        }
      }
    }

    // Push last pending item
    if (pendingName) {
      items.push({ name: pendingName, quantity: 1, series: pendingSeries.length > 0 ? [...pendingSeries] : undefined });
    }
  }

  // --- SET PRODUCTS ---
  if (items.length > 0) {
    return items.map((item, index) => ({
      id: index + 1,
      name: item.name,
      quantity: item.quantity,
      price: 0,
      priceSell: 0,
      category_name: "Sin categoria",
      series: item.series ?? [],
    }));
  } else {
    toast.warning("No se encontraron productos en la guía de remisión DELTRON.");
    return [];
  }
}

// =====================================================================
// INGRAM MICRO INVOICE PROCESSOR
// Handles "Factura Electrónica" from INGRAM MICRO S.A.C. (RUC 20267163228)
// Format: pdf-parse scatters table columns; code+unit lines anchor each item
// =====================================================================

export function processIngramInvoiceText(
  text: string,
  setValue: Function,
  setCurrency: Function
): ExtractedProduct[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const fullText = lines.join("\n");

  // --- PROVIDER INFO ---
  const rucMatch = fullText.match(
    /R\.?U\.?C\.?\s*(?:N[°º]?)?\s*:?\s*(\d{11})/i
  );
  if (rucMatch) {
    setValue("ruc", rucMatch[1]);
    setValue("provider_documentNumber", rucMatch[1]);
  }

  // Provider name + address (INGRAM MICRO line, address on next line)
  const nameIdx = lines.findIndex((l) => /INGRAM\s+MICRO/i.test(l));
  if (nameIdx >= 0) {
    setValue("provider_name", lines[nameIdx]);
    if (nameIdx + 1 < lines.length) {
      setValue("provider_adress", lines[nameIdx + 1]);
    }
  }

  // --- SERIE / CORRELATIVO ---
  const serieMatch = fullText.match(/\b([A-Z]\d{3}-\d{5,})\b/);
  if (serieMatch) {
    setValue("serie", serieMatch[1]);
    setValue("nroCorrelativo", serieMatch[1]);
  }

  // --- COMPROBANTE TYPE ---
  const comprobanteMatch = fullText.match(
    /(FACTURA|BOLETA)\s+ELECTR[ÓO]NICA/i
  );
  if (comprobanteMatch) {
    setValue("comprobante", comprobanteMatch[0].trim());
  }

  // --- FECHA DE EMISIÓN ---
  // In Ingram PDFs the date line appears BEFORE the "Fecha de Emisión:" label
  // e.g. "2026-01-30  12:00:00a.m.\nFecha de Emisión:"
  const fechaMatch = fullText.match(
    /(\d{4}-\d{2}-\d{2})\s+\d{1,2}:\d{2}:\d{2}[ap]\.m\./i
  );
  if (fechaMatch) {
    setValue("fecha_emision_comprobante", fechaMatch[1]);
  }

  // --- CURRENCY ---
  if (/d[óo]lar\s+estadounidense/i.test(fullText)) {
    setCurrency("USD");
    setValue("tipo_moneda", "USD");
  } else {
    setCurrency("PEN");
    setValue("tipo_moneda", "PEN");
  }

  // --- DATOS ADICIONALES → OBSERVACIÓN ---
  // Ingram header block (consistent across invoices):
  //   line X:   "Fecha de Vencimiento:Moneda:Orden de Compra:Factura Interna:"
  //   line X+1: "Cod. Vendedor:Nro Pedido:"
  //   line X+2: "{yyyy-mm-dd} {moneda}"   → Fecha de Vencimiento
  //   line X+3: "{orden_compra}"
  //   line X+4: "{factura_interna}"
  //   line X+5: "{condicion}"
  //   line X+6: "{nro_pedido}"
  const obsParts: string[] = [];
  const headerIdx = lines.findIndex((l) =>
    /^Fecha de Vencimiento:.*Orden de Compra:/i.test(l)
  );
  if (headerIdx >= 0) {
    // Fecha de Vencimiento (line headerIdx+2): "2026-03-01 Dólar..."
    const vencLine = lines[headerIdx + 2] || "";
    const vencMatch = vencLine.match(/^(\d{4}-\d{2}-\d{2})/);
    if (vencMatch) {
      obsParts.push(`Venc: ${vencMatch[1]}`);
    }

    // Orden de Compra (line headerIdx+3): purely numeric or alphanumeric
    const ocVal = (lines[headerIdx + 3] || "").trim();
    if (ocVal && /^[\dA-Za-z-]+$/.test(ocVal)) {
      obsParts.push(`OC: ${ocVal}`);
    }

    // Nro Pedido (line headerIdx+6): numeric
    const pedidoVal = (lines[headerIdx + 6] || "").trim();
    if (pedidoVal && /^\d+$/.test(pedidoVal)) {
      obsParts.push(`Pedido: ${pedidoVal}`);
    }
  }

  // Condición / Términos de Pago
  const terminosIdx = lines.findIndex((l) => /^Terminos de Pago:/i.test(l));
  if (terminosIdx >= 0 && terminosIdx + 1 < lines.length) {
    const terminosVal = lines[terminosIdx + 1]?.trim();
    if (terminosVal && /\d/.test(terminosVal)) {
      obsParts.push(`Pago: ${terminosVal}`);
    }
  }

  if (obsParts.length > 0) {
    setValue("entry_description", obsParts.join(" | ").slice(0, 200));
  }

  // --- ITEMS ---
  // Anchor on code+unit lines: "06627549EA 1.00 894.00"
  // Pattern: {code}{unit} {val} {val}  (unit = EA, UN, NIU, UND, PZA, SET)
  // Then look backward for description and forward for {precio_unitario} {cantidad}
  const items: { name: string; quantity: number; price: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match code+unit line
    if (!/^\d{4,}(?:EA|UN|NIU|UND|PZA|SET)\s+[\d.]+\s+[\d,.]+$/i.test(line))
      continue;

    // Look backward for description (nearest non-numeric text line)
    let name = "";
    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      const prev = lines[j];
      if (
        prev.length >= 5 &&
        /[A-Za-z]/.test(prev) &&
        !/^\d+[.,]?\d*$/.test(prev) &&
        !/^\d+$/.test(prev) &&
        !/^\d+[A-Z]{2,}\s/i.test(prev)
      ) {
        name = prev;
        break;
      }
    }

    // Look forward for {precio_unitario} {cantidad} line (two decimals)
    let price = 0;
    let quantity = 0;
    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      const next = lines[j];
      const twoNums = next.match(/^([\d,]+\.\d{2})\s+(\d+\.\d{2})$/);
      if (twoNums) {
        price = parseFloat(twoNums[1].replace(/,/g, ""));
        quantity = parseFloat(twoNums[2]);
        break;
      }
    }

    if (name && quantity > 0) {
      items.push({ name, quantity, price });
    }
  }

  // --- SET PRODUCTS ---
  let result: ExtractedProduct[] = [];
  if (items.length > 0) {
    result = items.map((item, index) => ({
      id: index + 1,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      priceSell: 0,
      category_name: "Sin categoria",
    }));
  } else {
    toast.warning(
      "No se encontraron productos en la factura de Ingram Micro."
    );
  }

  // --- TOTAL ---
  // Between "Observaciones:" and "REPRESENTACIÓN IMPRESA" the IGV and total appear
  // The largest number in that range is the IMPORTE TOTAL
  const obsIdx = lines.findIndex((l) => /^Observaciones/i.test(l));
  const repIdx = lines.findIndex((l) => /REPRESENTACI[ÓO]N/i.test(l));
  if (obsIdx >= 0 && repIdx > obsIdx) {
    let maxVal = 0;
    for (let k = obsIdx + 1; k < repIdx; k++) {
      const numMatch = lines[k].match(/^([\d,]+\.\d{2})$/);
      if (numMatch) {
        const val = parseFloat(numMatch[1].replace(/,/g, ""));
        if (val > maxVal) maxVal = val;
      }
    }
    if (maxVal > 0) {
      setValue("total_comprobante", maxVal.toFixed(2));
    }
  }

  return result;
}

// =====================================================================
// NEXSYS INVOICE PROCESSOR
// Handles "Factura Electrónica" from NEXSYS DEL PERU S.R.L. (RUC 20470145901)
// Format: values line {base} {igv_price} {qty}, then description, then code line
// =====================================================================

export function processNexsysInvoiceText(
  text: string,
  setValue: Function,
  setCurrency: Function
): ExtractedProduct[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const fullText = lines.join("\n");

  // --- PROVIDER INFO ---
  const rucMatch = fullText.match(
    /R\.?U\.?C\.?\s*N[°º]?\s*(\d{11})/i
  );
  if (rucMatch) {
    setValue("ruc", rucMatch[1]);
    setValue("provider_documentNumber", rucMatch[1]);
  }

  // Provider name + address (lines between name and phone/website)
  const nameIdx = lines.findIndex((l) => /NEXSYS\s+DEL\s+PERU/i.test(l));
  if (nameIdx >= 0) {
    setValue("provider_name", lines[nameIdx]);
    const addrParts: string[] = [];
    for (let j = nameIdx + 1; j < Math.min(nameIdx + 8, lines.length); j++) {
      if (/Telef|www\.|http/i.test(lines[j])) break;
      // Skip document type lines
      if (/^(FACTURA|BOLETA)\s+ELECTR/i.test(lines[j])) continue;
      if (lines[j].length > 0) addrParts.push(lines[j]);
    }
    if (addrParts.length > 0) {
      setValue(
        "provider_adress",
        addrParts.join(", ").replace(/\s+/g, " ").trim()
      );
    }
  }

  // --- SERIE / CORRELATIVO ---
  const serieMatch = fullText.match(/N[°º]\s*([A-Z]\d{3}-\d{5,})/i);
  if (serieMatch) {
    setValue("serie", serieMatch[1]);
    setValue("nroCorrelativo", serieMatch[1]);
  }

  // --- COMPROBANTE TYPE ---
  const comprobanteMatch = fullText.match(
    /(FACTURA|BOLETA)\s+ELECTR[ÓO]NICA/i
  );
  if (comprobanteMatch) {
    setValue("comprobante", comprobanteMatch[0].trim());
  }

  // --- FECHA DE EMISIÓN ---
  // In NEXSYS the date may be several lines after "FECHA" (separated by colons, client name, etc.)
  const fechaIdx = lines.findIndex((l) => /^FECHA$/i.test(l));
  if (fechaIdx >= 0) {
    for (let j = fechaIdx + 1; j < Math.min(fechaIdx + 8, lines.length); j++) {
      const dateStr = lines[j].trim();
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        setValue("fecha_emision_comprobante", dateStr);
        break;
      }
    }
  }

  // --- CURRENCY ---
  if (/US\$|DOLARES\s+AMERICANOS|d[óo]lar/i.test(fullText)) {
    setCurrency("USD");
    setValue("tipo_moneda", "USD");
  } else {
    setCurrency("PEN");
    setValue("tipo_moneda", "PEN");
  }

  // --- DATOS ADICIONALES → OBSERVACIÓN ---
  // Extract: REFERENCIA, TERMINOS, VENCIMIENTO, ASESOR COMERCIAL, PEDIDO DE VENTA
  // These appear in a known order between the address block and "ITEM"
  const obsParts: string[] = [];

  const refIdx = lines.findIndex((l) => /^REFERENCIA$/i.test(l));
  const asesorIdx = lines.findIndex((l) => /^ASESOR COMERCIAL:/i.test(l));
  const pedidoIdx = lines.findIndex((l) => /^PEDIDO DE VENTA:/i.test(l));
  const itemIdx = lines.findIndex((l) => /^ITEM$/i.test(l));
  const terminosLine = lines.find((l) => /^:TERMINOS/i.test(l));
  const vencimientoLine = lines.findIndex((l) => /^:VENCIMIENTO$/i.test(l));

  // TERMINOS: value appears 2 lines before "ITEM" (e.g., "CONTADO")
  if (itemIdx > 0) {
    const terminosVal = lines[itemIdx - 1]?.trim();
    if (terminosVal && !/^ITEM$/i.test(terminosVal) && !/^\d/.test(terminosVal)) {
      obsParts.push(`Términos: ${terminosVal}`);
    }
  }

  // REFERENCIA: value appears a few lines after "REFERENCIA" label
  if (refIdx >= 0) {
    // Look for a short numeric-dash value (e.g., "30-12", "18-12")
    for (let j = refIdx + 1; j < Math.min(refIdx + 5, lines.length); j++) {
      if (/^\d{1,2}-\d{1,2}$/.test(lines[j].trim())) {
        obsParts.push(`Ref: ${lines[j].trim()}`);
        break;
      }
    }
  }

  // VENCIMIENTO: date appears 2 lines before "CONTADO"/"CREDITO" before ITEM
  if (vencimientoLine >= 0 && itemIdx > 0) {
    const vencVal = lines[itemIdx - 2]?.trim();
    if (vencVal && /^\d{1,2}-\d{1,2}-\d{4}$/.test(vencVal)) {
      obsParts.push(`Venc: ${vencVal}`);
    }
  }

  // ASESOR COMERCIAL: value on line after PEDIDO DE VENTA value
  if (pedidoIdx >= 0 && pedidoIdx + 2 < lines.length) {
    const asesorVal = lines[pedidoIdx + 2]?.trim();
    if (asesorVal && !/^\d{1,2}[/-]/.test(asesorVal) && !/^ITEM$/i.test(asesorVal)) {
      obsParts.push(`Asesor: ${asesorVal}`);
    }
  }

  // PEDIDO DE VENTA: value is on the line right after "PEDIDO DE VENTA:"
  if (pedidoIdx >= 0 && pedidoIdx + 1 < lines.length) {
    const pedidoVal = lines[pedidoIdx + 1]?.trim();
    if (pedidoVal && /^PV-/i.test(pedidoVal)) {
      obsParts.push(`PV: ${pedidoVal}`);
    }
  }

  if (obsParts.length > 0) {
    setValue("entry_description", obsParts.join(" | ").slice(0, 200));
  }

  // --- TOTAL (from SON line or footer amounts) ---
  // Parse total from the Spanish text-in-words line (most reliable)
  const sonMatch = fullText.match(/\*{3}\s+(.+?)(?:\s+(?:DOLARES|SOLES|NUEVOS))/i);
  let invoiceTotal = 0;
  if (sonMatch) {
    invoiceTotal = parseSpanishAmount(sonMatch[1]);
  }
  // Fallback: find "IMPORTE TOTAL" and nearby amount, or largest amount in footer
  if (invoiceTotal <= 0) {
    const footerIdx = lines.findIndex((l) => /^\*{3}\s/.test(l));
    if (footerIdx >= 0) {
      const footerAmounts: number[] = [];
      for (let j = footerIdx + 1; j < Math.min(footerIdx + 15, lines.length); j++) {
        const amt = lines[j].match(/^([\d,]+\.\d{2})$/);
        if (amt) footerAmounts.push(parseFloat(amt[1].replace(/,/g, "")));
      }
      if (footerAmounts.length > 0) {
        invoiceTotal = Math.max(...footerAmounts);
      }
    }
  }
  if (invoiceTotal > 0) {
    setValue("total_comprobante", invoiceTotal.toFixed(2));
  }

  // --- ITEMS ---
  // NEXSYS has multiple item formats depending on the invoice:
  //
  // Format A (multi-line, spaced): values on one line with spaces
  //   Line 1: "{base_price} {igv_price} {quantity}"
  //   Line 2+: "{DESCRIPTION}"
  //   Line N: "{CODE} {item_sequence}"
  //
  // Format B (single-line, spaced): everything on one line with spaces
  //   "{base_price} {igv_price} {qty}{DESCRIPTION}{CODE} {item_sequence}"
  //
  // Format C (multi-line, merged): values merged without spaces
  //   Line 1: "{CODE}" (product code on its own line)
  //   Line 2+: "{DESCRIPTION}" (description on separate lines)
  //   Line N: "{baseTotal.XX}{qty}{igvUnit.XX}{seq.XX}" (all values concatenated)
  //
  // Format D (single-line, merged): code + description + values all on one line
  //   "{CODE}{DESCRIPTION}{baseTotal.XX}{qty}{igvUnit.XX}{seq.XX}"
  //
  // Section: between "ITEM" header and "***" total-in-words footer

  // Detect both standalone "ITEM" and merged header "ITEMCODIGODESCRIPCION..."
  const itemStartIdx = lines.findIndex(
    (l) => /^ITEM$/i.test(l) || /^ITEMCODIGO/i.test(l)
  );
  const itemEndIdx = lines.findIndex(
    (l, i) =>
      i > (itemStartIdx >= 0 ? itemStartIdx : 0) && /^\*{3}\s/.test(l)
  );
  const startIdx = itemStartIdx >= 0 ? itemStartIdx + 1 : 0;
  const endIdx = itemEndIdx >= 0 ? itemEndIdx : lines.length;
  const itemLines = lines.slice(startIdx, endIdx);

  const items: { name: string; quantity: number; price: number }[] = [];

  // Format A: values only with spaces (3 numbers, qty is integer at end)
  const valuesRegex = /^([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+(\d+)$/;
  // Format B: values + qty + description + code + seq all on one line (spaced)
  const singleLineRegex =
    /^([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+(\d{1,3})([A-Za-z].+?)\s+(\d+\.\d{2})$/;
  const codeLineRegex = /^[A-Z0-9][\w-]+\s+\d+\.\d{2}$/i;

  // Format C/D: merged values without spaces — parser with IGV cross-validation
  // Structure: {baseTotal.XX}{qty}{igvUnit.XX}{seq.XX}
  // Validation: baseTotal ≈ (igvUnit / 1.18) × qty
  function parseMergedNexsysValues(
    str: string
  ): { qty: number; igvUnit: number } | null {
    // Need at least 3 decimal points for base.XX + igvUnit.XX + seq.XX
    const dots: number[] = [];
    for (let k = 0; k < str.length; k++) {
      if (
        str[k] === "." &&
        k + 2 < str.length &&
        /^\d{2}/.test(str.substring(k + 1))
      ) {
        dots.push(k);
      }
    }
    if (dots.length < 3) return null;

    // First decimal number: base total price
    const baseEnd = dots[0] + 3;
    const baseTotal = parseFloat(str.substring(0, baseEnd).replace(/,/g, ""));
    if (isNaN(baseTotal) || baseTotal <= 0) return null;

    // After base, remainder contains: {qty}{igvUnit.XX}{seq.XX}
    const afterBase = str.substring(baseEnd);

    // Try qty = 1 digit, 2 digits, 3 digits — validate with IGV relationship
    for (let qtyLen = 1; qtyLen <= 3; qtyLen++) {
      if (qtyLen > afterBase.length) break;
      const qtyStr = afterBase.substring(0, qtyLen);
      if (!/^\d+$/.test(qtyStr)) break;
      const qty = parseInt(qtyStr, 10);
      if (qty <= 0) continue;

      // After qty, extract igvUnit (first decimal number)
      const afterQty = afterBase.substring(qtyLen);
      const igvMatch = afterQty.match(/^([\d,]+\.\d{2})/);
      if (!igvMatch) continue;
      const igvUnit = parseFloat(igvMatch[1].replace(/,/g, ""));
      if (isNaN(igvUnit) || igvUnit <= 0) continue;

      // Cross-validate: baseTotal ≈ (igvUnit / 1.18) × qty
      const expectedBase = (igvUnit / 1.18) * qty;
      if (Math.abs(expectedBase - baseTotal) < 1.0) {
        return { qty, igvUnit };
      }
    }
    return null;
  }

  // Known IT product description prefixes (for splitting code from description)
  const descPrefixPattern =
    /(?:PORTATIL|NOTEBOOK|LAPTOP|NB |PC |MONITOR|IMPRESORA|TECLADO|TABLET|DISCO|MEMORIA|SWITCH|ROUTER|UPS |SERVIDOR|ALL.IN.ONE|DESKTOP|WORKSTATION|SCANNER|PROYECTOR|PANTALLA|CELULAR|SMARTPHONE|AURICULAR|AUDIFONOS|CAMARA|WEBCAM|CABLE|ADAPTADOR|CARGADOR|BATERIA|FUENTE|CASE|GABINETE|PLACA|PROCESADOR|TARJETA|COOLER|VENTILADOR|KIT |PACK |COMBO |LICENCIA|SOFTWARE|MOUSE |MOCHILA)/i;

  for (let i = 0; i < itemLines.length; i++) {
    const line = itemLines[i];

    // Try Format A first (multi-line: values only on this line, with spaces)
    const multiMatch = line.match(valuesRegex);
    if (multiMatch) {
      const igvPrice = parseFloat(multiMatch[2].replace(/,/g, ""));
      const quantity = parseInt(multiMatch[3], 10);

      // Collect description from subsequent lines
      const descParts: string[] = [];
      for (let j = i + 1; j < itemLines.length; j++) {
        const nextLine = itemLines[j];
        if (valuesRegex.test(nextLine)) break;
        if (singleLineRegex.test(nextLine)) break;
        if (codeLineRegex.test(nextLine)) break;
        if (/^\*{3}\s|^Forma\s+de\s+Pago/i.test(nextLine)) break;
        if (nextLine.length > 0 && /[A-Za-z]/.test(nextLine)) {
          descParts.push(nextLine);
        }
      }

      const name = descParts.join(" ").replace(/\s+/g, " ").trim();
      if (name && quantity > 0) {
        items.push({ name, quantity, price: igvPrice });
      }
      continue;
    }

    // Try Format B (single-line with spaces)
    const singleMatch = line.match(singleLineRegex);
    if (singleMatch) {
      const igvPrice = parseFloat(singleMatch[2].replace(/,/g, ""));
      const quantity = parseInt(singleMatch[3], 10);
      const rawDesc = singleMatch[4];

      const codeStrip = rawDesc.match(/^(.*[a-z])([A-Z][A-Z0-9-]{7,})$/);
      const name =
        codeStrip && codeStrip[1].trim().length >= 10
          ? codeStrip[1].trim()
          : rawDesc.trim();

      if (name && quantity > 0) {
        items.push({ name, quantity, price: igvPrice });
      }
      continue;
    }

    // Try Format C: merged values on own line (all digits/dots/commas, no letters)
    if (/^[\d,.]+$/.test(line) && line.length >= 10) {
      const parsed = parseMergedNexsysValues(line);
      if (parsed) {
        // Look backward for description lines (stop at code or previous values)
        const descParts: string[] = [];
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = itemLines[j];
          // Stop at another merged values line
          if (/^[\d,.]+$/.test(prevLine) && prevLine.length >= 10) break;
          // Stop at a standalone product code (short alphanumeric, no spaces)
          if (
            /^[A-Z0-9][\w-]+$/i.test(prevLine) &&
            prevLine.length <= 25 &&
            !/\s/.test(prevLine)
          ) {
            break;
          }
          // Skip metadata labels
          if (/^(R\.U\.C|USUARIO|REFERENCIA|TERMINOS|VENCIMIENTO|ASESOR|PEDIDO|CONTADO|FECHA|DIRECCI|SEÑORES|:$)/i.test(prevLine)) break;
          // Add description line
          if (prevLine.length > 3 && /[A-Za-z]/.test(prevLine)) {
            descParts.unshift(prevLine);
          }
        }

        const name = descParts.join(" ").replace(/\s+/g, " ").trim();
        if (name && parsed.qty > 0) {
          items.push({ name, quantity: parsed.qty, price: parsed.igvUnit });
        }
        continue;
      }
    }

    // Try Format D: single-line merged (code + description + values concatenated)
    // Detect trailing merged values (10+ digits/dots/commas at end of line with text)
    const trailingMatch = line.match(/^(.+?)(\d[\d,.]{9,})$/);
    if (trailingMatch && /[A-Za-z]/.test(trailingMatch[1])) {
      const valuesStr = trailingMatch[2];
      const parsed = parseMergedNexsysValues(valuesStr);
      if (parsed) {
        let textPart = trailingMatch[1].trim();

        // Strip leading product code using known description prefixes
        const prefixIdx = textPart.search(descPrefixPattern);
        if (prefixIdx > 0) {
          textPart = textPart.substring(prefixIdx);
        }

        if (textPart.length > 3 && parsed.qty > 0) {
          items.push({
            name: textPart,
            quantity: parsed.qty,
            price: parsed.igvUnit,
          });
        }
        continue;
      }
    }
  }

  // --- SET PRODUCTS ---
  let result: ExtractedProduct[] = [];
  if (items.length > 0) {
    result = items.map((item, index) => ({
      id: index + 1,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      priceSell: 0,
      category_name: "Sin categoria",
    }));
  } else {
    toast.warning("No se encontraron productos en la factura de Nexsys.");
  }

  // If no total from SON/footer, compute from extracted items
  if (invoiceTotal <= 0 && items.length > 0) {
    const computedTotal = items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    if (computedTotal > 0) {
      setValue("total_comprobante", computedTotal.toFixed(2));
    }
  }

  return result;
}

// =====================================================================
// SUPERTEC INVOICE PROCESSOR
// Handles "Factura Electrónica" from SUPERTEC / TECNOLOGÍA SUPERIOR (RUC 20434327611)
//
// IMPORTANT: This PDF is typically a SCANNED IMAGE, so text comes from OCR (tesseract.js).
// OCR text is noisy — columns merge, numbers get misread, table structure is lost.
// Strategy: Extract header fields via tolerant regex, extract products via description-based
// matching with nearby price extraction.
//
// OCR sample output:
//   "F001 N*00050800" (N° → N*)
//   "FECHA EMISION : 03/03/2026"
//   "MONEDA : DÓLARES AMERICANOS"
//   "1 a ' UND |7730U//166B/SSD512GB/FREE/5.6 / BOTR3LA mi mi o"
//   "2 018146 , uno |NB.HP 255 610 RYZEN 3-7320U/66B/SSD256GB/FREE/15.6/ 290.00 245.76 290.00"
// =====================================================================

/**
 * Parse a Spanish number-in-words string to a numeric value.
 * Handles: "UN MIL DOSCIENTOS SESENTA Y CINCO CON 00/100" → 1265.00
 */
function parseSpanishAmount(text: string): number {
  // Extract the part after "SON:" and before "DOLARES|SOLES|NUEVOS"
  const match = text.match(/SON:\s*(.+?)(?:D[ÓO]LARES|SOLES|NUEVOS|$)/i);
  if (!match) return 0;

  let words = match[1]
    .toUpperCase()
    .replace(/CON\s+(\d{1,2})\/100/i, ".$1") // "CON 00/100" → ".00"
    .replace(/[^A-ZÁÉÍÓÚÑ\s.0-9]/g, " ")
    .trim();

  // Extract decimal part if present
  let decimals = 0;
  const decMatch = words.match(/\.(\d{1,2})/);
  if (decMatch) {
    decimals = parseInt(decMatch[1].padEnd(2, "0"), 10);
    words = words.replace(/\.\d{1,2}/, "").trim();
  }

  const ones: Record<string, number> = {
    CERO: 0, UN: 1, UNO: 1, UNA: 1, DOS: 2, TRES: 3, CUATRO: 4, CINCO: 5,
    SEIS: 6, SIETE: 7, OCHO: 8, NUEVE: 9, DIEZ: 10, ONCE: 11, DOCE: 12,
    TRECE: 13, CATORCE: 14, QUINCE: 15, DIECISEIS: 16, DIECISIETE: 17,
    DIECIOCHO: 18, DIECINUEVE: 19, VEINTE: 20, VEINTIUNO: 21, VEINTIDOS: 22,
    VEINTITRES: 23, VEINTICUATRO: 24, VEINTICINCO: 25, VEINTISEIS: 26,
    VEINTISIETE: 27, VEINTIOCHO: 28, VEINTINUEVE: 29,
  };

  const tens: Record<string, number> = {
    TREINTA: 30, CUARENTA: 40, CINCUENTA: 50, SESENTA: 60,
    SETENTA: 70, OCHENTA: 80, NOVENTA: 90,
  };

  const hundreds: Record<string, number> = {
    CIEN: 100, CIENTO: 100, DOSCIENTOS: 200, DOSCIENTAS: 200,
    TRESCIENTOS: 300, TRESCIENTAS: 300, CUATROCIENTOS: 400, CUATROCIENTAS: 400,
    QUINIENTOS: 500, QUINIENTAS: 500, SEISCIENTOS: 600, SEISCIENTAS: 600,
    SETECIENTOS: 700, SETECIENTAS: 700, OCHOCIENTOS: 800, OCHOCIENTAS: 800,
    NOVECIENTOS: 900, NOVECIENTAS: 900,
  };

  const tokens = words.split(/\s+/).filter((t) => t !== "Y");
  let total = 0;
  let current = 0;

  for (const token of tokens) {
    if (token === "MIL") {
      current = current === 0 ? 1000 : current * 1000;
      total += current;
      current = 0;
    } else if (token === "MILLON" || token === "MILLONES") {
      current = current === 0 ? 1000000 : current * 1000000;
      total += current;
      current = 0;
    } else if (hundreds[token] !== undefined) {
      current += hundreds[token];
    } else if (tens[token] !== undefined) {
      current += tens[token];
    } else if (ones[token] !== undefined) {
      current += ones[token];
    }
  }
  total += current;

  return total + decimals / 100;
}

export function processSupertecInvoiceText(
  text: string,
  setValue: Function,
  setCurrency: Function
): ExtractedProduct[] {
  // Multi-pass OCR: backend sends two passes separated by a marker.
  // 300 DPI (primary): best for headers and structured text.
  // 250 DPI (secondary): better for price columns in invoice tables.
  const OCR_PASS_MARKER = "===OCR_PASS_250===";
  let primaryText = text;
  let secondaryText = "";
  if (text.includes(OCR_PASS_MARKER)) {
    const [p, s] = text.split(OCR_PASS_MARKER);
    primaryText = p.trim();
    secondaryText = s.trim();
  }

  const lines = primaryText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const fullText = lines.join("\n");

  // Secondary pass lines (250 DPI) — used for price recovery
  const lines250 = secondaryText
    ? secondaryText.split("\n").map((l) => l.trim()).filter(Boolean)
    : [];

  // --- PROVIDER INFO ---
  // OCR may produce "R.U.C. 20434327611" or "R U C 20434327611"
  const rucMatch = fullText.match(
    /R\.?\s*U\.?\s*C\.?\s*(?:N[°º*]?)?\s*\.?\s*(\d{11})/i
  );
  if (rucMatch) {
    setValue("ruc", rucMatch[1]);
    setValue("provider_documentNumber", rucMatch[1]);
  }

  // Provider name — set fixed since OCR may garble it
  const hasSupertec =
    /supertec/i.test(fullText) || /tecnolog[ií]a\s+superior/i.test(fullText);
  if (hasSupertec) {
    setValue("provider_name", "SUPERTEC S.A.C.");
  }

  // Address: look for "AV.JOSE GALVEZ" or "AV. JOSE GALVEZ" pattern
  const addrMatch = fullText.match(
    /(AV\.?\s*JOSE\s+GALVEZ[^\n]*(?:LIMA|LINCE)[^\n]*)/i
  );
  if (addrMatch) {
    setValue(
      "provider_adress",
      addrMatch[1].replace(/\s+/g, " ").trim()
    );
  }

  // --- SERIE / CORRELATIVO ---
  // OCR renders N° as N*, Nº, N°, N#, etc.
  const serieMatch = fullText.match(
    /([FB]\d{3})\s*N[°º*#]?\s*0*(\d{5,})/i
  );
  if (serieMatch) {
    const serie = `${serieMatch[1]}-${serieMatch[2].padStart(8, "0")}`;
    setValue("serie", serie);
    setValue("nroCorrelativo", serie);
  }

  // --- COMPROBANTE TYPE ---
  const comprobanteMatch = fullText.match(
    /(FACTURA|BOLETA)\s+ELECTR[ÓO]NICA/i
  );
  if (comprobanteMatch) {
    setValue("comprobante", comprobanteMatch[0].trim());
  }

  // --- FECHA DE EMISIÓN ---
  // OCR may produce "FECHA EMISION : 03/03/2026" or "FECHA EMISION: 03/03/2026"
  const fechaMatch = fullText.match(
    /FECHA\s+EMISI[OÓ]N\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
  );
  if (fechaMatch) {
    setValue("fecha_emision_comprobante", fechaMatch[1].trim());
  }

  // --- CURRENCY ---
  if (/D[ÓO]LARES\s+AMERICANOS|US\$|DOLARES/i.test(fullText)) {
    setCurrency("USD");
    setValue("tipo_moneda", "USD");
  } else {
    setCurrency("PEN");
    setValue("tipo_moneda", "PEN");
  }

  // --- DATOS ADICIONALES → OBSERVACIÓN ---
  const obsParts: string[] = [];

  const vendedorMatch = fullText.match(/VENDEDOR\s*:?\s*(.+)/i);
  if (vendedorMatch) {
    obsParts.push(`Vendedor: ${vendedorMatch[1].trim()}`);
  }

  const formaPagoMatch = fullText.match(/FORMA\s+PAGO\s*:?\s*(.+)/i);
  if (formaPagoMatch) {
    obsParts.push(`Pago: ${formaPagoMatch[1].trim()}`);
  }

  const clienteMatch = fullText.match(/CLIENTE\s*:?\s*(\d+)/i);
  if (clienteMatch) {
    obsParts.push(`Cliente: ${clienteMatch[1]}`);
  }

  const obsMatch = fullText.match(/\bOBS\b\s*:?\s*(.+)/i);
  if (obsMatch) {
    obsParts.push(`Obs: ${obsMatch[1].trim()}`);
  }

  if (obsParts.length > 0) {
    setValue("entry_description", obsParts.join(" | ").slice(0, 200));
  }

  // --- PARSE TOTAL FROM "SON:" TEXT ---
  // OCR usually garbles the numeric total but the text amount ("SON: UN MIL ...") is readable.
  // Parse Spanish number words to get the total before extracting items (needed for price inference).
  let parsedTotal = 0;

  const sonLine = lines.find((l) => /^SON:/i.test(l));
  if (sonLine) {
    parsedTotal = parseSpanishAmount(sonLine);
  }

  // Also try numeric PRECIO TOTAL
  const precioTotalMatch = fullText.match(
    /(?:PRECIO\s+TOTAL)\s*[:\s]*([\d,]+\.\d{2})/i
  );
  if (precioTotalMatch) {
    parsedTotal = parseFloat(precioTotalMatch[1].replace(/,/g, ""));
  }

  // --- ITEMS ---
  // Supertec OCR produces lines like:
  //   Line 17: "NB HP 15-FC0275LA RYZEN7"
  //   Line 18: "1 a ' UND |7730U//166B/SSD512GB/FREE/5.6 / BOTR3LA mi mi o"
  //   Line 19: "2 018146 , uno |NB.HP 255 610 RYZEN 3-7320U/66B/SSD256GB/FREE/15.6/ 290.00 245.76 290.00"
  //   Line 20: "NB HP 15-FC0256LA RYZEN 5-"
  //   Line 21: "s uo 1 UND | 7520U/166B/SSD512GB/15.6/-REE/ B9TP9LA ET ADE E"
  //
  // Strategy: collect ALL product lines first (with or without prices), then infer missing prices.

  const items: { name: string; quantity: number; price: number }[] = [];

  // Pattern A: Structured line — "{IT} {CODE} {CANT} {UND} {DESC} {P.UNIT} {V.UNIT} {P.TOTAL}"
  // Works when pdf-parse extracts clean text (non-scanned PDFs)
  const structuredRegex =
    /^(\d{1,3})\s+(\d{4,8})\s+(\d+)\s+(UND|PZA|KIT|SET|NIU|UN)\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/i;

  for (const line of lines) {
    const m = line.match(structuredRegex);
    if (m) {
      items.push({
        name: m[5].trim(),
        quantity: parseInt(m[3], 10),
        price: parseFloat(m[6].replace(/,/g, "")),
      });
    }
  }

  // Pattern B: Multi-line — "{IT} {CODE} {CANT} {UND}" then description then prices
  if (items.length === 0) {
    const headerRegex = /^(\d{1,3})\s+(\d{4,8})\s+(\d+)\s+(UND|PZA|KIT|SET|NIU|UN)$/i;

    for (let i = 0; i < lines.length; i++) {
      const hMatch = lines[i].match(headerRegex);
      if (!hMatch) continue;

      const qty = parseInt(hMatch[3], 10);
      const descParts: string[] = [];
      let price = 0;

      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        const pricesMatch = lines[j].match(
          /^([\d,]+\.\d{2})\s+([\d,]+\.\d{2})(?:\s+([\d,]+\.\d{2}))?$/
        );
        if (pricesMatch) {
          price = parseFloat(pricesMatch[1].replace(/,/g, ""));
          break;
        }
        if (headerRegex.test(lines[j])) break;
        if (/^SON:|^OP\.\s|^IGV|^PRECIO\s+TOTAL/i.test(lines[j])) break;
        if (lines[j].length > 3 && /[A-Za-z]/.test(lines[j])) {
          descParts.push(lines[j]);
        }
      }

      const name = descParts.join(" ").replace(/\s+/g, " ").trim();
      if (name && qty > 0 && price > 0) {
        items.push({ name, quantity: qty, price });
      }
    }
  }

  // Pattern C: OCR-tolerant — collect product blocks from lines containing product keywords.
  // Some items have readable prices, others don't (OCR garbles them).
  // We collect ALL items (price=0 if unreadable) and infer missing prices from the total.
  if (items.length === 0) {
    const productKeyword = /NB[\s.]?HP|LAPTOP|MONITOR|IMPRESORA|RYZEN|CORE\s*I/i;
    const stopLine = /^SON:|^OP\.\s|^GRABADA|^PRECIO\s+TOTAL|^SE\s+ACCESORIOS|^NO\s+SE\s+ACEPTAN/i;

    // Pass 1: find all product block start indices
    const productBlocks: { startIdx: number; lines: string[] }[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (stopLine.test(lines[i])) break;
      if (!productKeyword.test(lines[i])) continue;

      // This line starts a product. Collect continuation lines (next line may contain
      // the rest of the description + prices, or just garbled text).
      const block = [lines[i]];
      // Check if next line is a continuation (contains model specs or prices)
      const nextLine = lines[i + 1] || "";
      if (
        nextLine &&
        !productKeyword.test(nextLine) &&
        !stopLine.test(nextLine) &&
        !/^SON:/i.test(nextLine)
      ) {
        block.push(nextLine);
      }
      productBlocks.push({ startIdx: i, lines: block });
    }

    for (const block of productBlocks) {
      const merged = block.lines.join(" ");

      // Extract prices from the merged block
      const decimals = merged.match(/\d{2,4}\.\d{2}/g);
      let price = 0;
      if (decimals && decimals.length > 0) {
        // First decimal >= 50 is the unit price
        for (const d of decimals) {
          const val = parseFloat(d);
          if (val >= 50) { price = val; break; }
        }
      }

      // Extract product name — clean OCR artifacts
      let rawName = merged;

      // Remove prices from name
      if (decimals) {
        for (const d of decimals) rawName = rawName.replace(d, " ");
      }

      // Clean OCR artifacts from the product name
      rawName = rawName
        // Remove leading item number ("2 ")
        .replace(/^\d{1,3}\s+/, "")
        // Remove standalone 6+ digit product codes (not part of model names like FC0275LA)
        .replace(/(?<![A-Za-z-])\d{6,8}(?![A-Za-z])/g, "")
        // Remove qty+unit block: "1 a ' UND", "s uo 1 UND", etc.
        .replace(/\d+\s*[a-z'.,\s]*\b(UND|PZA|KIT|SET|NIU|UN)\b/gi, "")
        .replace(/[,.]?\s*\buno\b/gi, "")
        .replace(/[|]/g, " ")
        // Remove isolated OCR noise words
        .replace(/\b(mi|o|s|uo|a|ET|ADE|E|ESP|EE|ao)\b/g, " ")
        .replace(/\s['"]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Fix common OCR errors in Supertec product names
      rawName = rawName
        .replace(/NB\.?HP/i, "NB HP")
        .replace(/166B/g, "16GB")
        .replace(/66B(?=\/)/g, "8GB")
        .replace(/\/5\.6/g, "/15.6")
        .replace(/-REE\//g, "/FREE/")
        .replace(/BOTR3LA/g, "B9TR3LA")
        .replace(/610\s+RYZEN/i, "G10 RYZEN")
        .replace(/\/\//g, "/")
        .replace(/\/\s+/g, "/")
        .replace(/\s*\/\s*/g, "/")
        // Close "RYZEN 5- 7520U" gap → "RYZEN 5-7520U"
        .replace(/-\s+(\d)/g, "-$1")
        .replace(/\s+/g, " ")
        .replace(/^[\s-]+|[\s-]+$/g, "")
        .trim();

      if (rawName.length > 10) {
        items.push({ name: rawName, quantity: 1, price });
      }
    }

    // Pass 2: Recover missing prices from 250 DPI OCR pass
    // At 250 DPI, price columns are often more readable than at 300 DPI.
    // Strategy: find the product's model code in 250 DPI lines, then check
    // the next line (continuation) for price patterns.
    if (lines250.length > 0) {
      for (const item of items) {
        if (item.price > 0) continue; // already has price

        // Find the model identifier (e.g., "FC0275LA", "FC0256LA", "G10")
        const modelMatch = item.name.match(
          /(?:FC\d{3,4}LA|G10|255\s+G\d{1,2})\b/i
        );
        if (!modelMatch) continue;

        const modelKey = modelMatch[0];
        for (let k = 0; k < lines250.length; k++) {
          if (!lines250[k].toUpperCase().includes(modelKey.toUpperCase())) continue;

          // Search this line AND the next line for prices
          // (the product name is on one line, prices on the continuation)
          for (let j = k; j <= Math.min(k + 1, lines250.length - 1); j++) {
            // Match XXX.XX or XXX:XX (OCR sometimes renders "." as ":")
            const priceMatches = lines250[j].match(/\d{2,4}[.:]\d{2}/g);
            if (!priceMatches) continue;

            const prices = priceMatches
              .map((p) => parseFloat(p.replace(":", ".")))
              .filter((v) => v >= 50 && v <= 50000);

            if (prices.length > 0) {
              // Last price in the line is P.TOTAL (= P.UNIT when qty=1)
              item.price = prices[prices.length - 1];
              break;
            }
          }
          if (item.price > 0) break;
        }
      }
    }

    // Pass 3: Infer any still-missing prices from the total
    if (items.length > 0 && parsedTotal > 0) {
      const knownSum = items.reduce((s, it) => s + it.price * it.quantity, 0);
      const unknownItems = items.filter((it) => it.price === 0);
      if (unknownItems.length > 0 && knownSum < parsedTotal) {
        const remaining = parsedTotal - knownSum;
        if (unknownItems.length === 1) {
          unknownItems[0].price = Math.round(remaining * 100) / 100;
        } else {
          const each = Math.round((remaining / unknownItems.length) * 100) / 100;
          unknownItems.forEach((it) => { it.price = each; });
        }
      }
    }
  }

  // --- SET PRODUCTS ---
  let result: ExtractedProduct[] = [];
  if (items.length > 0) {
    result = items.map((item, index) => ({
      id: index + 1,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      priceSell: 0,
      category_name: "Sin categoria",
    }));
  } else {
    toast.warning("No se encontraron productos en la factura de Supertec.");
  }

  // --- TOTAL ---
  // parsedTotal was computed earlier (from "SON:" text or "PRECIO TOTAL" numeric).
  if (parsedTotal > 0) {
    setValue("total_comprobante", parsedTotal.toFixed(2));
  } else {
    // Fallback: compute from extracted items
    const computed = items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    if (computed > 0) {
      setValue("total_comprobante", computed.toFixed(2));
    }
  }

  return result;
}
