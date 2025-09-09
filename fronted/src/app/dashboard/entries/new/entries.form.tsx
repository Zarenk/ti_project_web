"use client"

import { useForm } from 'react-hook-form'
import { checkSeries, processPDF } from '../entries.api'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import React from 'react'
import { getProducts } from '../../products/products.api'
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
import { detectInvoiceProvider, processExtractedText, processInvoiceText } from '../utils/pdfExtractor'

// Función para obtener el userId del token JWT almacenado en localStorage
async function getUserIdFromToken(): Promise<number | null> {
  const token = await getAuthToken();
  if (!token) {
    console.error('No se encontró un token de autenticación');
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
  tipo_moneda: z.string({})
})
//inferir el tipo de dato
export type EntriesType = z.infer<typeof entriesSchema>;

export function EntriesForm({entries, categories}: {entries: any; categories: any}) {

    //hook de react-hook-form
    const form = useForm<EntriesType>({
    resolver: zodResolver(entriesSchema),
    defaultValues: {
        name: entries?.name || '',
        description: entries?.description || '',      
        price: entries?.price || 1, // Valor predeterminado para quantity
        priceSell: entries?.priceSell || 1, // Valor predeterminado para quantity
        quantity: entries?.quantity || 1, // Valor predeterminado para quantity
        category_name: entries?.category_name || '', // Valor predeterminado para category_name
        provider_name: entries?.provider_name || '', // Valor predeterminado para provider_name
        provider_adress: entries?.provider_adress || '', // Valor predeterminado para provider_adress
        provider_documentNumber: entries?.provider_documentNumber || '', // Valor predeterminado para provider_documentNumber
        store_name: entries?.store_name || '', // Valor predeterminado para store_name
        store_adress: entries?.store_adress || '', // Valor predeterminado para store_adress
        entry_date: entries?.entry_date ? new Date(entries.entry_date) : new Date(), // Valor predeterminado para entry_date
        entry_description: entries?.entry_description || '', // Valor predeterminado para entry_description
        ruc: entries?.ruc || '', // Valor predeterminado para ruc
        serie: entries?.serie || '', // Valor predeterminado para serie
        nroCorrelativo: entries?.nroCorrelativo || '', // Valor predeterminado para serie
        fecha_emision_comprobante: entries?.fecha_emision_comprobante || '', // Valor predeterminado 
        comprobante: entries?.comprobante || '', // Valor predeterminado
        total_comprobante: entries?.total_comprobante || '', // Valor predeterminado
        tipo_moneda: entries?.total_comprobante || '', // Valor predeterminado
    }
    });

  // Extraer funciones y estados del formulario
  const { handleSubmit, register, setValue, formState: {errors} } = form;

  // Estado para manejar el envío del formulario
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingStores, setLoadingStores] = useState(true);

  // MODAL DE PRODUCTOS
  const [categoriess, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [isDialogOpenProduct, setIsDialogOpenProduct] = useState(false);
  // Estado adicional para manejar el checkbox
  const [isNewCategoryBoolean, setIsNewCategoryBoolean] = useState(false);
 
  // MODAL PARA AGREGAR SERIES
  const [openSeriesModal, setOpenSeriesModal] = useState<number | null>(null);
 
  // Estado para controlar el diálogo de confirmación del boton REGISTRAR VENTA
  const [isDialogOpen, setIsDialogOpen] = useState(false);
 
  // Función para manejar el envío del formulario
  const getAllSeriesFromDataTable = (): string[] => {
    // Suponiendo que `selectedProducts` contiene los productos en el DataTable
    return selectedProducts.flatMap((product) => product.series || []);
  };

  // ESTADO PARA EL TIPO DE CAMBIO
  const [tipoMoneda, setTipoMoneda] = useState<'USD' | 'PEN'>('PEN');
  const [tipoCambioActual, setTipoCambioActual] = useState<number | null>(null);

  // ALERT DIALOG PARA AGREGAR PROVEEDORES
  const [isDialogOpenProvider, setIsDialogOpenProvider] = useState(false); // Estado para controlar el AlertDialog
  //

  // ALERT DIALOG PARA AGREGAR TIENDAS
  const [isDialogOpenStore, setIsDialogOpenStore] = useState(false); // Controla la apertura del diálogo
  //

  // COMBOBOX DE PRODUCTOS
  const [products, setProducts] = useState<{ id: number; 
    name: string, price: number, priceSell: number, description: string, categoryId: number, category_name: string }[]>([]); // Estado para los productos
  const [open, setOpen] = React.useState(false)
  const [value, setValueProduct] = React.useState("")

  // ENVIAR GUIA PDF
  const [pdfGuiaFile, setPdfGuiaFile] = useState<File | null>(null);

  // Función para agregar un producto al datatable
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

  // Estado para manejar el diálogo de confirmación
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
          toast.error(`La serie "${serial}" ya está asociada a otro producto en el sistema.`);
          return false; // Detener el proceso si se encuentra una serie duplicada
        }
      } catch (error) {
        console.error(`Error al verificar la serie "${serial}":`, error);
        toast.error(`Error al verificar la serie "${serial}". Inténtalo nuevamente.`);
        return false; // Detener el proceso si ocurre un error
      }
    }
  
    return true; // Todas las series son válidas
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
  const [currency, setCurrency] = useState<string>(form.getValues("tipo_moneda") || "PEN");

  // Función para eliminar un producto del datatable
  const removeProduct = (id: number) => {
    setSelectedProducts((prev) => prev.filter((product) => product.id !== id));
  };
  //

  //handlesubmit para manejar los datos y el ingreso de los productos
  const onSubmit = handleSubmit(async (data) => {
    if (isSubmitting) return; // ✅ Evita clicks repetidos
    setIsSubmitting(true); // ✅ Bloquea nuevos intentos
    try {
      await handleFormSubmission({
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
        tipoMoneda, // Pasar el tipo de moneda
        tipoCambioActual, // Pasar el tipo de cambio actual
      });
    } finally {
      setIsSubmitting(false); // ✅ Libera el botón cuando termina
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
      // Si es una nueva categoría, usa el valor del input
      categoryName = form.getValues("category_name");
      if (!categoryName || categoryName.trim() === "") {
        toast.error("El nombre de la categoría no puede estar vacío.");
        console.error("El nombre de la categoría está vacío.");
        return;
      }
    } else {
      // Encuentra el nombre de la categoría correspondiente
      const category = categories.find(
        (cat: any) => cat.id === currentProduct.categoryId
      );
      categoryName = category?.name || "Sin categoría";
    }

    // Verifica si el producto ya está en la lista
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
      // Si el producto no existe, agrégalo
      setSelectedProducts((prev) => [
        ...prev,
        {
          id: currentProduct.id,
          name: currentProduct.name,
          price: currentProduct.price,
          priceSell: Number(form.getValues("priceSell") || currentProduct.priceSell),
          quantity,
          category_name: categoryName || "Sin categoria", // Incluye el nombre de la categoría
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
  };
  //

  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (file) {

      if (file.type !== "application/pdf") {
        toast.error("Por favor, sube un archivo PDF válido.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("El archivo no debe exceder los 5 MB.");
        return;
      }
      setPdfFile(file);
      try {
        const extractedText = await processPDF(file); // Llama a la función de la API
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
        toast.error("Por favor, sube un archivo PDF válido.");
        return;
      }
      if (fileGuia.size > 5 * 1024 * 1024) {
        toast.error("El archivo no debe exceder los 5 MB.");
        return;
      }
      setPdfGuiaFile(fileGuia);
      try {
        toast.success("Guía de remisión subida correctamente.");
      } catch (error) {
        console.error('Error al procesar el archivo PDF:', error);
        toast.error('Error al procesar el archivo PDF');
      }
    }
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
    async function fetchProducts() {
      try {
        const products = await getProducts();
        setProducts(products); // Guarda los productos en el estado
      } catch (error) {
        console.error('Error al obtener los productos:', error);
      } finally {
        setLoadingProducts(false);
      }
     }

    fetchProducts();
  }, []);
  //

  // Cargar los proveedores al montar el componente
  useEffect(() => {
    async function fetchProviders() {
      try {
          const providers = await getProviders();
          setProviders(providers); // Guarda los proveedores en el estado
      } catch (error) {
          console.error('Error al obtener los proveedores:', error);
        } finally {
          setLoadingProviders(false);
        }
      }
  
      fetchProviders();
  }, []);
  //

    // Cargar lass tiendas al montar el componente
  useEffect(() => {
    async function fetchStores() {
      try {
          const stores = await getStores();
          setStores(stores); // Guarda las tiendas en el estado
      } catch (error) {
          console.error('Error al obtener las tiendas:', error);
        } finally {
          setLoadingStores(false);
        }
      }
  
      fetchStores();
  }, []);
  //

  // Efecto para ajustar las series cuando cambia la cantidad
  useEffect(() => {
    if (series.length > quantity) {
      // Ajustar el array de series para que no exceda la nueva cantidad
      setSeries((prev) => prev.slice(0, quantity));
      toast.error(`La cantidad de series excedía la nueva cantidad (${quantity}). Se eliminaron las últimas series.`);
    }
  }, [quantity]);

  const isLoading = loadingProducts || loadingProviders || loadingStores;

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
    <div className="mx-auto w-full max-w-4xl px-1 sm:px-2 lg:px-8">
      <form className='relative flex flex-col gap-2' onSubmit={onSubmit}>
        <fieldset disabled={isSubmitting} className='flex flex-col gap-2'>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                    <UploadSection
                      register={register}
                      handlePDFUpload={handlePDFUpload}
                      handlePDFGuiaUpload={handlePDFGuiaUpload}
                      currency={currency}
                      setCurrency={setCurrency}
                      setTipoMoneda={setTipoMoneda}
                      form={form}
                    />
                    <AdditionalInfoSection
                      register={register}
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
                    />
                    <StoreSection
                      openStore={openStore}
                      setOpenStore={setOpenStore}
                      valueStore={valueStore}
                      setValueStore={setValueStore}
                      stores={stores}
                      setValue={form.setValue}
                      register={register}
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
                      categories={categories}
                      setProducts={setProducts}
                      setCategories={setCategories}
                      currentProduct={currentProduct}
                      setCurrentProduct={setCurrentProduct}
                      register={register}
                      setValue={form.setValue}
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
                    />
                  </div>
                    <SelectedProductsTable
                      selectedProducts={selectedProducts}
                      setSelectedProducts={setSelectedProducts}
                      openSeriesModal={openSeriesModal}
                      setOpenSeriesModal={setOpenSeriesModal}
                      getAllSeriesFromDataTable={getAllSeriesFromDataTable}
                      removeProduct={removeProduct}
                    />

                    <ActionButtons
                      setIsDialogOpen={setIsDialogOpen}
                      isDialogOpen={isDialogOpen}
                      onSubmit={handleConfirm}
                      form={form}
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
                    />
        </fieldset>
        {isSubmitting && (
          <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center">
            <svg className="w-6 h-6 animate-spin text-white" viewBox="0 0 24 24">
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
            <span className="ml-2 text-white">Procesando...</span>
          </div>
        )}
      </form>
    </div>
  )
}

export default EntriesForm
