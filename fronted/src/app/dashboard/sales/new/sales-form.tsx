"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { z } from 'zod'
import { JSX, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Barcode, CalendarIcon, Check, ChevronsUpDown, Loader2, Plus, Save, X } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn, normalizeOptionValue, uploadPdfToServer } from '@/lib/utils'
import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {jwtDecode} from 'jwt-decode';
import { getAuthToken } from "@/utils/auth-token";
import {  getStores } from '../../stores/stores.api'
import { getCategories } from '../../categories/categories.api'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { es } from "date-fns/locale";
import AddClientDialog from '../components/AddClientDialog'
import { createSale, fetchSeriesByProductAndStore, generarYEnviarDocumento, getProductsByStore, getSeriesByProductAndStore, getStockByProductAndStore, sendInvoiceToSunat } from '../sales.api'
import { AddSeriesDialog } from '../components/AddSeriesDialog'
import { SeriesModal } from '../components/SeriesModal'
import { StoreChangeDialog } from '../components/StoreChangeDialog'
import { getRegisteredClients } from '../../clients/clients.api'
import { InvoiceDocument } from '../components/pdf/InvoiceDocument'
import QRCode from 'qrcode';
import { numeroALetrasCustom } from '../components/utils/numeros-a-letras'
import { pdf } from '@react-pdf/renderer';
import { PaymentMethodsModal } from '../components/PaymentMethodsSelector'
import { ProductDetailModal } from '../components/ProductDetailModal'
import { useTenantSelection } from '@/context/tenant-selection-context'
// @ts-ignore
const Numalet = require('numalet');

// Función para obtener el userId del token JWT almacenado en localStorage
async function getUserIdFromToken(): Promise<number | null> {
  const token = await getAuthToken();
  if (!token) {
    console.error('No se encontró un token de autenticación');
    return null;
  }

  try {
    const decodedToken: { sub: number } = jwtDecode(token); // Decodifica el token
    return decodedToken.sub; // Retorna el userId (sub es el estándar en JWT para el ID del usuario)
  } catch (error) {
    console.error('Error al decodificar el token:', error);
    return null;
  }
}

// Define el tipo para los métodos de pago seleccionados
type SelectedPayment = {
  paymentMethodId: number | null;
  amount: number;
  currency: string;
};

//definir el esquema de validacion
const salesSchema = z.object({
  name: z.string({}),
  description: z.string({}),
  createdAt: z.string().optional(), // Campo opcional
  price: z.number({}),
  quantity: z.number({}),
  category_name: z.string({}),
  client_name: z.string({}),
  client_type: z.string({}),
  client_typeNumber: z.string({}),
  store_name: z.string({}),
  store_adress: z.string({}),
  serie: z.string({}),
  nroCorrelativo: z.string({}),
  ruc: z.string({}),
  fecha_emision_comprobante: z.string({}),
  tipoComprobante: z.string({}),
  total_comprobante: z.string({}),
  tipo_moneda: z.string({}),
  stock: z.number({}),
})
//inferir el tipo de dato
export type SalesType = z.infer<typeof salesSchema>;

function buildDefaultSaleValues(sale?: any): SalesType {
  return {
    name: sale?.name ?? "",
    description: sale?.description ?? "",
    createdAt: sale?.createdAt ?? "",
    price: sale?.price ?? 1,
    quantity: sale?.quantity ?? 1,
    category_name: sale?.category_name ?? "",
    client_name: sale?.client_name ?? "",
    client_type: sale?.client_type ?? "",
    client_typeNumber: sale?.client_typeNumber ?? "",
    store_name: sale?.store_name ?? "",
    store_adress: sale?.store_adress ?? "",
    serie: sale?.serie ?? "",
    nroCorrelativo: sale?.nroCorrelativo ?? "",
    ruc: sale?.ruc ?? "",
    fecha_emision_comprobante: sale?.fecha_emision_comprobante ?? "",
    tipoComprobante: sale?.tipoComprobante ?? "",
    total_comprobante: sale?.total_comprobante ?? "",
    tipo_moneda: sale?.tipo_moneda ?? "PEN",
    stock: sale?.stock ?? 0,
  };
}

export function SalesForm({sales, categories}: {sales: any; categories: any}) {

  const initialValues = useMemo(() => buildDefaultSaleValues(sales), [sales]);
  const form = useForm<SalesType>({
    resolver: zodResolver(salesSchema),
    defaultValues: initialValues,
  });
  useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues]);
  const { version } = useTenantSelection();

  // Extraer funciones y estados del formulario
  const { handleSubmit, register, setValue, formState: {errors} } = form;
  useEffect(() => {
    console.log("Errores del formulario:", errors);
  }, [errors]);

  useEffect(() => {
    setCurrency(initialValues.tipo_moneda || "PEN");
    setSelectedDate(
      initialValues.fecha_emision_comprobante
        ? new Date(initialValues.fecha_emision_comprobante)
        : new Date(),
    );
    setCreatedAt(initialValues.createdAt ? new Date(initialValues.createdAt) : null);
  }, [initialValues]);

  // Estado para manejar el archivo PDF
  const router = useRouter();
  const params = useParams<{id: string}>();

  // Estado para manejar el PDF GENERADO A PARTIR DE LA VENTA
  const [showPDF, setShowPDF] = useState(false); // Controla si se muestra el PDF
  const [pdfData, setPdfData] = useState<any>(null); // Almacena los datos para el PDF

  // Función para abrir el PDF en una nueva ventana
  const openPDFInNewWindow = async (documentData: JSX.Element) => {
    const blob = await pdf(documentData).toBlob();
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl);
  };

  // Estado para pagos
  const [payments, setPayments] = useState<SelectedPayment[]>([]); // Define el tipo explícito

  // Estado para manejar el modal de métodos de pago
  const [forceOpenPaymentModal, setForceOpenPaymentModal] = useState(false);

  // MODAL PARA SELECCIONAR SERIES
  const [isDialogOpenSeries, setIsDialogOpenSeries] = useState(false);
  const [series, setSeries] = useState<string[]>([]);
  
  // Estado para manejar el modal de series
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false); // Controla la apertura del modal  
  const [currentSeries, setCurrentSeries] = useState<string[]>([]); // Series del producto actual
  
  // Estado para manejar el combobox de series
  const [availableSeries, setAvailableSeries] = useState<string[]>([]); // Series disponibles
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]); // Series seleccionadas en el modal

  // Estado para controlar la superposición de carga al registrar la venta
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para controlar el diálogo de confirmación del boton REGISTRAR VENTA
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Estado para controlar el AlertDialog de precio 0
  const [isPriceAlertOpen, setIsPriceAlertOpen] = useState(false); // Controla la apertura del AlertDialog
  const [productWithZeroPrice, setProductWithZeroPrice] = useState<{ id: number; name: string } | null>(null); // Almacena el producto con precio 0
  
  // Estado para manejar el modal de detalle de producto en pantallas pequeñas
  const [activeProductIndex, setActiveProductIndex] = useState<number | null>(null);

  // COMBOBOX DE PRODUCTOS
  const [open, setOpen] = React.useState(false)
  const [value, setValueProduct] = React.useState("")
  // Estado para manejar la tienda seleccionada
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);

  // Estado para los productos
  const [products, setProducts] = useState<
    { id: number; name: string; price: number; description: string; categoryId: number; category_name: string; stock: number }[]
  >([]); 

  // Estado para rastrear si el combobox de tiendas ha sido tocado
  const [isStoreChangeDialogOpen, setIsStoreChangeDialogOpen] = useState(false); // Controla la apertura del AlertDialog
  const [pendingStore, setPendingStore] = useState<string | null>(null); // Almacena la tienda seleccionada temporalmente

  // CONTROLAR LA MONEDA
  const [currency, setCurrency] = useState<string>(initialValues.tipo_moneda || "PEN");

  // COMBOBOX DE COMPROBANTE
  const [openInvoice, setOpenInvoice] = useState(false); // Controla si el combobox está abierto
  const [valueInvoice, setValueInvoice] = useState(""); // Almacena el valor seleccionado

  // Estado para controlar si el combobox de clientes está habilitado
  const [isClientDisabled, setIsClientDisabled] = useState(true);

  // Estados para agregar un producto al datatable
  const [selectedProducts, setSelectedProducts] = useState<
    { id: number; name: string; price: number; quantity: number; category_name: string, series?: string[], newSeries?: string }[]
  >([]);
  const [currentProduct, setCurrentProduct] = useState<{ id: number; name: string; price: number; categoryId: number; category_name: string; series?: string[] } | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [stock, setStock] = useState<number>(0);

  const totalAmount = useMemo(() => {
    return selectedProducts.reduce((sum, product) => {
      const price = typeof product.price === 'number' ? product.price : 0;
      const qty = typeof product.quantity === 'number' ? product.quantity : 0;
      return sum + price * qty;
    }, 0);
  }, [selectedProducts]);

  const normalizedCurrency = (currency ?? "PEN") as "PEN" | "USD" | "EUR";

  const totalAmountInWords = useMemo(() => {
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
      USD: { singular: 'DÓLAR AMERICANO', plural: 'DÓLARES AMERICANOS' },
      EUR: { singular: 'EURO', plural: 'EUROS' },
    };

    const currencyLabel = currencyLabels[normalizedCurrency] ?? {
      singular: 'MONEDA',
      plural: 'MONEDAS',
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

  // VARIABLES DE CALENDAR
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    initialValues.fecha_emision_comprobante
      ? new Date(initialValues.fecha_emision_comprobante)
      : new Date(),
  );
  const [openCalendar, setOpenCalendar] = useState(false);
  const [createdAt, setCreatedAt] = useState<Date | null>(
    initialValues.createdAt ? new Date(initialValues.createdAt) : null,
  );

  // COMBOBOX DE TIENDAS
  const [stores, setStores] = useState<{ id: number; 
    name: string, description: string, adress: string }[]>([]); // Estado para as tiendas
  const [openStore, setOpenStore] = React.useState(false)
  const [valueStore, setValueStore] = React.useState("")

  // COMBOBOX DE Clientes
  const [isDialogOpenClient, setIsDialogOpenClient] = useState(false); // Controla la apertura del diálogo
  const [clients, setClients] = useState<{ id: number; 
    name: string, type: string, typeNumber: string }[]>([]); // Estado para los proveedores
  // Cargar los clientes al montar el componente
  const [openClient, setOpenClient] = React.useState(false)
  const [valueClient, setValueClient] = React.useState("")
  const [categoriesState, setCategoriesState] = useState(categories ?? []);
  useEffect(() => {
    setCategoriesState(categories ?? []);
  }, [categories]);
  useEffect(() => {
    let cancelled = false;
    setCategoriesState([]);
    async function fetchCategoriesByTenant() {
      try {
        const nextCategories = await getCategories();
        if (!cancelled) {
          setCategoriesState(Array.isArray(nextCategories) ? nextCategories : []);
        }
      } catch (error) {
        console.error("Error al obtener las categorías:", error);
        if (!cancelled) {
          setCategoriesState([]);
        }
      }
    }
    fetchCategoriesByTenant();
    return () => {
      cancelled = true;
    };
  }, [version]);

  const getCommandValue = (raw: unknown) =>
    typeof raw === "string" ? raw.trim() : raw != null ? String(raw) : "";

  const normalizedSelectedProductValue = useMemo(() => normalizeOptionValue(value), [value]);
  const normalizedSelectedStoreValue = useMemo(() => normalizeOptionValue(valueStore), [valueStore]);
  const normalizedSelectedClientValue = useMemo(() => normalizeOptionValue(valueClient), [valueClient]);

  const selectedProductOption = useMemo(
    () =>
      value
        ? products.find((product) => normalizeOptionValue(product.name) === normalizedSelectedProductValue) ?? null
        : null,
    [products, normalizedSelectedProductValue, value],
  );

  const selectedStoreOption = useMemo(
    () =>
      valueStore
        ? stores.find((store) => normalizeOptionValue(store.name) === normalizedSelectedStoreValue) ?? null
        : null,
    [stores, normalizedSelectedStoreValue, valueStore],
  );

  const selectedClientOption = useMemo(
    () =>
      valueClient
        ? clients.find((client) => normalizeOptionValue(client.name) === normalizedSelectedClientValue) ?? null
        : null,
    [clients, normalizedSelectedClientValue, valueClient],
  );

  const displayedProductName = selectedProductOption?.name ?? value ?? "";
  const displayedStoreName = selectedStoreOption?.name ?? valueStore ?? "";
  const displayedClientName = selectedClientOption?.name ?? valueClient ?? ""

  //handlesubmit para manejar los datos
  const onSubmit = handleSubmit(async (data) => {

  const userId = await getUserIdFromToken(); // Obtén el userId del token

      if (!userId) {
        toast.error("No se pudo obtener el ID del usuario. Por favor, inicie sesión nuevamente.");
        return;
      }
      if (payments.length === 0) {
        toast.error("Debe agregar al menos un método de pago antes de registrar la venta.");
        return;
      }
      if (selectedProducts.length === 0) {
        toast.error("Debe agregar al menos un producto antes de registrar la venta.");
        return;
      }

      // Calcular el total de productos
      const totalProductos = selectedProducts.reduce((sum, product) => {
        return sum + (product.price * product.quantity);
      }, 0);

      // Calcular el total de los métodos de pago
      const totalPagos = payments.reduce((sum, payment) => {
        return sum + payment.amount;
      }, 0);

      // Validar que ambos totales sean iguales (permite pequeña tolerancia)
      const precision = 0.01;
      if (Math.abs(totalProductos - totalPagos) > precision) {
        toast.error(`El monto ingresado en los métodos de pago no coincide con el total de productos.
      Total productos: S/ ${totalProductos.toFixed(2)}
      Total metodo de pagos: S/ ${totalPagos.toFixed(2)}.
      Por favor revise.`);
        setForceOpenPaymentModal(true); // 👈 fuerza la apertura del modal
        return;
      }

    setIsSubmitting(true);

    try{
        // Validar que la tienda exista
        const storeId = stores.find((store) => store.name === data.store_name)?.id; // Encuentra el ID de la tienda seleccionada       
        if (!storeId) {
          toast.error("Debe seleccionar una tienda válida.");
          return;
        } 
           
        // Validar que el cliente exista, excepto si el tipo de comprobante es "SIN COMPROBANTE"
        let clientId = null;
        if (data.tipoComprobante === "SIN COMPROBANTE") {
          // Seleccionar automáticamente el cliente "SIN CLIENTE"
          const sinCliente = clients.find((client) => client.name === "Sin Cliente");
          if (sinCliente) {
            clientId = sinCliente.id;
          } else {
            clientId = null;
            //toast.error("No se encontró el cliente predeterminado 'Sin Ciente'.");
            //return;
          }
        } else {
          // Validar que el cliente exista, excepto si el nombre del cliente es "Sin Cliente"
          if (data.client_name !== "Sin Cliente") {
            clientId = clients.find((client) => client.typeNumber === data.client_typeNumber)?.id;
            if (!clientId) {
              toast.error("Debe seleccionar un cliente válido.");
              return;
            }
          }
          else{
            const sinClient = clients.find((client) => client.name === "Sin Cliente");
            if (sinClient) {
              clientId = sinClient.id;
            } else {
              toast.error("No se encontró el cliente predeterminado 'Sin Cliente'.");
              return;
            }
          }
        }

        // Asegurarse de que clientId no sea null
        if (clientId === null) {
          //toast.error("El cliente no es válido.");
          //return;         
        }

        // Validar que todos los productos tengan valores válidos
        selectedProducts.forEach((product) => {
          if (product.price === undefined || product.quantity === undefined) {
            throw new Error(`El producto "${product.name}" tiene datos incompletos.`);
          }
        });

        // Calcular el total
        const total = selectedProducts.reduce((sum, product) => {
          const productTotal = product.price * product.quantity;
          return sum + (isNaN(productTotal) ? 0 : productTotal); // Asegurarse de que no se sumen valores NaN
        }, 0);


        // Transformar los productos seleccionados al formato esperado
        const transformedDetails = selectedProducts.map((product) => ({
          productId: product.id, // Usar `id` como `productId`
          quantity: product.quantity,
          price: Number(product.price),
          series: product.series || [], // Incluir las series seleccionadas
        }));

        let comprobante: string | null = null;
        let serieInvoice: string | null = null;
        let correlativoInvoice: string | null = null;

        if (data.tipoComprobante === "FACTURA") {
          comprobante = "invoice";
        } else if (data.tipoComprobante === "BOLETA") {
          comprobante = "boleta";
        } else if (data.tipoComprobante === "SIN COMPROBANTE") {
          // Si el tipo de comprobante es "SIN COMPROBANTE", no hacer nada
          console.log("No se requiere comprobante para 'SIN COMPROBANTE'.");
        } else {
          // Si el tipo de comprobante no es válido, lanzar un error
          throw new Error("El tipo de comprobante no es válido.");
        }
        
        // Verificar si comprobante es válido antes de llamar a generarYEnviarDocumento
        if (comprobante) {
          const { respuesta } = await generarYEnviarDocumento({ documentType: comprobante });
          if (!respuesta) {
            throw new Error("La respuesta del backend no contiene los datos esperados.");
          }
          serieInvoice = respuesta.serie; // Obtén la serie de la respuesta o del formulario
          correlativoInvoice = respuesta.correlativo;

          console.log("Serie:", serieInvoice, "Correlativo:", correlativoInvoice);
        } else {
          console.log("No se generó ningún documento porque el tipo de comprobante es 'SIN COMPROBANTE'.");
        }

        let tipoDocumentoFormatted;
        if(data.client_type === "CARNET DE EXTRANJERIA"){
          tipoDocumentoFormatted = 'CE';
        }
        else{
          tipoDocumentoFormatted = data.client_type;
        }

        const payload = {         
          userId,
          storeId,
          clientId,
          total,
          description: data.description,
          payments,
          details: transformedDetails,
          tipoMoneda: data.tipo_moneda,
          source: 'POS',
          ...(data.tipoComprobante !== "SIN COMPROBANTE" && { // Solo incluir si no es "SIN COMPROBANTE"
            tipoComprobante: data.tipoComprobante,
          }),
        };

        const createdSale = await createSale(payload);
        console.log("Datos recibidos en createSale:", payload);

        if (!createdSale || !createdSale.id) {
          throw new Error("No se pudo obtener el ID de la venta creada.");
        }   

        toast.success("Se registro la informacion correctamente."); // Notificación de éxito

        if(data.tipoComprobante != "SIN COMPROBANTE"){
          // Llamar al endpoint para enviar la factura a la SUNAT
          const invoicePayload = {
            saleId: createdSale.id,
            serie: serieInvoice,
            correlativo: correlativoInvoice,
            documentType: comprobante,
            tipoMoneda: data.tipo_moneda,
            total: Number(total),
            fechaEmision: createdAt ? createdAt.toISOString() : new Date().toISOString(),
            cliente: {
              razonSocial: data.client_name,
              ruc: data.client_typeNumber,
              dni: data.client_typeNumber,
              nombre: data.client_name,
              tipoDocumento: tipoDocumentoFormatted,
            },
            emisor: {
              razonSocial: data.store_name,
              adress: data.store_adress,
              ruc: 20519857538,
            },
            items: selectedProducts.map((product) => ({
              cantidad: Number(product.quantity),
              descripcion: product.name,
              series: product.series || [], // Pasar las series al documento
              precioUnitario: Number(product.price),
              subtotal: Number((product.price * product.quantity) / 1.18), // Subtotal sin IGV
              igv: Number((product.price * product.quantity) - (product.price * product.quantity) / 1.18), // IGV
              total: Number(product.price * product.quantity), // Total con IGV
            })),
          };

          console.log("Payload para SUNAT:", invoicePayload);

          const sunatResponse = await sendInvoiceToSunat(invoicePayload);
          console.log("Respuesta de la SUNAT:", sunatResponse);

          // Luego dentro de onSubmit, después de calcular `total`:
          const totalTexto = numeroALetrasCustom(total, 'PEN'); // 'PEN' | 'USD'
          console.log("Importe en letras:", totalTexto); // Verificar el resultado

          // Generar el código QR
          const qrData = `Representación impresa de la ${data.tipoComprobante.toUpperCase()} ELECTRÓNICA\nN° ${data.serie}-${data.nroCorrelativo}`;
          const qrCode = await QRCode.toDataURL(qrData);

          // ✅ Mostrar el PDF en nueva ventana
          await openPDFInNewWindow(
            <InvoiceDocument
              data={{ ...invoicePayload, serie: serieInvoice, correlativo: correlativoInvoice }}
              qrCode={qrCode}
              importeEnLetras={totalTexto}
            />
          );

          const blob = await pdf(
            <InvoiceDocument
              data={{ ...invoicePayload, serie: serieInvoice, correlativo: correlativoInvoice }}
              qrCode={qrCode}
              importeEnLetras={totalTexto}
            />
          ).toBlob();
          
          await uploadPdfToServer({
            blob,
            ruc: 20519857538,
            tipoComprobante: comprobante ?? "SIN_COMPROBANTE", // "boleta" o "invoice"
            serie: serieInvoice!,
            correlativo: correlativoInvoice!,
          });

          setShowPDF(true);

          if (sunatResponse.message && sunatResponse.message.toLowerCase().includes("exitosamente")) {
            toast.success("Factura enviada a la SUNAT correctamente.");
          } else if (sunatResponse.message) {
            toast.error(`Error al enviar la factura a la SUNAT: ${sunatResponse.message}`);
          } else {
            toast.error("Error desconocido al enviar la factura a la SUNAT.");
          }
        }

        router.push("/dashboard/sales");
        router.refresh();
    }
    catch(error: any){
      console.error("Error al registrar la venta o enviar la factura:", error);
      const message = error instanceof Error ? error.message : "Ocurrió un error al guardar la venta.";
      toast.error(message);
    }
    finally {
      setIsSubmitting(false);
    }
  })    
  //

  // Manejar el cambio en el combobox de tipoComprobante
  const handleTipoComprobanteChange = (currentValue: string) => {
    const selectedValue = currentValue === valueInvoice ? "" : currentValue;
    setValueInvoice(selectedValue); // Actualiza el estado local
    form.setValue("tipoComprobante", selectedValue); // Actualiza el formulario
    setOpenInvoice(false); // Cierra el combobox

    // Habilitar o deshabilitar el combobox de clientes según el valor seleccionado
    if (!selectedValue || selectedValue === "SIN COMPROBANTE") {
      setIsClientDisabled(true); // Deshabilita el combobox de clientes
    } else {
      setIsClientDisabled(false); // Habilita el combobox de clientes
    }

    // Limpiar los campos relacionados con el cliente
    setValueClient(""); // Limpia el valor del combobox de cliente
    form.setValue("client_name", ""); // Limpia el nombre del cliente
    form.setValue("client_type", ""); // Limpia el tipo de documento
    form.setValue("client_typeNumber", ""); // Limpia el número de documento
  };
  //

  // Manejar el cambio en el combobox de Tiendas
  const handleStoreChange = (storeIdentifier: string) => {
    const normalizedIdentifier = normalizeOptionValue(storeIdentifier);
    const nextStore =
      stores.find((store) => normalizeOptionValue(store.name) === normalizedIdentifier) ?? null;

    if (!nextStore) {
      console.error("Tienda no encontrada:", storeIdentifier);
      return;
    }

    setValueStore(nextStore.name || "");
    setSelectedStoreId(nextStore.id);
    setValue("store_name", nextStore.name || "");
    setValue("store_adress", nextStore.adress || "");

    setSelectedProducts([]);
    setCurrentProduct(null);
    setQuantity(1);
    setStock(0);
    setValueProduct("");
    setValue("category_name", "");
    setValue("price", 0);
    setValue("description", "");
    setOpenStore(false);
  };
  //

  // Función para eliminar un producto del datatable
  const removeProduct = (id: number) => {
    setSelectedProducts((prev) => prev.filter((product) => product.id !== id));
  };
  //

  // Funcion para agregar productos al datatable
  const addProduct = () => {
    if (!currentProduct) {
      toast.error("No se ha seleccionado ningun producto.");
      return;
    }

    // 🔒 Validar si el precio es 0 o null
    if (!currentProduct.price || currentProduct.price === 0) {
      toast.error("Este producto no tiene un precio asignado. Vuelva a seleccionarlo e ingrese un precio válido.");
      return;
    }

    if (stock < 1) {
      toast.error("El stock disponible para este producto es 0. No se puede agregar más.");
      return;
    }
  
    if (quantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0.");
      return;
    }

    if (quantity > stock) {
      toast.error("La cantidad no puede ser mayor al stock disponible.");
      return;
    }

    if (selectedSeries.length !== quantity) {
      // Si el producto no tiene series, continuar sin validar las series
      console.log("series:", currentProduct.series)
      if (currentProduct.series && currentProduct.series.length > 0){
        toast.error("Debe seleccionar tantas series como la cantidad ingresada.");
        return;
      }else{
        // Si el producto no tiene series, continuar sin validar las series
      console.log("El producto no tiene series, se permite agregarlo sin seleccionarlas.")
      }
    }

    let categoryName = form.getValues("category_name");

    // Verifica si el producto ya está en la lista
    const existingProduct = selectedProducts.find(
      (product) => product.id === currentProduct.id
    );
  
    // Calcula el stock restante después de considerar los productos ya agregados
    const remainingStock = existingProduct
    ? stock - existingProduct.quantity
    : stock;

    if (existingProduct) {
    // Si el producto ya existe, actualiza la cantidad
    setSelectedProducts((prev) =>
      prev.map((product) =>
        product.id === currentProduct.id
          ? { ...product,
            quantity: product.quantity + quantity, 
            series: [...(product.series || []), ...selectedSeries], // Agregar series
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
          quantity,
          category_name: categoryName || "Sin categoria", // Incluye el nombre de la categoría
          series: selectedSeries, // Agregar series
        },
      ]);
      toast.success("Producto agregado al detalle.");
    }

    // Actualiza el stock simulado
    setStock(remainingStock - quantity); // Actualiza el stock simulado
  
    // Limpia el producto actual y la cantidad
    setCurrentProduct(null);
    setQuantity(1);
    // Limpia los inputs relacionados
    setValue("category_name", "");
    setValue("price", 0);
    setValue("description", "");
    setStock(0);
    // Limpia el combobox
    setValueProduct(""); // Restablece el valor del combobox
    setOpen(false); // Cierra el combobox
    // **Limpia las series**
    setSeries([]); // Resetea el estado de las series
    // Limpia las series seleccionadas
    setSelectedSeries([]);
  };
  //

  // Cargar los productos cuando se selecciona una tienda
  useEffect(() => {
    let cancelled = false;

    async function fetchProductsByStore() {
      if (!selectedStoreId) {
        setProducts([]);
        return;
      }

      try {
        const products = await getProductsByStore(selectedStoreId);
        if (cancelled) return;
        const formattedProducts = products
          .map((item: any) => {
            const product = item?.inventory?.product;
            if (!product) return null;

            const category = product.category;
            return {
              id: product.id,
              name: product.name,
              price: product.priceSell ?? 0,
              description: product.description ?? '',
              categoryId: product.categoryId ?? null,
              category_name: category?.name ?? 'Sin categoría',
              stock: item?.stock ?? product.stock ?? 0,
            };
          })
          .filter(Boolean);

        setProducts(formattedProducts);
      } catch (error) {
        console.error('Error al obtener los productos por tienda:', error);
        if (!cancelled) {
          setProducts([]);
        }
      }
    }

    fetchProductsByStore();
    return () => {
      cancelled = true;
    };
  }, [selectedStoreId, version]); // Ejecutar cuando cambie la tienda seleccionada    
  //

  // Cargar los clientes según el tenant
  useEffect(() => {
    let cancelled = false;

    async function fetchClients() {
      try {
        const response = await getRegisteredClients();
        if (!cancelled) {
          setClients(Array.isArray(response) ? response : []);
        }
      } catch (error) {
        console.error('Error al obtener los clientes:', error);
        if (!cancelled) {
          setClients([]);
        }
      }
    }

    setClients([]);
    setValueClient('');
    fetchClients();

    return () => {
      cancelled = true;
    };
  }, [version]);
  //

  // Cargar tiendas según el tenant
  useEffect(() => {
    let cancelled = false;

    async function fetchStoresData() {
      try {
        const storesResponse = await getStores();
        if (!cancelled) {
          setStores(Array.isArray(storesResponse) ? storesResponse : []);
        }
      } catch (error) {
        console.error('Error al obtener las tiendas:', error);
        if (!cancelled) {
          setStores([]);
        }
      }
    }

    setStores([]);
    setValueStore('');
    setSelectedStoreId(null);
    fetchStoresData();

    return () => {
      cancelled = true;
    };
  }, [version]);

  // Actualizar el valor del formulario cuando cambie el estado local
  useEffect(() => {
    form.setValue("tipo_moneda", currency, { shouldValidate: true });
  }, [currency, form]);
  //

  useEffect(() => {
    setShowPDF(false);
    setPdfData(null);
    setPayments([]);
    setForceOpenPaymentModal(false);
    setIsDialogOpen(false);
    setIsDialogOpenSeries(false);
    setIsSeriesModalOpen(false);
    setSeries([]);
    setAvailableSeries([]);
    setSelectedSeries([]);
    setCurrentSeries([]);
    setCurrentProduct(null);
    setSelectedProducts([]);
    setQuantity(1);
    setStock(0);
    setActiveProductIndex(null);
    setProductWithZeroPrice(null);
    setIsPriceAlertOpen(false);
    setOpen(false);
    setOpenStore(false);
    setOpenClient(false);
    setOpenInvoice(false);
    setValueProduct('');
    setValueStore('');
    setValueClient('');
    setSelectedStoreId(null);
    setPendingStore(null);
    setIsStoreChangeDialogOpen(false);
    setCurrency('PEN');
    setValueInvoice('');
    setIsClientDisabled(true);
    setSelectedDate(new Date());
    setCreatedAt(null);
    setStores([]);
    setProducts([]);
    setClients([]);
    form.reset(buildDefaultSaleValues());
  }, [version, form]);

  return (
    <div className="container mx-auto w-full max-w-4xl grid sm:max-w-md md:max-w-lg lg:max-w-4xl">
      {isSubmitting && (
        <div
          aria-live="assertive"
          aria-busy="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-3 rounded-lg bg-card px-6 py-4 text-card-foreground shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-semibold uppercase tracking-[0.35em]">Cargando...</p>
          </div>
        </div>
      )}
      <form className='relative flex flex-col gap-2' onSubmit={onSubmit}>
        <fieldset disabled={isSubmitting} className="contents">                  
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 flex-col border rounded-md p-2">                  
                        <Label className="text-sm font-medium mb-2">Tipo de Comprobante</Label>
                        <Popover open={openInvoice} onOpenChange={setOpenInvoice}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openInvoice}
                              className="w-[260px] justify-between text-xs cursor-pointer"
                              title="Selecciona el tipo de comprobante"
                            >
                              {valueInvoice || "Selecciona un tipo de comprobante..."}
                              <ChevronsUpDown className="opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[260px] p-0">
                            <Command>
                              <CommandInput placeholder="Buscar tipo de comprobante..." />
                              <CommandList>
                                <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                                <CommandGroup>
                                  {["SIN COMPROBANTE", "BOLETA", "FACTURA"].map((type) => (
                                    <CommandItem
                                      key={type}
                                      value={type}
                                      className="cursor-pointer"
                                      onSelect={(currentValue) => {

                                        if (currentValue === valueInvoice) {
                                          setOpenInvoice(false); // Solo cierra el Popover
                                          return;
                                        }

                                        const selectedValue = currentValue === valueInvoice ? "" : currentValue;
                                        setValueInvoice(selectedValue); // Actualiza el estado local
                                        form.setValue("tipoComprobante", selectedValue); // Actualiza el formulario
                                        setOpenInvoice(false); // Cierra el combobox

                                        // Llama a la función handleTipoComprobanteChange
                                        handleTipoComprobanteChange(selectedValue); // Actualiza el estado de habilitación del combobox de clientes
                                      }}
                                    >
                                      {type}
                                      <Check
                                        className={cn(
                                          "ml-auto",
                                          valueInvoice === type ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                      </Popover>
                      <div className="flex justify-between gap-1">                       
                          <Label className="text-sm font-medium py-2 mr-20 sm:mr-12 md:mr-0 xl:mr-12">Fecha de Comprobante</Label>
                      </div>
                      <div className="flex gap-1">                                                                     
                        <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-[260px] justify-start text-left font-normal cursor-pointer",
                                !selectedDate && "text-muted-foreground"
                              )}
                              title="Define la fecha de emisión del comprobante"
                            >
                            <CalendarIcon />
                            {selectedDate
                            ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) // Mostrar la fecha en español
                            : "Selecciona una fecha"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[260px] p-0">
                            <Calendar
                              mode="single"
                              selected={selectedDate || undefined}
                              onSelect={(date) => {
                                setSelectedDate(date || null); // Actualiza la fecha seleccionada
                                setCreatedAt(date || null); // Actualiza el estado de createdAt
                                setValue("createdAt", date ? date.toISOString() : ""); // Actualiza el formulario
                                setOpenCalendar(false); // Cierra el Popover
                              }}
                              locale={es}
                              disabled={(date) => {
                                const today = new Date();
                                const twoDaysAgo = new Date();
                                twoDaysAgo.setDate(today.getDate() - 3); // Calcula la fecha de hace dos días
                                return date > today || date < twoDaysAgo; // Deshabilita fechas futuras y más de dos días atrás
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        </div>
                        <div className="flex justify-between gap-1">
                          <div className="flex flex-col">
                            <Label className="text-sm font-medium py-2">Moneda</Label>
                            <Select
                              value={currency} // Vincula el estado local
                              onValueChange={(value:any) => {
                                setCurrency(value); // Actualiza el estado local
                                form.setValue("tipo_moneda", value, { shouldValidate: true }); // Actualiza el formulario
                               }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona una moneda" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PEN">Soles (PEN)</SelectItem>
                                <SelectItem value="USD">Dólares (USD)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col flex-grow">
                            <Label className="text-sm font-medium py-2">Ingrese Metodo de Pago</Label>
                            <PaymentMethodsModal
                              value={payments}
                              onChange={setPayments}
                              selectedProducts={selectedProducts}
                              forceOpen={forceOpenPaymentModal}
                            />
                          </div>
                        </div>
                    </div>
       
                    <div className="flex-1 flex flex-col border rounded-md p-2">
                        <Label htmlFor="provider-combobox" className="text-sm font-medium mb-2">
                          Ingrese un Cliente:
                        </Label>
                        <div className="flex justify-between gap-1">
                          <Popover open={openClient} onOpenChange={setOpenClient}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openClient}
                                  className="w-[260px] justify-between cursor-pointer"
                                  disabled={isClientDisabled}
                                  title="Selecciona el cliente que realizará la compra"
                                >
                                  {displayedClientName || "Selecciona un cliente..."}
                                  <ChevronsUpDown className="opacity-50" />
                                </Button>                             
                              </PopoverTrigger>
                              <PopoverContent className="w-[260px] p-0">
                                <Command>
                                  <CommandInput 
                                  placeholder="Buscar cliente..."/>
                                  <CommandList>
                                    <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                                    <CommandGroup>
                                      {clients
                                        .filter((client) => {
                                          if (valueInvoice === "FACTURA") {
                                            return client.type === "RUC";
                                          }
                                          if (valueInvoice === "BOLETA") {
                                            return client.type !== "RUC";
                                          }
                                          return true;
                                        })
                                        .map((client) => {
                                          const normalizedClientName = normalizeOptionValue(client.name);
                                          const isSelected = normalizedClientName === normalizedSelectedClientValue;
                                          const commandValue = getCommandValue(client.name);

                                          return (
                                            <CommandItem
                                              key={client.id ?? client.name}
                                              value={commandValue}
                                              className="cursor-pointer"
                                              onSelect={() => {
                                                if (isSelected) {
                                                  setOpenClient(false);
                                                  return;
                                                }

                                                setValueClient(client.name || "");
                                                setValue("client_name", client.name || "");
                                                setValue("client_type", client.type || "");
                                                setValue("client_typeNumber", client.typeNumber || "");
                                                setOpenClient(false);
                                              }}
                                            >
                                              {client.name}
                                              <Check className={cn("ml-auto", isSelected ? "opacity-100" : "opacity-0")} />
                                            </CommandItem>
                                          );
                                        })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <Button className='sm:w-auto sm:ml-2 ml-0
                            bg-green-700 hover:bg-green-800 text-white cursor-pointer' type="button" 
                            disabled={isClientDisabled}
                            onClick={() => setIsDialogOpenClient(true)}
                            title="Registrar un nuevo cliente durante la venta">
                                <Save className="w-6 h-6"/>
                            </Button>
                            <AddClientDialog
                            isOpen={isDialogOpenClient}
                            onClose={() => setIsDialogOpenClient(false)}
                            setClients={setClients}
                            setValue={form.setValue} // Pasar la función para actualizar el formulario principal
                            updateTipoComprobante={(tipoComprobante: string) => {
                              setValueInvoice(tipoComprobante); // Actualiza el estado local del combobox
                              form.setValue("tipoComprobante", tipoComprobante); // Actualiza el formulario
                            }}
                            />   
                          </div>
                          <Label className="text-sm font-medium py-2">Nombre del Cliente</Label>
                          <Input {...register("client_name")} readOnly></Input>     
                          <div className="flex justify-between gap-1">
                            <div className="flex flex-col flex-grow">
                              <Label className="text-sm font-medium py-2">Tipo de Documento</Label>
                              <Input {...register("client_type")} readOnly></Input>
                            </div>
                            <div className="flex flex-col">
                              <Label className="text-sm font-medium py-2">N° de Documento</Label>
                              <Input {...register("client_typeNumber")} readOnly ></Input> 
                            </div>  
                          </div>                          
                        </div>
                                 
                        <div className="flex-1 flex flex-col border border-gray-600 rounded-md p-2">
                        <Label htmlFor="store-combobox" className="text-sm font-medium mb-2">
                          Ingrese una Tienda:
                        </Label>   
                        <div className="flex justify-between gap-1">
                          <Popover open={openStore} onOpenChange={setOpenStore}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openStore}
                                  className="w-[260px] justify-between cursor-pointer"
                                  title="Selecciona la tienda para la venta"
                                >
                                  {displayedStoreName || "Seleccione una Tienda..."}
                                  <ChevronsUpDown className="opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[260px] p-0">
                                <Command>
                                  <CommandInput 
                                  placeholder="Buscar tienda..."/>
                                  <CommandList>
                                    <CommandEmpty>No se encontraron tiendas.</CommandEmpty>
                                    <CommandGroup>
                                      {stores.map((store) => {
                                        const normalizedStoreName = normalizeOptionValue(store.name);
                                        const isSelected = normalizedStoreName === normalizedSelectedStoreValue;
                                        const commandValue = getCommandValue(store.name);

                                        return (
                                          <CommandItem
                                            key={store.id ?? store.name}
                                            value={commandValue}
                                            className="cursor-pointer"
                                            onSelect={() => {
                                              if (isSelected) {
                                                setOpenStore(false);
                                                return;
                                              }

                                              if (selectedProducts.length > 0) {
                                                setPendingStore(store.name || "");
                                                setIsStoreChangeDialogOpen(true);
                                                return;
                                              }

                                              handleStoreChange(store.name || "");
                                            }}
                                          >
                                            {store.name}
                                            <Check className={cn("ml-auto", isSelected ? "opacity-100" : "opacity-0")} />
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>         
                            <StoreChangeDialog
                              isOpen={isStoreChangeDialogOpen}
                              onClose={() => setIsStoreChangeDialogOpen(false)}
                              onConfirm={() => {
                                if (pendingStore) {
                                  handleStoreChange(pendingStore); // Cambia la tienda
                                }
                                setPendingStore(null); // Limpia la tienda pendiente
                              }}
                            />             
                          </div>
                          <Label className="text-sm font-medium py-2">Tienda</Label>
                          <Input {...register("store_name")} readOnly></Input>
                          <Label className="text-sm font-medium py-2">Direccion de la tienda</Label>
                          <Input {...register("store_adress")} readOnly></Input>        
                        </div>
                        <div className='flex-1 flex-col border border-gray-600 rounded-md p-2'> 
                          <Label htmlFor="product-combobox" className="text-sm font-medium mb-2">
                            Ingrese un producto:
                          </Label>
                          <div className="flex gap-1">
                            <Popover open={open} onOpenChange={setOpen}>
                              <PopoverTrigger asChild>
                              <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={open}
                              className="w-[200px] sm:w-[300px] justify-between cursor-pointer"
                              title="Selecciona un producto para agregarlo a la venta"
                            >
                              <span className="truncate max-w-[80%] block">
                                {displayedProductName || "Selecciona un producto..."}
                              </span>
                              <ChevronsUpDown className="opacity-50" />
                            </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[200px] sm:w-[300px] p-0">
                                <Command>
                                  <CommandInput 
                                  placeholder="Buscar producto..."/>
                                  <CommandList>
                                    <CommandEmpty>No se encontraron productos.</CommandEmpty>
                                    <CommandGroup>
                                      {products.map((product) => {
                                        const normalizedProductName = normalizeOptionValue(product.name);
                                        const isSelected = normalizedProductName === normalizedSelectedProductValue;
                                        const commandValue = getCommandValue(product.name);

                                        return (
                                          <CommandItem
                                            key={product.id ?? product.name}
                                            value={commandValue}
                                            className="cursor-pointer"
                                            onSelect={async () => {
                                              if (isSelected) {
                                                setOpen(false);
                                                return;
                                              }

                                              setValueProduct(product.name || "");

                                              const selectedProduct = product;

                                              const existingProduct = selectedProducts.find(
                                                (item) => item.id === selectedProduct.id,
                                              );
                                              let simulatedStock = existingProduct
                                                ? selectedProduct.stock - existingProduct.quantity
                                                : selectedProduct.stock;

                                              if (selectedStoreId) {
                                                try {
                                                  const series = await getSeriesByProductAndStore(
                                                    selectedStoreId,
                                                    selectedProduct.id,
                                                  );

                                                  setCurrentProduct({
                                                    ...selectedProduct,
                                                    series,
                                                  });

                                                  const realStock = await getStockByProductAndStore(
                                                    selectedStoreId,
                                                    selectedProduct.id,
                                                  );

                                                  simulatedStock = existingProduct
                                                    ? realStock - existingProduct.quantity
                                                    : realStock;

                                                  setStock(simulatedStock > 0 ? simulatedStock : 0);

                                                  if (selectedProduct.price === 0 || selectedProduct.price === null) {
                                                    setProductWithZeroPrice({
                                                      id: selectedProduct.id,
                                                      name: selectedProduct.name,
                                                    });
                                                    setIsPriceAlertOpen(true);
                                                    return;
                                                  }
                                                } catch (error) {
                                                  console.error("Error al obtener el stock del producto:", error);
                                                  setCurrentProduct({
                                                    ...selectedProduct,
                                                    series: [],
                                                  });
                                                  setStock(0);
                                                }
                                              } else {
                                                console.warn("No se ha seleccionado una tienda");
                                                setCurrentProduct(null);
                                                setStock(0);
                                              }

                                              const category = categoriesState.find(
                                                (cat: any) => cat.id === selectedProduct.categoryId,
                                              );

                                              setValue(
                                                "category_name",
                                                category?.name || selectedProduct.category_name || "Sin categor??a",
                                              );
                                              setValue("price", selectedProduct.price || 0);
                                              setValue("description", selectedProduct.description || "");
                                              setOpen(false);
                                            }}
                                          >
                                            {product.name}
                                            <Check className={cn("ml-auto", isSelected ? "opacity-100" : "opacity-0")} />
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <Button className='sm:w-auto sm:ml-2 ml-0
                            bg-green-700 hover:bg-green-800 text-white cursor-pointer' type="button" onClick={addProduct} title="Agregar el producto seleccionado a la venta">
                                <span className="hidden sm:block">Agregar</span>
                                <Plus className="w-2 h-2"/>
                            </Button>                            
                            {/* Botón para abrir el modal */}
                            <Button
                              className="sm:w-auto sm:ml-2 ml-0 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                              title="Gestionar series del producto seleccionado"
                              type="button" // Asegúrate de que el botón no envíe el formulario
                              onClick={async () => {
                                if (!currentProduct || !selectedStoreId) {
                                  toast.error("Debe seleccionar un producto y una tienda primero.");
                                  return;
                                }
                            
                                try {
                                  const series = await fetchSeriesByProductAndStore(selectedStoreId, currentProduct.id);
                                  const existingProduct = selectedProducts.find((product) => product.id === currentProduct.id);
                            
                                  // Filtrar las series ya utilizadas
                                  const remainingSeries = existingProduct
                                    ? series.filter((serie: string) => !existingProduct.series?.includes(serie))
                                    : series;
                            
                                  setAvailableSeries(remainingSeries); // Establece las series disponibles
                                  setIsDialogOpenSeries(true); // Abre el modal
                                } catch (error) {
                                  console.error("Error al cargar las series:", error);
                                }
                              }}
                            >
                              <span className="hidden sm:block">Series</span>
                              <Barcode className="w-6 h-6" />
                            </Button> 
                            <AddSeriesDialog
                            isOpen={isDialogOpenSeries}
                            onClose={() => setIsDialogOpenSeries(false)}
                            availableSeries={availableSeries}
                            selectedSeries={selectedSeries}
                            setSelectedSeries={setSelectedSeries}
                            quantity={quantity}
                            />                                        
                                                  
                          </div>                                      
                          <Label className="text-sm font-medium py-2">Categoria</Label>
                          <Input {...register("category_name")} readOnly ></Input>
                          <Label className="text-sm font-medium py-2">Precio de Venta</Label>
                          <Input {...register("price", { valueAsNumber: true })} readOnly
                          step="0.01" // Permite valores con decimales
                          min={0} // Asegura que no se ingresen valores negativos
                          >                        
                          </Input>
                          <Label className="text-sm font-medium py-2">Descripcion</Label>
                          <Input {...register("description")} readOnly></Input>
                          <div className="flex justify-start gap-1">
                            <div className="flex flex-col">
                            <Label className="text-sm font-medium py-2">Cantidad</Label>
                            <Input
                              type="text" // Usamos "text" para tener control total sobre la validación
                              placeholder="Cantidad"
                              value={quantity.toString()} // Convertimos el valor a string para mostrarlo correctamente
                              maxLength={10} // Limitar a 10 caracteres
                              onChange={(e) => {
                                const value = e.target.value;                  
                                // Permitir solo números y un único punto decimal
                                if (/^\d*\.?\d*$/.test(value) && value.length <= 10) {
                                  setQuantity(Number(value)); // Actualizamos el estado con el valor ingresado
                                }
                              }}
                              onBlur={() => {
                                // Validar y convertir el valor a número al salir del campo
                                const numericValue = parseFloat(String(quantity));
                                if (!isNaN(numericValue)) {
                                  setQuantity(numericValue); // Asegurarnos de que el valor sea un número válido
                                } else {
                                  setQuantity(1); // Restablecer a 0 si el valor no es válido
                                }
                              }}
                            />
                            </div>
                            <div className="flex flex-col">
                            <Label className="text-sm font-medium py-2">Stock</Label>
                            <Input
                              type="text" // Usamos "text" para tener control total sobre la validación
                              placeholder="Stock"
                              value={stock !== undefined ? stock.toString() : "0"} // Convertimos el valor a string para mostrarlo correctamente
                              readOnly // Hace que el campo sea de solo lectura
                            />   
                            </div>
                          </div>                     
                        </div>
                  </div>

                    {/* Datatable para mostrar los productos seleccionados */}
                    <div className="border px-1 sm:px-2 overflow-x-auto max-w-full max-h-[280px] overflow-y-auto sm:max-h-none sm:overflow-y-visible">
                      <Table className="w-full min-w-[280px] sm:min-w-[620px] text-xs sm:text-sm table-fixed">
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="text-left w-[104px] truncate py-1.5 sm:py-2">Nombre</TableHead>
                            <TableHead className="text-left hidden sm:table-cell w-[140px] truncate py-1.5 sm:py-2">Categoria</TableHead>
                            <TableHead className="text-left w-[56px] truncate py-1.5 sm:py-2">Cant.</TableHead>
                            <TableHead className="text-left w-[64px] truncate py-1.5 sm:py-2">Prec.</TableHead>
                            <TableHead className="text-left w-[76px] truncate py-1.5 sm:py-2">Total</TableHead>
                            <TableHead className="text-left hidden md:table-cell w-[120px] truncate py-1.5 sm:py-2">Series</TableHead>
                            <TableHead className="text-left w-[52px] truncate py-1.5 sm:py-2">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedProducts.map((product, index) => {
                            const rowTotal = Number(product.price ?? 0) * Number(product.quantity ?? 0);

                            return (
                              <TableRow
                                key={product.id}
                                className="cursor-pointer sm:cursor-default"
                                onClick={() => {
                                  if (window.innerWidth < 640) {
                                    setActiveProductIndex(index);
                                  }
                                }}
                                onDoubleClick={() => {
                                  if (typeof window !== 'undefined' && window.innerWidth >= 640) {
                                    setActiveProductIndex(index);
                                  }
                                }}
                              >
                                <TableCell className="font-semibold w-[92px] sm:w-[140px] truncate whitespace-nowrap overflow-hidden text-[11px] sm:text-xs">
                                  {product.name}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell truncate text-xs">
                                  {product.category_name}
                                </TableCell>
                                <TableCell className="w-[52px] sm:w-[80px] py-1.5 align-top">
                                  <div className="hidden sm:block">
                                    <Input
                                      type="number"
                                      value={product.quantity}
                                      min={1}
                                      onChange={(e) => {
                                        const updatedQuantity = parseInt(e.target.value, 10);
                                        if (updatedQuantity > 0) {
                                          setSelectedProducts((prev) =>
                                            prev.map((p, i) =>
                                              i === index ? { ...p, quantity: updatedQuantity } : p
                                            )
                                          );
                                        }
                                      }}
                                      onDoubleClick={(e) => e.stopPropagation()}
                                      className="h-8 sm:h-9 w-full text-xs sm:text-sm"
                                    />
                                  </div>
                                  <div className="sm:hidden text-[11px] font-medium leading-tight">
                                    {product.quantity}
                                    <p className="text-[10px] text-muted-foreground">Toca para editar</p>
                                  </div>
                                </TableCell>
                                <TableCell className="w-[60px] sm:w-[90px] py-1.5 align-top">
                                  <div className="hidden sm:block">
                                    <Input
                                      type="number"
                                      value={product.price}
                                      min={0}
                                      step="0.01"
                                      onChange={(e) => {
                                        const updatedPrice = parseFloat(e.target.value);
                                        if (updatedPrice >= 0) {
                                          setSelectedProducts((prev) =>
                                            prev.map((p, i) =>
                                              i === index ? { ...p, price: updatedPrice } : p
                                            )
                                          );
                                        }
                                      }}
                                      onDoubleClick={(e) => e.stopPropagation()}
                                      className="h-8 sm:h-9 w-full text-xs sm:text-sm"
                                    />
                                  </div>
                                  <div className="sm:hidden text-[11px] font-medium leading-tight">
                                    S/. {Number(product.price ?? 0).toFixed(2)}
                                  </div>
                                </TableCell>
                                <TableCell className="w-[72px] sm:w-[100px] truncate text-[11px] sm:text-xs">
                                  S/ {rowTotal.toFixed(2)}
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-xs">
                                  <div
                                    className="cursor-pointer text-blue-500 underline"
                                    onClick={() => {
                                      if (product.series && product.series.length > 0) {
                                        setCurrentSeries(product.series); // Establece las series del producto actual
                                        setIsSeriesModalOpen(true); // Abre el modal
                                      } else {
                                        toast.error("Este producto no tiene series asociadas.");
                                      }
                                    }}
                                    onDoubleClick={(e) => e.stopPropagation()}
                                  >
                                    {product.series && product.series.length > 0
                                      ? `${product.series.length} series`
                                      : "Sin series"}
                                  </div>
                                </TableCell>
                                <TableCell className="w-[44px] sm:w-[60px] py-1.5">
                                  <Button
                                    variant="outline"
                                    className="h-8 sm:h-9 px-1 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeProduct(product.id);
                                    }}
                                    onDoubleClick={(e) => e.stopPropagation()}
                                    title="Eliminar este producto de la venta"
                                  >
                                    <X className="w-4 h-4" color="red" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <SeriesModal
                      isOpen={isSeriesModalOpen}
                      onClose={() => setIsSeriesModalOpen(false)}
                      series={currentSeries}
                    />

                    {selectedProducts.length > 0 && totalAmountInWords && (
                      <div className="mt-4 w-full rounded-md border border-primary/20 bg-primary/5 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                          Monto Total: {totalAmountInWords}
                        </p>
                        <p className="mt-1 text-sm font-medium text-muted-foreground">
                          Total: {normalizedCurrency === 'USD' ? '$' : 'S/.'}{' '}
                          {totalAmount.toFixed(2)}
                        </p>
                      </div>
                    )}   

                    <ProductDetailModal
                      product={
                        activeProductIndex !== null
                          ? selectedProducts[activeProductIndex] ?? null
                          : null
                      }
                      onClose={() => setActiveProductIndex(null)}
                      onUpdate={({ quantity, price }) => {
                        if (activeProductIndex === null) return
                        setSelectedProducts((prev) =>
                          prev.map((product, productIndex) =>
                            productIndex === activeProductIndex
                              ? { ...product, quantity, price }
                              : product
                          )
                        )
                      }}
                      onRemove={() => {
                        if (activeProductIndex === null) return
                        removeProduct(selectedProducts[activeProductIndex].id)
                        setActiveProductIndex(null)
                      }}
                      onManageSeries={() => {
                        if (activeProductIndex === null) return
                        const product = selectedProducts[activeProductIndex]
                        if (product.series && product.series.length > 0) {
                          setCurrentSeries(product.series)
                          setIsSeriesModalOpen(true)
                          setActiveProductIndex(null)
                        } else {
                          toast.error("Este producto no tiene series asociadas.")
                        }
                      }}
                    />                   

                    <Button
                    className='mt-4 cursor-pointer'
                    type="button"
                    onClick={() => setIsDialogOpen(true)}
                    title="Abre la confirmación para registrar la venta">
                      Registrar Venta
                    </Button>

                      {/* Diálogo de confirmación */}
                      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Registro</AlertDialogTitle>
                          </AlertDialogHeader>
                          <p>¿Estás seguro de que deseas registrar esta venta?</p>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setIsDialogOpen(false)} className="cursor-pointer" title="Cancelar el registro de la venta">
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction className="cursor-pointer" title="Confirmar y registrar la venta"
                              onClick={() => {
                                setIsDialogOpen(false); // Cerrar el diálogo
                                onSubmit(); // Llamar a la función de envío
                              }}
                            >
                              Confirmar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      {/* ...other buttons like "Limpiar" and "Volver"... */}

                      {/* AlertDialog Previo Venta */}
                      <AlertDialog open={isPriceAlertOpen} onOpenChange={setIsPriceAlertOpen}>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Precio de Venta Requerido</AlertDialogTitle>
                          </AlertDialogHeader>
                          <p>
                            El producto <strong>{productWithZeroPrice?.name}</strong> tiene un precio de venta de <strong>0</strong>. Por favor, ingrese un precio válido.
                          </p>
                          <div className="flex flex-col gap-2 mt-4">
                            <Label className="text-sm font-medium">Nuevo Precio de Venta</Label>
                            <Input
                              type="number"
                              min={0.01}
                              step="0.01"
                              placeholder="Ingrese un precio"
                              onChange={(e) => {
                                const newPrice = parseFloat(e.target.value);
                                if (newPrice > 0) {
                                  setProducts((prev) =>
                                    prev.map((product) =>
                                      product.id === productWithZeroPrice?.id
                                        ? { ...product, price: newPrice }
                                        : product
                                    )
                                  );

                                  // Actualiza el estado de currentProduct
                                  setCurrentProduct((prev) =>
                                    prev && prev.id === productWithZeroPrice?.id
                                      ? { ...prev, price: newPrice }
                                      : prev
                                  );

                                  setValue("price", newPrice); // Actualiza el precio en el formulario
                                }
                              }}
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel
                              onClick={() => setIsPriceAlertOpen(false)}
                              className="cursor-pointer"
                              title="Cancelar sin actualizar el precio"
                            >
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className="cursor-pointer"
                              title="Confirmar el nuevo precio y continuar"
                              onClick={() => {
                                if (productWithZeroPrice) {
                                  const updatedProduct = products.find(
                                    (product) => product.id === productWithZeroPrice.id
                                  );
                                  if (!updatedProduct || updatedProduct.price <= 0) {
                                    toast.error("Debe ingresar un precio válido antes de continuar.");
                                    return;
                                  }
                                  // ✅ Forzar selección del producto después de actualizar su precio
                                  setCurrentProduct({
                                    ...updatedProduct,
                                    series: [], // Aquí puedes conservar series si es necesario
                                  });
                                  setValueProduct(updatedProduct.name); // Fuerza el valor en el combobox
                                }
                                setIsPriceAlertOpen(false); // Cierra el AlertDialog solo al confirmar
                              }}
                            >
                              Confirmar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                    <Button className="cursor-pointer"
                    type="button" // Evita que el botón envíe el formulario
                    onClick={() => {
                        form.reset({
                            name: "",
                            description: "",
                            price: 1,
                            quantity:1 ,
                            category_name: "",
                            client_name: "",
                            client_type: "", 
                            client_typeNumber: "", 
                            store_name: "",
                            store_adress: "",      
                            ruc: "",
                            fecha_emision_comprobante: "",
                            tipoComprobante: "",
                            serie: "",
                            total_comprobante: "",
                        })
                        // Limpia los estados relacionados con productos y proveedores
                        setSelectedProducts([]); // Limpia la lista de productos seleccionados en el datatable
                        setCurrentProduct(null); // Limpia el producto actual
                        setQuantity(1); // Restablece la cantidad a 1
                        setStock(0); // Restablece el stock

                        // Limpia los combobox
                        setValueProduct(""); // Limpia el valor del combobox de productos
                        setValueClient(""); // Limpia el valor del combobox de clientes
                        setValueStore(""); // Limpia el valor del combobox de tiendas
                        setValueInvoice(""); // Limpia el valor del combobox de tipo de comprobantes

                        // Restablece el calendario al día de hoy
                        const today = new Date();
                        setSelectedDate(today); // Actualiza el estado del calendario
                        form.setValue("fecha_emision_comprobante", today.toISOString().split("T")[0]); // Actualiza el valor del formulario

                        // Restablece la moneda a "SOLES (PEN)"
                        setCurrency("PEN"); // Actualiza el estado de la moneda
                        form.setValue("tipo_moneda", "PEN"); // Actualiza el valor del formulario

                        // Cierra los popovers de los combobox
                        setOpen(false); // Cierra el combobox de productos
                        setOpenClient(false); // Cierra el combobox de clientes
                        setOpenStore(false); // Cierra el combobox de tiendas
                        setOpenInvoice(false); // Cierra el combobox de tipo de comprobantes
                    }}  // Restablece los campos del formulario
                    title="Restablece todos los campos del formulario a sus valores iniciales"
                    >
                        Limpiar 
                    </Button>
                    <Button
                    className="cursor-pointer"
                    type="button" // Evita que el botón envíe el formulario
                    onClick={() => router.back()} // Regresa a la página anterior
                    title="Regresa a la vista anterior sin guardar"
                    >
                        Volver
                    </Button>
        </fieldset>       
        </form>
    </div>
  )
}

export default SalesForm

