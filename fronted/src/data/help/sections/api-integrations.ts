import type { HelpSection } from "../types"

export const apiIntegrationsSection: HelpSection = {
  id: "api-integrations",
  title: "API e Integraciones",
  description: "Documentación para desarrolladores: API REST, Webhooks, SDKs e integraciones con sistemas externos",
  icon: "🔌",
  entries: [
    {
      id: "api-getting-started",
      question: "Como empiezo a usar la API REST?",
      aliases: [
        "API REST",
        "documentación API",
        "cómo usar API",
        "API documentation",
        "REST API",
        // 🆕 Aliases genéricos contextuales
        "paso a paso",
        "el paso a paso",
        "pasos",
        "cuales son los pasos",
        "dame los pasos",
        "como funciona esto",
        "que hace esto",
        "para que sirve esto",
        "de que se encarga esto",
        "explicame esto",
        "explicame eso",
        "no se como funciona esto",
        "no entiendo esto",
        "ayudame",
        "necesito ayuda",
        "ayuda con esto",
        "quiero ayuda",
        "detalle",
        "dame el detalle",
        "necesito mas detalle",
        "especificacion",
        "especificacion completa",
        "que hacen los botones",
        "explicame los botones",
        "como funciona",
        "que hago",
        "como se usa",
        "guia",
        "tutorial",
      ],
      keywords: ["API", "REST", "documentación", "empiezo", "usar", "developers", "desarrollo"],
      answer: "La API REST te permite integrar el sistema con aplicaciones externas mediante HTTP:",
      steps: [
        {
          text: "REQUISITOS: Tener una cuenta activa y permisos de administrador",
        },
        {
          text: "BASE URL: https://api.tudominio.com/v1",
        },
        {
          text: "AUTENTICACIÓN: Todas las peticiones requieren un API Key en el header: Authorization: Bearer {tu_api_key}",
        },
        {
          text: "FORMATO: Todas las peticiones y respuestas usan JSON",
        },
        {
          text: "VERSIONADO: La API usa versionado semántico (v1, v2, etc.)",
        },
        {
          text: "EJEMPLO BÁSICO (JavaScript):\n\n```javascript\nfetch('https://api.tudominio.com/v1/products', {\n  headers: {\n    'Authorization': 'Bearer tu_api_key_aqui',\n    'Content-Type': 'application/json'\n  }\n})\n.then(res => res.json())\n.then(data => console.log(data))\n```",
        },
      ],
      relatedActions: ["api-authentication", "api-endpoints"],
    },
    {
      id: "api-authentication",
      question: "Como obtengo y uso API Keys para autenticación?",
      aliases: [
        "API key",
        "token de acceso",
        "autenticación API",
        "API authentication",
        "generar token",
      ],
      keywords: ["API", "key", "token", "autenticación", "authentication", "generar", "acceso"],
      answer: "Las API Keys te permiten autenticar tus peticiones de forma segura:",
      steps: [
        {
          text: "Ve a Configuración → Desarrolladores → API Keys",
        },
        {
          text: "Haz clic en 'Generar Nueva API Key'",
        },
        {
          text: "Asigna un NOMBRE descriptivo (ej. 'Integración con App Móvil')",
        },
        {
          text: "Define PERMISOS: Solo lectura, Lectura y escritura, o Admin completo",
        },
        {
          text: "COPIA la API Key generada - solo se muestra UNA VEZ por seguridad",
        },
        {
          text: "Guárdala en un lugar seguro (ej. variables de entorno, nunca en código público)",
        },
        {
          text: "USA la key en el header de cada petición: Authorization: Bearer {api_key}",
        },
        {
          text: "Puedes ROTAR (regenerar) la key si crees que fue comprometida",
        },
        {
          text: "REVOCA keys que ya no uses para mantener seguridad",
        },
      ],
      relatedActions: ["api-getting-started", "api-security"],
    },
    {
      id: "api-endpoints",
      question: "Cuáles son los endpoints principales de la API?",
      aliases: [
        "endpoints API",
        "rutas API",
        "API routes",
        "métodos API",
        "recursos API",
      ],
      keywords: ["endpoints", "API", "rutas", "routes", "métodos", "recursos"],
      answer: "La API expone los siguientes endpoints principales (todos bajo /v1):",
      steps: [
        {
          text: "PRODUCTOS:\nGET /products - Listar productos\nGET /products/:id - Ver producto\nPOST /products - Crear producto\nPUT /products/:id - Actualizar producto\nDELETE /products/:id - Eliminar producto",
        },
        {
          text: "VENTAS:\nGET /sales - Listar ventas\nGET /sales/:id - Ver venta\nPOST /sales - Crear venta\nGET /sales/:id/pdf - Descargar PDF",
        },
        {
          text: "CLIENTES:\nGET /clients - Listar clientes\nPOST /clients - Crear cliente\nPUT /clients/:id - Actualizar cliente",
        },
        {
          text: "INVENTARIO:\nGET /inventory - Ver stock\nPOST /inventory/adjust - Ajustar inventario\nGET /inventory/movements - Ver movimientos",
        },
        {
          text: "REPORTES:\nGET /reports/sales-summary - Resumen de ventas\nGET /reports/top-products - Productos más vendidos\nGET /reports/inventory-value - Valor del inventario",
        },
        {
          text: "Para documentación completa con parámetros y ejemplos, visita: https://api-docs.tudominio.com",
        },
      ],
      relatedActions: ["api-getting-started", "api-examples"],
    },
    {
      id: "api-webhooks",
      question: "Como configuro webhooks para recibir eventos en tiempo real?",
      aliases: [
        "webhooks",
        "notificaciones en tiempo real",
        "eventos webhook",
        "callback URL",
        "real-time notifications",
      ],
      keywords: ["webhooks", "eventos", "tiempo", "real", "notificaciones", "callback"],
      answer: "Los webhooks envían notificaciones HTTP automáticas cuando ocurren eventos importantes:",
      steps: [
        {
          text: "Ve a Configuración → Desarrolladores → Webhooks",
        },
        {
          text: "Haz clic en 'Nuevo Webhook'",
        },
        {
          text: "Ingresa la URL de tu servidor que recibirá los eventos (debe ser HTTPS)",
        },
        {
          text: "SELECCIONA LOS EVENTOS que quieres recibir:\n- sale.created (Nueva venta)\n- sale.updated (Venta modificada)\n- product.created (Nuevo producto)\n- product.stock_low (Stock bajo)\n- payment.received (Pago recibido)\n- entry.created (Nueva entrada de mercadería)",
        },
        {
          text: "El sistema enviará un POST a tu URL con el payload del evento en JSON",
        },
        {
          text: "Tu servidor debe responder con status 200 para confirmar recepción",
        },
        {
          text: "Si falla, el sistema reintentará 3 veces (1 min, 5 min, 30 min después)",
        },
        {
          text: "VALIDA la firma del webhook usando el secret key para seguridad",
        },
        {
          text: "Ejemplo de payload:\n```json\n{\n  \"event\": \"sale.created\",\n  \"timestamp\": \"2026-02-13T10:30:00Z\",\n  \"data\": {\n    \"id\": 123,\n    \"total\": 500.00,\n    \"client\": \"John Doe\"\n  }\n}\n```",
        },
      ],
      relatedActions: ["api-getting-started", "api-security"],
    },
    {
      id: "api-rate-limiting",
      question: "Cuál es el rate limit de la API?",
      aliases: [
        "rate limit",
        "límite de peticiones",
        "throttling",
        "límite de requests",
        "API limits",
      ],
      keywords: ["rate", "limit", "límite", "peticiones", "throttling", "requests"],
      answer: "La API tiene límites de peticiones para garantizar estabilidad:",
      steps: [
        {
          text: "LÍMITE POR DEFECTO: 1000 peticiones por hora por API Key",
        },
        {
          text: "BURST LIMIT: Máximo 100 peticiones por minuto",
        },
        {
          text: "Headers de respuesta indican el estado:\n- X-RateLimit-Limit: 1000\n- X-RateLimit-Remaining: 750\n- X-RateLimit-Reset: 1644764400",
        },
        {
          text: "Si excedes el límite, recibirás HTTP 429 'Too Many Requests'",
        },
        {
          text: "SOLUCIÓN: Espera hasta que se resetee el contador (header X-RateLimit-Reset)",
        },
        {
          text: "BEST PRACTICES:\n- Implementa exponential backoff\n- Cachea respuestas cuando sea posible\n- Usa webhooks en lugar de polling constante",
        },
        {
          text: "Si necesitas límites más altos, contacta al equipo de soporte con tu caso de uso",
        },
      ],
      relatedActions: ["api-getting-started", "api-webhooks"],
    },
    {
      id: "api-errors",
      question: "Como manejo errores de la API?",
      aliases: [
        "errores API",
        "error handling",
        "códigos de error",
        "API errors",
        "manejo de errores",
      ],
      keywords: ["errores", "API", "error", "handling", "códigos", "manejo"],
      answer: "La API usa códigos HTTP estándar y respuestas JSON estructuradas para errores:",
      steps: [
        {
          text: "CÓDIGOS HTTP:\n- 200 OK: Éxito\n- 201 Created: Recurso creado\n- 400 Bad Request: Petición inválida\n- 401 Unauthorized: API key inválida o faltante\n- 403 Forbidden: Sin permisos\n- 404 Not Found: Recurso no encontrado\n- 422 Unprocessable Entity: Validación fallida\n- 429 Too Many Requests: Rate limit excedido\n- 500 Internal Server Error: Error del servidor",
        },
        {
          text: "FORMATO DE RESPUESTA DE ERROR:\n```json\n{\n  \"error\": {\n    \"code\": \"VALIDATION_ERROR\",\n    \"message\": \"El precio debe ser mayor a 0\",\n    \"field\": \"price\",\n    \"details\": {...}\n  }\n}\n```",
        },
        {
          text: "CÓDIGOS DE ERROR COMUNES:\n- INVALID_API_KEY: API key incorrecta\n- VALIDATION_ERROR: Datos inválidos\n- RESOURCE_NOT_FOUND: No existe\n- INSUFFICIENT_STOCK: Stock insuficiente\n- DUPLICATE_ENTRY: Ya existe",
        },
        {
          text: "BEST PRACTICES:\n- Verifica el status code HTTP\n- Lee el mensaje de error en 'message'\n- Para errores de validación, revisa 'field' y 'details'\n- Implementa retry logic para errores 5xx\n- NO retries para errores 4xx (son permanentes)",
        },
      ],
      relatedActions: ["api-getting-started", "api-examples"],
    },
    {
      id: "api-pagination",
      question: "Como funciona la paginación en la API?",
      aliases: [
        "paginación API",
        "pagination",
        "listar resultados",
        "página siguiente",
        "offset limit",
      ],
      keywords: ["paginación", "pagination", "resultados", "página", "offset", "limit"],
      answer: "Los endpoints que retornan listas usan paginación cursor-based:",
      steps: [
        {
          text: "PARÁMETROS:\n- limit: Número de items por página (default: 20, max: 100)\n- cursor: Token para la página siguiente (obtenido de la respuesta anterior)",
        },
        {
          text: "EJEMPLO DE PETICIÓN:\nGET /products?limit=50&cursor=eyJpZCI6MTIzfQ==",
        },
        {
          text: "EJEMPLO DE RESPUESTA:\n```json\n{\n  \"data\": [...], // Array de productos\n  \"pagination\": {\n    \"next_cursor\": \"eyJpZCI6MTczfQ==\",\n    \"has_more\": true,\n    \"total\": 250\n  }\n}\n```",
        },
        {
          text: "OBTENER TODAS LAS PÁGINAS:\n1. Haz la primera petición sin cursor\n2. Si has_more es true, haz otra petición con next_cursor\n3. Repite hasta que has_more sea false",
        },
        {
          text: "VENTAJA DE CURSOR: Maneja bien datos que cambian durante la paginación (a diferencia de offset que puede saltarse items)",
        },
      ],
      relatedActions: ["api-endpoints", "api-examples"],
    },
    {
      id: "api-sdks",
      question: "Existen SDKs o librerías para facilitar la integración?",
      aliases: [
        "SDK",
        "librerías",
        "client libraries",
        "npm package",
        "SDK oficial",
      ],
      keywords: ["SDK", "librerías", "client", "libraries", "npm", "package", "oficial"],
      answer: "Ofrecemos SDKs oficiales para los lenguajes más populares:",
      steps: [
        {
          text: "JAVASCRIPT/TYPESCRIPT (Node.js):\nnpm install @tuapp/api-client\n\n```javascript\nimport { ApiClient } from '@tuapp/api-client';\n\nconst client = new ApiClient({\n  apiKey: process.env.API_KEY\n});\n\nconst products = await client.products.list();\n```",
        },
        {
          text: "PYTHON:\npip install tuapp-api\n\n```python\nfrom tuapp import Client\n\nclient = Client(api_key=os.getenv('API_KEY'))\nproducts = client.products.list()\n```",
        },
        {
          text: "PHP:\ncomposer require tuapp/api-client\n\n```php\n$client = new TuApp\\Client(['api_key' => $_ENV['API_KEY']]);\n$products = $client->products->list();\n```",
        },
        {
          text: "OTROS LENGUAJES: Si tu lenguaje no tiene SDK, puedes usar cualquier HTTP client (axios, fetch, requests, guzzle, etc.) siguiendo la documentación de la API REST",
        },
        {
          text: "CÓDIGO ABIERTO: Todos nuestros SDKs están en GitHub para contribuciones de la comunidad",
        },
      ],
      relatedActions: ["api-getting-started", "api-examples"],
    },
    {
      id: "api-integrations-payment",
      question: "Como integro pasarelas de pago como MercadoPago, Stripe?",
      aliases: [
        "integración MercadoPago",
        "integración Stripe",
        "pasarela de pago",
        "payment gateway",
        "procesar pagos",
      ],
      keywords: ["integración", "MercadoPago", "Stripe", "pasarela", "pago", "payment", "gateway"],
      answer: "Puedes integrar pasarelas de pago para procesar pagos online:",
      steps: [
        {
          text: "Ve a Configuración → Integraciones → Pasarelas de Pago",
        },
        {
          text: "MERCADOPAGO (Latam):\n1. Obtén tus credenciales de MercadoPago (Public Key y Access Token)\n2. Haz clic en 'Conectar MercadoPago'\n3. Ingresa tus credenciales\n4. Configura: modo sandbox (pruebas) o production\n5. Los pagos con MP ahora están disponibles en tus ventas",
        },
        {
          text: "STRIPE (Internacional):\n1. Obtén tus API keys de Stripe (Publishable y Secret)\n2. Haz clic en 'Conectar Stripe'\n3. Ingresa tus credenciales\n4. Los clientes pueden pagar con tarjeta directamente",
        },
        {
          text: "WEBHOOKS: Las pasarelas enviarán notificaciones cuando un pago sea confirmado, el sistema actualizará automáticamente el estado de la venta",
        },
        {
          text: "COMISIONES: Ten en cuenta que cada pasarela cobra comisiones (ej. MercadoPago ~4%, Stripe ~3.5%)",
        },
      ],
      relatedActions: ["api-webhooks", "api-getting-started"],
    },
    {
      id: "api-oauth",
      question: "Como implemento OAuth para que usuarios autoricen mi app?",
      aliases: [
        "OAuth",
        "autorización OAuth",
        "OAuth 2.0",
        "login con OAuth",
        "third-party auth",
      ],
      keywords: ["OAuth", "autorización", "OAuth 2.0", "login", "third-party", "auth"],
      answer: "OAuth 2.0 permite que usuarios autoricen tu aplicación de forma segura sin compartir contraseñas:",
      steps: [
        {
          text: "FLUJO OAUTH:\n1. Registra tu aplicación en Configuración → Desarrolladores → OAuth Apps\n2. Obtén tu Client ID y Client Secret\n3. Define las Redirect URIs permitidas (ej. https://tuapp.com/callback)",
        },
        {
          text: "PASO 1 - Redirect al usuario a:\nhttps://tudominio.com/oauth/authorize?\n  client_id=tu_client_id&\n  redirect_uri=https://tuapp.com/callback&\n  response_type=code&\n  scope=read_products,write_sales",
        },
        {
          text: "PASO 2 - Usuario autoriza tu app",
        },
        {
          text: "PASO 3 - Sistema redirige a tu redirect_uri con un code:\nhttps://tuapp.com/callback?code=abc123",
        },
        {
          text: "PASO 4 - Intercambia el code por un access_token:\nPOST https://tudominio.com/oauth/token\n{\n  \"grant_type\": \"authorization_code\",\n  \"code\": \"abc123\",\n  \"client_id\": \"tu_client_id\",\n  \"client_secret\": \"tu_client_secret\",\n  \"redirect_uri\": \"https://tuapp.com/callback\"\n}",
        },
        {
          text: "PASO 5 - Usa el access_token para hacer peticiones a la API:\nAuthorization: Bearer {access_token}",
        },
        {
          text: "SCOPES disponibles: read_products, write_products, read_sales, write_sales, read_clients, write_clients, admin",
        },
      ],
      relatedActions: ["api-authentication", "api-security"],
    },
    {
      id: "api-examples",
      question: "Donde encuentro ejemplos de código para la API?",
      aliases: [
        "ejemplos API",
        "code examples",
        "snippets",
        "ejemplos de código",
        "sample code",
      ],
      keywords: ["ejemplos", "API", "code", "snippets", "código", "sample"],
      answer: "Tenemos ejemplos completos de código para casos de uso comunes:",
      steps: [
        {
          text: "EJEMPLO 1 - Crear un producto:\n```javascript\nconst response = await fetch('https://api.tudominio.com/v1/products', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer tu_api_key',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({\n    name: 'Laptop HP',\n    price: 1200.00,\n    stock: 10,\n    category_id: 5\n  })\n});\n\nconst product = await response.json();\nconsole.log('Producto creado:', product.id);\n```",
        },
        {
          text: "EJEMPLO 2 - Registrar una venta:\n```python\nimport requests\n\nresponse = requests.post(\n  'https://api.tudominio.com/v1/sales',\n  headers={'Authorization': 'Bearer tu_api_key'},\n  json={\n    'client_id': 123,\n    'items': [\n      {'product_id': 456, 'quantity': 2, 'price': 50.00}\n    ],\n    'payment_method': 'cash'\n  }\n)\n\nsale = response.json()\nprint(f'Venta registrada: {sale[\"id\"]}')\n```",
        },
        {
          text: "EJEMPLO 3 - Consultar inventario:\n```php\n$ch = curl_init('https://api.tudominio.com/v1/inventory');\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n  'Authorization: Bearer tu_api_key'\n]);\n$response = curl_exec($ch);\n$inventory = json_decode($response);\n\nforeach ($inventory->data as $item) {\n  echo \"{$item->product_name}: {$item->stock}\\n\";\n}\n```",
        },
        {
          text: "MÁS EJEMPLOS: Visita https://github.com/tuapp/api-examples para ver el repositorio completo con ejemplos en 10+ lenguajes",
        },
      ],
      relatedActions: ["api-endpoints", "api-sdks"],
    },
    {
      id: "api-security",
      question: "Cuáles son las mejores prácticas de seguridad para la API?",
      aliases: [
        "seguridad API",
        "API security",
        "best practices",
        "buenas prácticas",
        "proteger API",
      ],
      keywords: ["seguridad", "API", "security", "best", "practices", "buenas", "prácticas", "proteger"],
      answer: "Sigue estas prácticas para mantener tu integración segura:",
      steps: [
        {
          text: "1. NUNCA compartas tu API Key públicamente:\n❌ NO la pongas en código frontend\n❌ NO la subas a GitHub\n✅ Úsala solo en backend\n✅ Guárdala en variables de entorno",
        },
        {
          text: "2. USA HTTPS siempre: Nunca hagas peticiones por HTTP plano (sin cifrado)",
        },
        {
          text: "3. ROTA tus API Keys periódicamente (cada 3-6 meses) o inmediatamente si sospechas compromiso",
        },
        {
          text: "4. USA PERMISOS MÍNIMOS: Si solo necesitas leer productos, no uses una key con permisos de admin",
        },
        {
          text: "5. VALIDA WEBHOOKS: Verifica la firma del webhook antes de procesar el evento para evitar ataques de spoofing",
        },
        {
          text: "6. IMPLEMENTA RETRY LOGIC con exponential backoff para manejar errores transitorios sin saturar la API",
        },
        {
          text: "7. MANEJA ERRORES apropiadamente: No expongas detalles internos en mensajes de error a usuarios finales",
        },
        {
          text: "8. MONITOREA tu uso: Revisa logs de API regularmente para detectar actividad sospechosa",
        },
        {
          text: "9. IP WHITELIST (opcional): Si tu servidor tiene IP fija, puedes restringir el acceso solo desde esas IPs",
        },
      ],
      relatedActions: ["api-authentication", "api-webhooks"],
    },
  ],
}
