import { toast } from "sonner"
import { createProvider } from "../../providers/providers.api";
import { verifyOrCreateProducts } from "../../products/products.api";
import { createEntry, uploadGuiaPdf, uploadPdf } from "../entries.api";
import { updateProductPriceSell } from "../../inventory/inventory.api";

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
  tipoMoneda, // Nuevo parámetro
  tipoCambioActual, // Nuevo parámetro
}: any) {
  const userId = await getUserIdFromToken();
  if (!userId) {
    toast.error("No se pudo obtener el ID del usuario. Por favor, inicie sesión nuevamente.");
    return;
  }

  try {
    const storeId = stores.find((store: any) => store.name === data.store_name)?.id;
    if (!storeId) {
      toast.error("Debe seleccionar una tienda válida.");
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
          description: "Proveedor creado automáticamente desde el PDF",
        });
        if (!createdProvider?.id) throw new Error("No se pudo crear el proveedor. Verifique los datos.");
        providerIdBoolean = createdProvider.id;
        toast.success("Proveedor creado correctamente.");
      }
    }

    let providerId = providers.find((p: any) => p.name === data.provider_name)?.id;
    if (!providerId) {
      if (!providerIdBoolean) {
        toast.error("Debe seleccionar un proveedor válido.");
        return;
      } else {
        providerId = providerIdBoolean;
      }
    }

    const productsToVerify = selectedProducts.map((product: any) => ({
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      brand: product.brand || null, // Agregar la marca si está disponible
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
      if (!verifiedProduct) throw new Error(`No se encontró un ID para el producto con nombre: ${product.name}`);

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

    const payload = {
      storeId,
      userId,
      providerId,
      date: data.entry_date,
      description: data.entry_description,
      tipoMoneda: data.tipo_moneda,
      paymentMethod: data.payment_method,
      details: updatedProducts,
      invoice: {
        serie: data.serie,
        nroCorrelativo: data.nroCorrelativo,
        comprobante: data.comprobante,
        tipoMoneda: data.tipo_moneda,
        total: parseFloat(data.total_comprobante),
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
    toast.error("Ocurrió un error al guardar la entrada.");
  }
}
