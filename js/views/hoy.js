// ============================================================
// GROWTH — vista del día
//
// Qué bloque toca, para qué sirve, y las tareas detalladas.
// Lo personal va mezclado con lo de negocio, marcado por color.
// ============================================================

import { el, clear, meter, chip, empty, toast, confirmModal } from '../ui.js';
import {
  AREAS, blockFor, formatStamp, relativeDay, todayISO,
  formatTime, formatDuration, areaClass, dowIndex, DOW_LONG,
  FOCUS_LIST, focusLabel
} from '../schedule.js';
import { tasksForDay, progressForDay, setDone, deleteTask } from '../store.js';
import { openTaskForm } from '../taskform.js';
import { openBlockForm } from '../blockform.js';

export function renderHoy(root, ctx) {
  const date  = ctx.date;
  const block = blockFor(date);
  const isToday = date === todayISO();
  const items = tasksForDay(date);
  const prog  = progressForDay(date);

  clear(root);

  // ── Encabezado ──
  const rel = relativeDay(date);
  root.append(el('div', { class: 'today-head' }, [
    el('span', { class: 'today-date', text: formatStamp(date) }),
    rel ? chip(rel, isToday ? 'area-now' : '', !isToday) : chip(DOW_LONG[dowIndex(date)], '', true),
    !isToday ? el('button', {
      class: 'btn btn-ghost today-back',
      text: '← Volver a hoy',
      onClick: () => ctx.setDate(todayISO())
    }) : null
  ]));

  // ── Rejilla ──
  const main = el('div', { class: 'col-main' });
  const side = el('div', { class: 'col-side' });
  root.append(el('div', { class: 'today-grid' }, [main, side]));

  // ── Tarjeta del bloque ──
  main.append(renderBlock(block, date));

  // ── Panel de tareas ──
  const list = el('div', { class: 'tasklist' });

  if (items.length === 0) {
    list.append(empty(
      'Día vacío',
      'Escribe con detalle qué vas a hacer. Una tarea con notas claras se ejecuta; una tarea vaga se pospone.'
    ));
  } else {
    items.forEach((item) => list.append(renderTask(item, date, ctx)));
  }

  main.append(el('section', { class: 'panel' }, [
    el('div', { class: 'panel-head' }, [
      el('span', { class: 'lbl', text: 'Tareas del día' }),
      el('div', { class: 'panel-head-actions' }, [
        el('span', {
          class: 'lbl num',
          text: items.length ? `${prog.done}/${prog.total}` : ''
        }),
        el('button', {
          class: 'btn btn-primary',
          text: '+ Añadir',
          onClick: () => openTaskForm(date, null, { defaultArea: block.area })
        })
      ])
    ]),
    el('div', { class: 'panel-body flush' }, [list])
  ]));

  // ── Progreso ──
  side.append(el('section', { class: `panel ticked ${areaClass(block.area)}` }, [
    el('div', { class: 'panel-head' }, [
      el('span', { class: 'lbl', text: 'Progreso del día' })
    ]),
    el('div', { class: 'panel-body' }, [
      meter({
        done: prog.done,
        total: prog.total,
        areaCls: areaClass(block.area),
        segments: 20
      }),
      el('p', {
        style: { margin: 'var(--s4) 0 0', fontSize: 'var(--fs-small)', color: 'var(--text-dim)', lineHeight: '1.55' },
        text: progressMessage(prog)
      })
    ])
  ]));

  // ── Números del día ──
  side.append(renderStats(items));
}

// ============================================================
// PIEZAS
// ============================================================

function renderBlock(block, date) {
  const chips = [chip(AREAS[block.area].label, areaClass(block.area))];
  if (block.altArea) chips.push(chip(AREAS[block.altArea].label, areaClass(block.altArea)));

  // Lo que este día te abre. En la Fase 1 solo se nombra;
  // desde la Fase 3 cada uno trae su pipeline aquí mismo.
  const links = (block.focus || []).map((f) => {
    const meta = FOCUS_LIST.find((x) => x.id === f);
    return el('span', {
      class: `blocklink ${areaClass(meta ? meta.area : block.area)}`,
      text: focusLabel(f)
    });
  });

  return el('section', { class: `blockcard ${areaClass(block.area)}` }, [
    el('div', { class: 'blockcard-top' }, [
      el('span', { class: 'lbl', text: `Bloque · ${block.day}` }),
      ...chips,
      el('button', {
        class: 'blockcard-edit',
        'aria-label': `Editar el bloque de ${block.day}`,
        text: '✎ Editar',
        onClick: () => openBlockForm(dowIndex(date))
      })
    ]),
    el('h2', { class: 'blockcard-title', text: block.title }),
    block.purpose ? el('p', { class: 'blockcard-purpose', text: block.purpose }) : null,
    links.length ? el('div', { class: 'blockcard-links' }, links) : null
  ]);
}

function renderTask(item, date, ctx) {
  const cls = areaClass(item.area || 'agro');

  const check = el('button', {
    class: 'task-check',
    role: 'checkbox',
    'aria-checked': String(Boolean(item.done)),
    'aria-label': (item.done ? 'Desmarcar: ' : 'Marcar: ') + (item.title || ''),
    onClick: async () => {
      const next = !item.done;
      check.setAttribute('aria-checked', String(next)); // respuesta inmediata
      try {
        await setDone(item, next);
      } catch (e) {
        console.error(e);
        check.setAttribute('aria-checked', String(item.done));
        toast('No se pudo guardar');
      }
    }
  });

  const meta = [];
  if (item.time)        meta.push(el('span', { class: 'm-time', text: formatTime(item.time) }));
  if (item.durationMin) meta.push(el('span', { text: formatDuration(item.durationMin) }));
  if (item.priority === 'alta') meta.push(el('span', { class: 'm-prio-alta', text: '▲ Alta' }));
  meta.push(el('span', { class: 'm-area', text: (AREAS[item.area] || AREAS.agro).short }));
  if (item.kind === 'routine') meta.push(el('span', { text: '↻ Cada semana' }));
  (item.categories || []).forEach((c) => meta.push(el('span', { class: 'm-cat', text: c })));

  const openEdit = () => openTaskForm(date, item);

  return el('div', { class: `task ${cls}${item.done ? ' done' : ''}` }, [
    check,
    el('div', { class: 'task-main' }, [
      el('div', {
        class: 'task-title',
        text: item.title || '(sin título)',
        role: 'button',
        tabindex: '0',
        onClick: openEdit,
        onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(); } }
      }),
      item.notes ? el('div', { class: 'task-notes', text: item.notes }) : null,
      meta.length ? el('div', { class: 'task-meta' }, meta) : null
    ]),
    el('button', {
      class: 'task-del',
      'aria-label': 'Borrar tarea',
      text: '✕',
      onClick: () => {
        confirmModal({
          title: 'Borrar tarea',
          message: item.kind === 'routine'
            ? `"${item.title}" es recurrente: se borra de todos los días.`
            : `Se borra "${item.title}". No se puede deshacer.`,
          onConfirm: async () => {
            try { await deleteTask(item); toast('Borrada'); }
            catch (e) { console.error(e); toast('No se pudo borrar'); }
          }
        });
      }
    })
  ]);
}

function renderStats(items) {
  const totalMin = items.reduce((s, t) => s + (t.durationMin || 0), 0);
  const pendMin  = items.filter((t) => !t.done).reduce((s, t) => s + (t.durationMin || 0), 0);
  const altas    = items.filter((t) => t.priority === 'alta' && !t.done).length;
  const personal = items.filter((t) => t.area === 'personal').length;

  const stat = (label, value, sub, cls = '') =>
    el('div', { class: `stat ${cls}` }, [
      el('span', { class: 'lbl', text: label }),
      el('div', { class: 'stat-val', text: value }),
      sub ? el('div', { class: 'stat-sub', text: sub }) : null
    ]);

  return el('div', { class: 'statrow' }, [
    stat('Tiempo', totalMin ? formatDuration(totalMin) : '—', pendMin ? `${formatDuration(pendMin)} pendiente` : 'Estimado'),
    stat('Alta', String(altas), 'Sin cerrar', altas > 0 ? 'area-savia' : ''),
    stat('Personal', String(personal), 'Tareas tuyas', 'area-personal')
  ]);
}

function progressMessage({ done, total }) {
  if (total === 0) return 'Todavía no has escrito nada para este día.';
  if (done === 0)  return 'Nada cerrado aún. Empieza por la de arriba.';
  if (done === total) return 'Día cerrado completo.';
  const left = total - done;
  return `Quedan ${left} ${left === 1 ? 'tarea' : 'tareas'} por cerrar.`;
}
