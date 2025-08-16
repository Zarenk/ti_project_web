
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
    const parts = line.trim().split(/\s{2,}/).filter(Boolean);
    if (parts.length < 4) return null;

    const totalPriceStr = parts.pop()!;
    const unitPriceStr = parts.pop()!;
    let quantityStr = parts.pop()!;

    if (isNaN(parseFloat(quantityStr.replace(/[^\d.,]/g, "")))) {
      quantityStr = parts.pop() || "";
    }

    const name = parts.join(" ").trim();
    const normalizeNumber = (value: string) =>
      parseFloat(value.replace(/[^0-9.]/g, ""));

    const quantity = normalizeNumber(quantityStr);
    const unitPrice = normalizeNumber(unitPriceStr);
    const totalPrice = normalizeNumber(totalPriceStr);

    if (isNaN(quantity) || isNaN(unitPrice)) {
      return null;
    }

    return { name, quantity, unitPrice, totalPrice };
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
        price: product.unitPrice,
        category_name: "Sin categoria",
      }))
    );
  } else {
    toast.warning("No se encontraron productos en el archivo PDF.");
  }

  const rucRegex = /R\.?U\.?C\.?\s*[:\-]?\s*(\d{11})/i;
  const rucMatch = text.match(/R\.?U\.?C\.?\s*(?:N[°º#:]\s*)?(\d{11})/i);
  const serieMatch = text.match(/(?:serie\s*[:\-]?\s*)?([A-Z]\d{3}-\d{3,})/i);
  const fechaMatch = text.match(/Fecha\s+de\s+emisi[óo]n[:\s]*([\d\/.-]+)/i);
  const totalMatch = text.match(
    /(?:TOTAL(?:\s+A\s+PAGAR)?|IMPORTE\s+TOTAL)[^\d]*([\d.,]+)/i
  );

  let providerName = "";
  let providerIndex = -1;

  if (rucMatch) {
    const ruc = rucMatch[1];
    setValue("ruc", ruc);
    setValue("provider_documentNumber", ruc);
    if (ruc === "20212331377") {
      setCurrency("USD");
      setValue("tipo_moneda", "USD");
    }

    const rucLineIndex = lines.findIndex((line) => rucRegex.test(line));
    if (rucLineIndex > 0) {
      providerName = lines[rucLineIndex - 1].trim();
      providerIndex = rucLineIndex - 1;
    }

  }
  if (!providerName) {
    const providerRegex = /([A-ZÑ&\.\s]{3,})\s+R\.?U\.?C\.?\s*[:\-]?\s*\d{11}/i;
    const providerMatch = text.match(providerRegex);
    if (providerMatch) {
      providerName = providerMatch[1].trim();
      providerIndex = lines.findIndex((line) => line.includes(providerName));
    }
  }

  if (providerName) {
    setValue("provider_name", providerName);
    let address = "";
    for (let i = providerIndex + 1; i <= providerIndex + 3 && i < lines.length; i++) {
      const addressMatch = lines[i].match(/direcci[óo]n[:\s]*(.+)/i);
      if (addressMatch) {
        address = addressMatch[1].trim();
        break;
      }
      if (i === providerIndex + 1 && !rucRegex.test(lines[i])) {
        address = lines[i].trim();
        break;
      }
      if (i === providerIndex + 2 && rucRegex.test(lines[i - 1])) {
        address = lines[i].trim();
        break;
      }
    }
    if (address) setValue("provider_adress", address);
  }
  if (serieMatch) {
    const serie = serieMatch[1];
    setValue("serie", serie);
    setValue("nroCorrelativo", serie);
  }
  if (fechaMatch)
    setValue("fecha_emision_comprobante", fechaMatch[1].trim());
  if (totalMatch) setValue("total_comprobante", totalMatch[1].trim());
}
