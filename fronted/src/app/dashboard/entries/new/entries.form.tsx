"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { createEntry, processPDF, uploadGuiaPdf, uploadPdf } from '../entries.api'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Barcode, Check, ChevronsUpDown, FileText, Plus, Printer, Save, TrashIcon, X } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import React from 'react'
import { createProduct, getProducts, verifyOrCreateProducts } from '../../products/products.api'
import { checkProviderExists, createProvider, getProviders } from '../../providers/providers.api'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {jwtDecode} from 'jwt-decode';
import { checkStoreExists, createStore, getStores } from '../../stores/stores.api'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { createCategory } from '../../categories/categories.api'
import AddStoreDialog from '../components/AddStoreDialog'
import AddProviderDialog from '../components/AddProviderDialog'
import { AddSeriesDialog } from '../components/AddSeriesDialog'
import AddProductDialog from '../components/AddProductDialog'
import { EditSeriesModal } from '../components/EditSeriesModal'

// Función para obtener el userId del token JWT almacenado en localStorage
function getUserIdFromToken(): number | null {
  const token = localStorage.getItem('token'); // Obtén el token del localStorage
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

//definir el esquema de validacion
const entriesSchema = z.object({
  name: z.string({}),
  description: z.string({}),
  price: z.number({}),
  quantity: z.number({}),
  category_name: z.string({}),
  provider_name: z.string({}),
  provider_adress: z.string({}),
  store_name: z.string({}),
  store_adress: z.string({}),
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
        quantity: entries?.quantity || 1, // Valor predeterminado para quantity
        category_name: entries?.category_name || '', // Valor predeterminado para category_name
        provider_name: entries?.provider_name || '', // Valor predeterminado para provider_name
        provider_adress: entries?.provider_adress || '', // Valor predeterminado para provider_adress
        store_name: entries?.store_name || '', // Valor predeterminado para store_name
        store_adress: entries?.store_adress || '', // Valor predeterminado para store_adress
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
  useEffect(() => {
    console.log("Errores del formulario:", errors);
  }, [errors]);

  // Estado para manejar el archivo PDF
  const router = useRouter();
  const params = useParams<{id: string}>();

  // Estado para manejar el error del nombre si se repite
  const [nameError, setNameError] = useState<string | null>(null);

  //handlesubmit para manejar los datos
  const onSubmit = handleSubmit(async (data) => {
  console.log("onSubmit ejecutado con datos:", data); // Depuración

  const userId = getUserIdFromToken(); // Obtén el userId del token
      if (!userId) {
        toast.error("No se pudo obtener el ID del usuario. Por favor, inicie sesión nuevamente.");
        return;
      }

    try{
        // Validar que la tienda exista
        const storeId = stores.find((store) => store.name === data.store_name)?.id; // Encuentra el ID de la tienda seleccionada       
        if (!storeId) {
          toast.error("Debe seleccionar una tienda válida.");
          return;
        }    
        // Validar que haya productos seleccionados
        if (selectedProducts.length === 0) {
          toast.error("Debe agregar al menos un producto al registro.");
          return;
        } 

        let providerIdBoolean: number | null = null;

        if(isNewInvoiceBoolean){
            const providerIdBooleanCheck = providers.find((provider) => provider.name === data.provider_name)?.id; // Encuentra el ID del proveedor seleccionado
            if (providerIdBooleanCheck) {
              providerIdBoolean = providerIdBooleanCheck; // Asignar el ID del proveedor existente
            }
            else{
              const createdProvider = await createProvider({
                name: form.getValues("provider_name"),
                adress: form.getValues("provider_adress"),
                description: "Proveedor creado automáticamente desde el PDF",
              });
              if (createdProvider && createdProvider.id) {
                providerIdBoolean = createdProvider.id; // Asignar el ID del proveedor creado
                toast.success("Proveedor creado correctamente.");
              }
              else {
                throw new Error("No se pudo crear el proveedor. Verifique los datos.");
              }
            }
        }

        // Validar que el proveedor exista
        let providerId = providers.find((provider) => provider.name === data.provider_name)?.id; // Encuentra el ID del proveedor seleccionado        
        if (!providerId) {
            if(!providerIdBoolean){
              toast.error("Debe seleccionar un proveedor válido.");
              return;
            }
            else{
              providerId = providerIdBoolean
            }
        }     

        // Verificar o crear productos faltantes
        const productsToVerify = selectedProducts.map((product) => ({
          name: product.name,
          price: product.price,
          quantity: product.quantity,
          categoryId: categories.find((cat: any) => cat.name === product.category_name)?.id || null,
        }));

        const verifiedProducts = await verifyOrCreateProducts(productsToVerify);
        console.log("Productos verificados o creados:", verifiedProducts);
       
        // Mapear los productos verificados para obtener sus IDs
        const updatedProducts = selectedProducts.map((product) => {
          const verifiedProduct = verifiedProducts.find((vp: any) => vp.name === product.name);
          if (!verifiedProduct) {
            console.error(`Error: No se encontró un ID para el producto con nombre: ${product.name}`);
            throw new Error(`No se encontró un ID para el producto con nombre: ${product.name}`);
          }

          return {
            productId: verifiedProduct.id, // Usar el ID del producto verificado
            quantity: product.quantity > 0 ? product.quantity : 1, // Asegúrate de que quantity sea mayor a 0
            price: product.price > 0 ? product.price : 1, // Asegúrate de que price sea mayor a 0
            series: product.series || [], // Agregar las series asociadas
          };
        });

        console.log("Estado de selectedProducts antes de enviar:", selectedProducts);

        // Prepara el payload para enviar al backend
        const payload = {
          storeId,
          userId,
          providerId, // ID del proveedor seleccionado
          description: data.description,
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

        console.log("Payload enviado al backend:", payload);
        const createdEntry = await createEntry(payload);
        if (!createdEntry || !createdEntry.id) {
          throw new Error("No se pudo obtener el ID de la entrada creada.");
        }

        console.log("Entrada creada con ID:", createdEntry.id);
        
        if (pdfFile) {
          await uploadPdf(createdEntry.id, pdfFile);
        }

        if (pdfGuiaFile) {
          await uploadGuiaPdf(createdEntry.id, pdfGuiaFile);  
        }

        toast.success("Se registro la informacion correctamente."); // Notificación de éxito
        router.push("/dashboard/entries");
        router.refresh();        
    }
    catch(error: any){
      console.error("Error al crear/actualizar la entrada:", error);
      toast.error("Ocurrió un error al guardar la entrada.")
    }
        
  })      
  //

  // COMBOBOX DE PRODUCTOS
    const [products, setProducts] = useState<{ id: number; 
    name: string, price: number, description: string, categoryId: number, category_name: string }[]>([]); // Estado para los productos
    const [open, setOpen] = React.useState(false)
    const [value, setValueProduct] = React.useState("")
    // Cargar los productos al montar el componente
    useEffect(() => {
      async function fetchProducts() {
        try {
          const products = await getProducts();
          setProducts(products); // Guarda los productos en el estado
        } catch (error) {
          console.error('Error al obtener los productos:', error);
        }
      }

      fetchProducts();
    }, []);
  //

  // COMBOBOX DE Proveedores
    const [providers, setProviders] = useState<{ id: number; 
    name: string, description: string, adress: string }[]>([]); // Estado para los proveedores
    const [openProvider, setOpenProvider] = React.useState(false)
    const [valueProvider, setValueProvider] = React.useState("")
    // Estado para rastrear si el combobox de proveedores ha sido tocado
    const [isProviderComboTouched, setIsProviderComboTouched] = useState(false);
    // Cargar los proveedores al montar el componente
    useEffect(() => {
      async function fetchProviders() {
        try {
            const providers = await getProviders();
            setProviders(providers); // Guarda los proveedores en el estado
        } catch (error) {
            console.error('Error al obtener los proveedores:', error);
          }
        }
  
        fetchProviders();
    }, []);
  //

   // COMBOBOX DE TIENDAS
    const [stores, setStores] = useState<{ id: number; 
    name: string, description: string, adress: string }[]>([]); // Estado para as tiendas
    const [openStore, setOpenStore] = React.useState(false)
    const [valueStore, setValueStore] = React.useState("")
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
  //

  // Función para agregar un producto al datatable
  const [selectedProducts, setSelectedProducts] = useState<
  { id: number; name: string; price: number; quantity: number; category_name: string, series?: string[], newSeries?: string }[]
  >([]);
  const [currentProduct, setCurrentProduct] = useState<{ id: number; name: string; price: number, categoryId: number, category_name:string } | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

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
      // Si el producto ya existe, actualiza la cantidad
      setSelectedProducts((prev) =>
        prev.map((product) =>
          product.id === currentProduct.id
            ? { ...product,
              quantity: product.quantity + quantity, 
              series: [...(product.series || []), ...(series || [])], // Agregar series
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
    setValue("description", "");
    // Limpia el combobox
    setValueProduct(""); // Restablece el valor del combobox
    setOpen(false); // Cierra el combobox
    // **Limpia las series**
    setSeries([]); // Resetea el estado de las series
  };
  //

  // Función para eliminar un producto del datatable
  const removeProduct = (id: number) => {
    setSelectedProducts((prev) => prev.filter((product) => product.id !== id));
  };
  //

  // BUSCAR PATRONES EN EL PDF
    const processExtractedText = (text: string) => {
    console.log("Procesando texto extraído:", text);

    // Expresión regular para capturar productos
    // Dividir el texto en líneas para procesarlo línea por línea
    const lines = text.split("\n").map((line) => line.trim());
    console.log("Procesando texto extraído:", lines);
    const products: { name: string; quantity: number; unitPrice: number; totalPrice: number }[] = [];

    let currentProduct = {
      name: "",
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0,
    };

    // PRIMER BLOQUE
    for (let i = 0; i < lines.length; i++) {

      let line = lines[i];
      const nextLine = lines[i + 1] || ""; // Línea siguiente para verificar contexto

      // Lista de palabras irrelevantes
      const irrelevantWords = ["LLEVATE", "GRATIS", "MONITORES", "DOCUMENTO", "ANTICIPADO", "REGALO"];

      // Eliminar palabras irrelevantes
      irrelevantWords.forEach((word) => {
       const regex = new RegExp(`\\b${word}\\b`, "gi"); // Coincide con la palabra completa, sin importar mayúsculas/minúsculas
       line = line.replace(regex, "").trim();
      });

      // Ignorar líneas irrelevantes
      if (
        line.length < 5 || // Ignorar líneas demasiado cortas
        line.match(/^(TOTAL|IGV|DOCUMENTOS|R\.?U\.?C\.?|FACTURA|FECHA|LLEVAR|AHEEE|BNFFF|APBBBP|HHHHH|ProductoTotalCantidadUnidadCodigo|Precio|Unitario|Valor|Descuentos|OBSERVACIONES|Número de Pedido|Orden de Compra|Ver\.)/i) || // Ignorar líneas irrelevantes
        /^[A-Z]{5,}$/.test(line) || // Ignorar líneas con solo letras mayúsculas largas irrelevantes
        /^\d+(\.\d{2})?$/.test(line) || // Ignorar líneas que contienen solo números (precios)
        /^[A-Z0-9]{10,}$/i.test(line) || // Ignorar líneas alfanuméricas largas sin guiones
        /^[A-Z0-9-]{10,}$/i.test(line) || // Ignorar líneas alfanuméricas largas con guiones
        /^\d{4}-\d{2}-\d{2}Dolares Americanos$/i.test(line) ||// Ignorar líneas con el patrón "YYYY-MM-DDDolares Americanos"
        (!line.includes(" ") && /^[A-Z0-9]+$/i.test(line)) ||// Ignorar códigos compactos sin espacios
        line.match(/^#PROMOCION/i) || // Ignorar líneas que comienzan con "#PROMOCION"
        line.match(/POR LA COMPRA DE/i) // Ignorar líneas que contienen "POR LA COMPRA DE"
      ) {
        continue;
      }

      // Eliminar sufijos irrelevantes como "- 9JLM", "- 1DLM" o "/1CLM"
      const cleanedLine = line.replace(/\s(-\s[A-Z0-9]+|\/[A-Z0-9]+)$/i, "").trim();

      // Verificar si el dato actual es un subconjunto o superconjunto de un dato ya capturado
      const isRedundant = products.some((product) => 
        product.name.includes(cleanedLine) || cleanedLine.includes(product.name)
      );
      if (isRedundant) {
        continue; // Ignorar el dato redundante
      }
  
      // Identificar posibles nombres de productos
      if (/^[A-Z0-9\s-/]+$/i.test(line) ||
        line.match(/^(MEM|RAM|PROC|SSD|NBG|MB|MON|KING|CORE|INT)/i) ) {
                                       
        // Aquí se puede continuar con la lógica para identificar patrones relevantes
        products.push({
          name: line,
          quantity: 0,
          unitPrice: 0,
          totalPrice: 0,
        });

        i += 1; // Saltar la línea de cantidad/precio
        continue; // Pasar a la siguiente iteración
      }
    }

    // Segundo bucle: Capturar los valores unitarios y asignarlos a los productos
    const extractUnitValue = (line: string): string | null => {
      // Expresión regular para capturar el número con decimales desde el primer punto
      const unitValueMatch = line.match(/NIU([\d,]+(\.\d{1,2})?)/); // Captura el número después de "NIU" con hasta 2 decimales
      if (unitValueMatch) {
        const rawValue = unitValueMatch[1].replace(/,/g, ""); // Eliminar comas si existen
        const parsedValue = parseFloat(rawValue); // Convertir a número flotante
        return parsedValue.toFixed(2); // Redondear a 2 decimales
      }
      return null; // Retorna null si no se encuentra un valor válido
    };

    let productIndex = 0; // Índice para recorrer los productos
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1] || ""; // Línea siguiente para verificar contexto

      // Extraer el valor unitario
      const unitValue = extractUnitValue(nextLine);
      if (unitValue !== null && productIndex < products.length) {
        products[productIndex].unitPrice = parseFloat(unitValue); // Asignar el valor unitario al producto correspondiente
        productIndex++; // Avanzar al siguiente producto
      }
    }

    // Tercer bucle: Buscar nombres de productos y capturar el valor numérico que sigue
    for (let i = 0; i < products.length; i++) {
      const product = products[i]; // Producto actual
      const productName = product.name.toLowerCase(); // Nombre del producto en minúsculas para comparación

      for (let j = 0; j < lines.length; j++) {
        const line = lines[j].toLowerCase(); // Línea actual en minúsculas para comparación

        // Verificar si el nombre del producto está en la línea actual
        if (line.includes(productName)) {
          const nextLine = lines[j + 1] || ""; // Línea siguiente para verificar contexto

          // Buscar un valor numérico en la línea siguiente (con o sin comas)
          const totalValueMatch = nextLine.match(/^\d{1,4}(,\d{3})*(\.\d{2})?$/); // Manejar números con o sin comas y con decimales

          if (totalValueMatch) {
            const totalValue = parseFloat(totalValueMatch[0].replace(/,/g, "")); // Eliminar comas y convertir a número flotante
            product.quantity = totalValue; // Asignar el valor total como cantidad
            break; // Salir del bucle interno una vez que se encuentra el valor
          }
        }
      } 

      // Si no se encuentra un valor numérico, mostrar una advertencia
      if (!product.quantity) {
        console.warn(`No se encontró un valor total para el producto: ${product.name}`);
      }
    }

    // Cuarto bloque: Determinar la cantidad real basada en la lógica proporcionada
    for (let i = 0; i < products.length; i++) {
      const product = products[i]; // Producto actual
      const { quantity, unitPrice } = product;

      if (!quantity || !unitPrice) {
        console.warn(`Producto ${product.name} no tiene cantidad o precio unitario válido.`);
        continue;
      }

      const quantityStr = quantity.toString(); // Convertir la cantidad a cadena para iterar sobre los dígitos
      const unitPriceStr = unitPrice.toString(); // Convertir el precio unitario a cadena
      let realQuantity = 0; // Cantidad real que vamos a calcular

      for (let j = 1; j <= quantityStr.length; j++) {
        const currentDigits = parseInt(quantityStr.slice(0, j), 10); // Tomar los primeros `j` dígitos
        const remainingDigits = parseFloat(quantityStr.slice(j)); // Tomar los dígitos restantes como número

        // Nueva lógica: Si el precio unitario comienza con 0
        if (unitPriceStr.startsWith("0")) {
          if (j === 1 && quantityStr.length > 1 && quantityStr[1] === "0") {
            realQuantity = parseInt(quantityStr.slice(0, 1), 10); // Tomar el primer dígito como cantidad
            break; // Salir del bucle porque ya determinamos la cantidad real
          } else if (j === 2) {
            realQuantity = parseInt(quantityStr.slice(0, 2), 10); // Tomar los dos primeros dígitos como cantidad
            break; // Salir del bucle porque ya determinamos la cantidad real
          }
        }

        // Nueva lógica: Si el segundo dígito es 0, asignar directamente los dos primeros dígitos como cantidad real
        if (j === 1 && quantityStr.length > 1 && quantityStr[1] === "0") {
          realQuantity = parseInt(quantityStr.slice(0, 2), 10); // Tomar los dos primeros dígitos
          break; // Salir del bucle porque ya determinamos la cantidad real
        }

        const calculatedValue = currentDigits * unitPrice; // Multiplicar los dígitos actuales por el precio unitario
        const difference = Math.abs(calculatedValue - remainingDigits); // Calcular la diferencia

        // Verificar si cumple la condición
        if (difference <= 100) {
          realQuantity = currentDigits; // Asignar la cantidad real
          break; // Salir del bucle interno si se cumple la condición
        }
      }

      // Segunda iteración: Verificar con diferencia <= 1000 si no se encontró una cantidad válida
      if (realQuantity === 0) {
        for (let j = 1; j <= quantityStr.length; j++) {
          const currentDigits = parseInt(quantityStr.slice(0, j), 10); // Tomar los primeros `j` dígitos
          const remainingDigits = parseFloat(quantityStr.slice(j)); // Tomar los dígitos restantes como número

          const calculatedValue = currentDigits * unitPrice; // Multiplicar los dígitos actuales por el precio unitario
          const difference = Math.abs(calculatedValue - remainingDigits); // Calcular la diferencia

          // Verificar si cumple la condición
          if (difference <= 1000) {
            realQuantity = currentDigits; // Asignar la cantidad real
            break; // Salir del bucle interno si se cumple la condición
          }
        }
      }

      if (realQuantity > 0) {
        product.quantity = realQuantity; // Actualizar la cantidad real en el producto
        console.log(`Cantidad real para el producto ${product.name}: ${realQuantity}`);
      } else {
        console.warn(`No se pudo determinar la cantidad real para el producto: ${product.name}`);
      }
    }

    // Actualizar el estado del formulario con los productos
    console.log("Productos extraídos:", products);
    if (products.length > 0) {
      setSelectedProducts(products.map((product, index) => ({
        id: index+1,
        name: product.name,
        quantity: product.quantity,
        price: product.unitPrice,
        category_name: "Sin categoria", // Puedes ajustar esto si tienes categorías
      })));
    } else { 
      toast.warning("No se encontraron productos en el archivo PDF.");
    }
  
    // Ejemplo: Buscar un patrón específico en el texto
    const categoryMatch = text.match(/Categoría:\s*(.+)/i);
    const priceMatch = text.match(/Precio:\s*\$?([\d.,]+)/i);
    const descriptionMatch = text.match(/Descripción:\s*(.+)/i);
    const providerMatch = text.match(/Proveedor:\s*(.+)/i); // Nuevo patrón para proveedor
    const storeMatch = text.match(/Tienda:\s*(.+)/i); // Nuevo patrón para tienda
    const rucMatch = text.match(/R\.?U\.?C\.?\s*N[°º]?\s*(\d{11})/i); // Captura el RUC
    const fechaEmisionMatch = text.match(/Fecha de Emisión[:\s]*([\d-]+)/i); // Captura la fecha de emisión
    const facturaMatch = text.match(/FACTURA\s+ELECTR[ÓO]NICA/i);
    const serieMatch = text.match(/FACTURA ELECTRÓNICA\s*([A-Z0-9-]+)/i); // Captura el número de factura
    const totalMatch = text.match(/TOTAL A PAGAR[:\s]*\$?([\d.,]+)/i); // Captura el total a pagar
 
    // Actualizar los valores del formulario si se encuentran coincidencias
    if (categoryMatch) {
      setValue("category_name", categoryMatch[1].trim());
    }
    if (priceMatch) {
      setValue("price", parseFloat(priceMatch[1].replace(",", "")));
    }
    if (descriptionMatch) {
      setValue("description", descriptionMatch[1].trim());
    }
    if (storeMatch) {
      setValue("store_name", storeMatch[1].trim());
    }
    if (rucMatch) {
      setValue("ruc", rucMatch[1].trim()); // RUC del cliente
    }
    if (fechaEmisionMatch) {
      setValue("fecha_emision_comprobante", fechaEmisionMatch[1].trim()); // Fecha de emisión
    }
    if (facturaMatch) {
      console.log("Se encontró el texto:", facturaMatch[0]);
      setValue("comprobante", facturaMatch[0].trim()); // Guarda el valor en el formulario
    } else {
      console.warn("No se encontró el texto 'FACTURA ELECTRÓNICA' o 'FACTURA ELECTRONICA'.");
    }
    if (serieMatch) {
      const serie = serieMatch[1].trim(); // Captura la serie del comprobante
      setValue("serie", serie);   
      // Buscar el nombre del proveedor después de la serie
      const providerNameMatch = text.match(new RegExp(`${serie}\\s+([A-Za-z\\s]+\\.[A-Za-z\\s]+\\.)`, "i"));
      if (providerNameMatch) {
        const providerName = providerNameMatch[1].trim(); // Captura el nombre del proveedor
        setValue("provider_name", providerName); // Guarda el nombre del proveedor en el formulario
        console.log("Proveedor encontrado:", providerName);

        // Buscar la dirección después del nombre del proveedor
        const addressMatch = text.match(new RegExp(`${providerName}\\s*[:]?\\s*(.+)`, "i"));
        if (addressMatch) {
          const address = addressMatch[1].trim(); // Captura la dirección
          setValue("provider_adress", address); // Guarda la dirección en el formulario
          console.log("Dirección encontrada:", address);
        } else {
          console.warn("No se encontró la dirección después del nombre del proveedor.");
        }
      } else {
        console.warn("No se encontró el nombre del proveedor después de la serie.");
      }
    }
    if (totalMatch) {
      setValue("total_comprobante", totalMatch[1].trim());
    }
  };
  //

  // ENVIAR PDF
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isNewInvoiceBoolean, setIsNewInvoiceBoolean] = useState(false);

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
        console.log('Texto extraído del PDF:', extractedText);
        processExtractedText(extractedText); // Procesa el texto extraído
        setIsNewInvoiceBoolean(true);
        toast.success("Factura subida correctamente.");
      } catch (error) {
        console.error('Error al procesar el archivo PDF:', error);
        toast.error('Error al procesar el archivo PDF');
      }
    }
  };
  //

  // ENVIAR GUIA PDF
  const [pdfGuiaFile, setPdfGuiaFile] = useState<File | null>(null);

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

  // ALERT DIALOG PARA AGREGAR PROVEEDORES
  const [isDialogOpenProvider, setIsDialogOpenProvider] = useState(false); // Estado para controlar el AlertDialog
  //

  // ALERT DIALOG PARA AGREGAR TIENDAS
  const [isDialogOpenStore, setIsDialogOpenStore] = useState(false); // Controla la apertura del diálogo
  //

  // CONTROLAR LA MONEDA
  const [currency, setCurrency] = useState<string>(form.getValues("tipo_moneda") || "PEN");
  // Actualizar el valor del formulario cuando cambie el estado local
  useEffect(() => {
    form.setValue("tipo_moneda", currency, { shouldValidate: true });
  }, [currency, form]);
  //

  // MODAL PARA AGREGAR SERIE
  const [isDialogOpenSeries, setIsDialogOpenSeries] = useState(false);
  const [series, setSeries] = useState<string[]>([]);
  const [currentSeries, setCurrentSeries] = useState<string>("");

  // Efecto para ajustar las series cuando cambia la cantidad
  useEffect(() => {
    if (series.length > quantity) {
      // Ajustar el array de series para que no exceda la nueva cantidad
      setSeries((prev) => prev.slice(0, quantity));
      toast.error(`La cantidad de series excedía la nueva cantidad (${quantity}). Se eliminaron las últimas series.`);
    }
  }, [quantity]);

  const handleAddSeries = () => {
    if (currentSeries.trim() === "") {
      toast.error("Por favor, ingresa un número de serie válido.");
      return;
    }
    if (series.includes(currentSeries)) {
      toast.error("El número de serie ya existe.");
      return;
    }
    if (series.length >= quantity) { // Validar que no exceda la cantidad de productos
      toast.error(`Solo puedes agregar un máximo de ${quantity} series.`);
      return;
    }
    setSeries((prev) => [...prev, currentSeries]);
    setCurrentSeries("");
  };

  const handleRemoveSeries = (serial: string) => {
    setSeries((prev) => prev.filter((s) => s !== serial));
  };
  //

  // MODAL DE PRODUCTOS
  const [categoriess, setCategories] = useState<{ id: number; name: string }[]>([]);

  const [isDialogOpenProduct, setIsDialogOpenProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductPrice, setNewProductPrice] = useState<number | "">("");
  // Estado adicional para manejar el checkbox
  const [openCategory, setOpenCategory] = useState(false); // Define openCategory state
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [isNewCategoryBoolean, setIsNewCategoryBoolean] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState(""); // Para la nueva categoría

    // Función para agregar una nueva categoría
    const handleAddCategory = async (): Promise<{ id: number; name: string } | null> => {

      if (!newCategoryName.trim()) {
        toast.error("El nombre de la nueva categoría es obligatorio.");
        return null;
      }

      try {
        const category = await createCategory({ name: newCategoryName }); // Llama a la API para crear la categoría  
        toast.success("Categoría agregada correctamente.");
        setIsNewCategoryBoolean(true); // Activa el estado de nueva categoría
        return { id: category.id, name: category.name }; // Devuelve el ID y el nombre de la categoría creada 
      } catch (error: any) {
        console.error("Error al agregar la categoría:", error);
        toast.error("La categoria ya existe, Ingrese otro nombre");
        return null;
      }
    };

    // Función para manejar la creación del producto
    const handleAddProduct = async () => {
      if (!newProductName.trim()) {
        toast.error("El nombre del producto es obligatorio.");
        return;
      }
      if (!isNewCategory && !newProductCategory) {
        toast.error("Debe seleccionar una categoría.");
        return;
      }
      if (newProductPrice === "" || newProductPrice <= 0) {
        toast.error("El precio del producto debe ser mayor a 0.");
        return;
      }

      try {
        let categoryId: number;
        let categoryName: string;

        if (isNewCategory) {
          const newCategory = await handleAddCategory(); // Agrega la nueva categoría
          if (!newCategory) {
            return; // Detén la ejecución si no se pudo crear la categoría
          }
          categoryId = newCategory.id;
          categoryName = newCategory.name;
        } else {
          categoryId = Number(newProductCategory);
          categoryName = categories.find((cat: any) => cat.id === categoryId)?.name || "";
        }

        // Aquí puedes llamar a la API para crear el producto
        const createdProduct = await createProduct({
          name: newProductName,
          categoryId,
          price: Number(newProductPrice),
        });

        // Actualizar el estado de productos
        setProducts((prevProducts) => [
          ...prevProducts,
          {
            id: createdProduct.id,
            name: createdProduct.name,
            price: createdProduct.price,
            description: createdProduct.description || "",
            categoryId: createdProduct.categoryId,
            category_name: categoryName,
          },
        ]);

        // Simular la selección del producto en el combobox
        setValueProduct(createdProduct.name); // Setea el valor del combobox
        setCurrentProduct({
          id: createdProduct.id,
          name: createdProduct.name,
          price: createdProduct.price,
          categoryId: createdProduct.categoryId,
          category_name: createdProduct.category_name || "Sin categoría",
        }); // Actualiza el producto seleccionado
        setValue("category_name", categoryName,); // Actualiza el nombre de la categoría
        setValue("price", createdProduct.price); // Actualiza el precio en el formulario
        setOpen(false); // Cierra el combobox

        toast.success("Producto agregado correctamente.");
        setIsDialogOpenProduct(false); // Cierra el modal
        setNewProductName(""); // Limpia los campos
        setNewProductCategory("");
        setNewProductPrice("");
        setNewCategoryName("");
        setIsNewCategory(false); // Restablece el estado del checkbox
        setValue("price", createdProduct.price); // Setea la dirección del proveedor en el formulario
      } catch (error: any) {
        console.error("Error al agregar el producto:", error);
        toast.error(error.message || "Error al agregar el producto.");
      }
    };
  //

  const [openSeriesModal, setOpenSeriesModal] = useState<number | null>(null);

  return (
    <div className="container mx-auto w-full max-w-4xl grid sm:max-w-md md:max-w-lg lg:max-w-4xl">
      <form className='flex flex-col gap-2' onSubmit={onSubmit}>
                    
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 flex-col border rounded-md p-2">                       
                        <Label className="text-sm font-medium mb-2">Fecha de Emision</Label>
                        <div className="flex justify-between gap-1">
                          <Input {...register("fecha_emision_comprobante")} readOnly ></Input> 
                          <Button className='sm:w-auto ml-0
                          bg-blue-700 hover:bg-blue-800 text-white text-xs' 
                          type="button"
                          onClick={() => document.getElementById("pdf-upload")?.click()}
                          >
                              <span className="hidden sm:block">Subir Factura PDF</span>
                              <FileText className="w-2 h-2"/>
                          </Button>  
                          <input
                              type="file"
                              id="pdf-upload"
                              accept="application/pdf"
                              className="hidden"
                              onChange={handlePDFUpload} // Llama a la función al seleccionar un archivo
                          />   
                          <Button className='sm:w-auto ml-0
                          bg-yellow-700 hover:bg-yellow-800 text-white text-xs' 
                          type="button"
                          onClick={() => document.getElementById("pdf-guia-upload")?.click()}
                          >
                              <span className="hidden sm:block">Subir Guia PDF</span>
                              <FileText className="w-2 h-2"/>
                          </Button>   
                          <input
                              type="file"
                              id="pdf-guia-upload"
                              accept="application/pdf"
                              className="hidden"
                              onChange={handlePDFGuiaUpload} // Llama a la función al seleccionar un archivo
                          />                                       
                        </div>
                        <div className="flex justify-between gap-1">                          
                          <Label className="text-sm font-medium py-2 mr-20 sm:mr-12 md:mr-0 xl:mr-12">Comprobante</Label>
                        </div>
                        <div className="flex gap-1">                                                                        
                          <Input {...register("comprobante")} readOnly ></Input>
                        </div>
                        <Label className="text-sm font-medium py-2">Serie</Label>
                        <Input {...register("serie")} readOnly></Input>
                        <div className="flex justify-start gap-1">
                          <div className="flex flex-col">
                            <Label className="text-sm font-medium py-2">Total</Label>
                            <Input {...register("total_comprobante")} readOnly></Input>
                          </div>
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
                        </div>
                    </div>
                  </div>     
                  
                  <div className="flex flex-wrap gap-4">
                      <div className="flex-1 flex flex-col border rounded-md p-2">
                        <Label htmlFor="provider-combobox" className="text-sm font-medium mb-2">
                          Ingrese un proveedor:
                        </Label>
                        <div className="flex justify-between gap-1">
                          <Popover open={openProvider} onOpenChange={setOpenProvider}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openProvider}
                                  className="w-[260px] justify-between"
                                >
                                  {valueProvider
                                    ? providers.find((provider) => String(provider.name) === valueProvider)?.name
                                    : "Selecciona un proveedor..."}
                                  <ChevronsUpDown className="opacity-50" />
                                </Button>                             
                              </PopoverTrigger>
                              <PopoverContent className="w-[260px] p-0">
                                <Command>
                                  <CommandInput 
                                  placeholder="Buscar proveedor..."/>
                                  <CommandList>
                                    <CommandEmpty>No se encontraron proveedores.</CommandEmpty>
                                    <CommandGroup>
                                      {providers.map((provider) => (
                                        <CommandItem
                                          key={provider.name}
                                          value={provider.name}
                                          onSelect={(currentValue) => {
                                            setValueProvider(currentValue === valueProvider ? "" : currentValue)
                                            const selectedProvider = providers.find(
                                              (provider) => String(provider.name) === currentValue
                                            );
                                            // Log para depurar
                                            // console.log("Proveedor seleccionado:", selectedProvider);
                                            if (selectedProvider) {
                                              // Actualiza los valores de los campos relacionados
                                              setValue("provider_name", selectedProvider.name || "");
                                              setValue("provider_adress", selectedProvider.adress || "");
                                            } 
                                            else {
                                              console.error("Proveedor no encontrado:", currentValue);
                                            }
                                            setOpenProvider(false)
                                          }}
                                        >
                                          {provider.name}
                                          <Check
                                            className={cn(
                                              "ml-auto",
                                              valueProvider === provider.name ? "opacity-100" : "opacity-0"
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
                          bg-green-700 hover:bg-green-800 text-white' type="button" onClick={() => setIsDialogOpenProvider(true)}>
                              <span className="hidden sm:block">Nuevo</span>
                              <Save className="w-6 h-6"/>
                            </Button>
                            <AddProviderDialog
                            isOpen={isDialogOpenProvider}
                            onClose={() => setIsDialogOpenProvider(false)}
                            setProviders={setProviders}
                            setValue={form.setValue} // Pasar la función para actualizar el formulario principal
                            />     
                          </div>
                          <Label className="text-sm font-medium py-2">Nombre del Proveedor</Label>
                          <Input {...register("provider_name")} readOnly></Input>
                          <div className="flex justify-between gap-1">
                            <div className="flex flex-col flex-grow">
                              <Label className="text-sm font-medium py-2">Direccion del Proveedor</Label>
                              <Input {...register("provider_adress")} readOnly></Input>
                            </div>
                            <div className="flex flex-col">
                              <Label className="text-sm font-medium py-2">Ruc</Label>
                              <Input {...register("ruc")} readOnly ></Input> 
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
                                            setIsProviderComboTouched(true); // Marca el combobox como tocado
                                            setValueStore(currentValue === valueStore ? "" : currentValue)
                                            const selectedStore = stores.find(
                                              (store) => String(store.name) === currentValue
                                            );
                                            // Log para depurar
                                            console.log("Tienda seleccionada:", selectedStore);
                                            if (selectedStore) {
                                              // Actualiza los valores de los campos relacionados
                                              setValue("store_name", selectedStore.name || "");
                                              setValue("store_adress", selectedStore.adress || "");
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
                                              valueProvider === store.name ? "opacity-100" : "opacity-0"
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
                            bg-green-700 hover:bg-green-800 text-white' type="button" onClick={() => setIsDialogOpenStore(true)}>
                                <span className="hidden sm:block">Nuevo</span>
                                <Save className="w-6 h-6"/>
                            </Button>
                          </div>
                          <Label className="text-sm font-medium py-2">Tienda</Label>
                          <Input {...register("store_name")} readOnly></Input>
                          <Label className="text-sm font-medium py-2">Direccion de la tienda</Label>
                          <Input {...register("store_adress")} readOnly></Input>
                          <AddStoreDialog
                            isOpen={isDialogOpenStore}
                            onClose={() => setIsDialogOpenStore(false)}
                            setStores={setStores}
                            setValue={form.setValue} // Pasar la función para actualizar el formulario principal
                          />             
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
                                  {value
                                    ? products.find((product) => String(product.name) === value)?.name
                                    : "Selecciona un producto..."}
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
                                          onSelect={(currentValue) => {
                                            setValueProduct(currentValue === value ? "" : currentValue)
                                            const selectedProduct = products.find(
                                              (product) => String(product.name) === currentValue
                                            );
                                          
                                            console.log("Producto seleccionado:", selectedProduct); // Depuración
                                          
                                            if (selectedProduct) {
                                              // Encuentra el nombre de la categoría correspondiente
                                              const category = categories.find(
                                                (cat:any) => cat.id === selectedProduct.categoryId
                                              );

                                              // Actualiza el estado del producto actual
                                              setCurrentProduct({
                                                id: selectedProduct.id,
                                                name: selectedProduct.name,
                                                price: selectedProduct.price,
                                                categoryId: selectedProduct.categoryId, // Incluye categoryId
                                                category_name: category?.name || selectedProduct.category_name || "Sin categoría", // Asegúrate de incluir el nombre de la categoría
                                              });

                                              // Actualiza los valores de los inputs relacionados
                                              setValue("category_name", category?.name || selectedProduct.category_name || "Sin categoría");
                                              setValue("price", selectedProduct.price || 0);
                                              setValue("description", selectedProduct.description || "");
                                            } else {
                                              console.error("Producto no encontrado:", currentValue);
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
                              onClick={() => setIsDialogOpenSeries(true)}
                            >
                              <span className="hidden sm:block">Agregar Series</span>
                              <Barcode className="w-6 h-6" />
                            </Button>
                            <AddSeriesDialog
                            isOpen={isDialogOpenSeries}
                            onClose={() => setIsDialogOpenSeries(false)}
                            series={series}
                            setSeries={setSeries}
                            quantity={quantity}
                            />
                            <Button className='sm:w-auto sm:ml-2 ml-0
                            bg-green-700 hover:bg-green-800 text-white' 
                            type="button" onClick={() => setIsDialogOpenProduct(true)}>
                                <span className="hidden sm:block">Nuevo</span>
                                <Save className="w-6 h-6"/>
                            </Button>       
                            <AddProductDialog
                            isOpen={isDialogOpenProduct}
                            onClose={() => setIsDialogOpenProduct(false)}
                            categories={categories}
                            setCategories={setCategories}
                            setProducts={setProducts}
                            setValueProduct={setValueProduct}
                            setCurrentProduct={setCurrentProduct}
                            setValue={form.setValue}
                            />                                            
                                                  
                          </div>                                      
                          <Label className="text-sm font-medium py-2">Categoria</Label>
                          <Input {...register("category_name")} readOnly ></Input>
                          <Label className="text-sm font-medium py-2">Precio de Compra</Label>
                          <Input {...register("price", { valueAsNumber: true })} readOnly
                          step="0.01" // Permite valores con decimales
                          min={0} // Asegura que no se ingresen valores negativos
                          >                        
                          </Input>
                          <Label className="text-sm font-medium py-2">Descripcion</Label>
                          <Input {...register("description")} readOnly></Input>
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
                  </div>

                    {/* Datatable para mostrar los productos seleccionados */}
                    <div className='border px-2 overflow-x-auto max-w-full'>
                      <Table className="table-fixed w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-left w-[100px] sm:w-[300px] max-w-[400px] truncate">Nombre</TableHead>
                            <TableHead className="text-left max-w-[150px] truncate">Categoria</TableHead>
                            <TableHead className="text-left max-w-[150px] truncate">Cantidad</TableHead>
                            <TableHead className="text-left max-w-[150px] truncate">Precio</TableHead>    
                            <TableHead className="text-left max-w-[150px] truncate">Series</TableHead>                    
                            <TableHead className="text-left max-w-[150px] truncate">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedProducts.map((product, index) => (
                            <TableRow key={product.id}>
                              <TableCell className="w-[100px] sm:w-[300px] max-w-[400px] truncate overflow-hidden whitespace-nowrap">{product.name}</TableCell>
                              <TableCell className="max-w-[150px] truncate overflow-hidden whitespace-nowrap">{product.category_name}</TableCell>
                              <TableCell className="max-w-[100px] truncate overflow-hidden whitespace-nowrap">
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
                              <TableCell className="max-w-[100px] truncate overflow-hidden whitespace-nowrap">
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
                              <TableCell className="text-xs max-w-[250px] truncate overflow-hidden whitespace-nowrap">
                              <div
                                className="cursor-pointer text-blue-500 underline"
                                onClick={() => setOpenSeriesModal(index)} // Abre el modal para el producto actual
                              >
                                {product.series && product.series.length > 0
                                  ? `${product.series.length} series`
                                  : "Sin series"}
                              </div>
                             </TableCell>
                             {openSeriesModal !== null && (
                              <EditSeriesModal
                                isOpen={openSeriesModal !== null}
                                onClose={() => setOpenSeriesModal(null)}
                                series={selectedProducts[openSeriesModal].series || []}
                                setSeries={(updatedSeries) => {
                                  setSelectedProducts((prev) =>
                                    prev.map((product, index) =>
                                      index === openSeriesModal
                                        ? { ...product, series: updatedSeries }
                                        : product
                                    )
                                  );
                                }}
                                quantity={selectedProducts[openSeriesModal].quantity} // Cantidad máxima permitida
                              />
                              )}                                     
                              <TableCell className="max-w-[100px] truncate overflow-hidden whitespace-nowrap">
                                <Button
                                  variant="outline"
                                  onClick={() => removeProduct(product.id)}
                                >
                                <X className="w-4 h-4" color="red"/>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>     
                    </div>                          

                    <Button className='mt-4' type="submit"
                    onClick={() => console.log("Botón Crear Ingreso clickeado")}>
                      Crear Ingreso de Productos
                    </Button>
                    <Button className=''
                    type="button" // Evita que el botón envíe el formulario
                    onClick={() => {
                        form.reset({
                            name: "",
                            description: "",
                            price: 1,
                            quantity:1 ,
                            category_name: "",
                            provider_name: "",
                            provider_adress: "",  
                            store_name: "",
                            store_adress: "",      
                            ruc: "",
                            fecha_emision_comprobante: "",
                            comprobante: "",
                            serie: "",
                            total_comprobante: "",
                        })
                        // Limpia los estados relacionados con productos y proveedores
                        setSelectedProducts([]); // Limpia la lista de productos seleccionados en el datatable
                        setCurrentProduct(null); // Limpia el producto actual
                        setQuantity(1); // Restablece la cantidad a 1
                        // Limpia los combobox de productos y proveedores
                        setValueProduct(""); // Limpia el valor del combobox de productos
                        setValueProvider(""); // Limpia el valor del combobox de proveedores
                        setValueStore(""); // Limpia el valor del combobox de tiendas
                        // Cierra los popovers de los combobox
                        setOpen(false); // Cierra el combobox de productos
                        setOpenProvider(false); // Cierra el combobox de proveedores
                        // Limpia el archivo PDF cargado
                        setPdfFile(null); // Restablece la variable del archivo PDF
                        setPdfGuiaFile(null);
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

export default EntriesForm
