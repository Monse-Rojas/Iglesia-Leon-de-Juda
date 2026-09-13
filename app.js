/* Lógica de la Aplicación - Control de Asistencia Iglesia León de Judá */

// Inicialización del estado y datos en localStorage
const STORAGE_KEYS = {
  ASISTENTES: 'lj_asistentes',
  SERVICIOS: 'lj_servicios',
  ASISTENCIA: 'lj_asistencia'
};

// Datos semilla de demostración si la base de datos está vacía
const SEED_MIEMBROS = [
  { id: '1', nombre: 'Carlos Mendoza', telefono: '555-123-8901', correo: 'carlos.mendoza@email.com', tipo: 'Liderazgo / Servidor' },
  { id: '2', nombre: 'María Elena Rodríguez', telefono: '555-987-6543', correo: 'maria.rodriguez@email.com', tipo: 'Miembro Regular' },
  { id: '3', nombre: 'Juan Pablo Hernández', telefono: '555-456-7890', correo: 'juan.pablo@email.com', tipo: 'Niño / Joven' },
  { id: '4', nombre: 'Ana Luisa Gómez', telefono: '555-222-3333', correo: 'ana.gomez@email.com', tipo: 'Visitante' },
  { id: '5', nombre: 'Roberto Fernández', telefono: '555-888-9999', correo: 'roberto.f@email.com', tipo: 'Adulto Mayor' }
];

// Estado global en memoria
let DB = {
  asistentes: [],
  servicios: [],
  asistencia: [] // { id, servicio_id, asistente_id, estado: 'Presente'|'Ausente'|'Justificado', notas }
};

let servicioActivoId = null;

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', () => {
  cargarBaseDatos();
  establecerFechaPorDefecto();
  updateDashboard();
  renderTablaMiembros();
  renderReportes();
});

// Cargar desde LocalStorage
function cargarBaseDatos() {
  const asistentesStored = localStorage.getItem(STORAGE_KEYS.ASISTENTES);
  const serviciosStored = localStorage.getItem(STORAGE_KEYS.SERVICIOS);
  const asistenciaStored = localStorage.getItem(STORAGE_KEYS.ASISTENCIA);

  if (asistentesStored) {
    DB.asistentes = JSON.parse(asistentesStored);
  } else {
    // Cargar datos semilla por primera vez
    DB.asistentes = [...SEED_MIEMBROS];
    guardarEnLocalStorage();
  }

  if (serviciosStored) DB.servicios = JSON.parse(serviciosStored);
  if (asistenciaStored) DB.asistencia = JSON.parse(asistenciaStored);
}

// Guardar cambios en LocalStorage
function guardarEnLocalStorage() {
  localStorage.setItem(STORAGE_KEYS.ASISTENTES, JSON.stringify(DB.asistentes));
  localStorage.setItem(STORAGE_KEYS.SERVICIOS, JSON.stringify(DB.servicios));
  localStorage.setItem(STORAGE_KEYS.ASISTENCIA, JSON.stringify(DB.asistencia));
}

// Cambiar de pestañas
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) targetTab.classList.add('active');

  // Encontrar el botón clickeado
  const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => 
    btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabId)
  );
  if (activeBtn) activeBtn.classList.add('active');

  // Refrescar vistas según pestaña
  if (tabId === 'dashboard') updateDashboard();
  if (tabId === 'miembros') renderTablaMiembros();
  if (tabId === 'reportes') renderReportes();
}

function establecerFechaPorDefecto() {
  const inputFecha = document.getElementById('servicio-fecha');
  if (inputFecha) {
    const today = new Date().toISOString().split('T')[0];
    inputFecha.value = today;
  }
}

/* ==========================================================================
   MÓDULO: REGISTRO DE MIEMBROS
   ========================================================================== */

function guardarMiembro(e) {
  e.preventDefault();
  const idInput = document.getElementById('miembro-id').value;
  const nombre = document.getElementById('miembro-nombre').value.trim();
  const telefono = document.getElementById('miembro-telefono').value.trim();
  const correo = document.getElementById('miembro-correo').value.trim();
  const tipo = document.getElementById('miembro-tipo').value;

  if (!nombre) return;

  if (idInput) {
    // Editar existente
    const index = DB.asistentes.findIndex(m => m.id === idInput);
    if (index !== -1) {
      DB.asistentes[index] = { id: idInput, nombre, telefono, correo, tipo };
    }
  } else {
    // Nuevo miembro
    const nuevoMiembro = {
      id: Date.now().toString(),
      nombre,
      telefono,
      correo,
      tipo
    };
    DB.asistentes.push(nuevoMiembro);
  }

  guardarEnLocalStorage();
  resetFormMiembro();
  renderTablaMiembros();
  updateDashboard();
  alert('¡Miembro guardado con éxito!');
}

function resetFormMiembro() {
  document.getElementById('form-miembro').reset();
  document.getElementById('miembro-id').value = '';
  document.getElementById('form-miembro-title').innerText = 'Nuevo Registro de Miembro';
}

function editarMiembro(id) {
  const miembro = DB.asistentes.find(m => m.id === id);
  if (!miembro) return;

  document.getElementById('miembro-id').value = miembro.id;
  document.getElementById('miembro-nombre').value = miembro.nombre;
  document.getElementById('miembro-telefono').value = miembro.telefono || '';
  document.getElementById('miembro-correo').value = miembro.correo || '';
  document.getElementById('miembro-tipo').value = miembro.tipo;
  document.getElementById('form-miembro-title').innerText = 'Editar Datos de Miembro';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function eliminarMiembro(id) {
  if (confirm('¿Estás seguro de eliminar este miembro? Se conservará el historial de asistencias previas.')) {
    DB.asistentes = DB.asistentes.filter(m => m.id !== id);
    guardarEnLocalStorage();
    renderTablaMiembros();
    updateDashboard();
  }
}

function renderTablaMiembros() {
  const tbody = document.getElementById('tabla-miembros-tbody');
  const busqueda = (document.getElementById('buscar-miembro')?.value || '').toLowerCase();
  tbody.innerHTML = '';

  const filtrados = DB.asistentes.filter(m => m.nombre.toLowerCase().includes(busqueda));

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">No se encontraron miembros registrados.</td></tr>`;
    return;
  }

  filtrados.forEach((m, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><strong>${escapeHtml(m.nombre)}</strong></td>
      <td>${escapeHtml(m.telefono || 'N/A')}</td>
      <td>${escapeHtml(m.correo || 'N/A')}</td>
      <td><span class="badge badge-tipo">${escapeHtml(m.tipo)}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editarMiembro('${m.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm" onclick="eliminarMiembro('${m.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ==========================================================================
   MÓDULO: CONTROL DE ASISTENCIA Y SERVICIOS
   ========================================================================== */

function crearOSeleccionarServicio(e) {
  e.preventDefault();
  const fecha = document.getElementById('servicio-fecha').value;
  const tipo = document.getElementById('servicio-tipo').value;
  const descripcion = document.getElementById('servicio-descripcion').value.trim();

  if (!fecha || !tipo) return;

  // Buscar si ya existe un servicio para esa fecha y tipo
  let servicio = DB.servicios.find(s => s.fecha === fecha && s.tipo === tipo);

  if (!servicio) {
    servicio = {
      id: 'serv_' + Date.now(),
      fecha,
      tipo,
      descripcion
    };
    DB.servicios.push(servicio);
    guardarEnLocalStorage();
  }

  servicioActivoId = servicio.id;
  cargarPanelAsistencia(servicio);
}

function cargarPanelAsistencia(servicio) {
  const panel = document.getElementById('panel-toma-asistencia');
  panel.style.display = 'block';

  document.getElementById('asistencia-servicio-info').innerText = `${servicio.tipo} (${formatearFecha(servicio.fecha)})`;
  document.getElementById('asistencia-servicio-subinfo').innerText = servicio.descripcion ? `Notas: ${servicio.descripcion}` : 'Registro activo de asistencia';

  const tbody = document.getElementById('tabla-asistencia-tbody');
  tbody.innerHTML = '';

  if (DB.asistentes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center">Por favor, registra primero algunos miembros en el módulo "Registro de Miembros".</td></tr>`;
    return;
  }

  // Obtener registros previos de asistencia para este servicio
  const registrosServicio = DB.asistencia.filter(a => a.servicio_id === servicio.id);

  DB.asistentes.forEach(m => {
    const reg = registrosServicio.find(r => r.asistente_id === m.id);
    const estadoActual = reg ? reg.estado : 'Ausente'; // Por defecto Ausente hasta marcar

    const tr = document.createElement('tr');
    tr.setAttribute('data-asistente-id', m.id);
    tr.innerHTML = `
      <td><strong>${escapeHtml(m.nombre)}</strong></td>
      <td><span class="badge badge-tipo">${escapeHtml(m.tipo)}</span></td>
      <td class="text-center">
        <div class="attendance-options">
          <button type="button" class="attendance-btn presente ${estadoActual === 'Presente' ? 'active' : ''}" onclick="seleccionarEstado(this, 'Presente')">Presente</button>
          <button type="button" class="attendance-btn ausente ${estadoActual === 'Ausente' ? 'active' : ''}" onclick="seleccionarEstado(this, 'Ausente')">Ausente</button>
          <button type="button" class="attendance-btn justificado ${estadoActual === 'Justificado' ? 'active' : ''}" onclick="seleccionarEstado(this, 'Justificado')">Justificado</button>
        </div>
      </td>
      <td>
        <input type="text" class="form-control form-control-sm obs-input" value="${escapeHtml(reg?.notas || '')}" placeholder="Nota opcional...">
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Scroll suave al panel de asistencia
  panel.scrollIntoView({ behavior: 'smooth' });
}

function seleccionarEstado(btn, estado) {
  const container = btn.parentElement;
  container.querySelectorAll('.attendance-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function marcarTodos(estado) {
  const tbody = document.getElementById('tabla-asistencia-tbody');
  tbody.querySelectorAll('tr').forEach(tr => {
    const btns = tr.querySelectorAll('.attendance-btn');
    btns.forEach(b => b.classList.remove('active'));
    const target = tr.querySelector(`.attendance-btn.${estado.toLowerCase()}`);
    if (target) target.classList.add('active');
  });
}

function guardarAsistenciaActual() {
  if (!servicioActivoId) return;

  const tbody = document.getElementById('tabla-asistencia-tbody');
  const rows = tbody.querySelectorAll('tr');

  rows.forEach(tr => {
    const asistenteId = tr.getAttribute('data-asistente-id');
    if (!asistenteId) return;

    const activeBtn = tr.querySelector('.attendance-btn.active');
    let estado = 'Ausente';
    if (activeBtn) {
      if (activeBtn.classList.contains('presente')) estado = 'Presente';
      if (activeBtn.classList.contains('ausente')) estado = 'Ausente';
      if (activeBtn.classList.contains('justificado')) estado = 'Justificado';
    }

    const notas = tr.querySelector('.obs-input')?.value || '';

    // Buscar si ya existía el registro
    const index = DB.asistencia.findIndex(a => a.servicio_id === servicioActivoId && a.asistente_id === asistenteId);

    if (index !== -1) {
      DB.asistencia[index].estado = estado;
      DB.asistencia[index].notas = notas;
    } else {
      DB.asistencia.push({
        id: 'ast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        servicio_id: servicioActivoId,
        asistente_id: asistenteId,
        estado: estado,
        notas: notas
      });
    }
  });

  guardarEnLocalStorage();
  updateDashboard();
  renderReportes();
  alert('¡Registro de asistencia guardado exitosamente!');
}

/* ==========================================================================
   MÓDULO: REPORTES Y DASHBOARD
   ========================================================================== */

function updateDashboard() {
  document.getElementById('stat-total-miembros').innerText = DB.asistentes.length;
  document.getElementById('stat-total-servicios').innerText = DB.servicios.length;

  if (DB.servicios.length === 0) {
    document.getElementById('stat-asistencia-promedio').innerText = '0%';
    document.getElementById('stat-ultimo-servicio').innerText = 'Sin registros';
  } else {
    // Calcular promedio general
    let totalPresentes = 0;
    let totalPosibles = DB.servicios.length * DB.asistentes.length;

    DB.asistencia.forEach(a => {
      if (a.estado === 'Presente') totalPresentes++;
    });

    const prom = totalPosibles > 0 ? Math.round((totalPresentes / totalPosibles) * 100) : 0;
    document.getElementById('stat-asistencia-promedio').innerText = `${prom}%`;

    // Último servicio
    const ultimoServicio = [...DB.servicios].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
    document.getElementById('stat-ultimo-servicio').innerText = formatearFecha(ultimoServicio.fecha);
  }

  renderTablaDashboardServicios();
}

function renderTablaDashboardServicios() {
  const tbody = document.getElementById('dashboard-servicios-tbody');
  tbody.innerHTML = '';

  if (DB.servicios.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">No hay servicios registrados aún.</td></tr>`;
    return;
  }

  const ultimosServicios = [...DB.servicios].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5);

  ultimosServicios.forEach(s => {
    const stats = calcularEstadisticasServicio(s.id);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${formatearFecha(s.fecha)}</strong></td>
      <td>${escapeHtml(s.tipo)}</td>
      <td><span class="badge badge-presente">${stats.presentes}</span></td>
      <td><span class="badge badge-ausente">${stats.ausentes}</span></td>
      <td><span class="badge badge-justificado">${stats.justificados}</span></td>
      <td><strong>${stats.porcentaje}%</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderReportes() {
  const tbody = document.getElementById('tabla-reportes-tbody');
  tbody.innerHTML = '';

  if (DB.servicios.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">No hay datos de culto o asistencia guardados.</td></tr>`;
    return;
  }

  const serviciosOrdenados = [...DB.servicios].sort((a, b) => b.fecha.localeCompare(a.fecha));

  serviciosOrdenados.forEach(s => {
    const stats = calcularEstadisticasServicio(s.id);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${formatearFecha(s.fecha)}</strong></td>
      <td>${escapeHtml(s.tipo)}</td>
      <td>${DB.asistentes.length}</td>
      <td><span class="badge badge-presente">${stats.presentes}</span></td>
      <td><span class="badge badge-ausente">${stats.ausentes}</span></td>
      <td><span class="badge badge-justificado">${stats.justificados}</span></td>
      <td><strong style="color: var(--primary-gold);">${stats.porcentaje}%</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

function calcularEstadisticasServicio(servicioId) {
  const registros = DB.asistencia.filter(a => a.servicio_id === servicioId);
  let presentes = 0;
  let ausentes = 0;
  let justificados = 0;

  registros.forEach(r => {
    if (r.estado === 'Presente') presentes++;
    else if (r.estado === 'Ausente') ausentes++;
    else if (r.estado === 'Justificado') justificados++;
  });

  const totalEvaluados = DB.asistentes.length || 1;
  const porcentaje = Math.round((presentes / totalEvaluados) * 100);

  return { presentes, ausentes, justificados, porcentaje };
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
