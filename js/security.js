// ========== SEGURIDAD Y VALIDACIONES ==========

// Detectar modo producción
const IS_PROD_SECURITY = !(location.hostname === 'localhost' || location.hostname === '127.0.0.1');
const logSecurity = IS_PROD_SECURITY ? () => {} : console.log.bind(console);

/**
 * Previene XSS sanitizando entrada de usuario
 */
function sanitizarHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

/**
 * Valida que un objeto tenga las propiedades requeridas
 */
function validarObjeto(obj, propiedades) {
  if (!obj || typeof obj !== 'object') return false;
  return propiedades.every(prop => prop in obj && obj[prop] != null);
}

/**
 * Valida que el profesional tiene los datos mínimos necesarios
 */
function validarProfesional(profesional) {
  return validarObjeto(profesional, ['id', 'nombre', 'especialidad', 'telefono']);
}

/**
 * Valida que la fecha es válida y está dentro del rango permitido
 */
function validarFecha(fecha) {
  try {
    const fechaObj = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // No permite fechas pasadas
    if (fechaObj < hoy) return false;
    
    // No permite fechas más de 90 días en el futuro (configurable)
    const maxFecha = new Date();
    maxFecha.setDate(maxFecha.getDate() + 90);
    if (fechaObj > maxFecha) return false;
    
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Valida que la hora está en formato válido
 */
function validarHora(hora) {
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(hora);
}

/**
 * Limpia datos sensibles del formulario después de usar
 */
function limpiarDatosSensibles() {
  const campos = ['nombre', 'email', 'telefono', 'documento'];
  campos.forEach(campo => {
    const elem = document.getElementById(campo);
    if (elem) elem.value = '';
  });
}

/**
 * Registra errores de forma segura
 */
function registrarError(mensaje, error = null) {
  const timestamp = new Date().toISOString();
  
  // Solo mostrar en desarrollo
  if (!IS_PROD_SECURITY) {
    console.error(`[${timestamp}] ❌ ${mensaje}`, error || '');
  }
  
  // Evitar enviar datos sensibles a logs externos
  if (window.logErrores) {
    window.logErrores({
      mensaje,
      timestamp,
      url: window.location.href
    });
  }
}

logSecurity('✅ Módulo de seguridad cargado');
