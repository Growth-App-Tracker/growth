// ============================================================
// GROWTH — editor de bloques
//
// El día de la semana no se toca: siempre hay un bloque por día.
// Lo que cambia es qué es ese bloque, de quién es y qué te enseña.
// ============================================================

import { el, modal, closeModal, field, segmented, toast } from './ui.js';
import {
  getBlocks, DEFAULT_BLOCKS, FOCUS_LIST, AREA_LIST, AREAS, areaClass
} from './schedule.js';
import { saveBlocks } from './store.js';

/**
 * Abre el editor de un día.
 * @param {number} i  0 = lunes … 6 = domingo
 */
export function openBlockForm(i) {
  const blocks = getBlocks().map((b) => ({ ...b }));
  const block  = blocks[i];
  const stock  = DEFAULT_BLOCKS[i];

  // ── Título ──
  const titleInput = el('input', {
    class: 'input', type: 'text', maxlength: '90',
    placeholder: 'Cómo se llama este bloque',
    value: block.title || ''
  });

  // ── Propósito ──
  const purposeInput = el('textarea', {
    class: 'textarea', maxlength: '400',
    placeholder: 'Para qué existe este día. Escríbelo como si se lo explicaras a alguien que quiere saltárselo.',
    text: block.purpose || ''
  });

  // ── Área ──
  const areaPick = segmented(
    AREA_LIST.map((a) => ({ id: a.id, label: a.short, cls: a.cls })),
    block.area || 'agro',
    () => paintPreview()
  );

  // ── Segunda área (para días mixtos como el sábado) ──
  const altPick = segmented(
    [{ id: '', label: 'Ninguna' }].concat(
      AREA_LIST.map((a) => ({ id: a.id, label: a.short, cls: a.cls }))
    ),
    block.altArea || '',
    () => paintPreview()
  );

  // ── Qué conecta ──
  const chosen = new Set(Array.isArray(block.focus) ? block.focus : []);
  const focusWrap = el('div', { class: 'focuspick' });

  FOCUS_LIST.forEach((f) => {
    const btn = el('button', {
      type: 'button',
      class: `focusopt ${areaClass(f.area)}`,
      'aria-pressed': String(chosen.has(f.id)),
      onClick: () => {
        if (chosen.has(f.id)) chosen.delete(f.id); else chosen.add(f.id);
        btn.setAttribute('aria-pressed', String(chosen.has(f.id)));
      }
    }, [
      el('span', { class: 'focusopt-dot' }),
      el('span', { text: f.label })
    ]);
    focusWrap.append(btn);
  });

  // ── Vista previa en vivo ──
  const preview = el('div', {});
  function paintPreview() {
    const area = areaPick.get();
    const alt  = altPick.get();
    preview.className = `blockcard ${areaClass(area)}`;
    preview.replaceChildren(
      el('div', { class: 'blockcard-top' }, [
        el('span', { class: 'lbl', text: `Bloque · ${block.day}` }),
        el('span', { class: `chip ${areaClass(area)}`, text: AREAS[area].label }),
        alt ? el('span', { class: `chip ${areaClass(alt)}`, text: AREAS[alt].label }) : null
      ]),
      el('h2', { class: 'blockcard-title', text: titleInput.value.trim() || 'Sin título' }),
      el('p', { class: 'blockcard-purpose', text: purposeInput.value.trim() || 'Sin propósito escrito.' })
    );
  }
  titleInput.addEventListener('input', paintPreview);
  purposeInput.addEventListener('input', paintPreview);
  paintPreview();

  // ── Cuerpo ──
  const body = el('div', {}, [
    el('div', { class: 'preview-wrap' }, [
      el('div', { class: 'lbl', style: { marginBottom: 'var(--s2)' }, text: 'Así se va a ver' }),
      preview
    ]),

    field('Título del bloque', titleInput),
    field('Propósito', purposeInput),
    field('Área', areaPick.node),
    field('Segunda área', altPick.node),

    el('div', { class: 'field' }, [
      el('label', { text: 'Qué te enseña este día' }),
      el('small', {
        style: { color: 'var(--text-faint)', fontSize: 'var(--fs-small)', lineHeight: '1.5', marginBottom: '7px', display: 'block' },
        text: 'Lo que se abre junto al bloque cuando llega el día. Puedes marcar más de uno, o ninguno.'
      }),
      focusWrap
    ]),

    el('button', {
      class: 'btn btn-ghost btn-block',
      style: { marginTop: 'var(--s2)' },
      text: '↺ Volver a como estaba de fábrica',
      onClick: () => {
        titleInput.value   = stock.title;
        purposeInput.value = stock.purpose;
        areaPick.set(stock.area);
        altPick.set(stock.altArea || '');
        chosen.clear();
        (stock.focus || []).forEach((f) => chosen.add(f));
        Array.from(focusWrap.children).forEach((btn, n) => {
          btn.setAttribute('aria-pressed', String(chosen.has(FOCUS_LIST[n].id)));
        });
        paintPreview();
        toast('Restaurado — falta guardar');
      }
    })
  ]);

  // ── Guardar ──
  const save = async () => {
    const title = titleInput.value.trim();
    if (!title) {
      titleInput.focus();
      titleInput.style.borderColor = 'var(--alert)';
      toast('El bloque necesita un título');
      return;
    }

    blocks[i] = {
      ...block,
      title,
      purpose: purposeInput.value.trim(),
      area: areaPick.get(),
      altArea: altPick.get() || null,
      focus: FOCUS_LIST.filter((f) => chosen.has(f.id)).map((f) => f.id)
    };

    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando…';
    try {
      await saveBlocks(blocks);
      closeModal();
      toast(`${block.day} actualizado`);
    } catch (e) {
      console.error(e);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Guardar';
      toast('No se pudo guardar');
    }
  };

  const saveBtn = el('button', { class: 'btn btn-primary grow-2', text: 'Guardar', onClick: save });

  modal({
    title: `Bloque de ${block.day.toLowerCase()}`,
    body,
    footer: [
      el('button', { class: 'btn btn-ghost', text: 'Cancelar', onClick: () => closeModal() }),
      saveBtn
    ]
  });

  titleInput.addEventListener('keydown', (e) => {
    titleInput.style.borderColor = '';
    if (e.key === 'Enter') { e.preventDefault(); save(); }
  });
}
