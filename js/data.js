// data.js

// Detectar modo producción
const IS_PROD_DATA = !(location.hostname === 'localhost' || location.hostname === '127.0.0.1');
const logData = IS_PROD_DATA ? () => {} : console.log.bind(console);
const logErrorData = console.error.bind(console);

// Asegurarse de que el archivo firebase-config.js se cargó primero
if (!window.firebase) {
    logErrorData("❌ ERROR: El objeto 'window.firebase' no está disponible.");
}

// ⬇️ IMPORTAR FUNCIONES DE FIRESTORE ⬇️
const { db, collection, getDocs, getDoc, doc, addDoc, setDoc, updateDoc, deleteDoc, query, where, Timestamp } = window.firebase; 

// Variable global para almacenar los profesionales cargados
let profesionales = [];
const COL_PROFESIONALES = 'profesionales';
const COL_TURNOS = 'turnos';

// Hacer disponible globalmente ANTES de cargar datos
window.profesionales = profesionales;

// =====================================================================
// ========== FUNCIONES DE CARGA Y GESTIÓN DE PROFESIONALES ==========
// =====================================================================

/**
 * Carga profesionales desde la colección 'profesionales' en Firestore.
 */
async function cargarProfesionales() {
  try {
    logData(`📡 Cargando profesionales desde Firestore: /${COL_PROFESIONALES}`);
    
    const profesionalesCol = collection(db, COL_PROFESIONALES);
    const profesionalesSnapshot = await getDocs(profesionalesCol);
    
    const profesionalesCargados = profesionalesSnapshot.docs.map(doc => {
      return { 
        id: doc.id,
        ...doc.data()
      };
    });
    
    if (profesionalesCargados.length > 0) {
      logData('✅ Profesionales cargados desde Firestore:', profesionalesCargados.length);
      return profesionalesCargados;
    }
    
  } catch (error) {
    logErrorData('❌ Error al conectar o leer Firestore:', error);
  }
  
  logData('⚠️ No se encontraron profesionales en la base de datos.');
  return [];
}

/**
 * Guarda un nuevo profesional o actualiza uno existente en Firestore.
 * Usa el nombre del profesional como ID del documento.
 */
async function guardarProfesional(datosProfesional, id = null) {
    try {
        // Crear un ID basado en el nombre (sin espacios, minúsculas)
        const nombreId = datosProfesional.nombre
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar acentos
            .replace(/\s+/g, '-') // Espacios por guiones
            .replace(/[^a-z0-9-]/g, ''); // Solo letras, números y guiones
        
        if (id) {
            // ACTUALIZACIÓN (Edición)
            const docRef = doc(db, COL_PROFESIONALES, id);
            await updateDoc(docRef, datosProfesional);
            return id;
        } else {
            // CREACIÓN (Nuevo profesional) - usar nombre como ID
            const docRef = doc(db, COL_PROFESIONALES, nombreId);
            await setDoc(docRef, datosProfesional);
            return nombreId;
        }
    } catch (e) {
        console.error("❌ Error al guardar/actualizar el profesional: ", e);
        return null;
    }
}

/**
 * Elimina un profesional de Firestore (y sus turnos asociados).
 */
async function eliminarProfesional(id) {
    try {
        // 1. Eliminar el documento del profesional
        await deleteDoc(doc(db, COL_PROFESIONALES, id));
        
        // 2. Opcional: Eliminar sus turnos asociados
        // Nota: Esto puede ser lento. Es mejor manejar la limpieza en la consola de Firebase.
        // const turnosQuery = query(collection(db, COL_TURNOS), where("profesionalId", "==", id));
        // const turnosSnapshot = await getDocs(turnosQuery);
        // turnosSnapshot.docs.forEach(async (turnoDoc) => {
        //     await deleteDoc(doc(db, COL_TURNOS, turnoDoc.id));
        // });

        logData(`🗑️ Profesional ${id} eliminado.`);
        return true;
    } catch (e) {
        logErrorData("❌ Error al eliminar el profesional: ", e);
        return false;
    }
}

/**
 * Recarga profesionales desde la BDD y actualiza la variable global.
 */
async function recargarProfesionales() {
  const nuevoProfesionales = await cargarProfesionales();
  profesionales.length = 0; // Limpiar el array
  profesionales.push(...nuevoProfesionales); // Rellenar con los nuevos
  window.profesionales = profesionales; // Actualizar referencia global
  
  logData('✅ Profesionales recargados:', profesionales.length);
  
  // Opcional: Forzar actualización de la UI si existe la función
  if (typeof mostrarProfesionales === 'function') {
    mostrarProfesionales();
  }
  return profesionales;
}


// =====================================================================
// ========== FUNCIONES DE GESTIÓN DE TURNOS (RESERVAS) ==========
// =====================================================================

/**
 * Consulta y obtiene los turnos ya reservados en Firestore para una fecha y profesional.
 */
async function obtenerTurnosReservados(profesionalId, fecha) {
  try {
    const turnosRef = collection(db, COL_TURNOS);
    const q = query(
      turnosRef,
      where("profesionalId", "==", profesionalId),
      where("fecha", "==", fecha)
    );

        const turnosSnapshot = await getDocs(q);
        // Solo considerar turnos que NO estén cancelados
        const horasReservadas = turnosSnapshot.docs
            .map(doc => doc.data())
            .filter(turno => turno.estado !== 'cancelado')
            .map(turno => turno.hora);

        return horasReservadas;

  } catch (error) {
    logErrorData('❌ Error al obtener turnos reservados:', error);
    return [];
  }
}

/**
 * Guarda un nuevo documento de turno en la colección 'turnos'.
 */
async function guardarNuevoTurno(datosTurno) {
    try {
        const turnosCol = collection(db, COL_TURNOS);
        
        const turnoData = {
            ...datosTurno,
            estado: 'confirmado',
            timestampReserva: Timestamp.now()
        };
        
        const docRef = await addDoc(turnosCol, turnoData);
        return docRef.id;

    } catch (e) {
        logErrorData("❌ Error al agregar el turno: ", e);
        return null;
    }
}

/**
 * Verifica si un horario específico está disponible para reservar.
 * Retorna true si está disponible, false si ya está ocupado.
 */
async function verificarDisponibilidadTurno(profesionalId, fecha, hora) {
    try {
        const turnosRef = collection(db, COL_TURNOS);
        const q = query(
            turnosRef,
            where("profesionalId", "==", profesionalId),
            where("fecha", "==", fecha),
            where("hora", "==", hora)
        );
        
        const snapshot = await getDocs(q);
        
        // Filtrar turnos que NO estén cancelados
        const turnosActivos = snapshot.docs
            .map(doc => doc.data())
            .filter(turno => turno.estado !== 'cancelado');
        
        const disponible = turnosActivos.length === 0; // Disponible si no hay turnos activos
        
        logData(`🔍 Verificando disponibilidad: ${fecha} ${hora} - ${disponible ? '✅ Disponible' : '❌ Ocupado'}`);
        return disponible;
        
    } catch (error) {
        logErrorData('❌ Error al verificar disponibilidad:', error);
        return false; // Por seguridad, si hay error asumir no disponible
    }
}

// =====================================================================
// ========== INICIALIZACIÓN Y FUNCIONES AUXILIARES (ASÍNCRONAS) ==========
// =====================================================================

/**
 * Función de inicialización asíncrona para cargar los datos al inicio.
 */
async function inicializarDatos() {
    // Esperar a que Firebase esté disponible
    if (!window.firebase || !window.firebase.db) {
        logData('⚠️ Firebase no está disponible aún, reintentando...');
        setTimeout(inicializarDatos, 500);
        return;
    }
    
    logData('🚀 Inicializando datos...');
    
    // Almacenar los profesionales cargados en la variable global
    const cargados = await cargarProfesionales();
    profesionales.length = 0;
    profesionales.push(...cargados);
    window.profesionales = profesionales;
    
    logData('✅ Datos inicializados. Profesionales disponibles:', profesionales.length);
    
    // La UI se maneja desde index.html initializeApp()
}

// Llamar a la función de inicialización cuando el documento esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarDatos);
} else {
  inicializarDatos();
}

/**
 * Obtiene los horarios realmente disponibles. (AHORA ASÍNCRONA)
 */
async function obtenerHorariosDisponibles(profesionalId, fecha) {
  const profesional = profesionales.find(p => p.id === profesionalId);
  if (!profesional) return [];
  
  // 1. Verificar si la fecha está en días no laborables
  if (profesional.diasNoLaborables && profesional.diasNoLaborables.includes(fecha)) {
    return [];
  }
  
  // 2. Determinar horarios según tipo de profesional
  let horariosFijos = [];
  
  // Si tiene turnos específicos para esta fecha, usarlos (prioridad)
  if (profesional.turnosEspecificos && profesional.turnosEspecificos[fecha]) {
    horariosFijos = profesional.turnosEspecificos[fecha];
  }
  // Si es profesional periódico, usar horarios semanales
  else if (profesional.tipoProfesional === 'periodico' || !profesional.tipoProfesional) {
    const fechaObj = new Date(fecha + 'T00:00:00');
    const diaSemana = fechaObj.getDay();
    horariosFijos = profesional.horarios?.[diaSemana] || [];
  }
  // Si es esporádico y no tiene turno para esta fecha específica
  else if (profesional.tipoProfesional === 'esporadico') {
    return [];
  }
  
  if (horariosFijos.length === 0) {
    return [];
  }

  // 3. Obtener horarios ya reservados de Firestore
  const horasReservadas = await obtenerTurnosReservados(profesionalId, fecha);
  
  // 4. Filtrar
  const horariosDisponibles = horariosFijos.filter(
    hora => !horasReservadas.includes(hora)
  );

  return horariosDisponibles;
}

// Las siguientes funciones auxiliares permanecen SIN cambios
function getDiasLaborales(profesionalId) { /* ... */ }
function trabajaEnFecha(profesionalId, fecha) { /* ... */ }

// =====================================================================
// ========== FUNCIONES DE CANCELACIÓN DE TURNOS ==========
// =====================================================================

/**
 * Busca un turno por documento del cliente.
 * Retorna un array de turnos encontrados (puede haber varios turnos para el mismo cliente).
 */
async function buscarTurnosPorDocumento(documento) {
    try {
        const turnosRef = collection(db, COL_TURNOS);
        const q = query(
            turnosRef,
            where("documento", "==", documento)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            logData(`🔍 No se encontraron turnos para documento: ${documento}`);
            return [];
        }
        
        // Filtrar solo turnos futuros o del día de hoy
        const hoy = new Date().toISOString().split('T')[0];
        const turnos = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(turno => turno.fecha >= hoy && turno.estado !== 'cancelado');
        
        logData(`✅ Turnos encontrados para documento ${documento}:`, turnos.length);
        return turnos;
        
    } catch (error) {
        logErrorData('❌ Error al buscar turnos por documento:', error);
        return [];
    }
}

/**
 * Busca un turno por teléfono del cliente.
 * Retorna un array de turnos encontrados.
 */
async function buscarTurnosPorTelefono(telefono) {
    try {
        // Normalizar el teléfono (quitar caracteres no numéricos)
        let telefonoNormalizado = telefono.replace(/\D/g, '');
        
        // Si no empieza con 54, agregar el prefijo
        if (!telefonoNormalizado.startsWith('54')) {
            telefonoNormalizado = '54' + telefonoNormalizado;
        }
        
        const turnosRef = collection(db, COL_TURNOS);
        const q = query(
            turnosRef,
            where("telefonoCliente", "==", telefonoNormalizado)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            logData(`🔍 No se encontraron turnos para teléfono: ${telefonoNormalizado}`);
            return [];
        }
        
        // Filtrar solo turnos futuros o del día de hoy
        const hoy = new Date().toISOString().split('T')[0];
        const turnos = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(turno => turno.fecha >= hoy && turno.estado !== 'cancelado');
        
        logData(`✅ Turnos encontrados para teléfono ${telefonoNormalizado}:`, turnos.length);
        return turnos;
        
    } catch (error) {
        logErrorData('❌ Error al buscar turnos por teléfono:', error);
        return [];
    }
}

/**
 * Cancela un turno específico por su ID.
 * Cambia el estado a 'cancelado' en lugar de eliminar el documento.
 */
async function cancelarTurno(turnoId) {
    try {
        const turnoRef = doc(db, COL_TURNOS, turnoId);
        
        // Primero verificar que el turno existe
        const turnoSnap = await getDoc(turnoRef);
        if (!turnoSnap.exists()) {
            logErrorData(`❌ Turno ${turnoId} no encontrado`);
            return { success: false, message: 'El turno no fue encontrado.' };
        }
        
        const turnoData = turnoSnap.data();
        
        // Verificar que no esté ya cancelado
        if (turnoData.estado === 'cancelado') {
            return { success: false, message: 'Este turno ya fue cancelado anteriormente.' };
        }
        
        // Verificar que la fecha no haya pasado
        const hoy = new Date().toISOString().split('T')[0];
        if (turnoData.fecha < hoy) {
            return { success: false, message: 'No se puede cancelar un turno de una fecha pasada.' };
        }
        
        // Actualizar el estado a cancelado
        await updateDoc(turnoRef, {
            estado: 'cancelado',
            fechaCancelacion: Timestamp.now()
        });
        
        logData(`✅ Turno ${turnoId} cancelado exitosamente`);
        return { 
            success: true, 
            message: 'Turno cancelado exitosamente.',
            turno: turnoData
        };
        
    } catch (error) {
        logErrorData('❌ Error al cancelar turno:', error);
        // Mostrar más detalle del error
        const errorMsg = error.code ? `Error ${error.code}: ${error.message}` : error.message || 'Error desconocido';
        console.error('Detalle del error:', errorMsg);
        return { success: false, message: `Error al cancelar el turno: ${errorMsg}` };
    }
}

/**
 * Elimina un turno permanentemente (uso administrativo).
 */
async function eliminarTurno(turnoId) {
    try {
        await deleteDoc(doc(db, COL_TURNOS, turnoId));
        logData(`🗑️ Turno ${turnoId} eliminado permanentemente`);
        return { success: true, message: 'Turno eliminado permanentemente.' };
    } catch (error) {
        logErrorData('❌ Error al eliminar turno:', error);
        return { success: false, message: 'Error al eliminar el turno.' };
    }
}

// Exportar funciones globalmente para que otros archivos las usen
window.cargarProfesionales = cargarProfesionales;
window.recargarProfesionales = recargarProfesionales;
window.obtenerHorariosDisponibles = obtenerHorariosDisponibles;
window.guardarNuevoTurno = guardarNuevoTurno;
window.verificarDisponibilidadTurno = verificarDisponibilidadTurno;
window.guardarProfesional = guardarProfesional;
window.eliminarProfesional = eliminarProfesional;
window.buscarTurnosPorDocumento = buscarTurnosPorDocumento;
window.buscarTurnosPorTelefono = buscarTurnosPorTelefono;
window.cancelarTurno = cancelarTurno;
window.eliminarTurno = eliminarTurno;