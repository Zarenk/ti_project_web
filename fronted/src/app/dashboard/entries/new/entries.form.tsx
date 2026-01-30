"use client"

import { useForm } from 'react-hook-form'
import { checkSeries, processPDF } from '../entries.api'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { z } from 'zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import React from 'react'
import { getProducts } from '../../products/products.api'
import { getCategories } from '../../categories/categories.api'
import { getProviders } from '../../providers/providers.api'
import {jwtDecode} from 'jwt-decode';
import { getAuthToken } from "@/utils/auth-token";
import { getStores } from '../../stores/stores.api'
import { UploadSection } from '../components/entries/UploadSection'
import { AdditionalInfoSection } from '../components/entries/AdditionalInfoSection'
import { ProviderSection } from '../components/entries/ProviderSection'
import { StoreSection } from '../components/entries/StoreSection'
import { ProductSelection } from '../components/entries/ProductSelection'
import { SelectedProductsTable } from '../components/entries/SelectedProductsTable'
import { handleFormSubmission } from '../utils/onSubmitHelper'
import { ActionButtons } from '../components/entries/ActionButtons'
import { getLatestExchangeRateByCurrency } from '../../exchange/exchange.api'
import {
  detectGuideDocument,
  detectInvoiceProvider,
  processExtractedText,
  processGuideText,
  processInvoiceText,
} from '../utils/pdfExtractor'
import { numeroALetrasCustom } from '../../sales/components/utils/numeros-a-letras'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTenantSelection } from '@/context/tenant-selection-context'

// FunciÃ³n para obtener el userId del token JWT almacenado en localStorage
async function getUserIdFromToken(): Promise<number | null> {
  const token = await getAuthToken();
  if (!token) {
    console.error('No se encontrÃ³ un token de autenticaciÃ³n');
    return null;
  }

  try {
    const decodedToken: { sub: number } = jwtDecode(token);
    return decodedToken.sub;
  } catch (error) {
    console.error('Error al decodificar el token:', error);
    return null;
  }
}

//definir el esquema de validacion
const entriesSchema = z.object({
  name: z.string({}),
  description: z.string({}),
  price: z.number({}),
  priceSell: z.number({}),
  quantity: z.number({}),
  category_name: z.string({}),
  provider_name: z.string({}),
  provider_adress: z.string({}),
  provider_documentNumber: z.string({}),
  store_name: z.string({}),
  store_adress: z.string({}),
  entry_date: z.date({}),
  entry_description: z.string({}),
  serie: z.string({}),
  nroCorrelativo: z.string({}),
  ruc: z.string({}),
  fecha_emision_comprobante: z.string({}),
  comprobante: z.string({}),
  total_comprobante: z.string({}),
  tipo_moneda: z.string({}),
  payment_method: z.enum(['CASH', 'CREDIT']),
  guia_serie: z.string({}),
  guia_correlativo: z.string({}),
  guia_fecha_emision: z.string({}),
  guia_fecha_entrega_transportista: z.string({}),
  guia_motivo_traslado: z.string({}),
  guia_punto_partida: z.string({}),
  guia_punto_llegada: z.string({}),
  guia_destinatario: z.string({}),
  guia_peso_bruto_unidad: z.string({}),
  guia_peso_bruto_total: z.string({}),
  guia_transportista: z.string({}),
})
//inferir el tipo de dato
export type EntriesType = z.infer<typeof entriesSchema>;

function buildDefaultEntryValues(entry?: any): EntriesType {
  return {
    name: entry?.name ?? "",
    description: entry?.description ?? "",
    price: entry?.price ?? 1,
    priceSell: entry?.priceSell ?? 1,
    quantity: entry?.quantity ?? 1,
    category_name: entry?.category_name ?? "",
    provider_name: entry?.provider_name ?? "",
    provider_adress: entry?.provider_adress ?? "",
    provider_documentNumber: entry?.provider_documentNumber ?? "",
    store_name: entry?.store_name ?? "",
    store_adress: entry?.store_adress ?? "",
    entry_date: entry?.entry_date ? new Date(entry.entry_date) : new Date(),
    entry_description: entry?.entry_description ?? "",
    ruc: entry?.ruc ?? "",
    serie: entry?.serie ?? "",
    nroCorrelativo: entry?.nroCorrelativo ?? "",
    fecha_emision_comprobante: entry?.fecha_emision_comprobante ?? "",
    comprobante: entry?.comprobante ?? "",
    total_comprobante: entry?.total_comprobante ?? "",
    tipo_moneda: entry?.tipo_moneda ?? "PEN",
    payment_method: entry?.payment_method ?? "CASH",
    guia_serie: entry?.guia_serie ?? "",
    guia_correlativo: entry?.guia_correlativo ?? "",
    guia_fecha_emision: entry?.guia_fecha_emision ?? "",
    guia_fecha_entrega_transportista: entry?.guia_fecha_entrega_transportista ?? "",
    guia_motivo_traslado: entry?.guia_motivo_traslado ?? "",
    guia_punto_partida: entry?.guia_punto_partida ?? "",
    guia_punto_llegada: entry?.guia_punto_llegada ?? "",
    guia_destinatario: entry?.guia_destinatario ?? "",
    guia_peso_bruto_unidad: entry?.guia_peso_bruto_unidad ?? "",
    guia_peso_bruto_total: entry?.guia_peso_bruto_total ?? "",
    guia_transportista: entry?.guia_transportista ?? "",
  };
}

export function EntriesForm({entries, categories}: {entries: any; categories: any}) {

    const initialValues = useMemo<EntriesType>(() => buildDefaultEntryValues(entries), [entries]);
    const form = useForm<EntriesType>({
      resolver: zodResolver(entriesSchema),
      defaultValues: initialValues,
    });

    useEffect(() => {
      form.reset(initialValues);
    }, [form, initialValues]);

  // Extraer funciones y estados del formulario
  const { handleSubmit, register, setValue, formState: {errors} } = form;
  const purchasePrice = form.watch('price');
  const categoryValue = form.watch('category_name');
  const initialCurrency = (form.getValues("tipo_moneda") as 'USD' | 'PEN') || 'PEN';

  // Estado para manejar el envÃ­o del formulario
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(!categories?.length);
  const { version } = useTenantSelection();

  // MODAL DE PRODUCTOS
  const [categoriesState, setCategories] = useState<{ id: number; name: string }[]>(categories ?? []);
  useEffect(() => {
    setCategories(categories ?? []);
  }, [categories]);

  useEffect(() => {
    let isActive = true;

    async function fetchCategoriesByTenant() {
      try {
        setLoadingCategories(true);
        setCategories([]);
        const nextCategories = await getCategories();
        if (isActive) {
          setCategories(Array.isArray(nextCategories) ? nextCategories : []);
        }
      } catch (error) {
        console.error('Error al obtener las categorias:', error);
        if (isActive) {
          setCategories([]);
        }
      } finally {
        if (isActive) {
          setLoadingCategories(false);
        }
      }
    }

    fetchCategoriesByTenant();

    return () => {
      isActive = false;
    };
  }, [version]);
  const [isDialogOpenProduct, setIsDialogOpenProduct] = useState(false);
  // Estado adicional para manejar el checkbox
  const [isNewCategoryBoolean, setIsNewCategoryBoolean] = useState(false);
 
  // MODAL PARA AGREGAR SERIES
  const [openSeriesModal, setOpenSeriesModal] = useState<number | null>(null);
 
  // Estado para controlar el diÃ¡logo de confirmaciÃ³n del boton REGISTRAR VENTA
  const [isDialogOpen, setIsDialogOpen] = useState(false);
 
  // FunciÃ³n para manejar el envÃ­o del formulario
  const getAllSeriesFromDataTable = (): string[] => {
    // Suponiendo que `selectedProducts` contiene los productos en el DataTable
    return selectedProducts.flatMap((product) => product.series || []);
  };

  // ESTADO PARA EL TIPO DE CAMBIO
  const [tipoMoneda, setTipoMoneda] = useState<'USD' | 'PEN'>(initialCurrency);
  const [tipoCambioActual, setTipoCambioActual] = useState<number | null>(null);

  // ALERT DIALOG PARA AGREGAR PROVEEDORES
  const [isDialogOpenProvider, setIsDialogOpenProvider] = useState(false); // Estado para controlar el AlertDialog
  //

  // ALERT DIALOG PARA AGREGAR TIENDAS
  const [isDialogOpenStore, setIsDialogOpenStore] = useState(false); // Controla la apertura del diÃ¡logo
  //

  // COMBOBOX DE PRODUCTOS
  const [products, setProducts] = useState<{ id: number; 
    name: string, price: number, priceSell: number, description: string, categoryId: number, category_name: string }[]>([]); // Estado para los productos
  const [open, setOpen] = React.useState(false)
  const [value, setValueProduct] = React.useState("")

  // ENVIAR GUIA PDF
  const [pdfGuiaFile, setPdfGuiaFile] = useState<File | null>(null);
  const [showGuideFields, setShowGuideFields] = useState(false);


  const entryReferenceIdRef = useRef<string | null>(null);
  const getEntryReferenceId = (): string => {
    if (entryReferenceIdRef.current) {
      return entryReferenceIdRef.current;
    }
    const fallbackId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const generated =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : fallbackId;
    entryReferenceIdRef.current = generated;
    return generated;
  };

  // FunciÃ³n para agregar un producto al datatable
  const [selectedProducts, setSelectedProducts] = useState<
    { id: number; name: string; price: number; priceSell: number; quantity: number; category_name: string, series?: string[], newSeries?: string }[]
  >([]);
  const [currentProduct, setCurrentProduct] = useState<{ id: number; name: string; price: number, priceSell: number, categoryId: number, category_name:string } | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  // MODAL PARA AGREGAR SERIE
  const [isDialogOpenSeries, setIsDialogOpenSeries] = useState(false);
  const [series, setSeries] = useState<string[]>([]);

  // COMBOBOX DE TIENDAS
  const [stores, setStores] = useState<{ id: number;
    name: string, description: string, adress: string }[]>([]); // Estado para as tiendas
  const [openStore, setOpenStore] = React.useState(false)
  const [valueStore, setValueStore] = React.useState("")

  // ENVIAR PDF
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isNewInvoiceBoolean, setIsNewInvoiceBoolean] = useState(false);
  const [showInvoiceFields, setShowInvoiceFields] = useState(false);
  const invoicePreviewUrl = useMemo(
    () => (pdfFile ? URL.createObjectURL(pdfFile) : null),
    [pdfFile],
  );
  const guidePreviewUrl = useMemo(
    () => (pdfGuiaFile ? URL.createObjectURL(pdfGuiaFile) : null),
    [pdfGuiaFile],
  );

  useEffect(() => {
    return () => {
      if (invoicePreviewUrl) URL.revokeObjectURL(invoicePreviewUrl);
    };
  }, [invoicePreviewUrl]);

  useEffect(() => {
    return () => {
      if (guidePreviewUrl) URL.revokeObjectURL(guidePreviewUrl);
    };
  }, [guidePreviewUrl]);

  // Estado para manejar el diÃ¡logo de confirmaciÃ³n
  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsDialogOpen(false); // Cierra el modal inmediatamente
    setIsSubmitting(true);
    await onSubmit(); // Esto ejecuta handleSubmit(...)
    setIsSubmitting(false);
  };

  // VARIABLES DE CALENDAR
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [openCalendar, setOpenCalendar] = useState(false);
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  //

  // Estado para manejar el archivo PDF
  const router = useRouter();
  const params = useParams<{id: string}>();

  // Validacion de la serie
  const validateSeriesBeforeSubmit = async (): Promise<boolean> => {
    const allSeries = selectedProducts.flatMap((product) => product.series || []);
  
    for (const serial of allSeries) {
      try {
        const result = await checkSeries(serial.trim());
        if (result.exists) {
          toast.error(`La serie "${serial}" ya estÃ¡ asociada a otro producto en el sistema.`);
          return false; // Detener el proceso si se encuentra una serie duplicada
        }
      } catch (error) {
        console.error(`Error al verificar la serie "${serial}":`, error);
        toast.error(`Error al verificar la serie "${serial}". IntÃ©ntalo nuevamente.`);
        return false; // Detener el proceso si ocurre un error
      }
    }
  
    return true; // Todas las series son vÃ¡lidas
  };
  //

  // COMBOBOX DE Proveedores
  const [providers, setProviders] = useState<{ id: number; 
  name: string, description: string, adress: string }[]>([]); // Estado para los proveedores
  const [openProvider, setOpenProvider] = React.useState(false)
  const [valueProvider, setValueProvider] = React.useState("")
  // Estado para rastrear si el combobox de proveedores ha sido tocado
  const [isProviderComboTouched, setIsProviderComboTouched] = useState(false);

  // CONTROLAR LA MONEDA
  const [currency, setCurrency] = useState<'USD' | 'PEN'>(initialCurrency);
  const [isCurrencyDialogOpen, setIsCurrencyDialogOpen] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<'USD' | 'PEN' | null>(null);
  const [isConvertingCurrency, setIsConvertingCurrency] = useState(false);

  const normalizedCurrency = currency === 'USD' ? 'USD' : 'PEN';

  const totalAmount = useMemo(() => {
    return selectedProducts.reduce((sum, product) => {
      const price = Number(product.price) || 0;
      const quantityValue = Number(product.quantity) || 0;
      return sum + price * quantityValue;
    }, 0);
  }, [selectedProducts]);

  const amountInWords = useMemo(() => {
    if (selectedProducts.length === 0) {
      return '';
    }

    const roundedTotal = Math.round(totalAmount * 100) / 100;
    const integerPart = Math.floor(roundedTotal);
    const cents = Math.round((roundedTotal % 1) * 100)
      .toString()
      .padStart(2, '0');

    const currencyLabels: Record<string, { singular: string; plural: string }> = {
      PEN: { singular: 'SOL', plural: 'SOLES' },
      USD: { singular: 'DÃ“LAR AMERICANO', plural: 'DÃ“LARES AMERICANOS' },
      EUR: { singular: 'EURO', plural: 'EUROS' }
    };

    const currencyLabel = currencyLabels[normalizedCurrency] ?? {
      singular: 'MONEDA',
      plural: 'MONEDAS'
    };

    const currencyText = integerPart === 1 ? currencyLabel.singular : currencyLabel.plural;

    const literal = numeroALetrasCustom(roundedTotal, normalizedCurrency)
      .replace('IMPORTE EN LETRAS:', '')
      .trim();

    const [amountWords] = literal.split(` ${currencyText} CON `);

    if (!amountWords) {
      return `SON ${literal}`;
    }

    return `SON ${amountWords} CON ${cents}/100 ${currencyText}`;
  }, [normalizedCurrency, selectedProducts.length, totalAmount]);

  const handleCurrencyToggle = () => {
    if (isConvertingCurrency) return;

    const targetCurrency = (currency === 'PEN' ? 'USD' : 'PEN') as 'USD' | 'PEN';

    setPendingCurrency(targetCurrency);
    setIsCurrencyDialogOpen(true);
  };

  const convertProductsByCurrency = (
    products: {
      id: number;
      name: string;
      price: number;
      priceSell: number;
      quantity: number;
      category_name: string;
      series?: string[];
      newSeries?: string;
    }[],
    exchangeRate: number,
    targetCurrency: 'USD' | 'PEN'
  ) => {
    const convertValue = (value: number | undefined) => {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return value;
      }

      const converted =
        targetCurrency === 'USD' ? value / exchangeRate : value * exchangeRate;

      return Number(converted.toFixed(2));
    };

    return products.map((product) => {
      const convertedPrice = convertValue(product.price);
      const convertedPriceSell = convertValue(product.priceSell);

      return {
        ...product,
        price:
          typeof convertedPrice === 'number' ? convertedPrice : product.price,
        priceSell:
          typeof convertedPriceSell === 'number'
            ? convertedPriceSell
            : product.priceSell,
      };
    });
  };

  const applyCurrencyChange = async (
    newCurrency: 'USD' | 'PEN',
    shouldConvertPrices: boolean
  ): Promise<boolean> => {
    if (newCurrency === currency) {
      return true;
    }

    try {
      if (shouldConvertPrices) {
        let exchangeRate = tipoCambioActual;

        if (currency === 'PEN' && newCurrency === 'USD') {
          if (!exchangeRate || exchangeRate <= 0) {
            exchangeRate = await getLatestExchangeRateByCurrency('USD');
          }

          if (!exchangeRate || exchangeRate <= 0) {
            toast.error(
              'No se pudo obtener un tipo de cambio vÃ¡lido para convertir a dÃ³lares.'
            );
            return false;
          }

          const convertValue = (value: number | string | null | undefined) => {
            const numericValue = Number(value);
            if (Number.isNaN(numericValue)) {
              return value;
            }

            const converted = numericValue / (exchangeRate as number);
            return Number(converted.toFixed(2));
          };

          setSelectedProducts((prev) =>
            convertProductsByCurrency(prev, exchangeRate as number, 'USD')
          );

          setCurrentProduct((prev) => {
            if (!prev) {
              return prev;
            }

            const updatedPrice = convertValue(prev.price);
            const updatedPriceSell = convertValue(prev.priceSell);
            const finalPrice = typeof updatedPrice === 'number' ? updatedPrice : 0;
            const finalPriceSell = typeof updatedPriceSell === 'number' ? updatedPriceSell : 0;
            form.setValue('price', finalPrice, { shouldValidate: true });
            form.setValue('priceSell', finalPriceSell, { shouldValidate: true });

            return {
              ...prev,
              price: finalPrice,
              priceSell: finalPriceSell,
            };
          });

          const rawPrice = form.getValues('price');
          const rawPriceSell = form.getValues('priceSell');
          const convertedPrice = convertValue(rawPrice);
          const convertedPriceSell = convertValue(rawPriceSell);
          form.setValue('price', typeof convertedPrice === 'number' ? convertedPrice : 0, { shouldValidate: true });
          form.setValue('priceSell', typeof convertedPriceSell === 'number' ? convertedPriceSell : 0, { shouldValidate: true });

          setTipoCambioActual(exchangeRate);
          toast.success('Los precios se actualizaron a dÃ³lares.');
        } else if (currency === 'USD' && newCurrency === 'PEN') {
          if (!exchangeRate || exchangeRate <= 0) {
            exchangeRate = await getLatestExchangeRateByCurrency('USD');
          }

          if (!exchangeRate || exchangeRate <= 0) {
            toast.error(
              'No se pudo obtener un tipo de cambio vÃ¡lido para convertir a soles.'
            );
            return false;
          }

          const convertValue = (value: number | string | null | undefined) => {
            const numericValue = Number(value);
            if (Number.isNaN(numericValue)) {
              return value;
            }

            const converted = numericValue * (exchangeRate as number);
            return Number(converted.toFixed(2));
          };

          setSelectedProducts((prev) =>
            convertProductsByCurrency(prev, exchangeRate as number, 'PEN')
          );

          setCurrentProduct((prev) => {
            if (!prev) {
              return prev;
            }

            const updatedPrice = convertValue(prev.price);
            const updatedPriceSell = convertValue(prev.priceSell);
            const finalPrice = typeof updatedPrice === 'number' ? updatedPrice : 0;
            const finalPriceSell = typeof updatedPriceSell === 'number' ? updatedPriceSell : 0;
            form.setValue('price', finalPrice, { shouldValidate: true });
            form.setValue('priceSell', finalPriceSell, { shouldValidate: true });

            return {
              ...prev,
              price: finalPrice,
              priceSell: finalPriceSell,
            };
          });

          const rawPrice = form.getValues('price');
          const rawPriceSell = form.getValues('priceSell');
          const convertedPrice = convertValue(rawPrice);
          const convertedPriceSell = convertValue(rawPriceSell);
          form.setValue('price', typeof convertedPrice === 'number' ? convertedPrice : 0, { shouldValidate: true });
          form.setValue('priceSell', typeof convertedPriceSell === 'number' ? convertedPriceSell : 0, { shouldValidate: true });

          setTipoCambioActual(exchangeRate);

          toast.success('Los precios se actualizaron a soles.');
        }
      }

      setCurrency(newCurrency);
      setTipoMoneda(newCurrency);
      form.setValue('tipo_moneda', newCurrency, { shouldValidate: true });

      return true;
    } catch (error) {
      console.error('Error al actualizar la moneda:', error);
      toast.error('No se pudo actualizar la moneda.');
      return false;
    }
  };

  const handleCurrencySelection = (value: 'USD' | 'PEN') => {
    if (value === currency) {
      return;
    }

    if (selectedProducts.length > 0) {
      setPendingCurrency(value);
      setIsCurrencyDialogOpen(true);
      return;
    }

    void applyCurrencyChange(value, false);
  };

  const confirmCurrencyChange = async () => {
    if (!pendingCurrency) {
      return;
    }

    setIsConvertingCurrency(true);
    const success = await applyCurrencyChange(pendingCurrency, true);
    setIsConvertingCurrency(false);

    if (success) {
      setIsCurrencyDialogOpen(false);
      setPendingCurrency(null);
    }
  };

  const cancelCurrencyChange = () => {
    if (isConvertingCurrency) {
      return;
    }

    setIsCurrencyDialogOpen(false);
    setPendingCurrency(null);
  };

  // FunciÃ³n para eliminar un producto del datatable
  const removeProduct = (id: number) => {
    setSelectedProducts((prev) => prev.filter((product) => product.id !== id));
  };
  //

  //handlesubmit para manejar los datos y el ingreso de los productos
  const onSubmit = handleSubmit(async (data) => {
    if (isSubmitting) return; // âœ… Evita clicks repetidos
    setIsSubmitting(true); // âœ… Bloquea nuevos intentos
    try {
      const success = await handleFormSubmission({
        data,
        form,
        stores,
        providers,
        selectedProducts,
        isNewInvoiceBoolean,
        validateSeriesBeforeSubmit,
        categories: categoriesState,
        pdfFile,
        pdfGuiaFile,
        router,
        getUserIdFromToken,
        tipoMoneda, // Pasar el tipo de moneda
        tipoCambioActual, // Pasar el tipo de cambio actual
        referenceId: getEntryReferenceId(),
      });
      if (success) {
        entryReferenceIdRef.current = null;
      }
    } finally {
      setIsSubmitting(false); // âœ… Libera el botÃ³n cuando termina
    }
  });

  // Actualizar el valor del formulario cuando cambie el estado local
  useEffect(() => {
    form.setValue("tipo_moneda", currency, { shouldValidate: true });
  }, [currency, form]);
  //

  const addProduct = () => {
    if (!currentProduct) {
      toast.error("No se ha seleccionado ningun producto.");
      console.error("No se ha seleccionado un producto.");
      return;
    }
  
    if (quantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0.");
      console.error("La cantidad debe ser mayor a 0.");
      return;
    }

    let categoryName = form.getValues("category_name");

    if (isNewCategoryBoolean) {
      // Si es una nueva categorÃ­a, usa el valor del input
      categoryName = form.getValues("category_name");
      if (!categoryName || categoryName.trim() === "") {
        toast.error("El nombre de la categorÃ­a no puede estar vacÃ­o.");
        console.error("El nombre de la categorÃ­a estÃ¡ vacÃ­o.");
        return;
      }
    } else {
      // Encuentra el nombre de la categorÃ­a correspondiente
      const category = categoriesState.find(
        (cat: any) => cat.id === currentProduct.categoryId
      );
      categoryName = category?.name || "Sin categorÃ­a";
    }

    // Verifica si el producto ya estÃ¡ en la lista
    const existingProduct = selectedProducts.find(
      (product) => product.id === currentProduct.id
    );
  
    if (existingProduct) {
      // Si el producto ya existe, actualiza la cantidad y el precio de venta si corresponde
      const newPriceSell = Number(form.getValues("priceSell") || 0);
      setSelectedProducts((prev) =>
        prev.map((product) =>
          product.id === currentProduct.id
            ? {
                ...product,
                quantity: product.quantity + quantity,
                series: [...(product.series || []), ...(series || [])], // Agregar series
                priceSell:
                  product.priceSell && product.priceSell > 0
                    ? product.priceSell
                    : newPriceSell,
              }
            : product
        )
      );
      toast.success("Cantidad actualizada para el producto existente.");
    } else {
      // Si el producto no existe, agrÃ©galo
      setSelectedProducts((prev) => [
        ...prev,
        {
          id: currentProduct.id,
          name: currentProduct.name,
          price: currentProduct.price,
          priceSell: Number(form.getValues("priceSell") || currentProduct.priceSell),
          quantity,
          category_name: categoryName || "Sin categoria", // Incluye el nombre de la categorÃ­a
          series: [...(series || [])], // Agregar series
        },
      ]);
      toast.success("Producto agregado al detalle.");
    }
  
    // Limpia el producto actual y la cantidad
    setCurrentProduct(null);
    setQuantity(1);
    // Limpia los inputs relacionados
    setValue("category_name", "");
    setValue("price", 0);
    setValue("priceSell", 0);
    setValue("description", "");
    // Limpia el combobox
    setValueProduct(""); // Restablece el valor del combobox
    setOpen(false); // Cierra el combobox
    // **Limpia las series**
    setSeries([]); // Resetea el estado de las series
    setIsNewCategoryBoolean(false);
  };
  //

  const handlePreviewInvoice = () => {
    if (invoicePreviewUrl) {
      window.open(invoicePreviewUrl, "_blank", "noopener,noreferrer");
    }
    setShowInvoiceFields(true);
    setShowGuideFields(false);
  };

  const handlePreviewGuide = () => {
    if (guidePreviewUrl) {
      window.open(guidePreviewUrl, "_blank", "noopener,noreferrer");
    }
    setShowGuideFields(true);
    setShowInvoiceFields(false);
  };
  //

  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (file) {

      if (file.type !== "application/pdf") {
        toast.error("Por favor, sube un archivo PDF vÃ¡lido.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("El archivo no debe exceder los 5 MB.");
        return;
      }
      setPdfFile(file);
      try {
        const extractedText = await processPDF(file); // Llama a la funciÃ³n de la API
        const provider = detectInvoiceProvider(extractedText);

        if (provider === "deltron") {
          processExtractedText(extractedText, setSelectedProducts, form.setValue, setCurrency);
        } else {
          processInvoiceText(extractedText, setSelectedProducts, form.setValue, setCurrency);
          if (provider === "unknown") {
            toast.warning("Formato de factura no reconocido.");
          }
        }
        setIsNewInvoiceBoolean(true);
        setShowInvoiceFields(true);
        setShowGuideFields(false);
        toast.success("Factura subida correctamente.");
      } catch (error) {
        console.error('Error al procesar el archivo PDF:', error);
        toast.error('Error al procesar el archivo PDF');
      }
    }
  };
  //

  const handlePDFGuiaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileGuia = event.target.files?.[0];
    
    if (fileGuia) {
      if (fileGuia.type !== "application/pdf") {
        toast.error("Por favor, sube un archivo PDF valido.");
        return;
      }
      if (fileGuia.size > 5 * 1024 * 1024) {
        toast.error("El archivo no debe exceder los 5 MB.");
        return;
      }
      setPdfGuiaFile(fileGuia);
      try {
        const extractedText = await processPDF(fileGuia);
        if (!extractedText || !extractedText.trim()) {
          toast.warning(
            "No se pudo leer texto del PDF. Si es una imagen escaneada, se requiere OCR.",
          );
          return;
        }

        if (!detectGuideDocument(extractedText)) {
          toast.warning("No se detecto una guia de remision en el PDF.");
        }

        processGuideText(extractedText, setSelectedProducts, form.setValue, setCurrency);
        setShowGuideFields(true);
        setShowInvoiceFields(false);
        toast.success("Guia de remision procesada correctamente.");
      } catch (error) {
        console.error('Error al procesar el archivo PDF:', error);
        toast.error('Error al procesar el archivo PDF');
      }
    }
  };
  //

  const handleClearForm = () => {
    setSelectedProducts([]);
    setSeries([]);
    setCurrentProduct(null);
    setQuantity(1);
    setValueProduct("");
    setValueProvider("");
    setValueStore("");
    setOpen(false);
    setOpenProvider(false);

    setPdfFile(null);
    setPdfGuiaFile(null);
    setIsNewInvoiceBoolean(false);

    // Restablece la UI al estado por defecto: factura visible, guia oculta
    setShowInvoiceFields(true);
    setShowGuideFields(false);

    const today = new Date();
    setSelectedDate(today);
    setCreatedAt(today);
    form.setValue("entry_date", today);

    setCurrency("PEN");
    setTipoMoneda("PEN");
    setTipoCambioActual(null);

    form.reset(buildDefaultEntryValues());

    // Limpia los inputs file para evitar archivos "pegados"
    const invoiceInput = document.getElementById("pdf-upload") as HTMLInputElement | null;
    if (invoiceInput) invoiceInput.value = "";
    const guideInput = document.getElementById("pdf-guia-upload") as HTMLInputElement | null;
    if (guideInput) guideInput.value = "";
  };
  //

  // Actualizar el estado local cuando cambie el valor del formulario
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.tipo_moneda) {
        setTipoMoneda(value.tipo_moneda as 'USD' | 'PEN');
      }
    });
  
    return () => subscription.unsubscribe();
  }, [form]);
  //

  useEffect(() => {
    async function fetchTipoCambio() {
      if (tipoMoneda === 'USD') {
        try {
          const exchangeRate = await getLatestExchangeRateByCurrency('USD');
          setTipoCambioActual(exchangeRate);
        } catch (error) {
          console.error("Error al obtener el tipo de cambio:", error);
          setTipoCambioActual(null);
        }
      } else {
        setTipoCambioActual(null);
      }
    }
    fetchTipoCambio();
  }, [tipoMoneda]);
  //

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("Errores del formulario:", errors);
    }
  }, [errors]);

  // Cargar los productos al montar el componente
  useEffect(() => {
    let isActive = true;

    async function fetchProducts() {
      try {
        const productsResponse = await getProducts();
        if (isActive) {
          setProducts(productsResponse);
        }
      } catch (error) {
        console.error('Error al obtener los productos:', error);
        if (isActive) {
          setProducts([]);
        }
      } finally {
        if (isActive) {
          setLoadingProducts(false);
        }
      }
     }

    setLoadingProducts(true);
    setProducts([]);
    fetchProducts();

    return () => {
      isActive = false;
    };
  }, [version]);
  //

  // Cargar los proveedores al montar el componente
  useEffect(() => {
    let isActive = true;

    async function fetchProviders() {
      try {
          const providersResponse = await getProviders();
          if (isActive) {
            setProviders(providersResponse);
          }
      } catch (error) {
          console.error('Error al obtener los proveedores:', error);
          if (isActive) {
            setProviders([]);
          }
        } finally {
          if (isActive) {
            setLoadingProviders(false);
          }
        }
      }
  
    setLoadingProviders(true);
    setProviders([]);
    fetchProviders();

    return () => {
      isActive = false;
    };
  }, [version]);
  //

    // Cargar lass tiendas al montar el componente
  useEffect(() => {
    let isActive = true;

    async function fetchStores() {
      try {
          const storesResponse = await getStores();
          if (isActive) {
            setStores(storesResponse);
          }
      } catch (error) {
          console.error('Error al obtener las tiendas:', error);
          if (isActive) {
            setStores([]);
          }
        } finally {
          if (isActive) {
            setLoadingStores(false);
          }
        }
      }
  
    setLoadingStores(true);
    setStores([]);
    fetchStores();

    return () => {
      isActive = false;
    };
  }, [version]);

  useEffect(() => {
    setSelectedProducts([]);
    setSeries([]);
    setCurrentProduct(null);
    setValueProduct('');
    setValueStore('');
    setValueProvider('');
    setPdfGuiaFile(null);
    setShowGuideFields(false);
    setTipoMoneda('PEN');
    setTipoCambioActual(null);
    setPdfFile(null);
    setShowInvoiceFields(false);
    setIsNewInvoiceBoolean(false);
    form.reset(buildDefaultEntryValues());
  }, [version, form]);
  //

  // Efecto para ajustar las series cuando cambia la cantidad
  useEffect(() => {
    if (series.length > quantity) {
      // Ajustar el array de series para que no exceda la nueva cantidad
      setSeries((prev) => prev.slice(0, quantity));
      toast.error(`La cantidad de series excedÃ­a la nueva cantidad (${quantity}). Se eliminaron las Ãºltimas series.`);
    }
  }, [quantity]);

  const isLoading = loadingProducts || loadingProviders || loadingStores || loadingCategories;

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-1 sm:px-2 lg:px-8">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="bg-accent animate-pulse rounded-md h-4 w-24" />
              <div className="bg-accent animate-pulse rounded-md h-24 w-full" />
            </div>
            <div className="space-y-2">
              <div className="bg-accent animate-pulse rounded-md h-4 w-24" />
              <div className="bg-accent animate-pulse rounded-md h-24 w-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="bg-accent animate-pulse rounded-md h-4 w-28" />
              <div className="bg-accent animate-pulse rounded-md h-10 w-full" />
            </div>
            <div className="space-y-2">
              <div className="bg-accent animate-pulse rounded-md h-4 w-28" />
              <div className="bg-accent animate-pulse rounded-md h-10 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="bg-accent animate-pulse rounded-md h-4 w-36" />
            <div className="bg-accent animate-pulse rounded-md h-40 w-full" />
          </div>
          <div className="flex justify-end gap-3">
            <div className="bg-accent animate-pulse rounded-md h-10 w-28" />
            <div className="bg-accent animate-pulse rounded-md h-10 w-40" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-2 sm:px-4 lg:px-8">
      <form className='relative flex flex-col gap-2' onSubmit={onSubmit}>
        <fieldset disabled={isSubmitting} className='flex flex-col gap-2'>
                  <div className="flex flex-col gap-2">
                    <UploadSection
                      register={register}
                      watch={form.watch}
                      handlePDFUpload={handlePDFUpload}
                      handlePDFGuiaUpload={handlePDFGuiaUpload}
                      onPreviewInvoice={handlePreviewInvoice}
                      onPreviewGuide={handlePreviewGuide}
                      invoicePreviewUrl={invoicePreviewUrl}
                      guidePreviewUrl={guidePreviewUrl}
                      currency={currency}
                      onCurrencyChange={handleCurrencySelection}
                      showInvoiceFields={showInvoiceFields}
                      showGuideFields={showGuideFields}
                    />
                    <AdditionalInfoSection
                      register={register}
                      watch={form.watch}
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                      createdAt={createdAt}
                      setCreatedAt={setCreatedAt}
                      openCalendar={openCalendar}
                      setOpenCalendar={setOpenCalendar}
                      setValue={setValue}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <ProviderSection
                      valueProvider={valueProvider}
                      setValueProvider={setValueProvider}
                      providers={providers}
                      openProvider={openProvider}
                      setOpenProvider={setOpenProvider}
                      isDialogOpenProvider={isDialogOpenProvider}
                      setIsDialogOpenProvider={setIsDialogOpenProvider}
                      setProviders={setProviders}
                      setValue={form.setValue}
                      register={register}
                      watch={form.watch}
                    />
                    <StoreSection
                      openStore={openStore}
                      setOpenStore={setOpenStore}
                      valueStore={valueStore}
                      setValueStore={setValueStore}
                      stores={stores}
                      setValue={form.setValue}
                      register={register}
                      watch={form.watch}
                      isDialogOpenStore={isDialogOpenStore}
                      setIsDialogOpenStore={setIsDialogOpenStore}
                      setStores={setStores}
                      setIsProviderComboTouched={setIsProviderComboTouched}
                      valueProvider={valueProvider}
                    />
                     <ProductSelection
                      open={open}
                      setOpen={setOpen}
                      value={value}
                      setValueProduct={setValueProduct}
                      products={products}
                      selectedProducts={selectedProducts}
                      categories={categoriesState}
                      setProducts={setProducts}
                      setCategories={setCategories}
                      currentProduct={currentProduct}
                      setCurrentProduct={setCurrentProduct}
                      register={register}
                      setValue={form.setValue}
                      categoryValue={categoryValue}
                      purchasePrice={purchasePrice}
                      addProduct={addProduct}
                      isDialogOpenSeries={isDialogOpenSeries}
                      setIsDialogOpenSeries={setIsDialogOpenSeries}
                      series={series}
                      setSeries={setSeries}
                      quantity={quantity}
                      setQuantity={setQuantity}
                      isDialogOpenProduct={isDialogOpenProduct}
                      setIsDialogOpenProduct={setIsDialogOpenProduct}
                      getAllSeriesFromDataTable={getAllSeriesFromDataTable}
                      isNewCategoryBoolean={isNewCategoryBoolean}
                      setIsNewCategoryBoolean={setIsNewCategoryBoolean}
                      currency={currency}
                      tipoCambioActual={tipoCambioActual}
                    />
                  </div>
                    <SelectedProductsTable
                      selectedProducts={selectedProducts}
                      setSelectedProducts={setSelectedProducts}
                      openSeriesModal={openSeriesModal}
                      setOpenSeriesModal={setOpenSeriesModal}
                      getAllSeriesFromDataTable={getAllSeriesFromDataTable}
                      removeProduct={removeProduct}
                      categories={categoriesState}
                    />

                    {selectedProducts.length > 0 && (
                      <div className="mt-4 w-full rounded-md border border-primary/20 bg-primary/5 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                          {amountInWords}
                        </p>
                        <p className="mt-1 text-sm font-medium text-muted-foreground">
                          Total: {normalizedCurrency === 'USD' ? '$' : 'S/.'}{' '}
                          {totalAmount.toFixed(2)}
                        </p>
                      </div>
                    )}

                    <ActionButtons
                      setIsDialogOpen={setIsDialogOpen}
                      isDialogOpen={isDialogOpen}
                      onSubmit={handleConfirm}
                      form={form}
                      onClear={handleClearForm}
                      setSelectedProducts={setSelectedProducts}
                      setCurrentProduct={setCurrentProduct}
                      setQuantity={setQuantity}
                      setValueProduct={setValueProduct}
                      setValueProvider={setValueProvider}
                      setValueStore={setValueStore}
                      setSelectedDate={setSelectedDate}
                      setCurrency={setCurrency}
                      setOpen={setOpen}
                      setOpenProvider={setOpenProvider}
                      setPdfFile={setPdfFile}
                      setPdfGuiaFile={setPdfGuiaFile}
                      router={router}
                      isSubmitting={isSubmitting}
                      onCurrencyToggle={handleCurrencyToggle}
                      currency={currency}
                      isConvertingCurrency={isConvertingCurrency}
                    />
        </fieldset>
        <AlertDialog
          open={isCurrencyDialogOpen}
          onOpenChange={(open) => {
            if (open) {
              setIsCurrencyDialogOpen(true);
            } else {
              cancelCurrencyChange();
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cambiar moneda</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedProducts.length > 0
                  ? `Tienes productos agregados. Â¿Deseas actualizar sus precios a ${
                      pendingCurrency === 'USD'
                        ? 'dÃ³lares (USD)'
                        : pendingCurrency === 'PEN'
                          ? 'soles (PEN)'
                          : 'la moneda seleccionada'
                    }? Se usarÃ¡ el tipo de cambio mÃ¡s reciente disponible.`
                  : 'Â¿Deseas cambiar la moneda seleccionada?'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex w-full sm:w-auto">
                  <AlertDialogCancel
                    onClick={cancelCurrencyChange}
                    disabled={isConvertingCurrency}
                  >
                    Cancelar
                  </AlertDialogCancel>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                MantÃ©n la moneda actual sin aplicar cambios
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex w-full sm:w-auto">
                  <AlertDialogAction
                    onClick={confirmCurrencyChange}
                    disabled={isConvertingCurrency}
                  >
                    {isConvertingCurrency ? 'Actualizando...' : 'Convertir precios'}
                  </AlertDialogAction>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                Confirma el cambio de moneda y actualiza los precios
              </TooltipContent>
            </Tooltip>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
        {isSubmitting && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-black/40">
            <svg className="w-6 h-6 animate-spin text-gray-800 dark:text-white" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span className="ml-2 text-gray-800 dark:text-white">Procesando...</span>
          </div>
        )}
      </form>
    </div>
  )
}

export default EntriesForm


