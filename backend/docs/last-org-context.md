Restaurar automáticamente la última organización utilizada
Este documento detalla el flujo completo para recordar y restaurar la última organización/compañía usada por un super administrador global, incluyendo manejo de casos edge, seguridad y optimizaciones.

1. Preparar el backend
Modelo de datos
Agrega a la tabla de usuarios (o a una entidad de preferencias):

lastOrgId (integer, nullable)
lastCompanyId (integer, nullable)
lastContextUpdatedAt (DateTime)
contextHash (string, opcional para validación de integridad)

Endpoints
PATCH /users/me/last-context
Actualiza el contexto del usuario:
json{
  "orgId": 123,
  "companyId": 45
}
Validaciones:

Verificar que el usuario tenga permisos activos sobre la organización
Validar que la organización y compañía existan
Rate limiting: máximo 10 requests por minuto
Devolver el contexto persistido con timestamp

GET /users/me
Ampliar para incluir:
json{
  "id": 1,
  "name": "Usuario",
  "lastContext": {
    "orgId": 123,
    "companyId": 45,
    "updatedAt": "2024-11-22T10:30:00Z"
  }
}
GET /users/me/validate-context
Endpoint específico para validar un contexto sin cargarlo:
json{
  "orgId": 123,
  "companyId": 45
}
Respuesta:
json{
  "isValid": true,
  "reason": null,
  "permissions": ["read", "write", "admin"]
}
Seguridad

TTL del contexto: Expirar automáticamente después de 30 días sin actividad
Audit log: Registrar cada cambio de contexto con timestamp e IP
Validación continua: Verificar permisos en cada request, no solo al restaurar

2. Persistencia en el frontend
Storage local
Estructura del objeto en localStorage:
json{
  "orgId": 123,
  "companyId": 45,
  "updatedAt": 1732300000000,
  "version": "1.0",
  "hash": "abc123xyz"
}
Clave: app_user_context_v1
Sincronización
typescriptclass ContextStorage {
  private readonly STORAGE_KEY = 'app_user_context_v1';
  private readonly CACHE_DURATION = 10000; // 10 segundos
  
  async saveContext(orgId: number, companyId: number): Promise<void> {
    const context = {
      orgId,
      companyId,
      updatedAt: Date.now(),
      version: '1.0',
      hash: this.generateHash(orgId, companyId)
    };
    
    // 1. Guardar localmente (inmediato)
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(context));
    } catch (error) {
      console.warn('localStorage no disponible:', error);
    }
    
    // 2. Sincronizar con backend (asíncrono, no bloquea UI)
    this.syncToBackend(context).catch(err => {
      console.error('Error sincronizando contexto:', err);
      // No fallar la operación, el contexto local ya está guardado
    });
    
    // 3. Notificar a otras pestañas
    this.broadcastContextChange(context);
  }
  
  private generateHash(orgId: number, companyId: number): string {
    // Hash simple para validar integridad
    return btoa(`${orgId}:${companyId}:${this.getUserId()}`);
  }
}
Sincronización multi-pestaña
typescript// Listener para detectar cambios en otras pestañas
window.addEventListener('storage', (event) => {
  if (event.key === 'app_user_context_v1' && event.newValue) {
    const newContext = JSON.parse(event.newValue);
    this.handleExternalContextChange(newContext);
  }
});

// Broadcast usando BroadcastChannel API
private contextChannel = new BroadcastChannel('app_context_sync');

contextChannel.onmessage = (event) => {
  if (event.data.type === 'CONTEXT_CHANGED') {
    this.reloadContextIfNeeded(event.data.context);
  }
};

3. Restauración al iniciar sesión / recargar
Flujo de restauración con fallbacks
typescriptclass ContextRestoreService {
  async restore(): Promise<RestoredContext> {
    this.showLoadingIndicator('Cargando tu espacio de trabajo...');
    
    try {
      // Paso 1: Intentar fuentes de contexto en orden de prioridad
      const context = await this.resolveContextSource();
      
      if (!context) {
        return this.handleNoContext();
      }
      
      // Paso 2: Validar el contexto obtenido
      const validation = await this.validateContext(context);
      
      if (!validation.isValid) {
        return this.handleInvalidContext(validation.reason, context);
      }
      
      // Paso 3: Aplicar el contexto
      await this.applyContext(context);
      
      // Paso 4: Feedback al usuario
      this.showSuccessToast(`Restaurado: ${validation.orgName}`);
      
      // Paso 5: Prefetch de datos críticos
      this.prefetchOrganizationData(context.orgId);
      
      return {
        success: true,
        context,
        source: context.source
      };
      
    } catch (error) {
      this.logError('restore_failed', error);
      return this.handleRestoreError(error);
    } finally {
      this.hideLoadingIndicator();
    }
  }
  
  private async resolveContextSource(): Promise<Context | null> {
    // Prioridad 1: localStorage (más rápido)
    const localContext = this.getLocalContext();
    
    // Prioridad 2: Backend
    const remoteContext = await this.getRemoteContext().catch(() => null);
    
    // Prioridad 3: Última sesión (del historial de navegación)
    const sessionContext = this.getSessionContext();
    
    // Prioridad 4: Organización favorita/principal del usuario
    const favoriteContext = await this.getFavoriteOrg().catch(() => null);
    
    // Resolver conflictos por timestamp más reciente
    return this.selectMostRecentContext([
      localContext,
      remoteContext,
      sessionContext,
      favoriteContext
    ]);
  }
  
  private selectMostRecentContext(contexts: Context[]): Context | null {
    const validContexts = contexts.filter(c => c && this.isContextFresh(c));
    
    if (validContexts.length === 0) return null;
    
    return validContexts.reduce((newest, current) => 
      current.updatedAt > newest.updatedAt ? current : newest
    );
  }
  
  private isContextFresh(context: Context): boolean {
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    return (Date.now() - context.updatedAt) < THIRTY_DAYS;
  }
  
  private async validateContext(context: Context): Promise<ValidationResult> {
    // Verificar hash de integridad
    if (context.hash && !this.verifyHash(context)) {
      return {
        isValid: false,
        reason: 'INTEGRITY_FAILED',
        message: 'El contexto fue modificado'
      };
    }
    
    // Validar con el backend
    const validation = await this.api.validateContext({
      orgId: context.orgId,
      companyId: context.companyId
    });
    
    return validation;
  }
}
Casos edge específicos
typescript// Caso 1: Usuario con una sola organización
if (userOrganizations.length === 1) {
  return this.applyContext({
    orgId: userOrganizations[0].id,
    companyId: userOrganizations[0].defaultCompanyId,
    source: 'auto_single_org'
  });
}

// Caso 2: Organización eliminada mid-session
contextChannel.onmessage = (event) => {
  if (event.data.type === 'ORG_DELETED' && 
      event.data.orgId === currentContext.orgId) {
    this.showModal({
      title: 'Organización eliminada',
      message: 'La organización que estabas usando ya no existe',
      action: () => this.redirectToOrgSelector()
    });
  }
};

// Caso 3: Pérdida de permisos mid-session
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 403 && 
        error.response?.data?.reason === 'ORG_ACCESS_REVOKED') {
      this.clearContext();
      this.showNotification({
        type: 'warning',
        message: 'Tus permisos han cambiado. Por favor, selecciona una organización.'
      });
      this.redirectToOrgSelector();
    }
    return Promise.reject(error);
  }
);

// Caso 4: localStorage deshabilitado
if (!this.isLocalStorageAvailable()) {
  console.warn('localStorage no disponible, usando solo backend');
  this.useBackendOnlyMode = true;
}

// Caso 5: Backend caído durante bootstrap
const remoteContext = await this.getRemoteContext()
  .catch(error => {
    this.showWarning('Trabajando en modo offline. Algunas funciones pueden no estar disponibles.');
    return null;
  });

// Caso 6: Contexto corrupto en ambos lados
if (!localContext && !remoteContext && !sessionContext) {
  this.logError('all_contexts_failed', { userId: this.getUserId() });
  this.clearAllContextData();
  return this.showOrgSelector();
}

4. Experiencia de usuario
Componente de selector de organización
typescriptinterface OrgSelectorProps {
  currentOrg?: Organization;
  onOrgChange: (orgId: number, companyId: number) => void;
  rememberSelection?: boolean;
}

// Features del selector:
// - Búsqueda rápida por nombre
// - Organizaciones recientes (últimas 5)
// - Organización "favorita" marcada con estrella
// - Indicador visual de la organización activa
// - Atajos de teclado (Ctrl+K para abrir)
Breadcrumb persistente
html<!-- Siempre visible en el header -->
<nav class="breadcrumb">
  <span class="org-name">Acme Corp</span>
  <span class="separator">›</span>
  <span class="company-name">División Norte</span>
  <button class="change-btn" title="Cambiar organización (Ctrl+K)">
    <icon-swap />
  </button>
</nav>
Indicadores visuales

Durante restauración: Skeleton loader con mensaje "Cargando tu espacio de trabajo..."
Restauración exitosa: Toast sutil (3 segundos) "Restaurado: [Nombre Org]"
Cambio manual: Confirmación visual inmediata + animación de transición
Modo offline: Banner discreto en la parte superior

Configuración de usuario
Agregar en el panel de preferencias:

☑ Recordar mi última organización (activo por defecto)
Organización favorita: [Selector dropdown]
Limpiar historial de contexto: [Botón secundario]

Feedback y transparencia
typescript// Mostrar origen de la restauración en dev tools
console.debug('Contexto restaurado desde:', {
  source: 'localStorage',
  orgId: 123,
  latency: '45ms',
  timestamp: new Date().toISOString()
});

5. Monitoreo y Analytics
Eventos a trackear
typescriptinterface ContextRestoreEvent {
  eventType: 'context_restore_attempt' | 'context_restore_success' | 'context_restore_failure';
  source: 'localStorage' | 'backend' | 'session' | 'favorite' | 'manual';
  success: boolean;
  orgId?: number;
  companyId?: number;
  latency: number;
  errorReason?: string;
  userAgent: string;
  timestamp: number;
}

// Enviar a sistema de analytics
analytics.track('context_restore_success', {
  source: 'localStorage',
  latency: 45,
  orgId: 123,
  companyId: 45
});
Métricas clave (KPIs)

Tasa de éxito de restauración (target: >95%)
Latencia promedio de restauración (target: <500ms)
Porcentaje de usuarios que cambian contexto por sesión
Errores de validación por tipo
Tasa de uso de localStorage vs backend

Logging para debugging
typescriptclass ContextLogger {
  logRestoreAttempt(context: Context) {
    console.group('🔄 Restauración de contexto');
    console.log('Fuente:', context.source);
    console.log('Organización:', context.orgId);
    console.log('Timestamp:', new Date(context.updatedAt));
    console.groupEnd();
  }
  
  logValidationError(reason: string, context: Context) {
    console.error('❌ Validación fallida:', {
      reason,
      context,
      userPermissions: this.getCurrentPermissions()
    });
  }
}

6. Performance y Optimización
Cache de validaciones
typescriptclass ValidationCache {
  private cache = new Map<string, CachedValidation>();
  private readonly CACHE_TTL = 10000; // 10 segundos
  
  async getValidation(orgId: number, companyId: number): Promise<ValidationResult> {
    const key = `${orgId}:${companyId}`;
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }
    
    const result = await this.fetchValidation(orgId, companyId);
    this.cache.set(key, { result, timestamp: Date.now() });
    return result;
  }
}
Lazy loading del selector
typescript// No cargar el componente hasta que sea necesario
const OrgSelector = lazy(() => import('./components/OrgSelector'));

// Solo renderizar si no hay contexto válido
{!hasValidContext && (
  <Suspense fallback={<SelectorSkeleton />}>
    <OrgSelector />
  </Suspense>
)}
Prefetching de datos
typescript// Después de restaurar contexto, precargar datos críticos
async applyContext(context: Context): Promise<void> {
  // 1. Aplicar headers
  this.setGlobalHeaders(context);
  
  // 2. Navegar al dashboard
  this.router.navigate(['/dashboard']);
  
  // 3. Prefetch en paralelo (no bloquea navegación)
  Promise.all([
    this.prefetchOrgDetails(context.orgId),
    this.prefetchRecentActivity(context.orgId),
    this.prefetchUserPermissions(context.orgId)
  ]).catch(err => console.warn('Prefetch parcialmente fallido:', err));
}
Debounce en cambios rápidos
typescript// Evitar múltiples requests si el usuario cambia rápido entre organizaciones
private saveContextDebounced = debounce(
  (orgId: number, companyId: number) => {
    this.contextStorage.saveContext(orgId, companyId);
  },
  500 // 500ms de espera
);

Alertas / backpressure
typescript// Registrar 429 y exponer métricas
this.contextThrottleService.recordHit(userId);

// Resumen disponible en /context-metrics/summary:
{
  throttleStats: {
    totalHits: 42,
    lastHourHits: 5,
    topUsers: [{ userId: 7, hits: 3 }]
  }
}

// Frontend aplica backoff de 60 s tras recibir 429
if (res.status === 429) {
  throttleUntil = Date.now() + 60_000;
  console.warn("Rate limit alcanzado, reintentando luego");
  return;
}

Resiliencia WebSocket
typescriptconst contextSocket = io(...);
let fallbackInterval: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const enableFallback = () => {
  if (!fallbackInterval) {
    fallbackInterval = setInterval(() => resolveSelection(), 15_000);
  }
};

contextSocket.on("connect_error", () => {
  // Tras 3 errores, desconectar socket y activar polling.
  enableFallback();
  reconnectTimer = setTimeout(() => setSocketAttempt((prev) => prev + 1), delay);
});

7. Testing
Test Suite Esencial
typescriptdescribe('ContextRestoreService', () => {
  describe('Primera sesión (sin contexto previo)', () => {
    it('debe mostrar el selector de organizaciones', async () => {
      // Test implementation
    });
    
    it('debe guardar contexto después de selección manual', async () => {
      // Test implementation
    });
  });
  
  describe('Restauración exitosa', () => {
    it('debe restaurar desde localStorage si es más reciente', async () => {
      // Test implementation
    });
    
    it('debe restaurar desde backend si localStorage está desactualizado', async () => {
      // Test implementation
    });
    
    it('debe aplicar headers globales correctamente', async () => {
      // Test implementation
    });
  });
  
  describe('Casos edge', () => {
    it('debe manejar organización eliminada entre sesiones', async () => {
      // Test implementation
    });
    
    it('debe manejar localStorage corrupto/manipulado', async () => {
      // Test implementation
    });
    
    it('debe funcionar cuando backend responde 500', async () => {
      // Test implementation
    });
    
    it('debe manejar cambio rápido entre 3+ organizaciones', async () => {
      // Test implementation
    });
    
    it('debe actualizar cuando usuario es degradado de super admin', async () => {
      // Test implementation
    });
    
    it('debe sincronizar entre múltiples pestañas', async () => {
      // Test implementation
    });
  });
  
  describe('Performance', () => {
    it('debe restaurar en menos de 500ms', async () => {
      // Test implementation
    });
    
    it('debe cachear validaciones por 10 segundos', async () => {
      // Test implementation
    });
  });
  
  describe('Seguridad', () => {
    it('debe validar hash de integridad', async () => {
      // Test implementation
    });
    
    it('debe expirar contexto después de 30 días', async () => {
      // Test implementation
    });
    
    it('debe respetar rate limiting', async () => {
      // Test implementation
    });
  });
});

8. Roadmap de Implementación
Fase 1: MVP (1-2 sprints)
Objetivo: Funcionalidad básica operativa

 Modelo de datos en backend
 Endpoints básicos (PATCH, GET)
 Persistencia en localStorage
 Flujo de restauración básico
 Validación de permisos
 Manejo de contexto inválido
 Logging básico
 Tests unitarios core

Criterio de éxito: Usuario puede guardar y restaurar su última organización en el 90% de los casos.
Fase 2: Robustez (1-2 sprints)
Objetivo: Manejo de casos edge y UX pulida

 Sincronización multi-pestaña
 Todos los fallbacks implementados
 Validación de integridad (hash)
 TTL de contexto (30 días)
 Indicadores visuales completos
 Configuración de usuario
 Rate limiting
 Tests de integración

Criterio de éxito: Sistema funciona correctamente en todos los casos edge identificados.
Fase 3: Optimización (1 sprint)
Objetivo: Performance y analytics

 Cache de validaciones
 Prefetching de datos
 Lazy loading del selector
 Debounce en cambios
 Analytics completo
 Dashboard de métricas
 Tests de performance
 Documentación final

Estado al cierre del sprint:

- Cache de validaciones (10s) implementada en ContextRestoreService con métricas de latencia.
- TeamSwitcher carga lazy y cachea organizaciones para acelerador de UI.
- useUserContextSync aplica debounce (500 ms) antes de sincronizar con el backend.
- Prefetch activo de organizaciones y mensajes cuando el contexto se restaura.
- Se agregaron eventos analytics `context_restore_*`, `context_manual_change`, `context_preference_changed` y un panel visual (`ContextAnalyticsPanel`).
- Documentación actualizada con comportamiento y configuración vigentes.

Criterio de éxito: Restauración en <500ms en p95, tasa de éxito >95%.
Fase 4: Mejoras Futuras (backlog)

 WebSockets para cambios en tiempo real
 Machine learning para predecir organización preferida
 Sincronización entre dispositivos en tiempo real
 Historial completo de cambios de contexto
 A/B testing de diferentes estrategias de restauración

Avance actual:

- Gateway Socket.IO `/context` emite `context:changed` cuando el backend persiste un nuevo `lastContext`.
- `TenantSelectionProvider` se suscribe y sincroniza la selección en vivo entre pestañas/dispositivos.
- Configuración: `NEXT_PUBLIC_SOCKET_URL` (opcional, cae en `NEXT_PUBLIC_BACKEND_URL`); el cliente debe enviar `userId` en la conexión (`query.userId`).

Fase 5: Documentación y soporte

- Historial completo disponible vía `GET /users/me/context-history?limit=&cursor=` (paginado) y restauración puntual con `POST /users/me/context-history/:id/restore`. El frontend cuenta con la vista dedicada `/dashboard/account/context-history`, navegación por páginas y botón de restaurar.
- Dashboard de métricas (`/dashboard/account/context-dashboard`) basado en `/context-metrics/*`, con KPIs personales/globales, stats de throttling y panel inline de analytics.
- Panel de analytics flotante reemplazado por un panel inline opcional dentro de la página de historial para evitar superposiciones. Desde allí se puede activar/desactivar la visualización de los últimos eventos `context_*`.
- Endpoints `/context-metrics/me` y `/context-metrics/summary` agregan métricas consolidadas (totales, top organizaciones, actividad 24h) y se muestran en el dashboard de historial.
- Export Prometheus-ready metrics en `/context-metrics/prometheus` para Datadog/Prometheus.
- Estrategias A/B documentadas: `NEXT_PUBLIC_CONTEXT_RESTORE_VARIANT` acepta `control`, `remote_first` y `extended_ttl`; todos los eventos incluyen `variant` en el payload para segmentar métricas.
- Se añadió guía de smoke-test: cambio de organización (TeamSwitcher), restauración automática tras reload, validación de contexto inválido y revisión del historial + analytics.
- Documento actualizado y listo para compartir con el equipo junto a la configuración de entorno (`README` y `.env`).

9. Configuración y Feature Flags
typescript// Permitir habilitar/deshabilitar features gradualmente
const FEATURE_FLAGS = {
  CONTEXT_RESTORE_ENABLED: true,
  USE_LOCAL_STORAGE: true,
  USE_BACKEND_SYNC: true,
  MULTI_TAB_SYNC: true,
  CONTEXT_TTL_DAYS: 30,
  VALIDATION_CACHE_MS: 10000,
  MAX_CONTEXT_UPDATES_PER_MINUTE: 10,
  PREFETCH_ORG_DATA: true,
  SHOW_RESTORE_TOAST: false, // Configurable por preferencias de usuario
};

10. SLA y Métricas Objetivo
MétricaObjetivoCríticoLatencia de restauración (p95)<500ms<1000msTasa de éxito>95%>90%Disponibilidad del servicio>99.5%>99%Tiempo de recuperación ante fallo<5min<15minTasa de error de validación<2%<5%
Recursos Adicionales

Diagrama de flujo: [Ver diagrama en Miro/FigJam]
API Documentation: [Ver Swagger/OpenAPI]
Runbook de debugging: [Ver Wiki]
Playbook operativo: [`last-org-context-playbook.md`](./last-org-context-playbook.md)
Postmortem template: [Ver Confluence]

## Escenarios end-to-end sugeridos

| # | Módulo | Pasos | Validación |
|---|--------|-------|------------|
| 1 | Dashboard | Cambiar org R1 → R2, abrir `/dashboard`, recargar | Breadcrumb y panel de empresa muestran R2; `context_restore_success` solo una vez |
| 2 | Catálogo PDF | Abrir `/dashboard/catalog`, forzar invalidación (anular permisos) | Al recargar aparece banner de contexto inválido; selector requiere nueva org |
| 3 | Mensajes | Cambiar a org con pocos datos, abrir `/dashboard/messages` | Hook `useMessageProvider` usa headers correctos (ver rede `x-org-id`) |
| 4 | Cash register | Abrir `/dashboard/cashregister`, alternar orgs sin recargar | Panel refleja empresa activa y no se dispara `context_restore_failure` |
| 5 | Multi-pestaña | Abrir dos tabs; cambiar org en Tab A | Tab B recibe `context:changed`, panel muestra nueva org sin recargar |
