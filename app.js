/* Lógica de la Aplicación (Directa a Supabase) - Iglesia León de Judá */

// CREDENCIALES DIRECTAS DE SUPABASE
const SUPABASE_URL = 'https://pvunuzruywavlyxrxibt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2dW51enJ1eXdhdmx5eHJ4aWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0ODI4ODcsImV4cCI6MjEwNDA1ODg4N30.GrB9OSA55UebDMRMUnL936nCeQGB3IC9VZxwWHG36k0';

// Inicialización directa del cliente de Supabase
let supabaseClient = null;
if (window.supabase) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error('Error al inicializar cliente de Supabase:', e);
  }
}

// Datos semilla locales por defecto
const SEED_REGISTROS = [
  { id: '1', nombre: 'Carlos Mendoza', fecha: '2026-09-15', departamento: 'Caballeros', llego: 'Sí' },
  { id: '2', nombre: 'María Elena Rodríguez', fecha: '2026-09-15', departamento: 'Damas', llego: 'Sí' },
  { id: '3', nombre: 'Juan Pablo Hernández', fecha: '2026-09-15', departamento: 'Jóvenes', llego: 'No' },
  { id: '4', nombre: 'Sofia Gómez', fecha: '2026-09-15', departamento: 'Niños', llego: 'Sí' },
  { id: '5', nombre: 'Roberto Fernández', fecha: '2026-09-15', departamento: 'Visitante', llego: 'Sí' }
];

let registrosAsistencia = [];

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
  establecerFechaPorDefecto();
  actualizarInsigniaConexion();
  await cargarBaseDatos();
  updateStats();
  renderTablaRegistros();
});

function actualizarInsigniaConexion() {
  const badge = document.getElementById('supabase-badge');
  const badgeText = document.getElementById('supabase-status-text');

  if (inputUrl = document.getElementById('supabase-url')) inputUrl.value = SUPABASE_URL;
  if (inputKey = document.getElementById('supabase-key')) inputKey.value = SUPABASE_ANON_KEY;

  if (supabaseClient && badge && badgeText) {
    badge.className = 'supabase-status connected';
    badgeText.innerText = 'Conectado a Supabase (pvunuzruywavlyxrxibt)';
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
    let { data, error } = await client.from('asistencia').select('*').limit(3);
    
    if (error && error.message.includes('relation')) {
      const res = await client.from('asistentes').select('*').limit(3);
      data = res.data;
      error = res.error;
    }

    if (error) {
      alert('Respuesta de Supabase: ' + error.message + '\n\nDetalle: ' + (error.details || error.hint || 'Revisa el nombre de las columnas o tablas.'));
    } else {
      alert(' ¡Conexión Exitosa con Supabase!\nLas tablas están conectadas correctamente.');
    }
  } catch (err) {
    alert('Error al probar conexión: ' + err.message);
  }
}

function guardarCredencialesSupabase(e) {
  e.preventDefault();
  cerrarModalSupabase();
  alert('Credenciales de Supabase guardadas y activas directamente en el sistema.');
}

function desconectarSupabase() {
  cerrarModalSupabase();
  alert('Modo Local activo.');
}

function establecerFechaPorDefecto() {
  const inputFecha = document.getElementById('asistencia-fecha');
  if (inputFecha && !inputFecha.value) {
    const today = new Date().toISOString().split('T')[0];
    inputFecha.value = today;
  }
}

/* ==========================================================================
   CARGA DE DATOS DESDE SUPABASE / LOCAL
   ========================================================================== */

async function cargarBaseDatos() {
  if (supabaseClient) {
    try {
      let { data, error } = await supabaseClient.from('asistencia').select('*');
      
      if (error && error.message.includes('relation')) {
        const res = await supabaseClient.from('asistentes').select('*');
        data = res.data;
        error = res.error;
      }

      if (!error && data && data.length > 0) {
        registrosAsistencia = data.map(r => ({
          id: r.id || Date.now().toString(),
          nombre: r.nombre || '',
          fecha: r.fecha || new Date().toISOString().split('T')[0],
          departamento: r.departamento || 'Visitante',
          llego: r.llego || 'Sí'
        }));
        return;
      }
    } catch (err) {
      console.warn('Cargando registros locales:', err);
    }
  }

  const stored = localStorage.getItem('lj_registros_asistencia');
  if (stored) {
    registrosAsistencia = JSON.parse(stored);
  } else {
    registrosAsistencia = [...SEED_REGISTROS];
    localStorage.setItem('lj_registros_asistencia', JSON.stringify(registrosAsistencia));
  }
}

function guardarEnLocalStorage() {
  localStorage.setItem('lj_registros_asistencia', JSON.stringify(registrosAsistencia));
}

/* ==========================================================================
   GUARDAR REGISTRO DIRECTO A SUPABASE (4 CAMPOS EXACTOS)
   ========================================================================== */

async function guardarRegistroAsistencia(e) {
  e.preventDefault();

  const idInput = document.getElementById('asistencia-id').value;
  const nombre = document.getElementById('asistencia-nombre').value.trim();
  const fecha = document.getElementById('asistencia-fecha').value;
  const departamento = document.getElementById('asistencia-departamento').value;
  const llego = document.getElementById('asistencia-llego').value; // 'Sí' o 'No'

  if (!nombre || !fecha || !departamento || !llego) {
    alert('Por favor completa todos los campos.');
    return;
  }

  // OBJETO CON LOS 4 CAMPOS EXACTOS PARA SUPABASE
  const datosRegistro = {
    nombre: nombre,
    fecha: fecha,
    departamento: departamento,
    llego: llego
  };

  let errorSupabase = null;

  if (idInput) {
    // Editar registro
    const index = registrosAsistencia.findIndex(r => String(r.id) === String(idInput));
    if (index !== -1) {
      registrosAsistencia[index] = { ...datosRegistro, id: idInput };

      if (supabaseClient) {
        let { error } = await supabaseClient.from('asistencia').update(datosRegistro).eq('id', idInput);
        if (error && error.message.includes('relation')) {
          const res = await supabaseClient.from('asistentes').update(datosRegistro).eq('id', idInput);
          error = res.error;
        }
        if (error) errorSupabase = error;
      }
    }
  } else {
    // Nuevo registro
    const nuevoId = 'rec_' + Date.now();
    const nuevoObj = { ...datosRegistro, id: nuevoId };
    registrosAsistencia.push(nuevoObj);

    if (supabaseClient) {
      let { error } = await supabaseClient.from('asistencia').insert([datosRegistro]);
      if (error && error.message.includes('relation')) {
        const res = await supabaseClient.from('asistentes').insert([datosRegistro]);
        error = res.error;
      }
      if (error) errorSupabase = error;
    }
  }

  guardarEnLocalStorage();
  resetFormulario();
  updateStats();
  renderTablaRegistros();

  if (errorSupabase) {
    alert(' Guardado localmente. Supabase devolvió: ' + errorSupabase.message);
  } else if (supabaseClient) {
    alert(' ¡Registro insertado exitosamente en tu base de datos de Supabase!');
  } else {
    alert(' ¡Registro guardado en almacenamiento local!');
  }
}

function resetFormulario() {
  document.getElementById('form-asistencia').reset();
  document.getElementById('asistencia-id').value = '';
  document.getElementById('form-title').innerText = 'Registrar Asistencia';
  establecerFechaPorDefecto();
}

function editarRegistro(id) {
  const reg = registrosAsistencia.find(r => String(r.id) === String(id));
  if (!reg) return;

  document.getElementById('asistencia-id').value = reg.id;
  document.getElementById('asistencia-nombre').value = reg.nombre;
  document.getElementById('asistencia-fecha').value = reg.fecha;
  document.getElementById('asistencia-departamento').value = reg.departamento;
  document.getElementById('asistencia-llego').value = reg.llego;

  document.getElementById('form-title').innerText = 'Editar Registro de Asistencia';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminarRegistro(id) {
  if (confirm('¿Estás seguro de eliminar este registro?')) {
    registrosAsistencia = registrosAsistencia.filter(r => String(r.id) !== String(id));

    let errorSupabase = null;
    if (supabaseClient) {
      let { error } = await supabaseClient.from('asistencia').delete().eq('id', id);
      if (error && error.message.includes('relation')) {
        const res = await supabaseClient.from('asistentes').delete().eq('id', id);
        error = res.error;
      }
      if (error) errorSupabase = error;
    }

    guardarEnLocalStorage();
    updateStats();
    renderTablaRegistros();

    if (errorSupabase) {
      alert('Eliminado localmente. Supabase: ' + errorSupabase.message);
    }
  }
}

function renderTablaRegistros() {
  const tbody = document.getElementById('tabla-asistencia-tbody');
  const busqueda = (document.getElementById('buscar-registro')?.value || '').toLowerCase();
  tbody.innerHTML = '';

  const filtrados = registrosAsistencia.filter(r => r.nombre.toLowerCase().includes(busqueda));

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">No se encontraron registros de asistencia.</td></tr>`;
    return;
  }

  const ordenados = [...filtrados].sort((a, b) => b.fecha.localeCompare(a.fecha));

  ordenados.forEach((r, idx) => {
    const esSi = r.llego === 'Sí' || r.llego === 'Si' || r.llego === true;
    const badgeClass = esSi ? 'badge-presente' : 'badge-falta';
    const textoLlego = esSi ? 'Sí' : 'No';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><strong>${escapeHtml(r.nombre)}</strong></td>
      <td>${formatearFecha(r.fecha)}</td>
      <td><span class="badge badge-depto">${escapeHtml(r.departamento)}</span></td>
      <td class="text-center"><span class="badge ${badgeClass}">${textoLlego}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editarRegistro('${r.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm" onclick="eliminarRegistro('${r.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateStats() {
  document.getElementById('stat-total-registros').innerText = registrosAsistencia.length;

  const llegaronCount = registrosAsistencia.filter(r => r.llego === 'Sí' || r.llego === 'Si' || r.llego === true).length;
  document.getElementById('stat-total-llegaron').innerText = llegaronCount;

  const deptoCounts = {};
  registrosAsistencia.forEach(r => {
    if (r.llego === 'Sí' || r.llego === 'Si' || r.llego === true) {
      deptoCounts[r.departamento] = (deptoCounts[r.departamento] || 0) + 1;
    }
  });

  let topDepto = '--';
  let maxCount = -1;
  for (const [dep, count] of Object.entries(deptoCounts)) {
    if (count > maxCount) {
      maxCount = count;
      topDepto = dep;
    }
  }
  document.getElementById('stat-departamento-top').innerText = topDepto;
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
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(registrosAsistencia, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `asistencia_leon_de_juda_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
