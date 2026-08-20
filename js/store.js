// ============================================================
// GROWTH — capa de datos
//
// Todo cuelga de users/{uid}/… para que el candado de Firestore
// sea una sola regla. Firestore mantiene una copia local, así que
// la app abre al instante y funciona sin internet.
// ============================================================

import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc,
  onSnapshot, query, where, writeBatch, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

import { db } from './firebase.js';
import { weekDays, dowIndex, setBlocks, blocksToSave } from './schedule.js';

let uid = null;

export function setUser(u) { uid = u; }
export function getUid() { return uid; }

const C = (name) => collection(db, 'users', uid, name);
const D = (name, id) => doc(db, 'users', uid, name, id);

// ============================================================
// ESTADO EN MEMORIA
// Lo que hay ahora mismo en pantalla. Se actualiza solo cuando
// cambian los datos, vengan de este dispositivo o de otro.
// ============================================================

export const state = {
  tasks:      [],          // tareas sueltas de la semana visible
  routines:   [],          // tareas recurrentes (plantillas)
  logs:       new Map(),   // "routineId__fecha" → true si está hecha
  categories: [],          // tus categorías de tarea
  settings:   {},
  ready:      false
};

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach((fn) => fn()); }

// ============================================================
// SUSCRIPCIONES
// ============================================================

let unsubs = [];
let errorHandler = () => {};

export function onError(fn) { errorHandler = fn; }

function stopAll() {
  unsubs.forEach((u) => { try { u(); } catch (_) {} });
  unsubs = [];
}

/**
 * Escucha la semana que contiene esa fecha.
 * Se llama otra vez al cambiar de semana: cierra lo viejo y abre lo nuevo.
 */
export function watchWeek(anchorISO) {
  stopAll();
  state.ready = false;

  const days  = weekDays(anchorISO);
  const start = days[0];
  const end   = days[6];

  let pending = 4;
  const settle = () => { if (--pending === 0) { state.ready = true; } emit(); };
  const fail = (e) => { console.error('[store]', e); errorHandler(e); settle(); };

  // Tareas del rango de la semana
  unsubs.push(onSnapshot(
    query(C('tasks'), where('date', '>=', start), where('date', '<=', end)),
    (snap) => {
      state.tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      settle();
    },
    fail
  ));

  // Plantillas recurrentes (son pocas, se traen todas)
  unsubs.push(onSnapshot(
    C('routines'),
    (snap) => {
      state.routines = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => r.active !== false);
      settle();
    },
    fail
  ));

  // Marcas de recurrentes completadas en esa semana
  unsubs.push(onSnapshot(
    query(C('routineLogs'), where('date', '>=', start), where('date', '<=', end)),
    (snap) => {
      state.logs = new Map();
      snap.docs.forEach((d) => {
        const v = d.data();
        if (v.done) state.logs.set(`${v.routineId}__${v.date}`, true);
      });
      settle();
    },
    fail
  ));

  // Tus categorías de tarea (son pocas, se traen todas)
  unsubs.push(onSnapshot(
    C('categories'),
    (snap) => {
      state.categories = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.createdMs || 0) - (b.createdMs || 0));
      settle();
    },
    fail
  ));

  // Ajustes (documento único). Aquí viven los bloques editados:
  // en cuanto cambian, la semana entera se repinta sola.
  unsubs.push(onSnapshot(
    D('settings', 'main'),
    (snap) => {
      state.settings = snap.exists() ? snap.data() : {};
      setBlocks(state.settings.blocks || null);
      emit();
    },
    fail
  ));
}

export function stopWatching() { stopAll(); }

// ============================================================
// LECTURA — lo que se pinta en pantalla
// ============================================================

/**
 * Las tareas de un día: las sueltas más las recurrentes que
 * caen en ese día de la semana, ya mezcladas y ordenadas.
 */
export function tasksForDay(iso) {
  const dow = dowIndex(iso);

  const once = state.tasks
    .filter((t) => t.date === iso)
    .map((t) => ({ ...t, kind: 'task' }));

  const repeated = state.routines
    .filter((r) => Array.isArray(r.days) && r.days.includes(dow))
    .map((r) => ({
      ...r,
      kind: 'routine',
      date: iso,
      done: state.logs.get(`${r.id}__${iso}`) === true
    }));

  return [...once, ...repeated].sort(compareTasks);
}

/** Primero las que tienen hora, después por prioridad, después por orden de creación. */
function compareTasks(a, b) {
  if (a.done !== b.done) return a.done ? 1 : -1;

  const at = a.time || '';
  const bt = b.time || '';
  if (at && bt && at !== bt) return at < bt ? -1 : 1;
  if (at && !bt) return -1;
  if (!at && bt) return 1;

  const rank = { alta: 0, media: 1, baja: 2 };
  const ap = rank[a.priority] ?? 1;
  const bp = rank[b.priority] ?? 1;
  if (ap !== bp) return ap - bp;

  return (a.createdMs || 0) - (b.createdMs || 0);
}

/** { done, total } de un día. */
export function progressForDay(iso) {
  const items = tasksForDay(iso);
  return { done: items.filter((t) => t.done).length, total: items.length };
}

// ============================================================
// ESCRITURA
// ============================================================

/**
 * Todos los campos, siempre, incluso los vacíos.
 * Si escribiéramos solo lo que tiene valor, borrar la hora de una
 * tarea no la borraría de verdad: se quedaría la vieja.
 */
function fields(data) {
  return {
    title:       (data.title || '').trim(),
    notes:       (data.notes || '').trim(),
    time:        data.time || '',
    durationMin: data.durationMin ? Number(data.durationMin) : null,
    area:        data.area || 'agro',
    priority:    data.priority || 'media',
    // Se guarda el NOMBRE, no una referencia. Así, si borras una
    // categoría, las tareas viejas siguen enseñando la suya.
    categories:  Array.isArray(data.categories) ? data.categories : [],
    source:      data.source || 'manual',
    sourceId:    data.sourceId || null
  };
}

/**
 * Guarda una tarea. Si trae días de repetición se guarda como
 * rutina (plantilla); si no, como tarea de un día.
 */
export async function saveTask(data, existing = null) {
  const isRoutine = Array.isArray(data.days) && data.days.length > 0;
  const base = fields(data);

  // ── Cambió de tipo: hay que mudar el documento de colección ──
  if (existing && existing.kind === 'routine' && !isRoutine) {
    await deleteRoutine(existing.id);
    return createOnce(base, data.date);
  }
  if (existing && existing.kind === 'task' && isRoutine) {
    await deleteDoc(D('tasks', existing.id));
    return createRoutine(base, data.days);
  }

  if (isRoutine) {
    if (existing) {
      await updateDoc(D('routines', existing.id), { ...base, days: data.days });
      return existing.id;
    }
    return createRoutine(base, data.days);
  }

  if (existing) {
    await updateDoc(D('tasks', existing.id), { ...base, date: data.date });
    return existing.id;
  }
  return createOnce(base, data.date);
}

async function createOnce(base, date) {
  const ref = await addDoc(C('tasks'), {
    ...base,
    date,
    done: false,
    createdMs: Date.now(),
    createdAt: serverTimestamp()
  });
  return ref.id;
}

async function createRoutine(base, days) {
  const ref = await addDoc(C('routines'), {
    ...base,
    days,
    active: true,
    createdMs: Date.now(),
    createdAt: serverTimestamp()
  });
  return ref.id;
}

/** Marca o desmarca. Las recurrentes se marcan por día, no de una vez para siempre. */
export async function setDone(item, done) {
  if (item.kind === 'routine') {
    const id = `${item.id}__${item.date}`;
    await setDoc(D('routineLogs', id), {
      routineId: item.id,
      date: item.date,
      done,
      doneAt: done ? serverTimestamp() : null
    });
    return;
  }
  await updateDoc(D('tasks', item.id), {
    done,
    doneAt: done ? serverTimestamp() : null
  });
}

/** Mueve una tarea a otro día. Las recurrentes no se mueven: se editan sus días. */
export function moveTask(item, newDate) {
  if (item.kind === 'routine') return Promise.resolve();
  return updateDoc(D('tasks', item.id), { date: newDate });
}

export function deleteTask(item) {
  if (item.kind === 'routine') return deleteRoutine(item.id);
  return deleteDoc(D('tasks', item.id));
}

/** Borra la rutina y sus marcas de días completados. */
async function deleteRoutine(routineId) {
  await deleteDoc(D('routines', routineId));
  const stale = [...state.logs.keys()].filter((k) => k.startsWith(routineId + '__'));
  if (!stale.length) return;
  const batch = writeBatch(db);
  stale.forEach((k) => batch.delete(D('routineLogs', k)));
  await batch.commit();
}

// ============================================================
// CATEGORÍAS
// El área dice para quién es la tarea (y le da el color).
// La categoría dice qué tipo de trabajo es. Sin color, a propósito.
// ============================================================

/** Crea una categoría. Devuelve null si ya existe una con ese nombre. */
export async function addCategory(name) {
  const clean = (name || '').trim();
  if (!clean) return null;

  const dupe = state.categories.some(
    (c) => (c.name || '').toLowerCase() === clean.toLowerCase()
  );
  if (dupe) return null;

  const ref = await addDoc(C('categories'), {
    name: clean,
    createdMs: Date.now(),
    createdAt: serverTimestamp()
  });
  return ref.id;
}

/**
 * Borra una categoría de la lista.
 * Las tareas que ya la tenían la conservan escrita: no se rompe el historial.
 */
export function deleteCategory(id) {
  return deleteDoc(D('categories', id));
}

/** Cuántas tareas de la semana visible usan esa categoría. */
export function categoryUsage(name) {
  const hit = (t) => Array.isArray(t.categories) && t.categories.includes(name);
  return state.tasks.filter(hit).length + state.routines.filter(hit).length;
}

// ============================================================
// AJUSTES
// ============================================================

export function saveSettings(patch) {
  return setDoc(D('settings', 'main'), patch, { merge: true });
}

/** Guarda los 7 bloques editados. */
export function saveBlocks(blocks) {
  return saveSettings({ blocks: blocksToSave(blocks) });
}

/** Vuelve a los bloques de fábrica. */
export function resetBlocks() {
  return saveSettings({ blocks: null });
}

export async function loadSettingsOnce() {
  const snap = await getDoc(D('settings', 'main'));
  return snap.exists() ? snap.data() : {};
}
