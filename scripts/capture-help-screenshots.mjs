#!/usr/bin/env node
/**
 * Captura automatica de screenshots para las guias de ayuda paso a paso.
 *
 * Requisitos:
 *   - Frontend corriendo en http://localhost:3000
 *   - Backend corriendo en http://localhost:4000
 *   - Playwright instalado: npm install --save-dev playwright
 *   - Chromium instalado: npx playwright install chromium
 *
 * Uso: node scripts/capture-help-screenshots.mjs
 */

import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const PUBLIC_HELP = resolve(PROJECT_ROOT, 'fronted/public/help');

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const EMAIL = process.env.LOGIN_EMAIL || 'jdzare@gmail.com';
const PASSWORD = process.env.LOGIN_PASSWORD || 'chuscasas1991';

// Viewport for consistent screenshots
const VIEWPORT = { width: 1280, height: 800 };

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

async function login(page) {
  console.log('  Iniciando sesion...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', EMAIL);
  // Wait for email validation to complete
  await page.waitForTimeout(2000);
  await page.fill('#password', PASSWORD);
  // Wait for password validation
  await page.waitForTimeout(1000);

  // Wait for the submit button to be enabled
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.waitFor({ state: 'visible', timeout: 5000 });

  // Click submit and wait for navigation with longer timeout
  try {
    await Promise.all([
      page.waitForURL('**/dashboard**', { timeout: 45000, waitUntil: 'load' }),
      submitButton.click(),
    ]);
  } catch (err) {
    // If direct navigation fails, try waiting for any URL change
    console.log('  Esperando navegacion alternativa...');
    await page.waitForTimeout(5000);
    // Check if we're on dashboard
    if (!page.url().includes('/dashboard')) {
      throw new Error('Login failed - no navigation to dashboard');
    }
  }

  console.log('  Login exitoso');
  // Wait for dashboard to fully render
  await page.waitForTimeout(4000);
}

async function screenshot(page, path, options = {}) {
  const fullPath = resolve(PUBLIC_HELP, path);
  ensureDir(dirname(fullPath));
  await page.screenshot({ path: fullPath, ...options });
  console.log(`    -> ${path}`);
}

// ─── Helpers ─────────────────────────────────────────────────

async function captureSidebar(page, navGroupText, outputPath) {
  const navItem = page.locator('nav').getByText(navGroupText).first();
  if (await navItem.isVisible()) {
    await navItem.click();
    await page.waitForTimeout(600);
  }
  const sidebar = page.locator('[data-sidebar="sidebar"]').first();
  if (await sidebar.isVisible()) {
    const fullPath = resolve(PUBLIC_HELP, outputPath);
    ensureDir(dirname(fullPath));
    await sidebar.screenshot({ path: fullPath });
    console.log(`    -> ${outputPath} (sidebar)`);
  } else {
    await screenshot(page, outputPath);
  }
}

async function captureMain(page, outputPath) {
  const mainContent = page.locator('main').first();
  if (await mainContent.isVisible()) {
    const fullPath = resolve(PUBLIC_HELP, outputPath);
    ensureDir(dirname(fullPath));
    await mainContent.screenshot({ path: fullPath });
    console.log(`    -> ${outputPath} (main)`);
  } else {
    await screenshot(page, outputPath);
  }
}

async function navigateAndWait(page, path, waitMs = 2000) {
  try {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (err) {
    // If networkidle fails, try with load
    console.log(`  Reintentando navegacion a ${path} con 'load'...`);
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'load', timeout: 60000 });
  }
  await page.waitForTimeout(waitMs);
}

async function scrollTo(page, y, waitMs = 500) {
  await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
  await page.waitForTimeout(waitMs);
}

async function scrollToText(page, text, waitMs = 300) {
  const el = page.locator(`text=${text}`).first();
  if (await el.isVisible()) {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(waitMs);
  }
}

async function scrollToBottom(page, waitMs = 500) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(waitMs);
}

async function switchToFormTab(page) {
  const tab = page.locator('[role="tab"]').filter({ hasText: 'Formulario' });
  if (await tab.isVisible()) {
    await tab.click();
    await page.waitForTimeout(1000);
  }
}

// ─── Sales screenshots ────────────────────────────────────────

async function captureSalesSteps(page) {
  console.log('\n📸 Capturando: Ventas > Nueva Venta');

  await navigateAndWait(page, '/dashboard/sales/new');
  await captureSidebar(page, 'Ventas', 'sales/step1-menu-ventas.png');

  await scrollTo(page, 0);
  await switchToFormTab(page);
  await captureMain(page, 'sales/step2-buscar-producto.png');

  await scrollTo(page, 350);
  await screenshot(page, 'sales/step3-agregar-carrito.png');

  await scrollTo(page, 0);
  await scrollToText(page, 'Ingrese un Cliente');
  await screenshot(page, 'sales/step4-seleccionar-cliente.png');

  await scrollToText(page, 'Metodo de Pago');
  await screenshot(page, 'sales/step5-metodo-pago.png');

  await scrollToBottom(page);
  await screenshot(page, 'sales/step6-confirmar-venta.png');
}

// ─── Entries screenshots ──────────────────────────────────────

async function captureEntriesSteps(page) {
  console.log('\n📸 Capturando: Ingresos > Nuevo Ingreso');

  await navigateAndWait(page, '/dashboard/entries/new');
  await captureSidebar(page, 'Almacen', 'entries/step1-menu-ingresos.png');

  await switchToFormTab(page);
  await scrollTo(page, 0);
  await captureMain(page, 'entries/step2-proveedor-tienda.png');

  await scrollToText(page, 'Ingrese un producto');
  await screenshot(page, 'entries/step3-agregar-productos.png');

  await scrollToText(page, 'Cantidad');
  await screenshot(page, 'entries/step4-cantidad-precio.png');

  await scrollToBottom(page);
  await screenshot(page, 'entries/step5-confirmar.png');
}

// ─── Products screenshots ─────────────────────────────────────

async function captureProductsSteps(page) {
  console.log('\n📸 Capturando: Productos > Nuevo Producto');

  await navigateAndWait(page, '/dashboard/products/new');
  await captureSidebar(page, 'Productos', 'products/step1-menu-productos.png');

  // Step 2: Top of form - basic data
  await scrollTo(page, 0);
  await captureMain(page, 'products/step2-datos-basicos.png');

  // Step 3: Category and brand section
  await scrollToText(page, 'Categoria');
  await screenshot(page, 'products/step3-categoria-marca.png');

  // Step 4: Prices section
  await scrollToText(page, 'Precio');
  await screenshot(page, 'products/step4-precios.png');

  // Step 5: Images section
  await scrollToText(page, 'imagen');
  await screenshot(page, 'products/step5-imagenes.png');

  // Step 6: Save button at bottom
  await scrollToBottom(page);
  await screenshot(page, 'products/step6-guardar.png');
}

// ─── Categories screenshots ──────────────────────────────────

async function captureCategoriesSteps(page) {
  console.log('\n📸 Capturando: Categorias > Nueva Categoria');

  await navigateAndWait(page, '/dashboard/categories');
  await captureSidebar(page, 'Categorias', 'categories/step1-menu-categorias.png');

  // Step 2: The form/dialog for creating a new category
  await captureMain(page, 'categories/step2-nombre-categoria.png');

  // Step 3: Full page showing the categories list
  await screenshot(page, 'categories/step3-confirmar.png');
}

// ─── Providers screenshots ────────────────────────────────────

async function captureProvidersSteps(page) {
  console.log('\n📸 Capturando: Proveedores > Nuevo Proveedor');

  await navigateAndWait(page, '/dashboard/providers/new');
  await captureSidebar(page, 'Proveedores', 'providers/step1-menu-proveedores.png');

  // Step 2: Top of form - provider data
  await scrollTo(page, 0);
  await captureMain(page, 'providers/step2-datos-proveedor.png');

  // Step 3: Contact section
  await scrollToText(page, 'Contacto');
  await screenshot(page, 'providers/step3-contacto.png');

  // Step 4: Save button
  await scrollToBottom(page);
  await screenshot(page, 'providers/step4-guardar.png');
}

// ─── Quotes screenshots ──────────────────────────────────────

async function captureQuotesSteps(page) {
  console.log('\n📸 Capturando: Cotizaciones');

  await navigateAndWait(page, '/dashboard/quotes');

  // Step 1: Sidebar showing Ventas > Cotizaciones
  await captureSidebar(page, 'Ventas', 'quotes/step1-menu-cotizaciones.png');

  // Step 2: Main quotes list with "Nueva Cotizacion" button
  await captureMain(page, 'quotes/step2-nueva-cotizacion.png');

  // Step 3: Client selection area (top of form)
  await scrollTo(page, 0);
  await screenshot(page, 'quotes/step3-seleccionar-cliente.png');

  // Step 4: Products section
  await scrollTo(page, 350);
  await screenshot(page, 'quotes/step4-agregar-productos.png');

  // Step 5: Bottom with save
  await scrollToBottom(page);
  await screenshot(page, 'quotes/step5-guardar.png');
}

// ─── Exchange screenshots ────────────────────────────────────

async function captureExchangeSteps(page) {
  console.log('\n📸 Capturando: Tipo de Cambio');

  await navigateAndWait(page, '/dashboard/exchange');

  // Step 1: Sidebar
  await captureSidebar(page, 'Tipo de Cambio', 'exchange/step1-menu-cambio.png');

  // Step 2: Exchange rate form
  await captureMain(page, 'exchange/step2-ingresar-tasa.png');

  // Step 3: Save area
  await scrollToBottom(page);
  await screenshot(page, 'exchange/step3-guardar.png');
}

// ─── Catalog screenshots ─────────────────────────────────────

async function captureCatalogSteps(page) {
  console.log('\n📸 Capturando: Catalogo');

  await navigateAndWait(page, '/dashboard/catalog');

  // Step 1: Sidebar
  await captureSidebar(page, 'Catalogo', 'catalog/step1-menu-catalogo.png');

  // Step 2: Catalog config / cover section
  await scrollTo(page, 0);
  await captureMain(page, 'catalog/step2-configurar-catalogo.png');

  // Step 3: Product selection area
  await scrollTo(page, 400);
  await screenshot(page, 'catalog/step3-seleccionar-productos.png');

  // Step 4: Export button
  await scrollToBottom(page);
  await screenshot(page, 'catalog/step4-exportar.png');
}

// ─── Users screenshots ───────────────────────────────────────

async function captureUsersSteps(page) {
  console.log('\n📸 Capturando: Usuarios > Nuevo Usuario');

  await navigateAndWait(page, '/dashboard/users/new');
  await captureSidebar(page, 'Usuarios', 'users/step1-menu-usuarios.png');

  // Step 2: Form top - name and email
  await scrollTo(page, 0);
  await captureMain(page, 'users/step2-datos-usuario.png');

  // Step 3: Role selection
  await scrollToText(page, 'Rol');
  await screenshot(page, 'users/step3-seleccionar-rol.png');

  // Step 4: Save/Create button
  await scrollToBottom(page);
  await screenshot(page, 'users/step4-crear.png');
}

// ─── Stores screenshots ──────────────────────────────────────

async function captureStoresSteps(page) {
  console.log('\n📸 Capturando: Tiendas > Nueva Tienda');

  await navigateAndWait(page, '/dashboard/stores/new');
  await captureSidebar(page, 'Tiendas', 'stores/step1-menu-tiendas.png');

  // Step 2: Form - store data
  await scrollTo(page, 0);
  await captureMain(page, 'stores/step2-datos-tienda.png');

  // Step 3: Save button
  await scrollToBottom(page);
  await screenshot(page, 'stores/step3-guardar.png');
}

// ─── Orders screenshots ──────────────────────────────────────

async function captureOrdersSteps(page) {
  console.log('\n📸 Capturando: Pedidos');

  await navigateAndWait(page, '/dashboard/orders');

  // Step 1: Sidebar showing Ventas > Pedidos
  await captureSidebar(page, 'Ventas', 'orders/step1-menu-pedidos.png');

  // Step 2: Orders list
  await captureMain(page, 'orders/step2-seleccionar-pedido.png');

  // Step 3: Order detail area (scroll down for content)
  await scrollTo(page, 350);
  await screenshot(page, 'orders/step3-revisar-detalle.png');

  // Step 4: Bottom of page with action buttons
  await scrollToBottom(page);
  await screenshot(page, 'orders/step4-procesar.png');
}

// ─── Messages screenshots ────────────────────────────────────

async function captureMessagesSteps(page) {
  console.log('\n📸 Capturando: Mensajes');

  await navigateAndWait(page, '/dashboard/messages');

  // Step 1: Sidebar showing Ventas > Mensajes
  await captureSidebar(page, 'Ventas', 'messages/step1-menu-mensajes.png');

  // Step 2: Conversation list (left panel)
  await captureMain(page, 'messages/step2-seleccionar-conversacion.png');

  // Step 3: Chat area with input
  await screenshot(page, 'messages/step3-responder.png');
}

// ─── Cash Register screenshots ───────────────────────────────

async function captureCashregisterSteps(page) {
  console.log('\n📸 Capturando: Caja');

  await navigateAndWait(page, '/dashboard/cashregister');

  // Step 1: Sidebar showing Ventas > Caja
  await captureSidebar(page, 'Ventas', 'cashregister/step1-menu-caja.png');

  // Step 2: Cash register form
  await captureMain(page, 'cashregister/step2-monto-inicial.png');

  // Step 3: Open button area
  await scrollToBottom(page);
  await screenshot(page, 'cashregister/step3-abrir.png');
}

// ─── Accounting screenshots ──────────────────────────────────

async function captureAccountingSteps(page) {
  console.log('\n📸 Capturando: Contabilidad > Asientos');

  await navigateAndWait(page, '/dashboard/accounting/entries');

  // Step 1: Sidebar showing Contabilidad > Asientos
  await captureSidebar(page, 'Contabilidad', 'accounting/step1-menu-contabilidad.png');

  // Step 2: Entry list with "Nuevo Asiento" button
  await captureMain(page, 'accounting/step2-nuevo-asiento.png');

  // Step 3: Form header area (journal, date, description)
  await scrollTo(page, 0);
  await screenshot(page, 'accounting/step3-datos-asiento.png');

  // Step 4: Debit/credit lines section
  await scrollTo(page, 350);
  await screenshot(page, 'accounting/step4-lineas.png');

  // Step 5: Save button
  await scrollToBottom(page);
  await screenshot(page, 'accounting/step5-guardar.png');
}

// ─── General / Login screenshots ─────────────────────────────

async function captureGeneralSteps(page) {
  console.log('\n📸 Capturando: General > Login');

  // For login steps, we need a fresh page (not logged in)
  // We capture the login page directly
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Step 1: Login page
  await screenshot(page, 'general/step1-pagina-login.png');

  // Step 2: Email field focus
  await page.fill('#email', 'usuario@ejemplo.com');
  await page.waitForTimeout(500);
  await screenshot(page, 'general/step2-email.png');

  // Step 3: Password field
  await page.fill('#password', '********');
  await page.waitForTimeout(500);
  await screenshot(page, 'general/step3-password.png');

  // Step 4: Login button area
  await screenshot(page, 'general/step4-iniciar-sesion.png');

  // Clear and re-login for remaining captures
  await page.fill('#email', '');
  await page.fill('#password', '');
}

// ─── Inventory screenshots ───────────────────────────────────

async function captureInventorySteps(page) {
  console.log('\n📸 Capturando: Inventario');

  await navigateAndWait(page, '/dashboard/inventory');

  // Step 1: Sidebar showing Almacen > Inventario
  await captureSidebar(page, 'Almacen', 'inventory/step1-menu-inventario.png');

  // Step 2: Inventory table with stock
  await scrollTo(page, 0);
  await captureMain(page, 'inventory/step2-tabla-stock.png');

  // Step 3: Filters and search bar area
  await screenshot(page, 'inventory/step3-filtros.png');
}

// ─── Main ─────────────────────────────────────────────────────

async function safeCapture(fn, name) {
  try {
    await fn();
    return true;
  } catch (err) {
    console.error(`  ⚠️  Error en ${name}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando captura de screenshots para guias de ayuda');
  console.log(`   URL: ${BASE_URL}`);
  console.log(`   Output: ${PUBLIC_HELP}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    locale: 'es-PE',
    colorScheme: 'light',
  });
  const page = await context.newPage();

  let successCount = 0;
  let failCount = 0;

  try {
    // Capture login steps BEFORE logging in
    if (await safeCapture(async () => await captureGeneralSteps(page), 'General')) successCount++;

    // Now login for all other captures
    await login(page);

    // Existing modules
    if (await safeCapture(async () => await captureSalesSteps(page), 'Sales')) successCount++;
    if (await safeCapture(async () => await captureEntriesSteps(page), 'Entries')) successCount++;

    // New modules
    if (await safeCapture(async () => await captureProductsSteps(page), 'Products')) successCount++;
    if (await safeCapture(async () => await captureCategoriesSteps(page), 'Categories')) successCount++;
    if (await safeCapture(async () => await captureProvidersSteps(page), 'Providers')) successCount++;
    if (await safeCapture(async () => await captureQuotesSteps(page), 'Quotes')) successCount++;
    if (await safeCapture(async () => await captureExchangeSteps(page), 'Exchange')) successCount++;
    if (await safeCapture(async () => await captureCatalogSteps(page), 'Catalog')) successCount++;
    if (await safeCapture(async () => await captureUsersSteps(page), 'Users')) successCount++;
    if (await safeCapture(async () => await captureStoresSteps(page), 'Stores')) successCount++;
    if (await safeCapture(async () => await captureOrdersSteps(page), 'Orders')) successCount++;
    if (await safeCapture(async () => await captureMessagesSteps(page), 'Messages')) successCount++;
    if (await safeCapture(async () => await captureCashregisterSteps(page), 'Cashregister')) successCount++;
    if (await safeCapture(async () => await captureAccountingSteps(page), 'Accounting')) successCount++;
    if (await safeCapture(async () => await captureInventorySteps(page), 'Inventory')) successCount++;

    failCount = 16 - successCount;

    console.log('\n✅ Capturas completadas!');
    console.log(`   Exitosas: ${successCount}/16`);
    if (failCount > 0) {
      console.log(`   Fallidas: ${failCount}`);
    }
    console.log(`   Screenshots guardados en: ${PUBLIC_HELP}`);
  } catch (err) {
    console.error('\n❌ Error fatal durante la captura:', err.message);
    // Take a debug screenshot
    const debugPath = resolve(PUBLIC_HELP, '_debug-error.png');
    ensureDir(dirname(debugPath));
    await page.screenshot({ path: debugPath, fullPage: true });
    console.error(`   Debug screenshot: ${debugPath}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
