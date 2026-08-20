// ============================================================
// GROWTH — ajustes
// Fase 1: cuenta, estado del sistema y salir.
// ============================================================

import { el, clear, toast, confirmModal, empty } from '../ui.js';
import { logout } from '../firebase.js';
import { getUid, resetBlocks, state, addCategory, deleteCategory, categoryUsage } from '../store.js';
import { getBlocks, isDefaultBlock, focusLabel, areaClass } from '../schedule.js';
import { openBlockForm } from '../blockform.js';
import { firebaseConfig, OWNER_EMAIL } from '../config.js';

const RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null
        && request.auth.uid == uid
        && request.auth.token.email == '${OWNER_EMAIL}';
    }
  }
}`;

export function renderAjustes(root, ctx) {
  clear(root);

  const user = ctx.user || {};

  root.append(el('div', { class: 'today-head' }, [
    el('span', { class: 'today-date', text: 'Sistema' })
  ]));

  const grid = el('div', { class: 'today-grid' });
  const main = el('div', { class: 'col-main' });
  const side = el('div', { class: 'col-side' });
  grid.append(main, side);
  root.append(grid);

  // ── La semana ──
  main.append(renderWeekPanel());

  // ── Categorías ──
  main.append(renderCategoryPanel());

  // ── Cuenta ──
  main.append(el('section', { class: 'panel' }, [
    el('div', { class: 'panel-head' }, [el('span', { class: 'lbl', text: 'Cuenta' })]),
    el('div', { class: 'panel-body' }, [
      kv('Correo', user.email || '—'),
      kv('Proyecto', firebaseConfig.projectId || '—'),
      kv('ID interno', getUid() || '—'),
      el('button', {
        class: 'btn btn-danger btn-block',
        style: { marginTop: 'var(--s4)' },
        text: 'Cerrar sesión',
        onClick: () => confirmModal({
          title: 'Cerrar sesión',
          message: 'Tus datos siguen guardados. Vas a tener que entrar otra vez con Google.',
          confirmText: 'Cerrar sesión',
          onConfirm: () => logout()
        })
      })
    ])
  ]));

  // ── Reglas de seguridad ──
  main.append(el('section', { class: 'panel' }, [
    el('div', { class: 'panel-head' }, [
      el('span', { class: 'lbl', text: 'Candado de la base de datos' }),
      el('div', { class: 'panel-head-actions' }, [
        el('button', {
          class: 'btn btn-ghost',
          text: 'Copiar',
          onClick: async () => {
            try { await navigator.clipboard.writeText(RULES); toast('Copiado'); }
            catch (_) { toast('No se pudo copiar'); }
          }
        })
      ])
    ]),
    el('div', { class: 'panel-body' }, [
      el('p', {
        style: { margin: '0 0 var(--s3)', fontSize: 'var(--fs-small)', color: 'var(--text-dim)', lineHeight: '1.6' },
        text: 'Pega esto en Firebase → Firestore Database → Rules → Publish. Sin esto, cualquiera con el enlace podría leer tus datos.'
      }),
      el('pre', { class: 'code', text: RULES })
    ])
  ]));

  // ── Estado ──
  side.append(el('section', { class: 'panel ticked area-now' }, [
    el('div', { class: 'panel-head' }, [el('span', { class: 'lbl', text: 'Estado' })]),
    el('div', { class: 'panel-body' }, [
      kv('Fase', '1 · Esqueleto'),
      kv('Conexión', navigator.onLine ? 'En línea' : 'Sin internet'),
      kv('Guardado', 'Firestore + caché local')
    ])
  ]));

  // ── Qué falta ──
  side.append(el('section', { class: 'panel' }, [
    el('div', { class: 'panel-head' }, [el('span', { class: 'lbl', text: 'Lo que viene' })]),
    el('div', { class: 'panel-body' }, [
      el('ol', { class: 'steps' }, [
        li('Fase 2', 'Las 3 prioridades, bandeja de captura, planificador semanal y la revisión del domingo.'),
        li('Fase 3', 'Training, contenido por negocio, inventario y la sección personal.'),
        li('Fase 4', 'Reportes de cumplimiento e histórico.'),
        li('Fase 5', 'Instalable en el celular y notificaciones.'),
        li('Fase 6', 'Google Calendar.')
      ])
    ])
  ]));
}

// ============================================================
// LA SEMANA — los 7 bloques
// ============================================================

function renderWeekPanel() {
  const blocks = getBlocks();
  const changed = blocks.filter((_, i) => !isDefaultBlock(i)).length;

  const list = el('div', { class: 'weeklist' });

  blocks.forEach((b, i) => {
    const links = (b.focus || []).map(focusLabel).join(' · ');

    list.append(el('button', {
      class: `weekrow ${areaClass(b.area)}`,
      'aria-label': `Editar el bloque de ${b.day}`,
      onClick: () => openBlockForm(i)
    }, [
      el('span', { class: 'weekrow-day', text: b.day.slice(0, 3) }),
      el('span', { class: 'weekrow-main' }, [
        el('span', { class: 'weekrow-title', text: b.title }),
        el('span', {
          class: 'weekrow-focus',
          text: links || 'Sin conexión a ningún pipeline'
        })
      ]),
      !isDefaultBlock(i) ? el('span', { class: 'weekrow-edited', text: 'Editado' }) : null,
      el('span', { class: 'weekrow-go', text: '›', 'aria-hidden': 'true' })
    ]));
  });

  return el('section', { class: 'panel' }, [
    el('div', { class: 'panel-head' }, [
      el('span', { class: 'lbl', text: 'La semana' }),
      el('div', { class: 'panel-head-actions' }, [
        changed ? el('span', { class: 'lbl', text: `${changed} editado${changed > 1 ? 's' : ''}` }) : null,
        changed ? el('button', {
          class: 'btn btn-ghost',
          text: '↺ Todo de fábrica',
          onClick: () => confirmModal({
            title: 'Volver a los bloques originales',
            message: 'Los 7 bloques vuelven a como estaban al principio. Tus tareas no se tocan.',
            confirmText: 'Restaurar los 7',
            onConfirm: async () => {
              try { await resetBlocks(); toast('Semana restaurada'); }
              catch (e) { console.error(e); toast('No se pudo restaurar'); }
            }
          })
        }) : null
      ])
    ]),
    el('div', { class: 'panel-body' }, [
      el('p', {
        style: { margin: '0 0 var(--s3)', fontSize: 'var(--fs-small)', color: 'var(--text-dim)', lineHeight: '1.6' },
        text: 'Siempre hay un bloque por día — eso no cambia. Lo que cambia es qué es, de quién es y qué te abre cuando llega el día. Toca uno para editarlo.'
      })
    ]),
    el('div', { class: 'panel-body flush' }, [list])
  ]);
}

// ============================================================
// CATEGORÍAS
// ============================================================

function renderCategoryPanel() {
  const cats = state.categories;
  const list = el('div', {});

  if (!cats.length) {
    list.append(empty(
      'Sin categorías',
      'El área dice de quién es la tarea. La categoría dice qué tipo de trabajo es: grabación, llamadas, papeleo, mantenimiento. Créalas aquí o desde cualquier tarea.'
    ));
  } else {
    cats.forEach((c) => {
      const used = categoryUsage(c.name);
      list.append(el('div', { class: 'catrow' }, [
        el('span', { class: 'catrow-name', text: c.name }),
        el('span', {
          class: 'catrow-use',
          text: used ? `${used} esta semana` : 'Sin uso'
        }),
        el('button', {
          class: 'btn btn-ghost btn-icon',
          'aria-label': `Borrar la categoría ${c.name}`,
          text: '✕',
          onClick: () => confirmModal({
            title: `Borrar "${c.name}"`,
            message: 'Sale de la lista, pero las tareas que ya la tenían la conservan escrita. Tu historial no se toca.',
            confirmText: 'Borrar de la lista',
            onConfirm: async () => {
              try { await deleteCategory(c.id); toast('Categoría borrada'); }
              catch (e) { console.error(e); toast('No se pudo borrar'); }
            }
          })
        })
      ]));
    });
  }

  // ── Crear ──
  const input = el('input', {
    class: 'input', type: 'text', maxlength: '40',
    placeholder: 'Nombre de la categoría'
  });

  const create = async () => {
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    try {
      const id = await addCategory(name);
      if (id === null) { toast('Ya tienes una con ese nombre'); return; }
      input.value = '';
      toast('Categoría creada');
    } catch (e) {
      console.error(e);
      toast('No se pudo crear');
    }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); create(); }
  });

  return el('section', { class: 'panel' }, [
    el('div', { class: 'panel-head' }, [
      el('span', { class: 'lbl', text: 'Categorías de tarea' }),
      el('div', { class: 'panel-head-actions' }, [
        cats.length ? el('span', { class: 'lbl num', text: String(cats.length) }) : null
      ])
    ]),
    el('div', { class: 'panel-body flush' }, [list]),
    el('div', { class: 'panel-body' }, [
      el('div', { class: 'catnew' }, [
        input,
        el('button', { class: 'btn btn-primary', text: 'Crear', onClick: create })
      ])
    ])
  ]);
}

function kv(label, value) {
  return el('div', { class: 'kv' }, [
    el('span', { class: 'lbl', text: label }),
    el('span', { class: 'kv-val', text: value })
  ]);
}

function li(strong, rest) {
  return el('li', {}, [el('strong', { text: strong + ' — ' }), rest]);
}
