// ========== CONFIGURACIÓN DE LA APLICACIÓN ==========

const CONFIG = {
  // Horarios disponibles por defecto
  horariosDisponibles: [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
  ],
  
  // Días máximos de anticipación para reservar
  diasMaximosReserva: 30,
  
  // Duración del toast en milisegundos
  duracionToast: 4000,
  
  // Delay para búsqueda (debounce)
  delayBusqueda: 300,
  
  // Animaciones
  animaciones: {
    modalDuracion: 400,
    toastDuracion: 300,
    cardDelay: 100
  },
  
  // Mensajes
  mensajes: {
    errorGenerico: 'Ocurrió un error. Por favor, intente nuevamente.',
    exitoReserva: '¡Reserva confirmada! Se abrirá WhatsApp para notificar al profesional.',
    errorFecha: 'Por favor, seleccione una fecha válida.',
    errorHorario: 'Por favor, seleccione un horario.',
    errorEmail: 'Por favor, ingrese un email válido.',
    errorTelefono: 'Por favor, ingrese un teléfono válido.',
    errorNombre: 'Por favor, ingrese su nombre completo.',
    errorDocumento: 'Por favor, ingrese su número de documento (DNI).',
    turnoOcupado: 'Este horario ya está reservado. Por favor, elija otro.',
    noProfesionales: 'No se encontraron profesionales con ese criterio.',
    errorCarga: 'Error al cargar los datos. Recargue la página.'
  },
  
  // Validaciones
  validaciones: {
    nombreMinLength: 3,
    // (otras validaciones)
  }
};