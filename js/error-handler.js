// ========== MANEJADOR GLOBAL DE ERRORES ==========

// Detectar modo producción
const IS_PROD_ERRHANDLER = !(location.hostname === 'localhost' || location.hostname === '127.0.0.1');
const logErrHandler = IS_PROD_ERRHANDLER ? () => {} : console.log.bind(console);

/**
 * Captura y registra errores no manejados
 */
window.addEventListener('error', (event) => {
  // Solo mostrar en consola errores críticos
  if (!IS_PROD_ERRHANDLER) {
    console.error('❌ Error no manejado:', event.error);
  }
  
  // Enviar a servicio de monitoreo en producción
  if (typeof logErrorGlobalmente === 'function') {
    logErrorGlobalmente({
      tipo: 'error',
      mensaje: event.message,
      archivo: event.filename,
      linea: event.lineno,
      columna: event.colno,
      error: event.error?.stack
    });
  }
});

/**
 * Captura promesas rechazadas no manejadas
 */
window.addEventListener('unhandledrejection', (event) => {
  if (!IS_PROD_ERRHANDLER) {
    console.error('❌ Promesa rechazada no manejada:', event.reason);
  }
  
  if (typeof logErrorGlobalmente === 'function') {
    logErrorGlobalmente({
      tipo: 'unhandledRejection',
      razon: event.reason?.message || String(event.reason),
      stack: event.reason?.stack
    });
  }
});

/**
 * Función de logging global de errores
 */
function logErrorGlobalmente(error) {
  // En desarrollo, solo log a consola
  if (!IS_PROD_ERRHANDLER) {
    console.table(error);
    return;
  }
  
  // En producción, se podría enviar a un servicio como Sentry, LogRocket, etc.
  // fetch('/api/log-error', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     ...error,
  //     timestamp: new Date().toISOString(),
  //     url: window.location.href,
  //     userAgent: navigator.userAgent
  //   })
  // }).catch(e => console.error('No se pudo enviar error:', e));
}

/**
 * Valida que las dependencias críticas están cargadas
 */
function validarDependencias() {
  const dependencias = {
    'Firebase': window.firebase && window.firebase.db,
    'CONFIG': typeof CONFIG !== 'undefined',
    'utils': typeof validarEmail === 'function',
    'data': typeof cargarProfesionales === 'function',
    'security': typeof sanitizarHTML === 'function'
  };
  
  const faltantes = Object.entries(dependencias)
    .filter(([_, cargada]) => !cargada)
    .map(([nombre]) => nombre);
  
  if (faltantes.length > 0) {
    if (!IS_PROD_ERRHANDLER) console.error('⚠️ Dependencias faltantes:', faltantes);
    return false;
  }
  
  logErrHandler('✅ Todas las dependencias cargadas correctamente');
  return true;
}

// Ejecutar validación cuando el DOM está listo
document.addEventListener('DOMContentLoaded', validarDependencias);

logErrHandler('✅ Sistema de error handling cargado');
