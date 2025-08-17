
import { toast } from "sonner";

// Listas de patrones para identificar proveedores por diseño de comprobante
// Se pueden agregar más nombres o RUCs en cada lista para extender el soporte
const DELTRON_PATTERNS: (string | RegExp)[] = ["20212331377"];
const TEMPLATE_PATTERNS: (string | RegExp)[] = [
  /gozu gaming/i,
  /2060\d{7}/, // RUC de GOZU y similares que comparten el mismo diseño
  /pc\s*link/i, // Nuevo proveedor con el mismo diseño de comprobante
  "20519078520", // RUC del nuevo proveedor
];

type InvoiceProvider = "deltron" | "gozu" | "unknown";

// Detecta el proveedor de la factura a partir del texto extraído
// Devuelve "deltron", "gozu" o "unknown" si no se reconoce
export function detectInvoiceProvider(text: string): InvoiceProvider {
  const normalized = text.toLowerCase();

  const matches = (patterns: (string | RegExp)[]) =>
    patterns.some((p) =>
      typeof p === "string" ? normalized.includes(p.toLowerCase()) : p.test(normalized)
    );

  if (matches(DELTRON_PATTERNS)) {
    return "deltron";
  }

  if (matches(TEMPLATE_PATTERNS)) {
    return "gozu";
  }

  return "unknown";
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

  const addressMatch = text.match(/Direcci[oó]n[^:]*[:\-\s]*([^\n]+)/i);
  if (addressMatch) {
    setValue("provider_adress", addressMatch[1].trim());
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
  if (products.length > 0) {
    setSelectedProducts(products.map((product, index) => ({
      id: index+1,
      name: product.name,
      quantity: product.quantity,
      price: product.unitPrice,
      category_name: "Sin categoria",
    })));
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
    .map((line) => line.trim())
    .filter(Boolean);

  const headerKeywords = [
    "IGV",
    "FORMA DE PAGO",
    "FORMA",
    "PAGO",
    "SUBTOTAL",
    "TOTAL",
    "SON:",
  ];

  const filteredLines = lines.filter(
    (line) => !headerKeywords.some((word) => line.toUpperCase().includes(word))
  );

  const parseProductLine = (line: string) => {
    const productRegex =
      /^(\d+(?:[.,]\d+)?)\s*[A-Z]*\s*(.+?)\s*(\d+(?:[.,]\d+)?)\s*(\d+(?:[.,]\d+)?)$/i;
    const match = line.match(productRegex);
    if (!match) return null;

    const [, qtyStr, name, unitStr, totalStr] = match;
    const normalize = (v: string) => {
      if (v.includes(',') && v.includes('.')) {
        return parseFloat(v.replace(/,/g, ''));
      }
      return parseFloat(v.replace(',', '.'));
    };

    return {
      name: name.trim(),
      quantity: normalize(qtyStr),
      unitPrice: normalize(unitStr),
      totalPrice: normalize(totalStr),
    };
  };

  const products: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[] = [];

  for (const line of filteredLines) {
    const product = parseProductLine(line);
    if (product) {
      products.push(product);
    }
  }

  if (products.length > 0) {
    setSelectedProducts(
      products.map((product, index) => ({
        id: index + 1,
        name: product.name,
        quantity: product.quantity,
        price: parseFloat(product.unitPrice.toFixed(2)),
        category_name: "Sin categoria",
      }))
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
