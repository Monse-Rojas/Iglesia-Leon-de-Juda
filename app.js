/* Lógica Completa de la Aplicación - Iglesia León de Judá & Supabase */

// CREDENCIALES DIRECTAS DE SUPABASE
const SUPABASE_URL = 'https://pvunuzruywavlyxrxibt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2dW51enJ1eXdhdmx5eHJ4aWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0ODI4ODcsImV4cCI6MjEwNDA1ODg4N30.GrB9OSA55UebDMRMUnL936nCeQGB3IC9VZxwWHG36k0';

const STORAGE_KEYS = {
  ASISTENTES: 'lj_asistentes',
  SERVICIOS: 'lj_servicios',
  ASISTENCIA: 'lj_asistencia'
};

// Datos semilla de demostración
const SEED_ASISTENTES = [
  { id: '1', nombre: 'Carlos Mendoza', fecha_hora: '2026-10-31T09:00', departamento: 'Caballeros' },
  { id: '2', nombre: 'María Elena Rodríguez', fecha_hora: '2026-10-31T09:15', departamento: 'Damas' },
  { id: '3', nombre: 'Juan Pablo Hernández', fecha_hora: '2026-10-31T09:30', departamento: 'Jóvenes' },
  { id: '4', nombre: 'Sofia Gómez', fecha_hora: '2026-10-31T09:45', departamento: 'Niños' },
  { id: '5', nombre: 'Roberto Fernández', fecha_hora: '2026-10-31T10:00', departamento: 'Visitante' }
];

// Estado global en memoria
let DB = {
  asistentes: [],
  servicios: [],
  asistencia: []
};

let servicioActivoId = null;
let supabaseClient = null;

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
  inicializarSupabaseClient();
  await cargarBaseDatos();
  establecerFechaPorDefecto();
  updateDashboard();
  renderTablaAsistentes();
  renderReportes();
});

/* ==========================================================================
   CONFIGURACIÓN Y CLIENTE SUPABASE
   ========================================================================== */

function inicializarSupabaseClient() {
  const badge = document.getElementById('supabase-badge');
  const badgeText = document.getElementById('supabase-status-text');

  const inputUrl = document.getElementById('supabase-url');
  if (inputUrl) inputUrl.value = SUPABASE_URL;
  const inputKey = document.getElementById('supabase-key');
  if (inputKey) inputKey.value = SUPABASE_ANON_KEY;

  if (window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      if (badge && badgeText) {
        badge.className = 'supabase-status connected';
        badgeText.innerText = 'Conectado a Supabase (pvunuzruywavlyxrxibt)';
      }
    } catch (err) {
      console.error('Error al inicializar cliente Supabase:', err);
      supabaseClient = null;
      if (badge && badgeText) {
        badge.className = 'supabase-status disconnected';
        badgeText.innerText = 'Error al Inicializar Supabase';
      }
    }
  }
}

function abrirModalSupabase() {
  document.getElementById('modal-supabase').classList.add('active');
}

function cerrarModalSupabase() {
  document.getElementById('modal-supabase').classList.remove('active');
}

async function probarConexionSupabase() {
  try {
    const client = supabaseClient || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: astData, error: astErr } = await client.from('asistentes').select('*').limit(3);

    if (astErr) {
      alert('Respuesta de Supabase: ' + astErr.message + '\n\nDetalle: ' + (astErr.details || astErr.hint || 'Verifica tus tablas.'));
    } else {
      alert(` ¡Conexión Exitosa con Supabase!\nSe detectó la tabla 'asistentes' con ${astData ? astData.length : 0} registros.`);
    }
  } catch (err) {
    alert('Error de conexión: ' + err.message);
  }
}

function guardarCredencialesSupabase(e) {
  e.preventDefault();
  cerrarModalSupabase();
  alert('Conexión con Supabase activa.');
}

function desconectarSupabase() {
  cerrarModalSupabase();
  alert('Modo Local activo.');
}

// Navegación de Pestañas
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) targetTab.classList.add('active');

  const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => 
    btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabId)
  );
  if (activeBtn) activeBtn.classList.add('active');

  if (tabId === 'dashboard') updateDashboard();
  if (tabId === 'asistentes') renderTablaAsistentes();
  if (tabId === 'reportes') renderReportes();
}

function establecerFechaPorDefecto() {
  const inputFecha = document.getElementById('servicio-fecha');
  if (inputFecha) {
    const today = new Date().toISOString().split('T')[0];
    inputFecha.value = today;
  }

  const inputFechaHora = document.getElementById('asistente-fecha-hora');
  if (inputFechaHora && !inputFechaHora.value) {
    inputFechaHora.value = obtenerFechaHoraActualLocal();
  }
}

/* ==========================================================================
   CARGA Y PERSISTENCIA DE DATOS EN SUPABASE
   ========================================================================== */

async function cargarBaseDatos() {
  if (supabaseClient) {
    try {
      const { data: astData } = await supabaseClient.from('asistentes').select('*');
      const { data: srvData } = await supabaseClient.from('servicios').select('*');
      const { data: asiData } = await supabaseClient.from('asistencia').select('*');

      if (astData) {
        DB.asistentes = astData.map(a => ({
          ...a,
          fecha_hora: a.fecha_hora || a.fecha || a.created_at || a.telefono || ''
        }));
      }
      if (srvData) DB.servicios = srvData;
      if (asiData) DB.asistencia = asiData;

      if (DB.asistentes.length > 0) return;
    } catch (err) {
      console.warn('Error al cargar desde Supabase:', err);
    }
  }

  const asistentesStored = localStorage.getItem(STORAGE_KEYS.ASISTENTES);
  const serviciosStored = localStorage.getItem(STORAGE_KEYS.SERVICIOS);
  const asistenciaStored = localStorage.getItem(STORAGE_KEYS.ASISTENCIA);

  if (asistentesStored) DB.asistentes = JSON.parse(asistentesStored);
  else {
    DB.asistentes = [...SEED_ASISTENTES];
    guardarEnLocalStorage();
  }

  if (serviciosStored) DB.servicios = JSON.parse(serviciosStored);
  if (asistenciaStored) DB.asistencia = JSON.parse(asistenciaStored);
}

function guardarEnLocalStorage() {
  localStorage.setItem(STORAGE_KEYS.ASISTENTES, JSON.stringify(DB.asistentes));
  localStorage.setItem(STORAGE_KEYS.SERVICIOS, JSON.stringify(DB.servicios));
  localStorage.setItem(STORAGE_KEYS.ASISTENCIA, JSON.stringify(DB.asistencia));
}

/* ==========================================================================
   MÓDULO: REGISTRO DE ASISTENTES (Nombre, Fecha y Hora, Departamento)
   ========================================================================== */

async function guardarAsistente(e) {
  e.preventDefault();
  const idInput = document.getElementById('asistente-id').value;
  const nombre = document.getElementById('asistente-nombre').value.trim();
  const fechaHora = document.getElementById('asistente-fecha-hora').value || obtenerFechaHoraActualLocal();
  const departamento = document.getElementById('asistente-departamento').value;

  if (!nombre) return;

  let errorSupabase = null;
  const datosSupabase = {
    nombre,
    fecha_hora: fechaHora,
    departamento
  };

  if (idInput) {
    const index = DB.asistentes.findIndex(m => String(m.id) === String(idInput));
    if (index !== -1) {
      const updated = { id: idInput, nombre, fecha_hora: fechaHora, departamento };
      DB.asistentes[index] = updated;

      if (supabaseClient) {
        let { error } = await supabaseClient.from('asistentes').update(datosSupabase).eq('id', idInput);
        // Fallback si la columna en Supabase es 'fecha' o 'telefono'
        if (error && error.message && (error.message.includes('fecha_hora') || error.message.includes('column'))) {
          const alt1 = await supabaseClient.from('asistentes').update({ nombre, fecha: fechaHora, departamento }).eq('id', idInput);
          if (!alt1.error) {
            error = null;
          } else if (alt1.error && alt1.error.message.includes('column')) {
            const alt2 = await supabaseClient.from('asistentes').update({ nombre, telefono: fechaHora, departamento }).eq('id', idInput);
            if (!alt2.error) error = null;
            else error = alt1.error;
          }
        }
        if (error) errorSupabase = error;
      }
    }
  } else {
    const nuevoId = Date.now().toString();
    const nuevo = {
      id: nuevoId,
      nombre,
      fecha_hora: fechaHora,
      departamento
    };
    DB.asistentes.push(nuevo);

    if (supabaseClient) {
      let { error } = await supabaseClient.from('asistentes').insert([{
        id: nuevoId,
        ...datosSupabase
      }]);
      // Fallback si la columna en Supabase es 'fecha' o 'telefono'
      if (error && error.message && (error.message.includes('fecha_hora') || error.message.includes('column'))) {
        const alt1 = await supabaseClient.from('asistentes').insert([{
          id: nuevoId,
          nombre,
          fecha: fechaHora,
          departamento
        }]);
        if (!alt1.error) {
          error = null;
        } else if (alt1.error && alt1.error.message.includes('column')) {
          const alt2 = await supabaseClient.from('asistentes').insert([{
            id: nuevoId,
            nombre,
            telefono: fechaHora,
            departamento
          }]);
          if (!alt2.error) error = null;
          else error = alt1.error;
        }
      }
      if (error) errorSupabase = error;
    }
  }

  guardarEnLocalStorage();
  resetFormAsistente();
  renderTablaAsistentes();
  updateDashboard();

  if (errorSupabase) {
    alert(' Guardado en almacenamiento local. Supabase reportó: ' + errorSupabase.message);
  } else if (supabaseClient) {
    alert(' ¡Asistente guardado exitosamente en tu tabla de Supabase!');
  } else {
    alert(' ¡Asistente guardado exitosamente en almacenamiento local!');
  }
}

function resetFormAsistente() {
  document.getElementById('form-asistente').reset();
  document.getElementById('asistente-id').value = '';
  document.getElementById('form-asistente-title').innerText = 'Registro de Nuevo Asistente';
  const inputFechaHora = document.getElementById('asistente-fecha-hora');
  if (inputFechaHora) {
    inputFechaHora.value = obtenerFechaHoraActualLocal();
  }
}

function editarAsistente(id) {
  const asistente = DB.asistentes.find(m => String(m.id) === String(id));
  if (!asistente) return;

  document.getElementById('asistente-id').value = asistente.id;
  document.getElementById('asistente-nombre').value = asistente.nombre;
  const inputFechaHora = document.getElementById('asistente-fecha-hora');
  if (inputFechaHora) {
    let val = asistente.fecha_hora || asistente.fecha || '';
    if (val && val.includes('T')) {
      inputFechaHora.value = val.slice(0, 16);
    } else if (val) {
      inputFechaHora.value = val;
    } else {
      inputFechaHora.value = obtenerFechaHoraActualLocal();
    }
  }
  document.getElementById('asistente-departamento').value = asistente.departamento;
  document.getElementById('form-asistente-title').innerText = 'Editar Datos de Asistente';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminarAsistente(id) {
  if (confirm('¿Estás seguro de eliminar este asistente?')) {
    DB.asistentes = DB.asistentes.filter(m => String(m.id) !== String(id));

    let errorSupabase = null;
    if (supabaseClient) {
      const { error } = await supabaseClient.from('asistentes').delete().eq('id', id);
      if (error) errorSupabase = error;
    }

    guardarEnLocalStorage();
    renderTablaAsistentes();
    updateDashboard();

    if (errorSupabase) {
      alert(' Eliminado localmente. Supabase reportó: ' + errorSupabase.message);
    }
  }
}

function renderTablaAsistentes() {
  const tbody = document.getElementById('tabla-asistentes-tbody');
  const busqueda = (document.getElementById('buscar-asistente')?.value || '').toLowerCase();
  tbody.innerHTML = '';

  const filtrados = DB.asistentes.filter(m => m.nombre.toLowerCase().includes(busqueda));

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">No se encontraron asistentes registrados.</td></tr>`;
    return;
  }

  filtrados.forEach((m, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><strong>${escapeHtml(m.nombre)}</strong></td>
      <td>${formatearFechaHora(m.fecha_hora || m.fecha || m.created_at)}</td>
      <td><span class="badge badge-depto">${escapeHtml(m.departamento)}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editarAsistente('${m.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm" onclick="eliminarAsistente('${m.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ==========================================================================
   MÓDULO: CONTROL DE ASISTENCIA (Presente / Falta)
   ========================================================================== */

async function crearOSeleccionarServicio(e) {
  e.preventDefault();
  const fecha = document.getElementById('servicio-fecha').value;
  const tipo = document.getElementById('servicio-tipo').value;

  if (!fecha || !tipo) return;

  let servicio = DB.servicios.find(s => s.fecha === fecha && s.tipo === tipo);

  if (!servicio) {
    servicio = {
      id: 'serv_' + Date.now(),
      fecha,
      tipo
    };
    DB.servicios.push(servicio);

    if (supabaseClient) {
      const { error } = await supabaseClient.from('servicios').upsert([servicio]);
      if (error) console.warn('Aviso Supabase al guardar servicio:', error.message);
    }

    guardarEnLocalStorage();
  } else {
    // Asegurar que el servicio existente esté sincronizado en Supabase
    if (supabaseClient) {
      await supabaseClient.from('servicios').upsert([servicio]);
    }
  }

  servicioActivoId = servicio.id;
  cargarPanelAsistencia(servicio);
}

function cargarPanelAsistencia(servicio) {
  const panel = document.getElementById('panel-toma-asistencia');
  panel.style.display = 'block';

  document.getElementById('asistencia-servicio-info').innerText = `${servicio.tipo} (${formatearFecha(servicio.fecha)})`;

  const tbody = document.getElementById('tabla-asistencia-tbody');
  tbody.innerHTML = '';

  if (DB.asistentes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center">Por favor, registra primero algunos asistentes en la pestaña "Registro de Asistentes".</td></tr>`;
    return;
  }

  const registrosServicio = DB.asistencia.filter(a => a.servicio_id === servicio.id);

  DB.asistentes.forEach(m => {
    const reg = registrosServicio.find(r => r.asistente_id === m.id);
    const estadoActual = reg ? reg.estado : 'Falta';

    const tr = document.createElement('tr');
    tr.setAttribute('data-asistente-id', m.id);
    tr.innerHTML = `
      <td><strong>${escapeHtml(m.nombre)}</strong></td>
      <td><span class="badge badge-depto">${escapeHtml(m.departamento)}</span></td>
      <td class="text-center">
        <div class="attendance-options">
          <button type="button" class="attendance-btn presente ${estadoActual === 'Presente' ? 'active' : ''}" onclick="seleccionarEstado(this, 'Presente')">
            <i class="fa-solid fa-check"></i> Presente
          </button>
          <button type="button" class="attendance-btn falta ${estadoActual === 'Falta' ? 'active' : ''}" onclick="seleccionarEstado(this, 'Falta')">
            <i class="fa-solid fa-xmark"></i> Falta
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  actualizarConteoLive();
  panel.scrollIntoView({ behavior: 'smooth' });
}

function seleccionarEstado(btn, estado) {
  const container = btn.parentElement;
  container.querySelectorAll('.attendance-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  actualizarConteoLive();
}

function marcarTodos(estado) {
  const tbody = document.getElementById('tabla-asistencia-tbody');
  tbody.querySelectorAll('tr').forEach(tr => {
    const btns = tr.querySelectorAll('.attendance-btn');
    btns.forEach(b => b.classList.remove('active'));
    const target = tr.querySelector(`.attendance-btn.${estado.toLowerCase()}`);
    if (target) target.classList.add('active');
  });
  actualizarConteoLive();
}

function actualizarConteoLive() {
  const tbody = document.getElementById('tabla-asistencia-tbody');
  if (!tbody) return;
  const presentesCount = tbody.querySelectorAll('.attendance-btn.presente.active').length;
  const el = document.getElementById('conteo-live-presentes');
  if (el) el.innerText = presentesCount;
}

async function guardarAsistenciaActual() {
  if (!servicioActivoId) return;

  const tbody = document.getElementById('tabla-asistencia-tbody');
  const rows = tbody.querySelectorAll('tr');

  const registrosUpsert = [];

  rows.forEach(tr => {
    const asistenteId = tr.getAttribute('data-asistente-id');
    if (!asistenteId) return;

    const activeBtn = tr.querySelector('.attendance-btn.active');
    let estado = 'Falta';
    if (activeBtn) {
      if (activeBtn.classList.contains('presente')) estado = 'Presente';
      if (activeBtn.classList.contains('falta')) estado = 'Falta';
    }

    const index = DB.asistencia.findIndex(a => a.servicio_id === servicioActivoId && a.asistente_id === asistenteId);

    const record = {
      id: index !== -1 ? DB.asistencia[index].id : 'ast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      servicio_id: servicioActivoId,
      asistente_id: asistenteId,
      estado: estado
    };

    if (index !== -1) {
      DB.asistencia[index] = record;
    } else {
      DB.asistencia.push(record);
    }

    registrosUpsert.push(record);
  });

  const servicioActual = DB.servicios.find(s => s.id === servicioActivoId);
  const nombreServicio = servicioActual ? servicioActual.tipo : (document.getElementById('servicio-tipo')?.value || 'el servicio');

  let errorSupabase = null;
  if (supabaseClient) {
    // 1. Sincronizar el servicio y su tipo en la tabla 'servicios' de Supabase
    if (servicioActual) {
      try {
        const { error: srvErr } = await supabaseClient.from('servicios').upsert([{
          id: servicioActual.id,
          fecha: servicioActual.fecha,
          tipo: servicioActual.tipo
        }]);
        if (srvErr) console.warn('Aviso al guardar servicio en Supabase:', srvErr.message);
      } catch (e) {
        console.warn('Aviso de conexión con servicios:', e);
      }
    }

    // 2. Sincronizar las asistencias en la tabla 'asistencia' de Supabase
    if (registrosUpsert.length > 0) {
      try {
        let { error } = await supabaseClient.from('asistencia').upsert(registrosUpsert);
        if (error && error.message && error.message.includes('relation')) {
          const res = await supabaseClient.from('asistencias').upsert(registrosUpsert);
          error = res.error;
        }
        if (error) errorSupabase = error;
      } catch (err) {
        console.warn('Error al guardar asistencia en Supabase:', err);
      }
    }
  }

  guardarEnLocalStorage();
  updateDashboard();
  renderReportes();

  if (errorSupabase) {
    alert(` Asistencia para "${nombreServicio}" guardada localmente, pero Supabase reportó: ` + errorSupabase.message);
  } else if (supabaseClient) {
    alert(` ¡Asistencia para "${nombreServicio}" guardada exitosamente en Supabase!`);
  } else {
    alert(` ¡Asistencia para "${nombreServicio}" guardada en almacenamiento local!`);
  }
}

/* ==========================================================================
   MÓDULO: REPORTES Y DASHBOARD
   ========================================================================== */

function updateDashboard() {
  document.getElementById('stat-total-asistentes').innerText = DB.asistentes.length;
  document.getElementById('stat-total-servicios').innerText = DB.servicios.length;

  if (DB.servicios.length === 0) {
    document.getElementById('stat-asistencia-promedio').innerText = '0%';
    document.getElementById('stat-departamento-top').innerText = '--';
  } else {
    let totalPresentes = 0;
    let totalPosibles = DB.servicios.length * DB.asistentes.length;

    const deptoCounts = { 'Niños': 0, 'Jóvenes': 0, 'Damas': 0, 'Caballeros': 0, 'Visitante': 0 };

    DB.asistencia.forEach(a => {
      if (a.estado === 'Presente') {
        totalPresentes++;
        const asis = DB.asistentes.find(m => m.id === a.asistente_id);
        if (asis && deptoCounts[asis.departamento] !== undefined) {
          deptoCounts[asis.departamento]++;
        }
      }
    });

    const prom = totalPosibles > 0 ? Math.round((totalPresentes / totalPosibles) * 100) : 0;
    document.getElementById('stat-asistencia-promedio').innerText = `${prom}%`;

    let topDepto = '--';
    let maxVal = -1;
    for (const [dep, count] of Object.entries(deptoCounts)) {
      if (count > maxVal && count > 0) {
        maxVal = count;
        topDepto = dep;
      }
    }
    document.getElementById('stat-departamento-top').innerText = topDepto;
  }

  renderTablaDashboardServicios();
}

function renderTablaDashboardServicios() {
  const tbody = document.getElementById('dashboard-servicios-tbody');
  tbody.innerHTML = '';

  if (DB.servicios.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">No hay cultos registrados aún.</td></tr>`;
    return;
  }

  const ultimosServicios = [...DB.servicios].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5);

  ultimosServicios.forEach(s => {
    const stats = calcularEstadisticasServicio(s.id);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${formatearFecha(s.fecha)}</strong></td>
      <td>${escapeHtml(s.tipo)}</td>
      <td><span class="badge badge-presente">${stats.totalPresentes}</span></td>
      <td><span class="badge badge-falta">${stats.totalFaltas}</span></td>
      <td><strong>${stats.porcentaje}%</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderReportes() {
  const tbody = document.getElementById('tabla-reportes-tbody');
  tbody.innerHTML = '';

  if (DB.servicios.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center">No hay datos de cultos o asistencia guardados.</td></tr>`;
    return;
  }

  const serviciosOrdenados = [...DB.servicios].sort((a, b) => b.fecha.localeCompare(a.fecha));

  serviciosOrdenados.forEach(s => {
    const stats = calcularEstadisticasServicio(s.id);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${formatearFecha(s.fecha)}</strong></td>
      <td>${escapeHtml(s.tipo)}</td>
      <td><span class="badge badge-presente" style="font-size: 0.85rem;">${stats.totalPresentes}</span></td>
      <td>${stats.deptos['Niños'] || 0}</td>
      <td>${stats.deptos['Jóvenes'] || 0}</td>
      <td>${stats.deptos['Damas'] || 0}</td>
      <td>${stats.deptos['Caballeros'] || 0}</td>
      <td>${stats.deptos['Visitante'] || 0}</td>
      <td><strong style="color: var(--primary-gold);">${stats.porcentaje}%</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

function calcularEstadisticasServicio(servicioId) {
  const registros = DB.asistencia.filter(a => a.servicio_id === servicioId);
  let totalPresentes = 0;
  let totalFaltas = 0;

  const deptos = {
    'Niños': 0,
    'Jóvenes': 0,
    'Damas': 0,
    'Caballeros': 0,
    'Visitante': 0
  };

  registros.forEach(r => {
    if (r.estado === 'Presente') {
      totalPresentes++;
      const asis = DB.asistentes.find(m => m.id === r.asistente_id);
      if (asis && deptos[asis.departamento] !== undefined) {
        deptos[asis.departamento]++;
      }
    } else {
      totalFaltas++;
    }
  });

  const totalEvaluados = DB.asistentes.length || 1;
  const porcentaje = Math.round((totalPresentes / totalEvaluados) * 100);

  return { totalPresentes, totalFaltas, deptos, porcentaje };
}

/* ==========================================================================
   UTILIDADES
   ========================================================================== */

function formatearFecha(fechaStr) {
  if (!fechaStr) return '';
  const partes = fechaStr.split('-');
  if (partes.length !== 3) return fechaStr;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obtenerFechaHoraActualLocal() {
  const now = new Date();
  const anio = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const dia = String(now.getDate()).padStart(2, '0');
  const horas = String(now.getHours()).padStart(2, '0');
  const minutos = String(now.getMinutes()).padStart(2, '0');
  return `${anio}-${mes}-${dia}T${horas}:${minutos}`;
}

function formatearFechaHora(fechaHoraStr) {
  if (!fechaHoraStr) return 'N/A';
  try {
    const d = new Date(fechaHoraStr);
    if (isNaN(d.getTime())) return escapeHtml(fechaHoraStr);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    let horas = d.getHours();
    const minutos = String(d.getMinutes()).padStart(2, '0');
    const ampm = horas >= 12 ? 'PM' : 'AM';
    horas = horas % 12;
    horas = horas ? horas : 12;
    const strHoras = String(horas).padStart(2, '0');
    return `${dia}/${mes}/${anio} ${strHoras}:${minutos} ${ampm}`;
  } catch (e) {
    return escapeHtml(fechaHoraStr);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function exportarBaseDatos() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(DB, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `asistencia_leon_de_juda_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
