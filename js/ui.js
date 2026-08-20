// ============================================================
// GROWTH — piezas visuales reutilizables
// ============================================================

/** Crea un elemento. props acepta: class, text, html, attrs sueltos y on* para eventos. */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);

  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }

  for (const c of [].concat(children)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(typeof c === 'string' || typeof c === 'number' ? String(c) : c);
  }
  return node;
}

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

// ============================================================
// MEDIDOR SEGMENTADO — el indicador principal de progreso
// ============================================================

export function meter({ done, total, label, areaCls = '', segments = 20 }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const on  = total > 0 ? Math.round((done / total) * segments) : 0;

  const track = el('div', { class: 'meter-track', role: 'progressbar',
    'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100,
    'aria-label': label || 'Progreso' });

  for (let i = 0; i < segments; i++) {
    track.append(el('i', { class: 'meter-seg' + (i < on ? ' on' : '') }));
  }

  return el('div', { class: `meter ${areaCls}` }, [
    label ? el('div', { class: 'lbl', text: label }) : null,
    el('div', { class: 'meter-top' }, [
      el('span', { class: 'meter-value', text: String(done) }),
      el('span', { class: 'meter-of', text: `/ ${total}` }),
      el('span', { class: 'meter-pct', text: `${pct}%` })
    ]),
    track
  ]);
}

/** Barra continua simple. */
export function bar(pct, areaCls = '') {
  const clamped = Math.max(0, Math.min(100, Math.round(pct || 0)));
  return el('div', { class: `bar ${areaCls}` }, [
    el('i', { style: { width: clamped + '%' } })
  ]);
}

/** Chip con punto de color. */
export function chip(text, areaCls = '', plain = false) {
  return el('span', { class: `chip ${areaCls}${plain ? ' plain' : ''}`, text });
}

/** Bloque de estado vacío. */
export function empty(mark, message) {
  return el('div', { class: 'empty' }, [
    el('div', { class: 'empty-mark', text: mark }),
    el('p', { text: message })
  ]);
}

// ============================================================
// MODAL
// ============================================================

let openModal = null;

/**
 * Abre un panel modal.
 * body: nodo con el contenido. footer: array de botones.
 * Devuelve { close } por si quieres cerrarlo desde afuera.
 */
export function modal({ title, body, footer = [], onClose }) {
  closeModal();

  const panel = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, [
    el('div', { class: 'modal-head' }, [
      el('div', { class: 'lbl', text: title }),
      el('button', { class: 'modal-close', 'aria-label': 'Cerrar', text: '✕', onClick: () => closeModal() })
    ]),
    el('div', { class: 'modal-body' }, [body]),
    footer.length ? el('div', { class: 'modal-foot' }, footer) : null
  ]);

  const backdrop = el('div', { class: 'modal-backdrop' }, [panel]);

  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) closeModal();
  });

  const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
  document.addEventListener('keydown', onKey);

  openModal = {
    node: backdrop,
    cleanup: () => { document.removeEventListener('keydown', onKey); if (onClose) onClose(); }
  };

  $('#modal-root').append(backdrop);
  document.body.style.overflow = 'hidden';

  // Enfoca el primer campo, pero no en celular (levanta el teclado de golpe)
  if (window.innerWidth >= 900) {
    const first = panel.querySelector('input, textarea, select');
    if (first) first.focus();
  }

  return { close: closeModal, panel };
}

export function closeModal() {
  if (!openModal) return;
  openModal.node.remove();
  openModal.cleanup();
  openModal = null;
  document.body.style.overflow = '';
}

/** Confirmación de una sola pregunta. */
export function confirmModal({ title, message, confirmText = 'Sí, borrar', danger = true, onConfirm }) {
  modal({
    title,
    body: el('p', { text: message, style: { margin: '0', color: 'var(--text-dim)', fontSize: 'var(--fs-body)', lineHeight: '1.6' } }),
    footer: [
      el('button', { class: 'btn btn-ghost', text: 'Cancelar', onClick: () => closeModal() }),
      el('button', {
        class: 'btn ' + (danger ? 'btn-danger' : 'btn-primary'),
        text: confirmText,
        onClick: () => { closeModal(); onConfirm(); }
      })
    ]
  });
}

// ============================================================
// AVISOS
// ============================================================

export function toast(message, areaCls = '') {
  const node = el('div', { class: `toast ${areaCls}`, text: message, role: 'status' });
  const root = $('#toast-root');
  root.append(node);

  setTimeout(() => {
    node.classList.add('out');
    setTimeout(() => node.remove(), 200);
  }, 2400);
}

// ============================================================
// CONTROLES DE FORMULARIO
// ============================================================

/**
 * Selector en segmentos. options: [{id, label, cls}]
 * Devuelve { node, get, set }.
 */
export function segmented(options, initial, onChange) {
  let value = initial;
  const wrap = el('div', { class: 'segmented' });

  const buttons = options.map((opt) => {
    const b = el('button', {
      type: 'button',
      class: opt.cls || '',
      text: opt.label,
      'aria-pressed': String(opt.id === value),
      onClick: () => {
        value = opt.id;
        buttons.forEach((x, i) => x.setAttribute('aria-pressed', String(options[i].id === value)));
        if (onChange) onChange(value);
      }
    });
    wrap.append(b);
    return b;
  });

  return {
    node: wrap,
    get: () => value,
    set: (v) => {
      value = v;
      buttons.forEach((x, i) => x.setAttribute('aria-pressed', String(options[i].id === value)));
    }
  };
}

/** Interruptor de encendido/apagado. */
export function toggle(initial, onChange) {
  let value = Boolean(initial);
  const node = el('button', {
    type: 'button', class: 'switch', role: 'switch',
    'aria-checked': String(value),
    onClick: () => {
      value = !value;
      node.setAttribute('aria-checked', String(value));
      if (onChange) onChange(value);
    }
  });
  return { node, get: () => value, set: (v) => { value = Boolean(v); node.setAttribute('aria-checked', String(value)); } };
}

/** Campo con etiqueta arriba. */
export function field(label, control) {
  return el('div', { class: 'field' }, [
    el('label', { text: label }),
    control
  ]);
}

/**
 * Casillas de categoría, con un campo para crear una nueva sin
 * salir del formulario (abrir otro modal encima cerraría este).
 *
 * @param {Array}  options   [{id, name}] las categorías que existen
 * @param {Array}  initial   nombres ya marcados
 * @param {Function} onCreate  recibe el nombre nuevo, devuelve una promesa
 */
export function categoryPicker(options, initial = [], onCreate) {
  const chosen = new Set(initial);
  const grid = el('div', { class: 'catgrid' });

  const paint = () => {
    clear(grid);

    options.forEach((cat) => {
      const btn = el('button', {
        type: 'button',
        class: 'focusopt',
        'aria-pressed': String(chosen.has(cat.name)),
        onClick: () => {
          if (chosen.has(cat.name)) chosen.delete(cat.name); else chosen.add(cat.name);
          btn.setAttribute('aria-pressed', String(chosen.has(cat.name)));
        }
      }, [
        el('span', { class: 'focusopt-dot' }),
        el('span', { text: cat.name })
      ]);
      grid.append(btn);
    });

    // Categorías que la tarea trae pero que ya no están en la lista
    // (las borraste después de crear la tarea). Se enseñan igual.
    [...chosen]
      .filter((n) => !options.some((o) => o.name === n))
      .forEach((n) => {
        const btn = el('button', {
          type: 'button',
          class: 'focusopt is-gone',
          title: 'Esta categoría ya no está en tu lista',
          'aria-pressed': 'true',
          onClick: () => { chosen.delete(n); paint(); }
        }, [
          el('span', { class: 'focusopt-dot' }),
          el('span', { text: n })
        ]);
        grid.append(btn);
      });
  };
  paint();

  // ── Crear una nueva ──
  const nameInput = el('input', {
    class: 'input', type: 'text', maxlength: '40',
    placeholder: 'Nombre de la categoría'
  });

  const createRow = el('div', { class: 'catnew', hidden: true }, [
    nameInput,
    el('button', { class: 'btn btn-primary', type: 'button', text: 'Crear', onClick: () => create() })
  ]);

  const addBtn = el('button', {
    type: 'button', class: 'btn btn-ghost catadd', text: '+ Nueva categoría',
    onClick: () => {
      createRow.hidden = false;
      addBtn.hidden = true;
      nameInput.focus();
    }
  });

  async function create() {
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }

    let id;
    try {
      id = await onCreate(name);
    } catch (e) {
      console.error(e);
      toast('No se pudo crear');
      return;
    }
    if (id === null) { toast('Ya tienes una con ese nombre'); return; }

    // La lista real llega por la base de datos, pero la pintamos ya
    // para que no se sienta lento.
    if (!options.some((o) => o.name === name)) options.push({ id, name });
    chosen.add(name);
    nameInput.value = '';
    createRow.hidden = true;
    addBtn.hidden = false;
    paint();
    toast('Categoría creada');
  }

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); create(); }
  });

  const wrap = el('div', {}, [
    options.length === 0 ? el('small', {
      class: 'cathint',
      text: 'Todavía no tienes categorías. Sirven para agrupar tareas por tipo de trabajo — grabación, llamadas, papeleo — sin importar de qué negocio sean.'
    }) : null,
    grid,
    addBtn,
    createRow
  ]);

  return { node: wrap, get: () => [...chosen] };
}

/** Selector de días de la semana (para tareas recurrentes). */
export function dowPicker(initial = [], onChange) {
  const short = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  let value = new Set(initial);
  const wrap = el('div', { class: 'dowpick' });

  short.forEach((s, i) => {
    const b = el('button', {
      type: 'button', text: s,
      title: names[i], 'aria-label': names[i],
      'aria-pressed': String(value.has(i)),
      onClick: () => {
        if (value.has(i)) value.delete(i); else value.add(i);
        b.setAttribute('aria-pressed', String(value.has(i)));
        if (onChange) onChange([...value].sort());
      }
    });
    wrap.append(b);
  });

  return { node: wrap, get: () => [...value].sort((a, b) => a - b) };
}
