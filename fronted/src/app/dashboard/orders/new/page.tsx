"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { getUserDataFromToken, isTokenValid } from "@/lib/auth";
import { DEFAULT_STORE_ID } from "@/lib/config";
import { getProductsByStore, getStockByProductAndStore, createWebOrder } from "@/app/dashboard/sales/sales.api";
import { getStores } from "@/app/dashboard/stores/stores.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { getClients } from "@/app/dashboard/clients/clients.api";
import { getCategories } from "@/app/dashboard/categories/categories.api";
import { regions } from "@/lib/region";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import ProductsSection from "./ProductsSection";
import SummaryCard from "./SummaryCard";
import ClientCombobox from "./ClientCombobox";
import { useTenantSelection } from "@/context/tenant-selection-context";

// (Combos de bÃƒÂºsqueda se aislaron en componentes)

// Memoized section: Datos del Cliente
const ClientFields = React.memo(function ClientFields({
  firstName,
  lastName,
  email,
  phone,
  personalDni,
  onCommit,
}: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  personalDni: string;
  onCommit: (partial: Partial<{ firstName: string; lastName: string; email: string; phone: string; personalDni: string }>) => void;
}) {
  const [fn, setFn] = React.useState(firstName);
  const [ln, setLn] = React.useState(lastName);
  const [em, setEm] = React.useState(email);
  const [ph, setPh] = React.useState(phone);
  const [dni, setDni] = React.useState(personalDni);

  React.useEffect(() => setFn(firstName), [firstName]);
  React.useEffect(() => setLn(lastName), [lastName]);
  React.useEffect(() => setEm(email), [email]);
  React.useEffect(() => setPh(phone), [phone]);
  React.useEffect(() => setDni(personalDni), [personalDni]);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Nombre</Label>
        <Input className="mt-1" value={fn} onChange={(e) => setFn(e.target.value)} onBlur={() => onCommit({ firstName: fn })} placeholder="Nombre" />
      </div>
      <div className="space-y-2">
        <Label>Apellido</Label>
        <Input className="mt-1" value={ln} onChange={(e) => setLn(e.target.value)} onBlur={() => onCommit({ lastName: ln })} placeholder="Apellido" />
      </div>
      <div className="space-y-2">
        <Label>Correo</Label>
        <Input className="mt-1" type="email" value={em} onChange={(e) => setEm(e.target.value)} onBlur={() => onCommit({ email: em })} placeholder="cliente@correo.com" />
      </div>
      <div className="space-y-2">
        <Label>Telefono</Label>
        <Input className="mt-1" value={ph} onChange={(e) => setPh(e.target.value)} onBlur={() => onCommit({ phone: ph })} placeholder="999999999" />
      </div>
      <div className="space-y-2">
        <Label>DNI</Label>
        <Input className="mt-1" value={dni} onChange={(e) => setDni(e.target.value)} onBlur={() => onCommit({ personalDni: dni })} placeholder="DNI" />
      </div>
    </div>
  );
});

// Memoized section: EnvÃ¯Â¿Â½o (checkboxes + direcciÃ¯Â¿Â½n condicional)
const ShippingFields = React.memo(function ShippingFields({
  pickupInStore,
  setPickupInStore,
  shippingName,
  setShippingName,
  shippingAddress,
  setShippingAddress,
  region,
  setRegion,
  city,
  setCity,
  postalCode,
  setPostalCode,
}: {
  pickupInStore: boolean;
  setPickupInStore: (v: boolean) => void;
  shippingName: string;
  setShippingName: (v: string) => void;
  shippingAddress: string;
  setShippingAddress: (v: string) => void;
  region: string;
  setRegion: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  postalCode: string;
  setPostalCode: (v: string) => void;
}) {
  return (
    <div className="px-0 md:px-0 grid md:grid-cols-2 gap-3">
      <div className="md:col-span-2 flex items-center gap-3 pb-1">
        <div className="flex items-center gap-2">
          <Checkbox id="pickup" checked={pickupInStore} onCheckedChange={() => setPickupInStore(true)} />
          <Label htmlFor="pickup">Recojo en tienda</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="delivery" checked={!pickupInStore} onCheckedChange={() => setPickupInStore(false)} />
          <Label htmlFor="delivery">Envio a domicilio</Label>
        </div>
      </div>
      {!pickupInStore && (
        <>
          <div className="md:col-span-2 space-y-2">
            <Label>Nombre para envio</Label>
            <Input className="mt-1" value={shippingName} onChange={(e) => setShippingName(e.target.value)} placeholder="Nombre de receptor" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Direccion</Label>
            <Input className="mt-1" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="Calle 123" />
          </div>
          <div className="space-y-2">
            <Label>Region</Label>
            <Select
              value={region}
              onValueChange={(v) => {
                setRegion(v);
                const r = regions.find((x) => x.name === v);
                const firstCity = r?.cities?.[0] ?? '';
                setCity(firstCity);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona regiÃƒÂ³n" />
              </SelectTrigger>
              <SelectContent side="bottom" align="start">
                {regions.map((r) => (
                  <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Departamento/Ciudad</Label>
            <Select value={city} onValueChange={(v) => setCity(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona departamento" />
              </SelectTrigger>
              <SelectContent side="bottom" align="start">
                {(regions.find((x) => x.name === region)?.cities ?? []).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Codigo Postal</Label>
            <Input className="mt-1" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="15000" />
          </div>
        </>
      )}
    </div>
  );
});

// Memoized section: FacturaciÃ¯Â¿Â½n
const BillingFields = React.memo(function BillingFields({
  invoiceType,
  setInvoiceType,
  billingDni,
  setBillingDni,
  billingName,
  setBillingName,
  billingRuc,
  setBillingRuc,
  billingRazonSocial,
  setBillingRazonSocial,
  billingAddress,
  setBillingAddress,
}: any) {
  return (
    <div className="px-0 md:px-0 space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-2">
          <Label className="block">Tipo de comprobante</Label>
          <Select value={invoiceType} onValueChange={setInvoiceType}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="bottom" align="start">
              <SelectItem value="SIN COMPROBANTE">Sin Comprobante</SelectItem>
              <SelectItem value="BOLETA">Boleta</SelectItem>
              <SelectItem value="FACTURA">Factura</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {invoiceType === 'BOLETA' && (
          <>
            <div className="space-y-2">
              <Label className="block">DNI</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="\\d*"
                maxLength={8}
                value={billingDni}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                  setBillingDni(v);
                }}
                placeholder="DNI del cliente"
              />
            </div>
            <div className="space-y-2">
              <Label className="block">Nombre</Label>
              <Input value={billingName} onChange={(e) => setBillingName(e.target.value)} placeholder="Nombre completo" />
            </div>
          </>
        )}
        {invoiceType === 'FACTURA' && (
          <>
            <div className="space-y-2">
              <Label className="block">RUC</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="\\d*"
                maxLength={11}
                value={billingRuc}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setBillingRuc(v);
                }}
                placeholder="RUC de la empresa"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="block">Razon Social</Label>
              <Input value={billingRazonSocial} onChange={(e) => setBillingRazonSocial(e.target.value)} placeholder="RazÃ¯Â¿Â½n social" />
            </div>
          </>
        )}
        {invoiceType !== 'SIN COMPROBANTE' && (
          <div className="space-y-2 md:col-span-3">
            <Label className="block">Direccion de facturacion</Label>
            <Input value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} placeholder="DirecciÃ¯Â¿Â½n fiscal" />
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Estos datos se usaron para emitir el comprobante cuando se complete la orden.</p>
    </div>
  );
});

type ProductOption = {
  id: number;
  name: string;
  price: number;
  stock?: number | null;
  categoryId?: number | null;
  categoryName?: string | null;
  searchKey?: string;
};

type OrderItem = {
  productId: number;
  name: string;
  quantity: number;
  price: number;
};

export default function NewOrderPage() {
  const router = useRouter();
  const { version } = useTenantSelection();
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);

  // Basics
  const [storeId, setStoreId] = useState<number>(DEFAULT_STORE_ID);
  const [stores, setStores] = useState<{ id: number; name: string }[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>(0); // 0 = Todas
  const [selectedStock, setSelectedStock] = useState<number | null>(null);

  // Customer fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [personalDni, setPersonalDni] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  // Keep the combobox label independent from form inputs
  const [selectedClientLabel, setSelectedClientLabel] = useState<string>("");

  // Shipping fields
  const [shippingName, setShippingName] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [region, setRegion] = useState<string>("Tacna");
  const [city, setCity] = useState<string>("Tacna");
  const [postalCode, setPostalCode] = useState("");
  const [pickupInStore, setPickupInStore] = useState(false);

  // Items
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [items, setItems] = useState<OrderItem[]>([]);

  // Currency
  const [currency, setCurrency] = useState<string>("PEN");
  const [paymentMethod, setPaymentMethod] = useState<string>("TRANSFERENCIA");
  // Billing
  const [invoiceType, setInvoiceType] = useState<string>('SIN COMPROBANTE');
  const [billingDni, setBillingDni] = useState<string>('');
  const [billingName, setBillingName] = useState<string>('');
  const [billingRuc, setBillingRuc] = useState<string>('');
  const [billingRazonSocial, setBillingRazonSocial] = useState<string>('');
  const [billingAddress, setBillingAddress] = useState<string>('');
  const [storesLoading, setStoresLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const clientsWithKey = useMemo(() => {
    return (clients || []).map((c: any) => {
      const key = `${c?.name ?? ''} ${c?.typeNumber ?? ''} ${c?.dni ?? ''} ${c?.ruc ?? ''} ${c?.email ?? ''} ${c?.phone ?? ''}`
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');
      return { ...c, searchKey: c.searchKey ?? key };
    });
  }, [clients]);

  // Zod validation schema (run only on submit)
  const itemSchema = useMemo(() => z.object({
    productId: z.number().int().positive(),
    name: z.string().min(1),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
  }), []);

  const formSchema = useMemo(() => z.object({
    email: z.string().email({ message: 'Ingresa un correo vÃ¯Â¿Â½lido.' }),
    shippingMethod: z.enum(['PICKUP', 'DELIVERY']),
    shippingName: z.string().min(2, { message: 'Ingresa el nombre para envio.' }).optional(),
    shippingAddress: z.string().min(3, { message: 'Ingresa la direccion de envio.' }).optional(),
    city: z.string().min(2, { message: 'Ingresa la ciudad.' }).optional(),
    postalCode: z.string().min(3, { message: 'Ingresa el codigo postal.' }).optional(),
    invoiceType: z.enum(['SIN COMPROBANTE', 'BOLETA', 'FACTURA']),
    billingDni: z.string().regex(/^\d{8}$/,{ message: 'DNI debe tener 8 dÃ¯Â¿Â½gitos.' }).optional(),
    billingName: z.string().min(3, { message: 'Ingresa el nombre para la boleta.' }).optional(),
    billingRuc: z.string().regex(/^\d{11}$/,{ message: 'RUC debe tener 11 dÃ¯Â¿Â½gitos.' }).optional(),
    billingRazonSocial: z.string().min(3, { message: 'Ingresa la razÃ¯Â¿Â½n social.' }).optional(),
    billingAddress: z.string().min(3, { message: 'Ingresa la direcciÃ¯Â¿Â½n de facturaciÃ¯Â¿Â½n.' }).optional(),
  }).superRefine((val, ctx) => {
    if (val.shippingMethod === 'DELIVERY') {
      if (!val.shippingName || val.shippingName.trim().length < 2) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ingresa el nombre para envio.' });
      if (!val.shippingAddress) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ingresa la direccion de envio.' });
      if (!val.city) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ingresa la ciudad.' });
      if (!val.postalCode) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ingresa el codigo postal.' });
    }
    if (val.invoiceType === 'BOLETA') {
      if (!val.billingDni) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'DNI debe tener 8 dÃ¯Â¿Â½gitos.' });
      if (!val.billingName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ingresa el nombre para la boleta.' });
      if (!val.billingAddress) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ingresa la direcciÃ¯Â¿Â½n de facturaciÃ¯Â¿Â½n.' });
    }
    if (val.invoiceType === 'FACTURA') {
      if (!val.billingRuc) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'RUC debe tener 11 dÃ¯Â¿Â½gitos.' });
      if (!val.billingRazonSocial) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ingresa la razÃ¯Â¿Â½n social.' });
      if (!val.billingAddress) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ingresa la direcciÃ¯Â¿Â½n de facturaciÃ¯Â¿Â½n.' });
    }
  }), [itemSchema]);

  useEffect(() => {
    async function guard() {
      const user = await getUserDataFromToken();
      const valid = await isTokenValid();
      const normalizedRole = user?.role ? user.role.trim().toUpperCase().replace(/\s+/g, "_") : null;
      const isSuperAdmin = normalizedRole ? normalizedRole.includes("SUPER_ADMIN") : false;
      const allowedRoles = new Set(["ADMIN", "EMPLOYEE", "ACCOUNTANT", "AUDITOR"]);
      const roleAllowed = normalizedRole ? (isSuperAdmin || allowedRoles.has(normalizedRole)) : false;

      if (!user || !valid || !roleAllowed) {
        router.replace("/unauthorized");
        return;
      }
      setUserId(user.id);
      setRole(user.role ?? null);
      setAuthChecked(true);
    }
    guard();
  }, [router, version]);

  useEffect(() => {
    async function loadStores() {
      try {
        const data = await getStores();
        const list = Array.isArray(data) ? data.map((s: any) => ({ id: s.id, name: s.name })) : [];
        setStores(list);
        if (!list.find((s) => s.id === storeId) && list.length > 0) {
          setStoreId(list[0].id);
        }
      } catch (err) {
        console.error("Error loading stores", err);
      } finally {
        setStoresLoading(false);
      }
    }
    loadStores();
  }, [version]);

  // Load categories once
  useEffect(() => {
    async function loadCats() {
      try {
        const cats = await getCategories();
        const list = Array.isArray(cats)
          ? cats
              .filter((c: any) => c && typeof c.id === 'number' && typeof c.name === 'string')
              .sort((a: any, b: any) => a.name.localeCompare(b.name))
              .map((c: any) => ({ id: c.id, name: c.name }))
          : [];
        setCategories(list);
      } catch (e) {
        console.error('Error loading categories', e);
        setCategories([]);
      }
    }
    loadCats();
  }, [version]);

  // Keep popover logic inside child components now

  // Stable callbacks for memo children
  const handleClientPick = useCallback((c: any) => {
    const name: string = c.name ?? "";
    const parts = name.trim().split(/\s+/);
    setFirstName(parts.slice(0, -1).join(" ") || parts[0] || "");
    setLastName(parts.length > 1 ? parts[parts.length - 1] : "");
    setEmail(c.email ?? "");
    setPhone(c.phone ?? "");
    setPersonalDni(c.typeNumber ?? "");
    setShippingName(name);
    setSelectedClientId(c.id ?? null);
    setSelectedClientLabel(name);
  }, [version]);

  const handleProductPick = useCallback((p: { id: number; name: string; price: number }) => {
    setSelectedProductId(p.id);
    setSelectedPrice(p.price);
  }, []);

  // Memoized filtered lists (evaluate only when popover is open)
  // Filtering moved inside combobox components

  // Prefill billing data when tipo de comprobante cambia a BOLETA
  useEffect(() => {
    if (invoiceType === 'BOLETA') {
      const fullName = `${firstName} ${lastName}`.trim();
      if (!billingName && fullName) setBillingName(fullName);
      if (!billingDni && personalDni) setBillingDni(personalDni);
    }
  }, [invoiceType, firstName, lastName, personalDni]);

  // Fetch stock for the selected product in the current store
  useEffect(() => {
    let cancelled = false;
    async function fetchStock() {
      if (!selectedProductId) { setSelectedStock(null); return; }
      try {
        const stockInfo = await getStockByProductAndStore(storeId, selectedProductId);
        const available = Number((stockInfo as any)?.stock ?? (stockInfo as any)?.available ?? stockInfo ?? 0);
        if (!cancelled) setSelectedStock(Number.isFinite(available) ? available : 0);
      } catch {
        if (!cancelled) setSelectedStock(null);
      }
    }
    fetchStock();
    return () => { cancelled = true; };
  }, [storeId, selectedProductId]);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await getProductsByStore(storeId);
        const opts: ProductOption[] = Array.isArray(data)
          ? data
              .map((item: any) => {
                const id = item?.inventory?.product?.id;
                const name = item?.inventory?.product?.name;
                const price = Number(item?.inventory?.product?.priceSell ?? item?.inventory?.product?.price ?? 0);
                const stock = typeof item?.stock === 'number' ? item.stock : (typeof item?.inventory?.stock === 'number' ? item.inventory.stock : undefined);
                const categoryId = item?.inventory?.product?.categoryId ?? item?.inventory?.product?.category?.id ?? null;
                const categoryName = item?.inventory?.product?.category?.name ?? null;
                const rawKey = `${name ?? ''} ${categoryName ?? ''}`
                  .toString()
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/\p{Diacritic}/gu, '');
                return {
                  id,
                  name,
                  price,
                  stock,
                  categoryId,
                  categoryName,
                  searchKey: rawKey,
                };
              })
              .filter((p) => !!p?.id && !!p?.name)
          : [];
        setProducts(opts);
      } catch (err) {
        console.error("Error loading products", err);
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    }
    loadProducts();
    // reset selection when store changes
    setItems([]);
    setSelectedProductId(null);
    setSelectedPrice(0);
    setQuantity(1);
  }, [storeId, version]);

  useEffect(() => {
    async function loadClients() {
      try {
        const data = await getClients();
        // Backend ya excluye genÃ¯Â¿Â½ricos; cortesÃ¯Â¿Â½a: descartar nombres/usuarios con prefijo generic_
        const safe = Array.isArray(data)
          ? data.filter((c: any) => {
              const name = String(c?.name ?? '').toLowerCase();
              if (name.startsWith('generic_')) return false;
              const type = String(c?.type ?? '').toUpperCase();
              const num = String(c?.typeNumber ?? '').trim();
              const isDni = type === 'DNI' && /^\d{8}$/.test(num);
              const isRuc = type === 'RUC' && /^\d{11}$/.test(num);
              return isDni || isRuc;
            })
          : [];
        setClients(safe);
      } catch (err) {
        console.error("Error loading clients", err);
        setClients([]);
      } finally {
        setClientsLoading(false);
      }
    }
    loadClients();
  }, [version]);

  const subtotal = useMemo(() => items.reduce((s, it) => s + it.quantity * it.price, 0), [items]);
  const shipping = 0;
  const total = useMemo(() => subtotal + shipping, [subtotal]);
  const currentInCart = useMemo(
    () => (selectedProductId ? (items.find((i) => i.productId === selectedProductId)?.quantity ?? 0) : 0),
    [items, selectedProductId],
  );
  const remainingStock = useMemo(() => {
    if (selectedStock === null || selectedProductId === null) return null;
    const rem = selectedStock - currentInCart;
    return rem < 0 ? 0 : rem;
  }, [selectedStock, selectedProductId, currentInCart]);

  function resetSelection() {
    setSelectedProductId(null);
    setSelectedPrice(0);
    setQuantity(1);
  }

  const addItem = React.useCallback(async () => {
    if (!selectedProductId) {
      toast.error("Selecciona un producto");
      return;
    }
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;
    if (quantity <= 0) {
      toast.error("Cantidad invÃƒÆ’Ã‚Â¡lida");
      return;
    }
    const unitPrice = selectedPrice > 0 ? selectedPrice : product.price;
    if (unitPrice <= 0) {
      toast.error("Precio invÃƒÆ’Ã‚Â¡lido");
      return;
    }
    try {
      const stockInfo = await getStockByProductAndStore(storeId, selectedProductId);
      const available = Number((stockInfo as any)?.stock ?? (stockInfo as any)?.available ?? stockInfo ?? 0);
      const inCart = items.find((i) => i.productId === selectedProductId)?.quantity ?? 0;
      if (available < inCart + quantity) {
        const canAdd = Math.max(0, available - inCart);
        if (canAdd <= 0) {
          toast.error(`No puedes agregar mÃ¯Â¿Â½s. Stock disponible: ${available}. Ya tienes ${inCart} en la orden.`);
          return;
        }
        toast.error(`Solo puedes agregar ${canAdd} unidad(es) mÃ¯Â¿Â½s. Stock disponible: ${available}.`);
        return;
      }
    } catch (err) {
      console.warn("No se pudo validar stock en frontend", err);
    }
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === selectedProductId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + quantity,
          price: unitPrice,
        };
        return next;
      }
      return [...prev, { productId: selectedProductId, name: product.name, quantity, price: unitPrice }];
    });
    resetSelection();
  }, [items, quantity, selectedPrice, selectedProductId, storeId, products])

  const removeItem = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== id));
  }, [])

  async function handleCreateOrder() {
    if (!authChecked || !userId) return;
    const formData = {
      email,
      items,
      shippingMethod: pickupInStore ? 'PICKUP' as const : 'DELIVERY' as const,
      shippingName: pickupInStore ? undefined : (shippingName || undefined),
      shippingAddress: pickupInStore ? undefined : (shippingAddress || undefined),
      city: pickupInStore ? undefined : (city || undefined),
      postalCode: pickupInStore ? undefined : (postalCode || undefined),
      invoiceType: invoiceType as 'SIN COMPROBANTE' | 'BOLETA' | 'FACTURA',
      billingDni: invoiceType === 'BOLETA' ? (billingDni || undefined) : undefined,
      billingName: invoiceType === 'BOLETA' ? (billingName || undefined) : undefined,
      billingRuc: invoiceType === 'FACTURA' ? (billingRuc || undefined) : undefined,
      billingRazonSocial: invoiceType === 'FACTURA' ? (billingRazonSocial || undefined) : undefined,
      billingAddress: invoiceType !== 'SIN COMPROBANTE' ? (billingAddress || undefined) : undefined,
    };

    const parsed = formSchema.safeParse(formData);
    if (!parsed.success) {
      const msgs = parsed.error.issues.map((i) => i.message);
      toast.error(Array.from(new Set(msgs)).join('\n'));
      return;
    }

    const payload = {
      userId,
      storeId,
      total: Number(total.toFixed(2)),
      tipoMoneda: currency,
      description: `Orden creada por ${role ?? "empleado"}`,
      details: items.map((i) => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
      payments: [
        {
          paymentMethodId:
            paymentMethod === 'EFECTIVO' ? -1 :
            paymentMethod === 'TRANSFERENCIA' ? -2 :
            paymentMethod === 'TARJETA' ? -3 :
            paymentMethod === 'YAPE' ? -4 : -6,
          amount: Number(total.toFixed(2)),
          currency,
        },
      ],
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email,
      phone: phone || undefined,
      personalDni: personalDni || undefined,
      shippingName: pickupInStore ? undefined : parsed.data.shippingName,
      shippingAddress: parsed.data.shippingMethod === 'PICKUP' ? '' : (parsed.data.shippingAddress || ''),
      city: parsed.data.city || "",
      postalCode: parsed.data.postalCode || "",
      shippingMethod: pickupInStore ? 'PICKUP' : 'DELIVERY',
      // Billing fields for future comprobante
      tipoComprobante: invoiceType,
      dni: parsed.data.billingDni,
      invoiceName: parsed.data.billingName,
      ruc: parsed.data.billingRuc,
      razonSocial: parsed.data.billingRazonSocial,
      invoiceAddress: parsed.data.billingAddress,
      source: "WEB" as const,
    };

    try {
      const order = await createWebOrder(payload as any);
      toast.success("Orden creada correctamente");
      if (order && order.id) {
        router.push('/dashboard/orders');
      }
    } catch (err: any) {
      console.error("Error al crear la orden", err);
      toast.error(err?.message || "No se pudo crear la orden");
    }
  }

  const isPageLoading = !authChecked || storesLoading || productsLoading || clientsLoading;
  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-950">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <Skeleton className="h-8 w-72" />
          </div>
          <div className="grid lg:grid-cols-3 gap-6 max-w-7xl">
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-sm p-0">
                <CardHeader className="p-4">
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="px-4 pb-4 grid md:grid-cols-2 gap-3">
                  <div className="md:col-span-2 flex items-center gap-3 pb-1">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-sm p-0">
                <CardHeader className="px-4 pt-4 pb-2">
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent className="px-4 pb-4 grid md:grid-cols-2 gap-3">
                  <div className="md:col-span-2 flex items-center gap-3 pb-1">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-sm p-0">
                <CardHeader className="px-4 pt-4 pb-2">
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid md:grid-cols-4 gap-3 items-end">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md border p-3">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1">
              <Card className="shadow-sm p-0 sticky top-8">
                <CardHeader className="p-4">
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                  <div className="pt-4">
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-blue-900 dark:text-blue-100">Nueva Orden</h1>

        <div className="grid lg:grid-cols-3 gap-6 max-w-7xl">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-blue-200 dark:border-blue-700 shadow-sm">
              <CardHeader className="px-4 pt-4 pb-2 items-center">
                <CardTitle className="text-center">Datos del Cliente</CardTitle>
                <Separator className="mx-auto mt-1 w-16 bg-blue-200 dark:bg-blue-700" />
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Search className="h-4 w-4 text-muted-foreground" /> Buscar cliente
                  </Label>
                  <ClientCombobox
                    clients={clientsWithKey}
                    selectedId={selectedClientId}
                    selectedLabel={selectedClientLabel}
                    onPick={handleClientPick}
                  />
                  <p className="text-xs text-muted-foreground">Busca clientes registrados y autocompleta sus datos.</p>
                </div>

                <ClientFields
                  firstName={firstName}
                  lastName={lastName}
                  email={email}
                  phone={phone}
                  personalDni={personalDni}
                  onCommit={(p) => {
                    if (p.firstName !== undefined) setFirstName(p.firstName);
                    if (p.lastName !== undefined) setLastName(p.lastName);
                    if (p.email !== undefined) setEmail(p.email);
                    if (p.phone !== undefined) setPhone(p.phone);
                    if (p.personalDni !== undefined) setPersonalDni(p.personalDni);
                  }}
                />
              </CardContent>
            </Card>

            <Card className="border-blue-200 dark:border-blue-700 shadow-sm">
              <CardHeader className="px-4 pt-4 pb-2 items-center">
                <CardTitle className="text-center">Facturacion</CardTitle>
                <Separator className="mx-auto mt-1 w-16 bg-blue-200 dark:bg-blue-700" />
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-1 space-y-2">
                    <Label className="block">Tipo de comprobante</Label>
                    <Select value={invoiceType} onValueChange={setInvoiceType}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent side="bottom" align="start">
                        <SelectItem value="SIN COMPROBANTE">Sin Comprobante</SelectItem>
                        <SelectItem value="BOLETA">Boleta</SelectItem>
                        <SelectItem value="FACTURA">Factura</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {invoiceType === 'BOLETA' && (
                    <>
                      <div className="space-y-2">
                        <Label className="block">DNI</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="\\d*"
                          maxLength={8}
                          value={billingDni}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 8)
                            setBillingDni(v)
                          }}
                          placeholder="DNI del cliente"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="block">Nombre</Label>
                        <Input value={billingName} onChange={(e) => setBillingName(e.target.value)} placeholder="Nombre completo" />
                      </div>
                    </>
                  )}
                  {invoiceType === 'FACTURA' && (
                    <>
                      <div className="space-y-2">
                        <Label className="block">RUC</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="\\d*"
                          maxLength={11}
                          value={billingRuc}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 11)
                            setBillingRuc(v)
                          }}
                          placeholder="RUC de la empresa"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="block">Razon Social</Label>
                        <Input value={billingRazonSocial} onChange={(e) => setBillingRazonSocial(e.target.value)} placeholder="Razon social" />
                      </div>
                    </>
                  )}
                  {invoiceType !== 'SIN COMPROBANTE' && (
                    <div className="space-y-2 md:col-span-3">
                      <Label className="block">DirecciÃƒÂ³n de facturaciÃƒÂ³n</Label>
                      <Input value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} placeholder="DirecciÃƒÂ³n fiscal" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Estos datos se usarÃƒÂ¡n para emitir el comprobante cuando se complete la orden.</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 dark:border-blue-700 shadow-sm">
              <CardHeader className="px-4 pt-4 pb-2 items-center">
                <CardTitle className="text-center">Pago</CardTitle>
                <Separator className="mx-auto mt-1 w-16 bg-blue-200 dark:bg-blue-700" />
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2 border rounded-md p-3">
                    <RadioGroupItem value="TRANSFERENCIA" id="pm-transfer" />
                    <Label htmlFor="pm-transfer">Transferencia</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-md p-3">
                    <RadioGroupItem value="EFECTIVO" id="pm-cash" />
                    <Label htmlFor="pm-cash">Efectivo</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-md p-3">
                    <RadioGroupItem value="YAPE" id="pm-yape" />
                    <Label htmlFor="pm-yape">Yape</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-md p-3">
                    <RadioGroupItem value="TARJETA" id="pm-card" />
                    <Label htmlFor="pm-card">Tarjeta (Credito/Debito)</Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">Se registrarÃƒÂ¡ el mÃƒÂ©todo elegido para el pago del cliente.</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 dark:border-blue-700 shadow-sm">
              <CardHeader className="px-4 pt-4 pb-2 items-center">
                <CardTitle className="text-center">Envio</CardTitle>
                <Separator className="mx-auto mt-1 w-16 bg-blue-200 dark:bg-blue-700" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ShippingFields
                  pickupInStore={pickupInStore}
                  setPickupInStore={setPickupInStore}
                  shippingName={shippingName}
                  setShippingName={setShippingName}
                  shippingAddress={shippingAddress}
                  setShippingAddress={setShippingAddress}
                  region={region}
                  setRegion={setRegion}
                  city={city}
                  setCity={setCity}
                  postalCode={postalCode}
                  setPostalCode={setPostalCode}
                />
              </CardContent>
            </Card>

            <ProductsSection
              storeId={storeId}
              stores={stores}
              setStoreId={setStoreId}
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedProductId={selectedProductId}
              products={products}
              handleProductPick={handleProductPick}
              selectedStock={selectedStock}
              remainingStock={remainingStock}
              quantity={quantity}
              setQuantity={setQuantity}
              selectedPrice={selectedPrice}
              setSelectedPrice={setSelectedPrice}
              addItem={addItem}
              items={items}
              removeItem={removeItem}
            />
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-1">
            <SummaryCard
              currency={currency}
              setCurrency={setCurrency}
              subtotal={subtotal}
              shipping={shipping}
              total={total}
              handleCreateOrder={handleCreateOrder}
              userId={userId}
              itemsLength={items.length}
              email={email}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

