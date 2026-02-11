
import { toast } from "sonner";

// Listas de patrones para identificar proveedores por diseño de comprobante
// Se pueden agregar más nombres o RUCs en cada lista para extender el soporte
const DELTRON_PATTERNS: (string | RegExp)[] = ["20212331377"];
const INGRAM_PATTERNS: (string | RegExp)[] = ["20267163228", /ingram\s+micro/i];
const TEMPLATE_PROVIDER_PATTERNS: (string | RegExp)[] = [
  /gozu gaming/i,
  /2060\d{7}/, // RUC de GOZU y similares que comparten el mismo diseño
  /pc\s*link/i, // Nuevo proveedor con el mismo diseño de comprobante
  "20519078520", // RUC del nuevo proveedor
];

type InvoiceProvider = "deltron" | "template" | "ingram" | "unknown";

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
  setSelectedProducts: Function,
  setValue: Function,
  setCurrency: Function
) {
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
  if (products.length > 0) {
    setSelectedProducts(
      products.map((product, index) => {
        const basePrice = parseFloat(product.unitPrice.toFixed(2));
        const finalPrice = applyIgv
          ? parseFloat((basePrice * 1.18).toFixed(2))
          : basePrice;

        return {
          id: index+1,
          name: product.name,
          quantity: product.quantity,
          price: finalPrice,
          category_name: "Sin categoria",
        };
      })
    );
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
}

export function processInvoiceText(
  text: string,
  setSelectedProducts: Function,
  setValue: Function,
  setCurrency: Function
) {
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
  if (products.length > 0) {
    setSelectedProducts(
      products.map((product, index) => {
        const basePrice = parseFloat(product.unitPrice.toFixed(2));
        const finalPrice = applyIgv
          ? parseFloat((basePrice * 1.18).toFixed(2))
          : basePrice;

        return {
          id: index + 1,
          name: product.name,
          quantity: product.quantity,
          price: finalPrice,
          category_name: "Sin categoria",
        };
      })
    );
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
}

export function processGuideText(
  text: string,
  setSelectedProducts: Function,
  setValue: Function,
  setCurrency: Function
) {
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
    setSelectedProducts(
      items.map((item, index) => ({
        id: index + 1,
        name: item.name,
        quantity: item.quantity,
        price: 0,
        priceSell: 0,
        category_name: "Sin categoria",
        series: item.series ?? [],
      }))
    );
  } else {
    toast.warning("No se encontraron productos en la guia de remision.");
  }
}

// =====================================================================
// DELTRON GUIDE PROCESSOR
// Handles "Guía de Remisión Remitente Electrónica" from GRUPO DELTRON
// Format: BIENES A TRASLADAR with CÓDIGO, DESCRIPCIÓN, series on next lines
// =====================================================================

export function processDeltronGuideText(
  text: string,
  setSelectedProducts: Function,
  setValue: Function,
  setCurrency: Function
) {
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

    console.log("[DELTRON Guide] Items section lines:", itemLines);

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
    setSelectedProducts(
      items.map((item, index) => ({
        id: index + 1,
        name: item.name,
        quantity: item.quantity,
        price: 0,
        priceSell: 0,
        category_name: "Sin categoria",
        series: item.series ?? [],
      }))
    );
  } else {
    toast.warning("No se encontraron productos en la guía de remisión DELTRON.");
  }
}
