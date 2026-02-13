// ========== VARIABLES GLOBALES ==========
const IS_PROD_APP = !(location.hostname === 'localhost' || location.hostname === '127.0.0.1');
const logApp = IS_PROD_APP ? () => {} : console.log.bind(console);
const logErrorApp = console.error.bind(console);

let lista, buscar, modal, cerrarModalBtn;
let profesionalSeleccionado = null; // Asumo que esta variable existe
let fechaSeleccionada = null;
let horarioSeleccionado = null;

// Exponer profesionalSeleccionado globalmente para whatsapp.js
Object.defineProperty(window, 'profesionalSeleccionado', {
  get: () => profesionalSeleccionado,
  set: (value) => { profesionalSeleccionado = value; }
});

// ========== INICIALIZAR DOM ==========
function inicializarDOM() {
  lista = document.getElementById('lista-profesionales');
  buscar = document.getElementById('buscar');
  modal = document.getElementById('modal-turno');
  cerrarModalBtn = document.getElementById('cerrar-modal');
  return lista && buscar && modal && cerrarModalBtn;
}

// ========== FUNCIONES AUXILIARES ==========
function actualizarIconos() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Obtener iniciales del nombre
function obtenerIniciales(nombre) {
  if (!nombre) return '?';
  const palabras = nombre.trim().split(' ').filter(p => p.length > 0);
  if (palabras.length === 1) {
    return palabras[0].substring(0, 2).toUpperCase();
  }
  return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase();
}

// ========== MOSTRAR PROFESIONALES (MODIFICADA: ASÍNCRONA) ==========
async function mostrarProfesionales(filtro = "") {
  if (!lista) return;

  // Acceder al array global de profesionales cargado por data.js
  let todosProfesionales = window.profesionales || []; 

  // Si los datos aún no están cargados, intentar recargar
  if (todosProfesionales.length === 0) {
     lista.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem;"><i data-lucide="loader-circle" class="spin" style="width: 48px; height: 48px; color: var(--color-principal); margin-bottom: 1rem;"></i><p style="color: var(--texto-light); font-size: 1.1rem;">Cargando profesionales...</p></div>`;
     actualizarIconos();
     
     // Intentar recargar si la función existe
     if (typeof window.recargarProfesionales === 'function') {
       const cargados = await window.recargarProfesionales();
       todosProfesionales = cargados;
     }
     
     if (todosProfesionales.length === 0) {
        lista.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem;"><i data-lucide="alert-triangle" style="width: 48px; height: 48px; color: var(--color-error); margin-bottom: 1rem;"></i><p style="color: var(--texto-light); font-size: 1.1rem;">${CONFIG.mensajes.errorCarga}</p></div>`;
        return;
     }
  }

  lista.innerHTML = "";

  const filtrados = todosProfesionales.filter(p =>
    p.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    p.especialidad.toLowerCase().includes(filtro.toLowerCase())
  );

  if (filtrados.length === 0) {
    lista.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
        <i data-lucide="search-x" style="width: 48px; height: 48px; color: var(--texto-light); margin-bottom: 1rem;"></i>
        <p style="color: var(--texto-light); font-size: 1.1rem;">${CONFIG.mensajes.noProfesionales}</p>
      </div>
    `;
    return;
  }
  
    filtrados.forEach(p => {
    const card = document.createElement('div');
    card.className = 'profesional-card';
    card.setAttribute('data-id', p.id);
    const iniciales = obtenerIniciales(p.nombre);
    const esEsporadico = p.tipoProfesional === 'esporadico';
    
    // Mostrar icono de Font Awesome o Lucide
    let iconHtml = '';
    if (p.icono && p.icono.startsWith('fa-')) {
      iconHtml = `<i class="fa-solid ${p.icono}" style="font-size:1.2em;"></i>`;
    } else {
      iconHtml = `<i data-lucide="${p.icono || 'stethoscope'}"></i>`;
    }
    
    card.innerHTML = `
      <div class="card-header">
        <div class="avatar-wrapper">
          <span class="avatar-iniciales">${iniciales}</span>
        </div>
        <div class="info-principal">
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <h3 style="margin: 0;">${p.nombre}</h3>
            ${esEsporadico ? '<span style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 0.35rem 0.65rem; border-radius: 10px; font-size: 0.7rem; font-weight: 600; white-space: nowrap; display: inline-block;">Esporadico</span>' : ''}
          </div>
          <p class="especialidad">${iconHtml} ${p.especialidad}</p>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-secundario" onclick="abrirModalTurno('${p.id}')">
          Agendar turno <i data-lucide="calendar-check"></i>
        </button>
      </div>
    `;
    lista.appendChild(card);
    });

  actualizarIconos();
}

// ========== CONFIGURAR BÚSQUEDA ==========
function configurarBusqueda() {
  let timeout;
  buscar.addEventListener('input', (e) => {
    clearTimeout(timeout);
    const filtro = e.target.value;
    timeout = setTimeout(() => {
      mostrarProfesionales(filtro);
    }, CONFIG.delayBusqueda);
  });
}

// ========== ABRIR MODAL TURNO ==========
function abrirModalTurno(profesionalId) {
  profesionalSeleccionado = window.profesionales.find(p => p.id === profesionalId);
  if (!profesionalSeleccionado) {
    return mostrarToast(CONFIG.mensajes.errorGenerico, 'error');
  }

  // Mostrar el nombre y especialidad del profesional en el modal
  document.getElementById('nombre-profesional').textContent = profesionalSeleccionado.nombre;
  document.getElementById('especialidad').textContent = profesionalSeleccionado.especialidad;

  // Mostrar/ocultar botón de WhatsApp según configuración del profesional
  const btnWhatsApp = document.getElementById('btn-whatsapp-profesional');
    const soloWhatsAppContainer = document.getElementById('solo-whatsapp-mensaje');
    const formReserva = document.getElementById('form-reserva');
    const horariosSection = document.querySelector('.seccion-titulo')?.parentElement;
    
    // Verificar si es modo "solo WhatsApp"
    const esSoloWhatsApp = profesionalSeleccionado.soloWhatsApp === true;
    
    if (btnWhatsApp) {
      // Siempre mostrar botón de WhatsApp si está habilitado o es solo WhatsApp
      btnWhatsApp.style.display = (profesionalSeleccionado.mostrarWhatsApp !== false || esSoloWhatsApp) ? 'inline-flex' : 'none';
    }

    // Referencias a contenedores
    const fechaContainerNormal = document.getElementById('fecha-container-normal');
    const fechasEsporadicoContainer = document.getElementById('fechas-esporadico-container');
    const fechasEsporadicoGrid = document.getElementById('fechas-esporadico');
    const fechaInput = document.getElementById('fecha-turno');
    
    // Modo Solo WhatsApp: ocultar todo excepto el botón de contacto
    if (esSoloWhatsApp) {
      fechaContainerNormal.style.display = 'none';
      fechasEsporadicoContainer.style.display = 'none';
      if (formReserva) formReserva.style.display = 'none';
      if (horariosSection) horariosSection.style.display = 'none';
      
      // Mostrar mensaje de solo WhatsApp
      let mensajeContainer = document.getElementById('solo-whatsapp-mensaje');
      if (!mensajeContainer) {
        mensajeContainer = document.createElement('div');
        mensajeContainer.id = 'solo-whatsapp-mensaje';
        mensajeContainer.className = 'solo-whatsapp-info';
        btnWhatsApp.parentElement.after(mensajeContainer);
      }
      mensajeContainer.innerHTML = `
        <div class="solo-whatsapp-card">
          <div class="solo-whatsapp-icon">
            <svg viewBox="0 0 24 24" fill="#25D366" width="48" height="48">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <h3>Contacto directo por WhatsApp</h3>
          <p>Este profesional no utiliza el sistema de reservas online. Para coordinar un turno, contactalo directamente por WhatsApp.</p>
        </div>
      `;
      mensajeContainer.style.display = 'block';
      
      // Mostrar modal y salir
      modal.classList.remove('oculto');
      document.body.style.overflow = 'hidden';
      actualizarIconos();
      return;
    }
    
    // Modo normal: mostrar formulario de reserva
    if (formReserva) formReserva.style.display = 'block';
    if (horariosSection) horariosSection.style.display = 'block';
    const mensajeWhatsApp = document.getElementById('solo-whatsapp-mensaje');
    if (mensajeWhatsApp) mensajeWhatsApp.style.display = 'none';
  fechaSeleccionada = null;
  horarioSeleccionado = null;
  document.getElementById('horarios-disponibles').innerHTML = '';
  document.getElementById('form-reserva').reset();
  
  // Detectar si es profesional esporádico
  const esEsporadico = profesionalSeleccionado.tipoProfesional === 'esporadico';
  
  if (esEsporadico && profesionalSeleccionado.turnosEspecificos) {
    // PROFESIONAL ESPORÁDICO: Mostrar fechas disponibles como botones
    fechaContainerNormal.style.display = 'none';
    fechasEsporadicoContainer.style.display = 'block';
    
    // Obtener fechas futuras disponibles
    const hoy = new Date().toISOString().split('T')[0];
    const fechasDisponibles = Object.keys(profesionalSeleccionado.turnosEspecificos)
      .filter(fecha => fecha >= hoy)
      .sort((a, b) => a.localeCompare(b));
    
    fechasEsporadicoGrid.innerHTML = '';
    
    if (fechasDisponibles.length === 0) {
      fechasEsporadicoGrid.innerHTML = `
        <div class="no-fechas-disponibles">
          <i data-lucide="calendar-x"></i>
          <p>No hay fechas de atención programadas</p>
        </div>
      `;
    } else {
      fechasDisponibles.forEach(fecha => {
        const fechaObj = new Date(fecha + 'T00:00:00');
        const diaSemana = fechaObj.toLocaleDateString('es-AR', { weekday: 'short' });
        const dia = fechaObj.getDate();
        const mes = fechaObj.toLocaleDateString('es-AR', { month: 'short' });
        
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fecha-esporadico-btn';
        btn.setAttribute('data-fecha', fecha);
        btn.innerHTML = `
          <span class="fecha-dia-semana">${diaSemana}</span>
          <span class="fecha-dia-num">${dia}</span>
          <span class="fecha-mes">${mes}</span>
        `;
        
        btn.addEventListener('click', async () => {
          // Deseleccionar otras fechas
          document.querySelectorAll('.fecha-esporadico-btn').forEach(b => b.classList.remove('seleccionado'));
          btn.classList.add('seleccionado');
          fechaSeleccionada = fecha;
          
          // Cargar horarios para esta fecha
          await mostrarHorariosParaFecha(fecha);
        });
        
        fechasEsporadicoGrid.appendChild(btn);
      });
    }
  } else {
    // PROFESIONAL PERIÓDICO: Mostrar calendario normal
    fechaContainerNormal.style.display = 'block';
    fechasEsporadicoContainer.style.display = 'none';
    
    const today = new Date().toISOString().split('T')[0];
    fechaInput.min = today;
    fechaInput.value = '';
    
    // Escuchar cambio de fecha
    fechaInput.removeEventListener('change', mostrarHorariosDisponibles);
    fechaInput.addEventListener('change', mostrarHorariosDisponibles);
  }

  // Mostrar el modal
  modal.classList.remove('oculto');
  document.body.style.overflow = 'hidden';
  
  // Configurar el formulario de reserva
  configurarFormularioReserva();
  
  actualizarIconos();
}

// ========== MOSTRAR HORARIOS PARA FECHA ESPECÍFICA (ESPORÁDICOS) ==========
async function mostrarHorariosParaFecha(fecha) {
  const horariosContainer = document.getElementById('horarios-disponibles');
  horarioSeleccionado = null;
  
  // Mensaje de carga
  horariosContainer.innerHTML = `<p class="cargando"><i data-lucide="loader-circle" class="spin"></i> Cargando disponibilidad...</p>`;
  actualizarIconos();
  
  // Obtener horarios disponibles
  const horariosDisponibles = await window.obtenerHorariosDisponibles(profesionalSeleccionado.id, fecha);
  
  horariosContainer.innerHTML = '';
  
  if (horariosDisponibles.length === 0) {
    horariosContainer.innerHTML = `<p class="no-disponible">No hay turnos disponibles para el ${formatearFecha(fecha)}.</p>`;
    return;
  }
  
  // Generar botones de horario
  horariosDisponibles.forEach(hora => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'horario';
    btn.textContent = hora;
    btn.setAttribute('data-hora', hora);
    btn.addEventListener('click', () => {
      document.querySelectorAll('.horario').forEach(b => b.classList.remove('seleccionado'));
      btn.classList.add('seleccionado');
      horarioSeleccionado = hora;
    });
    horariosContainer.appendChild(btn);
  });
  
  actualizarIconos();
}

// ========== MOSTRAR HORARIOS DISPONIBLES (MODIFICADA: ASÍNCRONA) ==========
async function mostrarHorariosDisponibles() { // AÑADIDO 'async'
  const fechaInput = document.getElementById('fecha-turno');
  const fecha = fechaInput.value;
  const horariosContainer = document.getElementById('horarios-disponibles');
  horarioSeleccionado = null; // Limpiar selección anterior

  if (!fecha) return;

  // Mensaje de carga
  horariosContainer.innerHTML = `<p class="cargando"><i data-lucide="loader-circle" class="spin"></i> Cargando disponibilidad...</p>`;
  actualizarIconos();
  
  // 1. Obtener la disponibilidad REAL desde Firestore (Usa la función asíncrona)
  const horariosDisponibles = await window.obtenerHorariosDisponibles(profesionalSeleccionado.id, fecha);

  horariosContainer.innerHTML = ''; // Limpiar el mensaje de carga

  if (horariosDisponibles.length === 0) {
    horariosContainer.innerHTML = `<p class="no-disponible">No hay turnos disponibles para el ${formatearFecha(fecha)}.</p>`;
    return;
  }
  
  // 2. Generar botones de horario
  horariosDisponibles.forEach(hora => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'horario';
    btn.textContent = hora;
    btn.setAttribute('data-hora', hora);
    btn.addEventListener('click', () => {
      // Lógica de selección de botón
      document.querySelectorAll('.horario').forEach(b => b.classList.remove('seleccionado'));
      btn.classList.add('seleccionado');
      horarioSeleccionado = hora;
      fechaSeleccionada = fecha; // Asegurar que la fecha también está guardada
    });
    horariosContainer.appendChild(btn);
  });

  actualizarIconos();
}

// ========== MANEJADOR DE RESERVA ==========
function configurarFormularioReserva() {
  const formReserva = document.getElementById('form-reserva');
  logApp('🔧 Configurando formulario de reserva');
  
  if (!formReserva) {
    logErrorApp('❌ Formulario de reserva no encontrado');
    return;
  }
  
  // Remover listeners anteriores clonando el formulario
  const nuevoForm = formReserva.cloneNode(true);
  formReserva.parentNode.replaceChild(nuevoForm, formReserva);
  
  nuevoForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    logApp('🚀 Formulario enviado');
    
    // Obtener botón de envío y deshabilitarlo
    const btnSubmit = nuevoForm.querySelector('button[type="submit"]');
    let textoOriginal = ''; // Declarar fuera para acceso en todos los bloques
    
    if (btnSubmit) {
      btnSubmit.disabled = true;
      textoOriginal = btnSubmit.innerHTML;
      btnSubmit.innerHTML = '<i data-lucide="loader-circle" class="spin"></i> Procesando...';
      actualizarIconos();
    }
    
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefonoRaw = document.getElementById('telefono').value.trim();
    const documento = document.getElementById('documento').value.trim();

    logApp('📋 Datos recibidos');

    // 1. Validaciones
    if (!profesionalSeleccionado || !fechaSeleccionada || !horarioSeleccionado) {
        alert('Por favor, seleccione fecha y horario');
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = textoOriginal;
          actualizarIconos();
        }
        return false;
    }
    if (!nombre || nombre.length < 3) {
        alert('Por favor, ingrese su nombre completo');
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = textoOriginal;
          actualizarIconos();
        }
        return false;
    }
    // Documento obligatorio
    if (!documento || documento.length < 7) {
        alert('Por favor, ingrese su número de documento');
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = textoOriginal;
          actualizarIconos();
        }
        return false;
    }
    // Email opcional - solo validar si se ingresó
    if (email && window.validarEmail && !window.validarEmail(email)) {
        alert('Por favor, ingrese un email válido');
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = textoOriginal;
          actualizarIconos();
        }
        return false;
    }
    
    // Validar teléfono usando la función de utils
    const resultadoTelefono = window.validarTelefono(telefonoRaw);
    if (!resultadoTelefono.valido) {
        alert(resultadoTelefono.mensaje);
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = textoOriginal;
          actualizarIconos();
        }
        return false;
    }
    const telefonoFinal = resultadoTelefono.telefono;

    logApp('✅ Validaciones pasadas');

    // 2. VERIFICAR QUE EL TURNO SIGUE DISPONIBLE (evitar turnos duplicados)
    logApp('🔍 Verificando disponibilidad del turno...');
    const disponible = await window.verificarDisponibilidadTurno(
        profesionalSeleccionado.id, 
        fechaSeleccionada, 
        horarioSeleccionado
    );
    
    if (!disponible) {
        alert('⚠️ Este horario acaba de ser reservado por otra persona. Por favor, seleccioná otro horario.');
        // Re-habilitar botón
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = textoOriginal;
          actualizarIconos();
        }
        // Recargar horarios disponibles
        await mostrarHorariosDisponibles();
        return false;
    }

    // 3. Recopilar datos para la BDD
    const datosTurno = {
        profesionalId: profesionalSeleccionado.id,
        fecha: fechaSeleccionada,
        hora: horarioSeleccionado,
        nombreCliente: nombre,
        telefonoCliente: telefonoFinal,
        email: email || null,
        documento: documento,
    };
    
    // 3. Guardar el turno en Firestore
    logApp('📝 Guardando turno...');
    
    let turnoId = null;
    try {
      turnoId = await window.guardarNuevoTurno(datosTurno);
      
      if (!turnoId) {
        throw new Error('No se pudo guardar el turno en la base de datos');
      }
      
      logApp('📝 Turno guardado con ID:', turnoId);
    } catch (errorFirebase) {
      logErrorApp('❌ Error al guardar turno:', errorFirebase);
      alert('Error al confirmar el turno. Por favor, intentá nuevamente o contactá al profesional directamente.');
      // Re-habilitar botón
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = textoOriginal;
        actualizarIconos();
      }
      return false;
    }
    
    // Continuar con WhatsApp solo si se guardó exitosamente
    logApp('📱 Preparando WhatsApp...');
    
    // Construir URL de WhatsApp directamente aquí
    const telefonoProf = profesionalSeleccionado.telefono ? profesionalSeleccionado.telefono.toString().replace(/\D/g, '') : '';
    const whatsappNum = telefonoProf.startsWith('54') ? telefonoProf : '54' + telefonoProf;
    
    const mensajeWpp = encodeURIComponent(
`${profesionalSeleccionado.mensajeBase || "Nuevo turno confirmado"}:

📅 Fecha: ${fechaSeleccionada.split('-').reverse().join('/')}
🕐 Hora: ${horarioSeleccionado}
👤 Paciente: ${nombre}
📞 Teléfono: ${telefonoFinal}
${email ? '📧 Email: ' + email : ''}
🪪 Documento: ${documento}

Movement - Sistema de Reservas`
    );
    
    const whatsappUrl = `https://wa.me/${whatsappNum}?text=${mensajeWpp}`;
    logApp('📱 Redirigiendo a WhatsApp...');
    
    // Mostrar alerta de éxito
    alert('¡Turno confirmado! Te redirigiremos a WhatsApp...');
    
    // Cerrar modal
    cerrarModal();
    nuevoForm.reset();
    
    // Redirigir a WhatsApp
    window.location.href = whatsappUrl;
    
    return false;
  });
  
  logApp('✅ Formulario de reserva configurado');
}

// Exportar función
window.configurarFormularioReserva = configurarFormularioReserva;
  
// ========== CERRAR MODAL ==========
function cerrarModal() {
  if (modal) {
    modal.classList.add('oculto');
    document.body.style.overflow = '';
  }
}

// ========== CONFIGURAR MODAL ==========
function configurarModal() {
  if (!modal || !cerrarModalBtn) return;
  
  // Configurar cierre de modal
  cerrarModalBtn.addEventListener('click', cerrarModal);
  
  // Cerrar modal al hacer click fuera
  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrarModal();
  });
  
  // Cerrar modal con tecla ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('oculto')) {
      cerrarModal();
    }
  });
}

// ========== SISTEMA DE CANCELACIÓN DE TURNOS ==========

let modalCancelar = null;
let turnoSeleccionadoParaCancelar = null;

// Inicializar modal de cancelación
function inicializarModalCancelar() {
  modalCancelar = document.getElementById('modal-cancelar');
  const cerrarBtn = document.getElementById('cerrar-modal-cancelar');
  const formBuscar = document.getElementById('form-buscar-turno');
  const btnConfirmar = document.getElementById('btn-confirmar-cancelar');
  
  if (!modalCancelar) return;
  
  // Cerrar modal
  if (cerrarBtn) {
    cerrarBtn.addEventListener('click', cerrarModalCancelar);
  }
  
  // Cerrar al hacer click fuera
  modalCancelar.addEventListener('click', (e) => {
    if (e.target === modalCancelar) cerrarModalCancelar();
  });
  
  // Cerrar con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalCancelar && !modalCancelar.classList.contains('oculto')) {
      cerrarModalCancelar();
    }
  });
  
  // Formulario de búsqueda
  if (formBuscar) {
    formBuscar.addEventListener('submit', async (e) => {
      e.preventDefault();
      await buscarTurnoParaCancelar();
    });
  }
  
  // Botón confirmar cancelación
  if (btnConfirmar) {
    btnConfirmar.addEventListener('click', confirmarCancelacionTurno);
  }
}

// Abrir modal de cancelación
function abrirModalCancelar() {
  if (!modalCancelar) {
    modalCancelar = document.getElementById('modal-cancelar');
  }
  
  if (modalCancelar) {
    // Resetear estado
    resetearModalCancelar();
    modalCancelar.classList.remove('oculto');
    document.body.style.overflow = 'hidden';
    actualizarIconos();
  }
}

// Cerrar modal de cancelación
function cerrarModalCancelar() {
  if (modalCancelar) {
    modalCancelar.classList.add('oculto');
    document.body.style.overflow = '';
    resetearModalCancelar();
  }
}

// Resetear modal a estado inicial
function resetearModalCancelar() {
  const pasoBuscar = document.getElementById('paso-buscar-turno');
  const pasoConfirmar = document.getElementById('paso-confirmar-cancelar');
  const resultadoBusqueda = document.getElementById('resultado-busqueda');
  const inputDoc = document.getElementById('buscar-documento');
  const inputTel = document.getElementById('buscar-telefono');
  
  if (pasoBuscar) pasoBuscar.style.display = 'block';
  if (pasoConfirmar) pasoConfirmar.style.display = 'none';
  if (resultadoBusqueda) resultadoBusqueda.innerHTML = '';
  if (inputDoc) inputDoc.value = '';
  if (inputTel) inputTel.value = '';
  
  turnoSeleccionadoParaCancelar = null;
}

// Buscar turno para cancelar
async function buscarTurnoParaCancelar() {
  const documento = document.getElementById('buscar-documento').value.trim();
  const telefono = document.getElementById('buscar-telefono').value.trim();
  const resultadoDiv = document.getElementById('resultado-busqueda');
  
  if (!documento && !telefono) {
    alert('Por favor, ingresá tu documento o teléfono para buscar tu turno.');
    return;
  }
  
  // Mostrar loading
  resultadoDiv.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <i data-lucide="loader-circle" class="spin" style="width: 40px; height: 40px; color: var(--azul);"></i>
      <p style="color: var(--texto-light); margin-top: 1rem;">Buscando turnos...</p>
    </div>
  `;
  actualizarIconos();
  
  let turnos = [];
  
  try {
    if (documento) {
      turnos = await window.buscarTurnosPorDocumento(documento);
    } else if (telefono) {
      turnos = await window.buscarTurnosPorTelefono(telefono);
    }
  } catch (error) {
    logErrorApp('Error buscando turnos:', error);
  }
  
  if (turnos.length === 0) {
    resultadoDiv.innerHTML = `
      <div class="no-turnos-encontrados">
        <i data-lucide="calendar-x"></i>
        <p>No se encontraron turnos activos</p>
        <p>Verificá que los datos ingresados sean correctos</p>
      </div>
    `;
    actualizarIconos();
    return;
  }
  
  // Mostrar turnos encontrados
  resultadoDiv.innerHTML = `
    <div class="turnos-encontrados">
      <p style="font-weight: 600; margin-bottom: 0.5rem; color: var(--texto);">
        Se encontraron ${turnos.length} turno(s):
      </p>
      ${turnos.map(turno => renderizarTurnoCard(turno)).join('')}
    </div>
  `;
  actualizarIconos();
}

// Renderizar card de turno
function renderizarTurnoCard(turno) {
  // Buscar nombre del profesional
  const profesional = window.profesionales.find(p => p.id === turno.profesionalId);
  const nombreProfesional = profesional ? profesional.nombre : turno.profesionalId;
  
  // Formatear fecha
  const fechaFormateada = turno.fecha.split('-').reverse().join('/');
  
  return `
    <div class="turno-card-cancelar" data-turno-id="${turno.id}">
      <div class="turno-card-header">
        <h4>
          <i data-lucide="stethoscope"></i>
          ${nombreProfesional}
        </h4>
        <button type="button" class="btn-seleccionar-cancelar" onclick="seleccionarTurnoParaCancelar('${turno.id}')">
          <i data-lucide="x-circle"></i>
          Cancelar
        </button>
      </div>
      <div class="turno-card-body">
        <div class="detalle">
          <i data-lucide="calendar"></i>
          <span>${fechaFormateada}</span>
        </div>
        <div class="detalle">
          <i data-lucide="clock"></i>
          <span>${turno.hora}</span>
        </div>
        <div class="detalle">
          <i data-lucide="user"></i>
          <span>${turno.nombreCliente}</span>
        </div>
      </div>
    </div>
  `;
}

// Seleccionar turno para cancelar
async function seleccionarTurnoParaCancelar(turnoId) {
  const documento = document.getElementById('buscar-documento').value.trim();
  const telefono = document.getElementById('buscar-telefono').value.trim();
  
  // Buscar el turno nuevamente para tener datos actualizados
  let turnos = [];
  if (documento) {
    turnos = await window.buscarTurnosPorDocumento(documento);
  } else if (telefono) {
    turnos = await window.buscarTurnosPorTelefono(telefono);
  }
  
  const turno = turnos.find(t => t.id === turnoId);
  
  if (!turno) {
    alert('No se pudo encontrar el turno. Por favor, intentá nuevamente.');
    return;
  }
  
  turnoSeleccionadoParaCancelar = turno;
  
  // Buscar nombre del profesional
  const profesional = window.profesionales.find(p => p.id === turno.profesionalId);
  const nombreProfesional = profesional ? profesional.nombre : turno.profesionalId;
  const especialidad = profesional ? profesional.especialidad : '';
  
  // Formatear fecha
  const fechaFormateada = turno.fecha.split('-').reverse().join('/');
  
  // Actualizar info en el paso de confirmación
  document.getElementById('cancelar-profesional').textContent = `${nombreProfesional}${especialidad ? ' - ' + especialidad : ''}`;
  document.getElementById('cancelar-fecha').textContent = fechaFormateada;
  document.getElementById('cancelar-hora').textContent = turno.hora;
  document.getElementById('cancelar-cliente').textContent = turno.nombreCliente;
  
  // Mostrar paso de confirmación
  document.getElementById('paso-buscar-turno').style.display = 'none';
  document.getElementById('paso-confirmar-cancelar').style.display = 'block';
  
  actualizarIconos();
}

// Volver a la búsqueda
function volverBusqueda() {
  document.getElementById('paso-buscar-turno').style.display = 'block';
  document.getElementById('paso-confirmar-cancelar').style.display = 'none';
  turnoSeleccionadoParaCancelar = null;
}

// Confirmar cancelación del turno
async function confirmarCancelacionTurno() {
  if (!turnoSeleccionadoParaCancelar) {
    alert('No hay turno seleccionado para cancelar.');
    return;
  }
  
  const btnConfirmar = document.getElementById('btn-confirmar-cancelar');
  
  // Deshabilitar botón mientras procesa
  btnConfirmar.disabled = true;
  btnConfirmar.innerHTML = '<i data-lucide="loader-circle" class="spin"></i> Cancelando...';
  actualizarIconos();
  
  try {
    const resultado = await window.cancelarTurno(turnoSeleccionadoParaCancelar.id);
    
    if (resultado.success) {
      // Obtener datos del turno y profesional
      const turno = turnoSeleccionadoParaCancelar;
      const profesional = window.profesionales.find(p => p.id === turno.profesionalId);
      const telefonoProf = profesional && profesional.telefono ? profesional.telefono.toString().replace(/\D/g, '') : '';
      const whatsappNum = telefonoProf.startsWith('54') ? telefonoProf : '54' + telefonoProf;
      const mensajeWpp = encodeURIComponent(
        `Hola ${profesional ? profesional.nombre : ''},\n\nEl paciente ${turno.nombreCliente} ha cancelado el siguiente turno:\n\n📅 Fecha: ${turno.fecha.split('-').reverse().join('/')}\n🕐 Hora: ${turno.hora}\n🪪 Documento: ${turno.documento}\n\nPor favor, actualizá tu agenda.\n\nMovement - Sistema de Reservas`
      );
      const whatsappUrl = `https://wa.me/${whatsappNum}?text=${mensajeWpp}`;

      // Mostrar mensaje de éxito con botón WhatsApp
      const pasoConfirmar = document.getElementById('paso-confirmar-cancelar');
      pasoConfirmar.innerHTML = `
        <div class="cancelacion-exitosa">
          <div class="icono-exito">
            <i data-lucide="check-circle"></i>
          </div>
          <h3>¡Turno cancelado!</h3>
          <p>Tu turno ha sido cancelado exitosamente.</p>
          <a href="${whatsappUrl}" target="_blank" class="btn" style="margin-bottom: 1rem;">
            <i data-lucide="send"></i>
            Avisar por WhatsApp
          </a>
          <button type="button" class="btn" onclick="cerrarModalCancelar()">
            <i data-lucide="home"></i>
            Volver al inicio
          </button>
        </div>
      `;
      actualizarIconos();
    } else {
      alert(resultado.message || 'Error al cancelar el turno.');
      btnConfirmar.disabled = false;
      btnConfirmar.innerHTML = '<i data-lucide="x-circle"></i> Confirmar cancelación';
      actualizarIconos();
    }
  } catch (error) {
    logErrorApp('Error al cancelar turno:', error);
    alert('Ocurrió un error al cancelar el turno. Por favor, intentá nuevamente.');
    btnConfirmar.disabled = false;
    btnConfirmar.innerHTML = '<i data-lucide="x-circle"></i> Confirmar cancelación';
    actualizarIconos();
  }
}

// Toggle para mostrar/ocultar info de cancelación
function toggleInfoCancelacion() {
  const infoTooltip = document.getElementById('info-cancelacion');
  if (infoTooltip) {
    infoTooltip.classList.toggle('oculto');
    actualizarIconos();
  }
}

// ========== MODAL DE CONTACTO ==========
function abrirModalContacto() {
  const modalContacto = document.getElementById('modal-contacto');
  if (modalContacto) {
    modalContacto.classList.remove('oculto');
    document.body.style.overflow = 'hidden';
    actualizarIconos();
  }
}

function cerrarModalContacto() {
  const modalContacto = document.getElementById('modal-contacto');
  if (modalContacto) {
    modalContacto.classList.add('oculto');
    document.body.style.overflow = '';
  }
}

// Inicializar modal de contacto
function inicializarModalContacto() {
  const modalContacto = document.getElementById('modal-contacto');
  
  if (!modalContacto) return;
  
  // Cerrar al hacer click fuera
  modalContacto.addEventListener('click', (e) => {
    if (e.target === modalContacto) cerrarModalContacto();
  });
  
  // Cerrar con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalContacto && !modalContacto.classList.contains('oculto')) {
      cerrarModalContacto();
    }
  });
}

// Exportar funciones globalmente
window.abrirModalCancelar = abrirModalCancelar;
window.cerrarModalCancelar = cerrarModalCancelar;
window.seleccionarTurnoParaCancelar = seleccionarTurnoParaCancelar;
window.volverBusqueda = volverBusqueda;
window.confirmarCancelacionTurno = confirmarCancelacionTurno;
window.inicializarModalCancelar = inicializarModalCancelar;
window.toggleInfoCancelacion = toggleInfoCancelacion;
window.abrirModalContacto = abrirModalContacto;
window.cerrarModalContacto = cerrarModalContacto;
window.inicializarModalContacto = inicializarModalContacto;

// ========== INICIALIZACIÓN ==========
// La inicialización ahora se maneja en index.html para controlar el flujo de carga
// window.addEventListener('DOMContentLoaded', ...) ha sido movido a index.html

// ========== RECARGAR PROFESIONALES ==========
// ❌ ELIMINADA LÓGICA DE LISTENER 'storage'