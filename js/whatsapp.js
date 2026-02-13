// ========== GESTIÓN DE WHATSAPP ==========

// Detectar modo producción
const IS_PROD_WA = !(location.hostname === 'localhost' || location.hostname === '127.0.0.1');
const logWA = IS_PROD_WA ? () => {} : console.log.bind(console);
const logErrorWA = console.error.bind(console);

function enviarReserva(profesional, fecha, hora) {
  logWA('📱 enviarReserva llamada con:', { profesional, fecha, hora });
  
  // Validar que el profesional tenga los datos necesarios
  if (!profesional || !profesional.telefono) {
    logErrorWA('❌ Error: Profesional o teléfono no disponible', profesional);
    if (typeof window.mostrarToast === 'function') {
      window.mostrarToast('Error: No se pudo enviar el mensaje a WhatsApp', 'error');
    }
    return;
  }

  // Las validaciones de campos ya se hacen antes de llamar a esta función en app.js
  const nombreInput = document.getElementById('nombre');
  const telefonoInput = document.getElementById('telefono');
  const emailInput = document.getElementById('email');
  const docInput = document.getElementById('documento');
  
  const nombre = nombreInput ? (typeof window.capitalizarNombre === 'function' ? window.capitalizarNombre(nombreInput.value.trim()) : nombreInput.value.trim()) : '';
  const telefonoCliente = telefonoInput ? telefonoInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const doc = docInput ? docInput.value.trim() : '';
  const fechaFormateada = typeof window.formatearFecha === 'function' ? window.formatearFecha(fecha) : fecha;

  logWA('📱 Datos del mensaje:', { nombre, telefonoCliente, fechaFormateada });

  const mensaje = encodeURIComponent(
`${profesional.mensajeBase || "Nuevo turno confirmado"}:

Fecha: ${fechaFormateada}
Hora: ${hora}
Paciente: ${nombre}
Teléfono: ${telefonoCliente}
${email ? `📧 Email: ${email}` : ''}
${doc ? `🪪 Documento: ${doc}` : ''}

Movement - Sistema de Reservas`
  );

  // Validar formato de teléfono de WhatsApp
  let whatsappNumber = profesional.telefono.toString().replace(/\D/g, '');
  
  // Si no tiene código de país, agregar 54 (Argentina)
  if (!whatsappNumber.startsWith('54') && whatsappNumber.length <= 10) {
    whatsappNumber = '54' + whatsappNumber;
  }
  
  logWA('📱 Número WhatsApp:', whatsappNumber);
  
  if (whatsappNumber.length < 10) {
    logErrorWA('❌ Error: Teléfono de WhatsApp inválido', whatsappNumber);
    if (typeof window.mostrarToast === 'function') {
      window.mostrarToast('Error: Teléfono de WhatsApp inválido', 'error');
    }
    return;
  }

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${mensaje}`;
  logWA('📱 URL WhatsApp generada');

  // Abrir WhatsApp
  try {
    const ventana = window.open(whatsappUrl, '_blank');
    if (!ventana) {
      // Si el popup fue bloqueado, intentar con location
      logWA('⚠️ Popup bloqueado, intentando con location.href');
      window.location.href = whatsappUrl;
    }
  } catch (error) {
    logErrorWA('❌ Error al abrir WhatsApp:', error);
    // Fallback: intentar con un link
    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Función para contactar al profesional directamente por WhatsApp
function contactarProfesionalWhatsApp() {
  // Obtener el profesional seleccionado desde la variable global de app.js
  const profesional = window.profesionalSeleccionado;
  
  if (!profesional || !profesional.telefono) {
    logErrorWA('❌ Error: Profesional o teléfono no disponible para contacto directo');
    if (typeof window.mostrarToast === 'function') {
      window.mostrarToast('No se pudo obtener el contacto del profesional', 'error');
    }
    return;
  }

  logWA('📱 Contactando profesional:', profesional.nombre);

  // Obtener mensajes directos configurados
  const mensajes = profesional.mensajesDirectos || (profesional.mensajeBase ? [profesional.mensajeBase] : []);
  
  // Si hay más de un mensaje, mostrar modal de selección
  if (mensajes.length > 1) {
    mostrarModalSeleccionMensaje(profesional, mensajes);
    return;
  }
  
  // Si hay un solo mensaje o ninguno, enviar directamente
  const mensajeTexto = mensajes[0] || 'Hola! Te escribo para solicitar un turno en MOVEMENT 📲 ¿me pasas día y horario disponible?';
  enviarMensajeWhatsApp(profesional, mensajeTexto);
}

// Mostrar modal de selección de mensajes
function mostrarModalSeleccionMensaje(profesional, mensajes) {
  const modal = document.getElementById('modal-seleccion-mensaje');
  const lista = document.getElementById('lista-mensajes-seleccion');
  
  if (!modal || !lista) {
    logErrorWA('❌ No se encontró el modal de selección');
    // Fallback: usar el primer mensaje
    enviarMensajeWhatsApp(profesional, mensajes[0]);
    return;
  }
  
  // Renderizar opciones de mensajes
  lista.innerHTML = mensajes.map((msg, index) => `
    <button type="button" class="btn-seleccion-mensaje" onclick="seleccionarMensaje(${index})"
            style="display: flex; align-items: flex-start; gap: 0.75rem; padding: 1rem; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer; text-align: left; transition: all 0.2s; width: 100%;"
            onmouseover="this.style.borderColor='#25D366'; this.style.background='linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';"
            onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)';">
      <span style="background: #25D366; color: white; font-weight: bold; min-width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0;">${index + 1}</span>
      <span style="color: #333; line-height: 1.4; font-size: 0.95rem;">${msg}</span>
    </button>
  `).join('');
  
  // Guardar mensajes para la selección
  window._mensajesSeleccion = mensajes;
  window._profesionalSeleccionMensaje = profesional;
  
  // Mostrar modal
  modal.classList.remove('oculto');
  document.body.style.overflow = 'hidden';
}

// Seleccionar y enviar mensaje
function seleccionarMensaje(index) {
  const mensajes = window._mensajesSeleccion || [];
  const profesional = window._profesionalSeleccionMensaje;
  
  if (profesional && mensajes[index]) {
    cerrarModalSeleccion();
    enviarMensajeWhatsApp(profesional, mensajes[index]);
  }
}

// Cerrar modal de selección
function cerrarModalSeleccion() {
  const modal = document.getElementById('modal-seleccion-mensaje');
  if (modal) {
    modal.classList.add('oculto');
    document.body.style.overflow = '';
  }
  window._mensajesSeleccion = null;
  window._profesionalSeleccionMensaje = null;
}

// Función para enviar mensaje a WhatsApp
function enviarMensajeWhatsApp(profesional, mensajeTexto) {
  // Formatear número de WhatsApp
  let whatsappNumber = profesional.telefono.toString().replace(/\D/g, '');
  
  // Si no tiene código de país, agregar 54 (Argentina)
  if (!whatsappNumber.startsWith('54') && whatsappNumber.length <= 10) {
    whatsappNumber = '54' + whatsappNumber;
  }

  const mensaje = encodeURIComponent(mensajeTexto);

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${mensaje}`;
  
  logWA('📱 URL WhatsApp contacto directo:', whatsappUrl);

  try {
    const ventana = window.open(whatsappUrl, '_blank');
    if (!ventana) {
      window.location.href = whatsappUrl;
    }
  } catch (error) {
    logErrorWA('❌ Error al abrir WhatsApp:', error);
    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Exportar funciones globalmente
window.enviarReserva = enviarReserva;
window.contactarProfesionalWhatsApp = contactarProfesionalWhatsApp;
window.mostrarModalSeleccionMensaje = mostrarModalSeleccionMensaje;
window.seleccionarMensaje = seleccionarMensaje;
window.cerrarModalSeleccion = cerrarModalSeleccion;
window.enviarMensajeWhatsApp = enviarMensajeWhatsApp;