// ============================================================
// GROWTH — la semana fija y el manejo de fechas
//
// Los 7 bloques son la columna vertebral del sistema.
// Viven aquí, en código, para que no se puedan mover sin querer.
// La semana empieza LUNES (índice 0) y termina DOMINGO (índice 6).
// ============================================================

// ── Áreas: los únicos cuatro colores del sistema ──
export const AREAS = {
  agro:     { id: 'agro',     label: 'Agro Horse', short: 'AGRO', cls: 'area-agro' },
  savia:    { id: 'savia',    label: 'Savia Café', short: 'SAVIA', cls: 'area-savia' },
  personal: { id: 'personal', label: 'Personal',   short: 'PERSONAL', cls: 'area-personal' }
};

export const AREA_LIST = [AREAS.agro, AREAS.savia, AREAS.personal];

export const PRIORITIES = {
  alta:  { id: 'alta',  label: 'Alta' },
  media: { id: 'media', label: 'Media' },
  baja:  { id: 'baja',  label: 'Baja' }
};

// ── Con qué se conecta un bloque ──
// Esto es lo que hace que el día "sepa" qué enseñarte: el lunes
// los hitos del inventario, el martes el pipeline de training.
// Si mueves un bloque de día, la conexión se va con él.
export const FOCUS_LIST = [
  { id: 'inventario',     label: 'Proyecto de inventario',  area: 'agro'  },
  { id: 'training-teach', label: 'Training · enseñar',       area: 'agro'  },
  { id: 'training-exec',  label: 'Training · ejecutar',      area: 'agro'  },
  { id: 'content-agro',   label: 'Contenido Agro Horse',     area: 'agro'  },
  { id: 'content-savia',  label: 'Contenido Savia',          area: 'savia' },
  { id: 'review',         label: 'Revisión semanal',         area: 'personal' },
  { id: 'report-agro',    label: 'Reporte Agro Horse',       area: 'agro'  },
  { id: 'report-savia',   label: 'Reporte Savia',            area: 'savia' }
];

export function focusLabel(id) {
  const f = FOCUS_LIST.find((x) => x.id === id);
  return f ? f.label : id;
}

// ── Los 7 bloques de fábrica, lunes a domingo ──
// Se pueden cambiar desde Sistema. El día de la semana no:
// siempre hay un bloque por día. Eso no es negociable.
export const DEFAULT_BLOCKS = [
  {
    day: 'Lunes', area: 'agro', altArea: null,
    title: 'Inventario y sistema nuevo',
    purpose: 'Mover el proyecto grande. Sin este bloque, el proyecto se estanca y nadie lo nota hasta que es tarde.',
    focus: ['inventario']
  },
  {
    day: 'Martes', area: 'agro', altArea: null,
    title: 'Training al equipo — enseñar',
    purpose: 'Enseñas el tema. No lo ejecutas tú: lo explicas para que el jueves ellos lo hagan solos.',
    focus: ['training-teach']
  },
  {
    day: 'Miércoles', area: 'agro', altArea: null,
    title: 'Contenido Agro Horse — batch',
    purpose: 'Un día de grabación produce 3–4 semanas de material. No grabes para esta semana.',
    focus: ['content-agro']
  },
  {
    day: 'Jueves', area: 'agro', altArea: null,
    title: 'Training al equipo — ejecutar y documentar',
    purpose: 'Ellos ejecutan lo del martes y de ahí sale el proceso escrito. El proceso escrito es la meta real.',
    focus: ['training-exec']
  },
  {
    day: 'Viernes', area: 'agro', altArea: null,
    title: 'Inventario y sistema nuevo',
    purpose: 'Segundo empuje de la semana al proyecto grande. Cierra lo que quedó abierto el lunes.',
    focus: ['inventario']
  },
  {
    day: 'Sábado', area: 'savia', altArea: 'agro',
    title: 'Contenido Savia — batch + reporte Agro Horse',
    purpose: 'Grabas el batch de Savia y cierras la semana de Agro Horse con su reporte.',
    focus: ['content-savia', 'report-agro']
  },
  {
    day: 'Domingo', area: 'savia', altArea: null,
    title: 'Revisión semanal + reporte Savia',
    purpose: 'Los 30 minutos que hacen que el resto funcione. Vacías la cabeza y escribes las 3 prioridades de la semana que viene.',
    focus: ['review', 'report-savia']
  }
];

// Los bloques que están en uso ahora mismo.
// Arrancan como los de fábrica y los ajustes los sobrescriben.
let activeBlocks = DEFAULT_BLOCKS.map((b) => ({ ...b }));

/** Campos que el usuario puede cambiar. El día no está aquí a propósito. */
const EDITABLE = ['title', 'purpose', 'area', 'altArea', 'focus'];

/**
 * Aplica los bloques guardados encima de los de fábrica.
 * Pasar null vuelve todo a los originales.
 */
export function setBlocks(saved) {
  activeBlocks = DEFAULT_BLOCKS.map((base, i) => {
    const over = Array.isArray(saved) ? saved[i] : null;
    const merged = { ...base };
    if (over) {
      EDITABLE.forEach((k) => {
        if (over[k] !== undefined) merged[k] = over[k];
      });
    }
    merged.day = base.day;                                   // el día nunca cambia
    if (!Array.isArray(merged.focus)) merged.focus = [];
    return merged;
  });
}

export function getBlocks() { return activeBlocks; }

/** ¿Este bloque sigue igual que el de fábrica? */
export function isDefaultBlock(i) {
  const a = activeBlocks[i], b = DEFAULT_BLOCKS[i];
  return EDITABLE.every((k) => JSON.stringify(a[k] ?? null) === JSON.stringify(b[k] ?? null));
}

/** Solo los campos editables, listos para guardar. */
export function blocksToSave(blocks) {
  return blocks.map((b) => ({
    title: b.title, purpose: b.purpose,
    area: b.area, altArea: b.altArea || null,
    focus: Array.isArray(b.focus) ? b.focus : []
  }));
}

export const DOW_SHORT = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
export const DOW_LONG  = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const MONTHS     = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const MONTHS_LONG = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

// ============================================================
// FECHAS
// Todo se maneja en hora local del navegador (Puerto Rico).
// El formato de guardado siempre es "YYYY-MM-DD".
// ============================================================

/** Convierte un Date a "YYYY-MM-DD" usando la fecha local, no UTC. */
export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Convierte "YYYY-MM-DD" a un Date local al mediodía (evita saltos de zona horaria). */
export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function todayISO() {
  return toISO(new Date());
}

/** Índice de día con la semana empezando en lunes: 0 = lunes … 6 = domingo. */
export function dowIndex(iso) {
  return (fromISO(iso).getDay() + 6) % 7;
}

export function addDays(iso, n) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** El lunes de la semana a la que pertenece esa fecha. */
export function weekStart(iso) {
  return addDays(iso, -dowIndex(iso));
}

/** Los 7 días (lunes→domingo) de la semana de esa fecha. */
export function weekDays(iso) {
  const start = weekStart(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Identificador de semana tipo "2026-W34" (norma ISO 8601). */
export function weekId(iso) {
  const d = fromISO(iso);
  // El jueves de esa semana define a qué año pertenece
  const thursday = new Date(d);
  thursday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
  const year = thursday.getFullYear();
  const jan1 = new Date(year, 0, 1, 12, 0, 0, 0);
  const week = 1 + Math.round((thursday - jan1) / 86400000 / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** "Lunes 18 de agosto" */
export function formatLong(iso) {
  const d = fromISO(iso);
  return `${DOW_LONG[dowIndex(iso)]} ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`;
}

/** "18 AGO 2026" */
export function formatStamp(iso) {
  const d = fromISO(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()].toUpperCase()} ${d.getFullYear()}`;
}

/** Cuántos días hay de a hasta b (positivo = b está en el futuro). */
export function daysBetween(a, b) {
  return Math.round((fromISO(b) - fromISO(a)) / 86400000);
}

/** "Hoy", "Mañana", "Ayer" o null si está más lejos. */
export function relativeDay(iso, ref = todayISO()) {
  const diff = daysBetween(ref, iso);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  return null;
}

/** El bloque que le toca a esa fecha. */
export function blockFor(iso) {
  return activeBlocks[dowIndex(iso)];
}

/** Clase CSS del color de un área. */
export function areaClass(areaId) {
  return (AREAS[areaId] && AREAS[areaId].cls) || '';
}

/** Hora "14:30" a "2:30 PM". */
export function formatTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Minutos a "1H 30M". */
export function formatDuration(min) {
  if (!min) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}H ${m}M`;
  if (h) return `${h}H`;
  return `${m}M`;
}
