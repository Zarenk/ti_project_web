import { toast } from "sonner"
import { createProvider } from "../../providers/providers.api";
import { verifyOrCreateProducts } from "../../products/products.api";
import { createEntry, uploadGuiaPdf, uploadPdf } from "../entries.api";
import { updateProductPriceSell } from "../../inventory/inventory.api";

function parseMonetaryAmount(value?: string | number): number | undefined {
  if (value == null) {
    return undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const sanitized = trimmed.replace(/[^0-9.,-]/g, "");
  if (!sanitized) {
    return undefined;
  }
  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");
  let normalized = sanitized;
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      normalized = sanitized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = sanitized.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    normalized = sanitized.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = sanitized.replace(/,/g, "");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}
export async function handleFormSubmission({
  data,
  form,
  stores,
  providers,
  selectedProducts,
  isNewInvoiceBoolean,
  validateSeriesBeforeSubmit,
  categories,
  pdfFile,
  pdfGuiaFile,
  router,
  getUserIdFromToken,
  tipoMoneda, // Nuevo parÃ¡metro
  tipoCambioActual, // Nuevo parÃ¡metro
}: any) {
  const userId = await getUserIdFromToken();
  if (!userId) {
    toast.error("No se pudo obtener el ID del usuario. Por favor, inicie sesiÃ³n nuevamente.");
    return;
  }

  try {
    const storeId = stores.find((store: any) => store.name === data.store_name)?.id;
    if (!storeId) {
      toast.error("Debe seleccionar una tienda vÃ¡lida.");
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error("Debe agregar al menos un producto al registro.");
      return;
    }

    const areSeriesValid = await validateSeriesBeforeSubmit();
    if (!areSeriesValid) return;

    let providerIdBoolean: number | null = null;

    if (isNewInvoiceBoolean) {
      const existing = providers.find((p: any) => p.name === data.provider_name)?.id;
      if (existing) {
        providerIdBoolean = existing;
      } else {
        const createdProvider = await createProvider({
          name: form.getValues("provider_name"),
          adress: form.getValues("provider_adress"),
          document: "RUC",
          documentNumber: form.getValues("provider_documentNumber"),
          description: "Proveedor creado automÃ¡ticamente desde el PDF",
        });
        if (!createdProvider?.id) throw new Error("No se pudo crear el proveedor. Verifique los datos.");
        providerIdBoolean = createdProvider.id;
        toast.success("Proveedor creado correctamente.");
      }
    }

    let providerId = providers.find((p: any) => p.name === data.provider_name)?.id;
    if (!providerId) {
      if (!providerIdBoolean) {
        toast.error("Debe seleccionar un proveedor vÃ¡lido.");
        return;
      } else {
        providerId = providerIdBoolean;
      }
    }

    const productsToVerify = selectedProducts.map((product: any) => ({
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      brand: product.brand || null, // Agregar la marca si estÃ¡ disponible
      categoryId: categories.find((cat: any) => cat.name === product.category_name)?.id || null,
    }));

    const verifiedProducts = await verifyOrCreateProducts(productsToVerify);

    // Actualizar precio de venta si es necesario
    await Promise.all(
      selectedProducts.map(async (product: any) => {
        const verified = verifiedProducts.find((vp: any) => vp.name === product.name);
        if (verified && product.priceSell && product.priceSell > 0) {
          try {
            if (!verified.priceSell || verified.priceSell !== product.priceSell) {
              await updateProductPriceSell(verified.id, product.priceSell);
            }
          } catch (err) {
            console.error('Error al actualizar precio de venta:', err);
          }
        }
      })
    );

    const updatedProducts = selectedProducts.map((product: any) => {
      const verifiedProduct = verifiedProducts.find((vp: any) => vp.name === product.name);
      if (!verifiedProduct) throw new Error(`No se encontrÃ³ un ID para el producto con nombre: ${product.name}`);

      // Calcular el precio en soles si la moneda es "USD"
      const priceInSoles = tipoMoneda === "USD" && tipoCambioActual
        ? product.price * tipoCambioActual
        : null;

      return {
        productId: verifiedProduct.id,
        quantity: product.quantity > 0 ? product.quantity : 1,
        price: product.price > 0 ? product.price : 1,
        priceInSoles: priceInSoles, // Agregar el precio en soles si aplica
        series: product.series || [],
      };
    });

    console.log("Productos actualizados:", updatedProducts);

    const totalFromInput = parseMonetaryAmount(data.total_comprobante);
    const fallbackDetailsTotal = selectedProducts.reduce(
      (sum: number, product: any) => sum + (Number(product.price) || 0) * (Number(product.quantity) || 0),
      0,
    );

    const payload = {
      storeId,
      userId,
      providerId,
      date: data.entry_date,
      description: data.entry_description,
      tipoMoneda: data.tipo_moneda,
      paymentMethod: data.payment_method,
      paymentTerm: data.payment_method, // Contado/Crédito para asientos contables
      details: updatedProducts,
      totalGross: totalFromInput,
      invoice: {
        serie: data.serie,
        nroCorrelativo: data.nroCorrelativo,
        tipoComprobante: data.comprobante,
        tipoMoneda: data.tipo_moneda,
        total: totalFromInput ?? fallbackDetailsTotal,
        fechaEmision: new Date(data.fecha_emision_comprobante),
      },
    };

    const createdEntry = await createEntry(payload);
    if (!createdEntry?.id) throw new Error("No se pudo obtener el ID de la entrada creada.");

    if (pdfFile) await uploadPdf(createdEntry.id, pdfFile);
    if (pdfGuiaFile) await uploadGuiaPdf(createdEntry.id, pdfGuiaFile);

    toast.success("Se registro la informacion correctamente.");
    router.push("/dashboard/entries");
    router.refresh();
  } catch (error: any) {
    console.error("Error al crear/actualizar la entrada:", error);
    toast.error("OcurriÃ³ un error al guardar la entrada.");
  }
}


