"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { z } from 'zod'
import { JSX, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Barcode, CalendarIcon, Check, ChevronsUpDown, Plus, Save, X } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn, uploadPdfToServer } from '@/lib/utils'
import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {jwtDecode} from 'jwt-decode';
import { getAuthToken } from "@/utils/auth-token";
import {  getStores } from '../../stores/stores.api'
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

export function SalesForm({sales, categories}: {sales: any; categories: any}) {

  //hook de react-hook-form
  const form = useForm<SalesType>({
  resolver: zodResolver(salesSchema),
  defaultValues: {
      name: sales?.name || '',
      description: sales?.description || '',    
      createdAt: sales?.createAt || '',   
      price: sales?.price || 1, // Valor predeterminado para quantity
      quantity: sales?.quantity || 1, // Valor predeterminado para quantity
      category_name: sales?.category_name || '', // Valor predeterminado para category_name
      client_name: sales?.client_name || '', 
      client_type: sales?.client_type || '', 
      client_typeNumber: sales?.client_typeNumber || '', 
      store_name: sales?.store_name || '', 
      store_adress: sales?.store_adress || '', 
      ruc: sales?.ruc || '', // Valor predeterminado para ruc
      serie: sales?.serie || '', // Valor predeterminado para serie
      nroCorrelativo: sales?.nroCorrelativo || '', // Valor predeterminado para serie
      fecha_emision_comprobante: sales?.fecha_emision_comprobante || '', // Valor predeterminado 
      tipoComprobante: sales?.tipoComprobante || '', // Valor predeterminado
      total_comprobante: sales?.total_comprobante || '', // Valor predeterminado
      tipo_moneda: sales?.total_comprobante || '', // Valor predeterminado
      stock: sales?.stock || 0,
    }
  });

  // Extraer funciones y estados del formulario
  const { handleSubmit, register, setValue, formState: {errors} } = form;
  useEffect(() => {
    console.log("Errores del formulario:", errors);
  }, [errors]);

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
  
  // Estado para controlar el diálogo de confirmación del boton REGISTRAR VENTA
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Estado para controlar el AlertDialog de precio 0
  const [isPriceAlertOpen, setIsPriceAlertOpen] = useState(false); // Controla la apertura del AlertDialog
  const [productWithZeroPrice, setProductWithZeroPrice] = useState<{ id: number; name: string } | null>(null); // Almacena el producto con precio 0
  
  // Estado para manejar el AlertDialog de la tabla productos pantalla chicas
  const [selectedProductDetail, setSelectedProductDetail] = useState<typeof selectedProducts[0] | null>(null);

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
  const [currency, setCurrency] = useState<string>(form.getValues("tipo_moneda") || "PEN");

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

  // VARIABLES DE CALENDAR
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [openCalendar, setOpenCalendar] = useState(false);
  const [createdAt, setCreatedAt] = useState<Date | null>(null);

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
      toast.error("Ocurrió un error al guardar la venta.")      
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
  const handleStoreChange = (storeName: string) => {
    setValueStore(storeName === valueStore ? "" : storeName);
    const selectedStore = stores.find((store) => String(store.name) === storeName);
    
    if (selectedStore) {
      // Actualiza los valores de los campos relacionados con la tienda
      setSelectedStoreId(selectedStore.id); // Actualiza el ID de la tienda seleccionada
      setValue("store_name", selectedStore.name || "");
      setValue("store_adress", selectedStore.adress || "");
    
      // Limpia los campos relacionados con los productos
      setSelectedProducts([]); // Limpia la lista de productos seleccionados
      setCurrentProduct(null); // Limpia el producto actual
      setQuantity(1); // Restablece la cantidad a 1
      setStock(0); // Restablece el stock a 0
      setValueProduct(""); // Limpia el valor del combobox de productos
      setValue("category_name", ""); // Limpia el input de categoría
      setValue("price", 0); // Limpia el input de precio
      setValue("description", ""); // Limpia el input de descripción
    } else {
      console.error("Tienda no encontrada:", storeName);
    }
    
    setOpenStore(false); // Cierra el combobox de tiendas
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

    async function fetchProductsByStore() {
      if (!selectedStoreId) return; // Si no hay tienda seleccionada, no hacer nada

      try {
        const products = await getProductsByStore(selectedStoreId);
        // Mapea los datos para adaptarlos al formato esperado
        const formattedProducts = products.map((item: any) => ({
          id: item.inventory.product.id,
          name: item.inventory.product.name,
          price: item.inventory.product.priceSell,
          description: item.inventory.product.description,
          categoryId: item.inventory.product.categoryId,
          category_name: item.inventory.product.category.name,
        }));
        setProducts(formattedProducts); // Actualiza el estado con los productos
      } catch (error) {
        console.error('Error al obtener los productos por tienda:', error);
      }
    }

      fetchProductsByStore();
    }, [selectedStoreId]); // Ejecutar cuando cambie la tienda seleccionada    
  //

  // Cargar los proveedores al montar el componente
  useEffect(() => {
    async function fetchClients() {
      try {
          const clients = await getRegisteredClients();
          setClients(clients); // Guarda los proveedores en el estado
      } catch (error) {
          console.error('Error al obtener los clientes:', error);
        }
      }
      fetchClients();
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
        }
      }
  
      fetchStores();
  }, []);

  // Actualizar el valor del formulario cuando cambie el estado local
  useEffect(() => {
    form.setValue("tipo_moneda", currency, { shouldValidate: true });
  }, [currency, form]);
  //

  return (
    <div className="container mx-auto w-full max-w-4xl grid sm:max-w-md md:max-w-lg lg:max-w-4xl">
      <form className='flex flex-col gap-2' onSubmit={onSubmit}>
                    
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 flex-col border rounded-md p-2">                       
                        <Label className="text-sm font-medium mb-2">Tipo de Comprobante</Label>
                        <Popover open={openInvoice} onOpenChange={setOpenInvoice}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openInvoice}
                              className="w-[260px] justify-between text-xs"
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
                                "w-[260px] justify-start text-left font-normal",
                                !selectedDate && "text-muted-foreground"
                              )}
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
                              onValueChange={(value) => {
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
                                  className="w-[260px] justify-between"
                                  disabled={isClientDisabled}
                                >
                                  {valueClient
                                    ? clients.find((client) => String(client.name) === valueClient)?.name
                                    : "Selecciona un cliente..."}
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
                                          // Mostrar solo clientes con type "RUC" si el tipo de comprobante es FACTURA
                                          if (valueInvoice === "FACTURA") {
                                            return client.type === "RUC";
                                          }
                                          // Excluir clientes con type "RUC" si el tipo de comprobante es BOLETA
                                          if (valueInvoice === "BOLETA") {
                                            return client.type !== "RUC";
                                          }
                                          return true; // Mostrar todos los clientes en otros casos
                                        })
                                        .map((client) => (
                                        <CommandItem
                                          key={client.name}
                                          value={client.name}
                                          onSelect={(currentValue) => {
                                            setValueClient(currentValue === valueClient ? "" : currentValue)
                                            const selectedClient = clients.find(
                                              (client) => String(client.name) === currentValue
                                            );
                                            if (selectedClient) {
                                              // Actualiza los valores de los campos relacionados
                                              setValue("client_name", selectedClient.name || "");
                                              setValue("client_type", selectedClient.type || "");
                                              setValue("client_typeNumber", selectedClient.typeNumber || "");
                                              setValueClient(selectedClient.name); // Actualiza el valor del combobox
                                            } 
                                            else {
                                              console.error("Cliente no encontrado:", currentValue);
                                            }
                                            setOpenClient(false)
                                          }}
                                        >
                                          {client.name}
                                          <Check
                                            className={cn(
                                              "ml-auto",
                                              valueClient === client.name ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <Button className='sm:w-auto sm:ml-2 ml-0
                            bg-green-700 hover:bg-green-800 text-white' type="button" 
                            disabled={isClientDisabled}
                            onClick={() => setIsDialogOpenClient(true)}>
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
                                  className="w-[260px] justify-between"
                                >
                                  {valueStore
                                    ? stores.find((store) => String(store.name) === valueStore)?.name
                                    : "Seleccione una Tienda..."}
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
                                      {stores.map((store) => (
                                        <CommandItem
                                          key={store.name}
                                          value={store.name}
                                          onSelect={(currentValue) => {

                                            // Si la tienda seleccionada es la misma que la actual, no hacer nada
                                            if (currentValue === valueStore) {
                                              console.log("La tienda seleccionada es la misma. No se realiza ninguna acción.");
                                              return;
                                            }

                                            if (selectedProducts.length > 0) {
                                              // Si hay registros en la tabla, abre el AlertDialog
                                              setPendingStore(currentValue); // Almacena la tienda seleccionada temporalmente
                                              setIsStoreChangeDialogOpen(true); // Abre el AlertDialog
                                              return;
                                            }
                                        
                                            // Si no hay registros, cambia directamente la tienda
                                            handleStoreChange(currentValue);

                                            setValueStore(currentValue === valueStore ? "" : currentValue)
                                            const selectedStore = stores.find(
                                              (store) => String(store.name) === currentValue
                                            );
                                            // Log para depurar
                                            console.log("Tienda seleccionada:", selectedStore);
                                            if (selectedStore) {
                                              // Actualiza los valores de los campos relacionados
                                              setSelectedStoreId(selectedStore.id); // Actualiza el ID de la tienda seleccionada
                                              setValue("store_name", selectedStore.name || "");
                                              setValue("store_adress", selectedStore.adress || "");

                                              // Limpia los campos relacionados con los productos
                                              setSelectedProducts([]); // Limpia la lista de productos seleccionados
                                              setCurrentProduct(null); // Limpia el producto actual
                                              setQuantity(1); // Restablece la cantidad a 1
                                              setStock(0); // Restablece el stock a 0
                                              setValueProduct(""); // Limpia el valor del combobox de productos
                                              setValue("category_name", ""); // Limpia el input de categoría
                                              setValue("price", 0); // Limpia el input de precio
                                              setValue("description", ""); // Limpia el input de descripción
                                            } 
                                            else {
                                              console.error("Tienda no encontrada:", currentValue);
                                            }
                                            setOpenStore(false)
                                          }}
                                        >
                                          {store.name}
                                          <Check
                                            className={cn(
                                              "ml-auto",
                                              valueStore === store.name ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                        </CommandItem>
                                      ))}
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
                              className="w-[200px] sm:w-[300px] justify-between"
                            >
                              <span className="truncate max-w-[80%] block">
                                {value
                                  ? products.find((product) => String(product.name) === value)?.name
                                  : "Selecciona un producto..."}
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
                                      {products.map((product) => (
                                        <CommandItem
                                          key={product.name}
                                          value={product.name}
                                          onSelect={async (currentValue) => {

                                            if (currentValue === value) {
                                              setOpen(false); // Solo cierra el Popover
                                              return;
                                            }

                                            setValueProduct(currentValue === value ? "" : currentValue)
                                            const selectedProduct = products.find(
                                              (product) => String(product.name) === currentValue
                                            );
                                          
                                            if (selectedProduct) {
                                           
                                              // Calcula el stock restante considerando los productos ya agregados
                                              const existingProduct = selectedProducts.find(
                                                (product) => product.id === selectedProduct.id
                                              );
                                              let simulatedStock = existingProduct
                                                ? selectedProduct.stock - existingProduct.quantity
                                                : selectedProduct.stock;

                                              if (selectedStoreId) {
                                                try {
                                                  // Obtén las series del producto desde el backend
                                                  const series = await getSeriesByProductAndStore(selectedStoreId, selectedProduct.id);

                                                  // Actualiza el estado del producto actual con las series
                                                  setCurrentProduct({
                                                    ...selectedProduct,
                                                    series, // Agrega las series al producto actual
                                                  });
                                                  // Obtiene el stock real desde el backend
                                                  const realStock = await getStockByProductAndStore(selectedStoreId, selectedProduct.id);
                                            
                                                  // Calcula el stock restante simulando las cantidades ya agregadas
                                                  simulatedStock = existingProduct
                                                    ? realStock - existingProduct.quantity
                                                    : realStock;
                                            
                                                  setStock(simulatedStock > 0 ? simulatedStock : 0);

                                                  if (selectedProduct.price === 0 || selectedProduct.price === null) {
                                                    setProductWithZeroPrice({ id: selectedProduct.id, name: selectedProduct.name }); // Almacena el producto con precio 0 o null
                                                    setIsPriceAlertOpen(true); // Abre el AlertDialog
                                                    return; // Detiene la ejecución hasta que el usuario ingrese un precio válido
                                                  }

                                                  } catch (error) {
                                                    console.error('Error al obtener el stock del producto:', error);
                                                    setCurrentProduct({
                                                      ...selectedProduct,
                                                      series: [], // Si hay un error, establece las series como un array vacío
                                                    });
                                                    setStock(0); // Si hay un error, establece el stock en 0
                                                  }
                                              } else {
                                                  console.warn('No se ha seleccionado una tienda');
                                                  setCurrentProduct(null);
                                                  setStock(0); // Si no hay tienda seleccionada, establece el stock en 0
                                              }

                                              // Encuentra el nombre de la categoría correspondiente
                                              const category = categories.find(
                                                (cat:any) => cat.id === selectedProduct.categoryId
                                              );   

                                              // Actualiza los valores de los inputs relacionados
                                              setValue("category_name", category?.name || selectedProduct.category_name || "Sin categoría");
                                              setValue("price", selectedProduct.price || 0);
                                              setValue("description", selectedProduct.description || "");
                                            } else {
                                              console.error("Producto no encontrado:", currentValue);
                                              setStock(0); // Si no se encuentra el producto, establece el stock en 0
                                            }
                                          
                                            setOpen(false); // Cierra el combobox
                                          }}
                                        >
                                          {product.name}
                                          <Check
                                            className={cn(
                                              "ml-auto",
                                              value === product.name ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <Button className='sm:w-auto sm:ml-2 ml-0
                            bg-green-700 hover:bg-green-800 text-white' type="button" onClick={addProduct}>
                                <span className="hidden sm:block">Agregar</span>
                                <Plus className="w-2 h-2"/>
                            </Button>                            
                            {/* Botón para abrir el modal */}
                            <Button
                              className="bg-blue-600 hover:bg-blue-700 text-white className='sm:w-auto sm:ml-2 ml-0"
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
                    <div className='border px-2 overflow-x-auto w-full'>
                      <Table className="w-full text-sm">
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="text-left w-[100px] max-w-[100px] sm:w-[200px] sm:max-w-[200px] truncate whitespace-nowrap overflow-hidden">Nombre</TableHead>
                            <TableHead className="text-left hidden sm:table-cell w-[100px] truncate">Categoria</TableHead>
                            <TableHead className="text-left md:table-cell w-[100px] truncate">Cantidad</TableHead>
                            <TableHead className="text-left md:table-cell w-[100px] truncate">Precio</TableHead>    
                            <TableHead className="text-left hidden sm:table-cell w-[100px] truncate">Series</TableHead>                    
                            <TableHead className="text-left w-[100px] truncate">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedProducts.map((product, index) => (
                            <TableRow
                            key={product.id}
                            className="cursor-pointer md:cursor-default"
                            onClick={() => {
                              if (window.innerWidth < 768) {
                                setSelectedProductDetail(product); // solo para móviles
                              }
                            }}
                            >
                              <TableCell className="font-semibold w-[100px] max-w-[100px] sm:w-[200px] sm:max-w-[200px] truncate whitespace-nowrap overflow-hidden">{product.name}</TableCell>
                              <TableCell className="hidden sm:table-cell truncate">{product.category_name}</TableCell>
                              <TableCell className="truncate">
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
                                  className="w-full"
                                />
                              </TableCell>
                              <TableCell className="truncate">
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
                              className="w-full"
                              />
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
                                  >
                                  {product.series && product.series.length > 0
                                    ? `${product.series.length} series`
                                    : "Sin series"}
                                </div>
                              </TableCell>
                              <SeriesModal
                                isOpen={isSeriesModalOpen}
                                onClose={() => setIsSeriesModalOpen(false)}
                                series={currentSeries}
                              />                                 
                              <TableCell className="">
                                <Button
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeProduct(product.id)
                                  }}
                                >
                                <X className="w-4 h-4" color="red"/>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>     
                    </div>      

                    {selectedProductDetail && (
                      <ProductDetailModal
                        product={selectedProductDetail}
                        onClose={() => setSelectedProductDetail(null)}
                      />
                    )}                    

                    <Button className='mt-4' type="button"
                    onClick={() => setIsDialogOpen(true)}>
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
                            <AlertDialogCancel onClick={() => setIsDialogOpen(false)}>
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
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
                            <AlertDialogCancel onClick={() => setIsPriceAlertOpen(false)}>
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
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

                    <Button className=''
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
                    >
                        Limpiar
                    </Button>
                    <Button 
                    className=""
                    type="button" // Evita que el botón envíe el formulario
                    onClick={() => router.back()} // Regresa a la página anterior
                    >
                        Volver
                    </Button>
                    
        </form>
    </div>
  )
}

export default SalesForm
