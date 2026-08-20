// ============================================================
// GROWTH — formulario de tarea
//
// Una tarea acepta: título, notas largas, hora, duración,
// área, prioridad y repetición semanal.
// ============================================================

import { el, modal, closeModal, field, segmented, toggle, dowPicker, categoryPicker, toast, confirmModal } from './ui.js';
import { AREA_LIST, DOW_LONG, dowIndex } from './schedule.js';
import { saveTask, deleteTask, addCategory, state } from './store.js';

/**
 * Abre el formulario.
 * @param {string} date  fecha del día en que se crea (YYYY-MM-DD)
 * @param {object|null} existing  tarea a editar, o null para una nueva
 * @param {object} opts  { defaultArea }
 */
export function openTaskForm(date, existing = null, opts = {}) {
  const isEdit    = Boolean(existing);
  const isRoutine = isEdit && existing.kind === 'routine';

  // ── Campos ──
  const titleInput = el('input', {
    class: 'input', type: 'text', maxlength: '160',
    placeholder: 'Qué vas a hacer',
    value: isEdit ? (existing.title || '') : ''
  });

  const notesInput = el('textarea', {
    class: 'textarea', maxlength: '4000',
    placeholder: 'El detalle: pasos, contexto, con quién, qué necesitas antes de empezar…',
    text: isEdit ? (existing.notes || '') : ''
  });

  const timeInput = el('input', {
    class: 'input', type: 'time',
    value: isEdit ? (existing.time || '') : ''
  });

  const durInput = el('input', {
    class: 'input num-input', type: 'number', min: '0', step: '5',
    placeholder: 'minutos',
    value: isEdit && existing.durationMin ? String(existing.durationMin) : ''
  });

  const areaPick = segmented(
    AREA_LIST.map((a) => ({ id: a.id, label: a.short, cls: a.cls })),
    isEdit ? (existing.area || 'agro') : (opts.defaultArea || 'agro')
  );

  const prioPick = segmented(
    [{ id: 'alta', label: 'Alta' }, { id: 'media', label: 'Media' }, { id: 'baja', label: 'Baja' }],
    isEdit ? (existing.priority || 'media') : 'media'
  );

  // ── Categorías ──
  const catPick = categoryPicker(
    state.categories.map((c) => ({ id: c.id, name: c.name })),
    isEdit && Array.isArray(existing.categories) ? existing.categories : [],
    (name) => addCategory(name)
  );

  // ── Repetición ──
  const days = dowPicker(isRoutine && Array.isArray(existing.days) ? existing.days : [dowIndex(date)]);

  const repeatBox = el('div', { style: { marginTop: 'var(--s3)' }, hidden: !isRoutine }, [
    el('label', { class: 'lbl', style: { display: 'block', marginBottom: '7px' }, text: 'Qué días se repite' }),
    days.node,
    el('small', {
      style: { display: 'block', marginTop: 'var(--s2)', color: 'var(--text-faint)', fontSize: 'var(--fs-small)' },
      text: 'Aparece sola cada semana en los días marcados. La marcas por día, no de una vez.'
    })
  ]);

  const repeatSwitch = toggle(isRoutine, (on) => {
    repeatBox.hidden = !on;
  });

  const repeatRow = el('div', { class: 'switch-row' }, [
    el('div', {}, [
      el('span', { class: 'lbl', text: 'Se repite cada semana' }),
      el('small', { text: isRoutine ? 'Estás editando una tarea recurrente.' : 'Para lo que haces siempre el mismo día.' })
    ]),
    repeatSwitch.node
  ]);

  // ── Cuerpo ──
  const body = el('div', {}, [
    field('Tarea', titleInput),
    field('Notas', notesInput),

    el('div', { class: 'field-row' }, [
      field('Hora', timeInput),
      field('Duración', durInput)
    ]),

    field('Área', areaPick.node),
    field('Prioridad', prioPick.node),
    field('Categorías', catPick.node),

    repeatRow,
    repeatBox
  ]);

  // ── Guardar ──
  const submit = async () => {
    const title = titleInput.value.trim();
    if (!title) {
      titleInput.focus();
      titleInput.style.borderColor = 'var(--alert)';
      toast('Falta el título');
      return;
    }

    const repeats = repeatSwitch.get();
    const picked  = days.get();

    if (repeats && picked.length === 0) {
      toast('Marca al menos un día');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando…';

    try {
      await saveTask({
        title,
        notes: notesInput.value,
        time: timeInput.value,
        durationMin: durInput.value ? Number(durInput.value) : null,
        area: areaPick.get(),
        priority: prioPick.get(),
        categories: catPick.get(),
        date,
        days: repeats ? picked : []
      }, existing);

      closeModal();
      toast(isEdit ? 'Tarea actualizada' : 'Tarea añadida');
    } catch (e) {
      console.error(e);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Guardar';
      toast('No se pudo guardar');
    }
  };

  const saveBtn = el('button', { class: 'btn btn-primary grow-2', text: 'Guardar', onClick: submit });

  const footer = [];
  if (isEdit) {
    footer.push(el('button', {
      class: 'btn btn-danger',
      text: 'Borrar',
      onClick: () => {
        confirmModal({
          title: 'Borrar tarea',
          message: isRoutine
            ? 'Esto borra la tarea recurrente y desaparece de todos los días. No se puede deshacer.'
            : 'Esto borra la tarea. No se puede deshacer.',
          onConfirm: async () => {
            try { await deleteTask(existing); toast('Borrada'); }
            catch (e) { console.error(e); toast('No se pudo borrar'); }
          }
        });
      }
    }));
  } else {
    footer.push(el('button', { class: 'btn btn-ghost', text: 'Cancelar', onClick: () => closeModal() }));
  }
  footer.push(saveBtn);

  const m = modal({
    title: isEdit ? 'Editar tarea' : `Nueva tarea · ${DOW_LONG[dowIndex(date)]}`,
    body,
    footer
  });

  // Enter en el título guarda; en las notas hace salto de línea normal.
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
    titleInput.style.borderColor = '';
  });

  return m;
}
