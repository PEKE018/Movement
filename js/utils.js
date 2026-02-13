// ========== UTILIDADES GENERALES ==========

function obtenerIniciales(nombre) {
  return nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function formatearFecha(fechaISO) {
  const partes = fechaISO.split('-');
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validarTelefono(telefono) {
  const limpio = telefono.replace(/\D/g, '');
  if (limpio.length < 10) return { valido: false, mensaje: 'El teléfono debe tener al menos 10 dígitos' };
  
  // Formatear con código de Argentina (54) sin el 9 adicional
  let telefonoFormateado = limpio;
  if (!telefonoFormateado.startsWith('54')) {
    telefonoFormateado = '54' + limpio;
  }
  
  return { valido: true, telefono: telefonoFormateado };
}

function sanitizarTexto(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function mostrarToast(mensaje, tipo = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.innerHTML = `
    <i data-lucide="${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'x-circle' : 'info'}"></i>
    <span>${sanitizarTexto(mensaje)}</span>
  `;
  document.body.appendChild(toast);
  if (typeof lucide !== 'undefined') lucide.createIcons();
  setTimeout(() => toast.classList.add('toast-show'), 10);
  setTimeout(() => { toast.classList.remove('toast-show'); setTimeout(() => toast.remove(), CONFIG.animaciones.toastDuracion); }, CONFIG.duracionToast);
}

function capitalizarNombre(nombre) {
  return nombre.toLowerCase().split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}
// Exportar funciones globalmente
window.formatearFecha = formatearFecha;
window.validarEmail = validarEmail;
window.validarTelefono = validarTelefono;
window.sanitizarTexto = sanitizarTexto;
window.mostrarToast = mostrarToast;
window.capitalizarNombre = capitalizarNombre;