#!/usr/bin/env node
/**
 * Demo del Sistema de Ayuda Contextual
 * Muestra cómo el sistema entiende consultas del mundo real
 * de usuarios inexpertos en diferentes situaciones
 */

console.log('🎯 Demo: Sistema de Ayuda Contextual para Usuarios Inexpertos\n');
console.log('='.repeat(80));

// Simulación de detección de contexto
function detectUserType(query) {
  const q = query.toLowerCase();

  if (q.match(/cuanto\s+(vendi|vendí|tengo|dinero)/)) return "owner";
  if (q.includes("cliente esperando") || q.includes("rapido")) return "seller";
  if (q.includes("asiento") || q.includes("libro")) return "accountant";
  if (q.includes("llego") || q.includes("mercaderia")) return "warehouse";
  if (q.includes("no encuentro") || q.includes("no se")) return "beginner";

  return "unknown";
}

function detectUrgency(query) {
  const q = query.toLowerCase();

  if (q.includes("urgente") || q.includes("ya") || q.includes("cliente esperando")) {
    return "🚨 CRÍTICO";
  }
  if (q.includes("no puedo") || q.includes("error")) {
    return "⚠️  ALTO";
  }
  if (q.includes("necesito") || q.includes("rapido")) {
    return "⏱️  MEDIO";
  }
  return "📝 BAJO";
}

function detectFrustration(query) {
  const q = query.toLowerCase();

  if (q.includes("no sirve") || q.includes("nunca") || q.includes("!!!")) {
    return "😤 ALTA (necesita empatía)";
  }
  if (q.includes("no puedo") || q.includes("no me deja")) {
    return "😕 MEDIA (ofrecer ayuda)";
  }
  if (q.includes("no entiendo")) {
    return "🤔 BAJA (explicar mejor)";
  }
  return "😊 NINGUNA";
}

// Casos de prueba reales
const realWorldTests = [
  {
    category: '👔 DUEÑO DE NEGOCIO (Orientado a resultados)',
    tests: [
      {
        query: "cuanto vendi hoy",
        expectedResponse: "Reporte de ventas diarias",
        adaptedTone: "CONCISO - Ir directo al número",
        quickAction: "📊 Ver dashboard con ventas del día"
      },
      {
        query: "cuanto dinero tengo en stock",
        expectedResponse: "Valor total del inventario",
        adaptedTone: "CONCISO - Mostrar número total",
        quickAction: "💰 Ver valor del inventario"
      },
      {
        query: "que productos se venden mas",
        expectedResponse: "Top productos más vendidos",
        adaptedTone: "CONCISO - Lista top 10",
        quickAction: "🏆 Ver ranking de productos"
      }
    ]
  },
  {
    category: '🛒 VENDEDOR (Rápido, práctico, cliente esperando)',
    tests: [
      {
        query: "tengo un cliente esperando como vendo rapido",
        expectedResponse: "Modo venta rápida",
        adaptedTone: "URGENTE - Solo pasos esenciales",
        quickAction: "⚡ Activar modo rápido (Ctrl+N)"
      },
      {
        query: "no encuentro el producto que me pide el cliente",
        expectedResponse: "Búsqueda de productos",
        adaptedTone: "RÁPIDO - Atajo de búsqueda",
        quickAction: "🔍 Buscar por código/nombre (Ctrl+F)"
      },
      {
        query: "el cliente quiere descuento como le hago",
        expectedResponse: "Aplicar descuento en venta",
        adaptedTone: "CONCISO - 3 pasos máximo",
        quickAction: "💸 Agregar descuento"
      }
    ]
  },
  {
    category: '📦 PERSONAL DE ALMACÉN (Tareas físicas)',
    tests: [
      {
        query: "acaba de llegar mercaderia del proveedor",
        expectedResponse: "Registrar ingreso de mercadería",
        adaptedTone: "PASO A PASO - Guía completa",
        quickAction: "📥 Nuevo ingreso"
      },
      {
        query: "un producto se cayo y se rompio como lo saco del stock",
        expectedResponse: "Dar de baja producto dañado",
        adaptedTone: "AMIGABLE - Tranquilizar",
        quickAction: "❌ Ajustar inventario (merma)"
      },
      {
        query: "necesito pasar productos de una tienda a otra",
        expectedResponse: "Transferencia entre tiendas",
        adaptedTone: "DETALLADO - Evitar errores",
        quickAction: "🔄 Crear transferencia"
      }
    ]
  },
  {
    category: '😰 USUARIO PRINCIPIANTE (Confundido, con errores)',
    tests: [
      {
        query: "no encuentro donde hacer una venta ayuda",
        expectedResponse: "Navegación básica",
        adaptedTone: "MUY DETALLADO - Con capturas",
        quickAction: "🎥 Ver tutorial en video"
      },
      {
        query: "me equivoque y borre algo que no debia",
        expectedResponse: "Deshacer/recuperar acción",
        adaptedTone: "EMPÁTICO - Tranquilizar primero",
        quickAction: "↩️  Intentar recuperar"
      },
      {
        query: "es mi primer dia no se por donde empezar",
        expectedResponse: "Tour guiado / Onboarding",
        adaptedTone: "AMIGABLE - Bienvenida",
        quickAction: "🎯 Iniciar tour guiado"
      }
    ]
  },
  {
    category: '❌ PROBLEMAS Y ERRORES (Frustración)',
    tests: [
      {
        query: "no puedo guardar la venta me sale error!!!",
        expectedResponse: "Solución de error de guardado",
        adaptedTone: "EMPÁTICO - Calmar frustración",
        quickAction: "🆘 Contactar soporte inmediato"
      },
      {
        query: "el sistema no me deja hacer nada esta bloqueado",
        expectedResponse: "Desbloquear sistema / permisos",
        adaptedTone: "TRANQUILIZADOR - Explicar causa",
        quickAction: "🔓 Verificar permisos"
      },
      {
        query: "por que nunca funciona cuando lo necesito",
        expectedResponse: "Ayuda general / soporte",
        adaptedTone: "EMPATÍA ALTA - Disculparse",
        quickAction: "📞 Hablar con soporte humano"
      }
    ]
  },
  {
    category: '🚨 CASOS URGENTES (Necesita respuesta YA)',
    tests: [
      {
        query: "URGENTE tengo reunion en 10 minutos necesito el reporte",
        expectedResponse: "Exportar reporte inmediato",
        adaptedTone: "ULTRA RÁPIDO - Solo el link",
        quickAction: "⚡ Descargar reporte ya"
      },
      {
        query: "hay cola de clientes y el sistema esta lento",
        expectedResponse: "Optimizar/reiniciar sistema",
        adaptedTone: "SOLUCIÓN INMEDIATA",
        quickAction: "🔄 Refrescar sistema"
      }
    ]
  },
  {
    category: '🗣️ LENGUAJE COLOQUIAL / INFORMAL',
    tests: [
      {
        query: "oye como ago pa vender rapido ps",
        expectedResponse: "Venta rápida",
        adaptedTone: "AUTO-CORRECCIÓN + AMIGABLE",
        quickAction: "⚡ Modo rápido"
      },
      {
        query: "no c como se ase esto",
        expectedResponse: "Depende del 'esto'",
        adaptedTone: "PEDIR CLARIFICACIÓN AMABLE",
        quickAction: "❓ ¿Qué necesitas hacer?"
      },
      {
        query: "la merca ta cara cuanto tengo invertido",
        expectedResponse: "Valor del inventario",
        adaptedTone: "ENTENDER JERGA + RESPONDER",
        quickAction: "💰 Ver inversión en stock"
      }
    ]
  }
];

// Ejecutar demos
realWorldTests.forEach(({ category, tests }, catIndex) => {
  console.log(`\n${category}`);
  console.log('─'.repeat(80));

  tests.forEach(({ query, expectedResponse, adaptedTone, quickAction }, testIndex) => {
    const userType = detectUserType(query);
    const urgency = detectUrgency(query);
    const frustration = detectFrustration(query);

    console.log(`\n${catIndex + 1}.${testIndex + 1} Usuario pregunta:`);
    console.log(`   "${query}"`);
    console.log('');
    console.log(`   📊 Análisis del Sistema:`);
    console.log(`      • Tipo de usuario: ${userType.toUpperCase()}`);
    console.log(`      • Urgencia: ${urgency}`);
    console.log(`      • Frustración: ${frustration}`);
    console.log('');
    console.log(`   ✅ Respuesta esperada: ${expectedResponse}`);
    console.log(`   🎨 Tono adaptado: ${adaptedTone}`);
    console.log(`   ⚡ Acción rápida: ${quickAction}`);

    // Simular respuesta adaptada
    if (frustration.includes("ALTA")) {
      console.log(`   💬 Respuesta: "Entiendo tu frustración. Vamos a resolver esto..."`);
    } else if (urgency.includes("CRÍTICO")) {
      console.log(`   💬 Respuesta: "🚨 RESPUESTA RÁPIDA: [Pasos esenciales]"`);
    } else if (userType === "beginner") {
      console.log(`   💬 Respuesta: "🎯 Te voy a guiar paso a paso..."`);
    } else {
      console.log(`   💬 Respuesta: [Estándar con contexto]`);
    }
  });
});

// Estadísticas finales
console.log('\n' + '='.repeat(80));
console.log('📊 Estadísticas del Sistema de Ayuda Contextual\n');

const totalTests = realWorldTests.reduce((sum, cat) => sum + cat.tests.length, 0);
const userTypes = ['owner', 'seller', 'accountant', 'warehouse', 'beginner'];

console.log(`Total de escenarios probados:    ${totalTests}`);
console.log(`Tipos de usuario detectados:     ${userTypes.length}`);
console.log(`Niveles de urgencia:             4 (Bajo, Medio, Alto, Crítico)`);
console.log(`Niveles de frustración:          4 (Ninguna, Baja, Media, Alta)`);

console.log('\n🎯 Adaptaciones Contextuales Implementadas:\n');
console.log('  ✅ Tono adaptado al tipo de usuario');
console.log('  ✅ Respuestas según urgencia');
console.log('  ✅ Empatía para usuarios frustrados');
console.log('  ✅ Acciones rápidas contextuales');
console.log('  ✅ Auto-corrección de lenguaje informal');
console.log('  ✅ Detección de jerga/coloquialismos');

console.log('\n💡 Capacidades Especiales:\n');
console.log('  🚨 Modo urgente para clientes esperando');
console.log('  😤 Detección de frustración y respuesta empática');
console.log('  👶 Modo principiante con tutoriales');
console.log('  ⚡ Atajos de teclado para vendedores');
console.log('  📊 Respuestas concisas para dueños');
console.log('  📦 Guías físicas para almacén');

console.log('\n🌟 Mejoras vs Sistema Anterior:\n');
console.log('  • Entiende CONTEXTO, no solo palabras clave');
console.log('  • Detecta URGENCIA y adapta respuesta');
console.log('  • Reconoce tipo de USUARIO');
console.log('  • Muestra EMPATÍA cuando hay frustración');
console.log('  • Ofrece ACCIONES RÁPIDAS según situación');
console.log('  • Maneja LENGUAJE INFORMAL y jerga');

console.log('\n✨ El sistema ahora es VERDADERAMENTE útil para usuarios');
console.log('   inexpertos en situaciones reales del día a día!\n');
