// ============================================================
// GROWTH — arranque y control general
// ============================================================

import { isConfigured, watchAuth, login, catchRedirect, authErrorText } from './firebase.js';
import { setUser, watchWeek, stopWatching, onChange, onError, progressForDay } from './store.js';
import {
  todayISO, weekDays, weekStart, dowIndex, blockFor,
  DOW_SHORT, fromISO, areaClass, addDays
} from './schedule.js';
import { el, clear, $, toast, closeModal } from './ui.js';
import { ROUTES, routeById, currentId, go, onRoute } from './router.js';
import { openTaskForm } from './taskform.js';

// ── Estado de la pantalla ──
let currentDate = todayISO();
let watchedWeek = null;
let currentUser = null;

// ============================================================
// PANTALLAS
// ============================================================

function showScreen(which) {
  $('#screen-boot').hidden  = which !== 'boot';
  $('#screen-setup').hidden = which !== 'setup';
  $('#screen-auth').hidden  = which !== 'auth';
  $('#app').hidden          = which !== 'app';
}

// ============================================================
// RIEL DE LOS 7 DÍAS
// ============================================================

function renderRail() {
  const rail = $('#dayrail');
  const route = routeById(currentId());

  rail.hidden = !route.rail;
  if (!route.rail) return;

  clear(rail);
  const today = todayISO();

  weekDays(currentDate).forEach((iso) => {
    const d = fromISO(iso);
    const block = blockFor(iso);
    const prog = progressForDay(iso);
    const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;

    rail.append(el('button', {
      class: `daycell ${areaClass(block.area)}`,
      'aria-selected': String(iso === currentDate),
      'data-today': String(iso === today),
      'aria-label': `${block.day} ${d.getDate()} · ${prog.done} de ${prog.total} tareas`,
      onClick: () => setDate(iso)
    }, [
      el('span', { class: 'daycell-dow', text: DOW_SHORT[dowIndex(iso)] }),
      el('span', { class: 'daycell-num', text: String(d.getDate()) }),
      el('span', { class: 'daycell-area' }),
      el('span', { class: 'daycell-meter' }, [el('i', { style: { width: pct + '%' } })])
    ]));
  });
}

// ============================================================
// NAVEGACIÓN
// ============================================================

function renderNav() {
  const nav = $('#nav');
  const active = currentId();
  clear(nav);

  ROUTES.forEach((r) => {
    nav.append(el('button', {
      class: 'navbtn',
      'aria-current': r.id === active ? 'page' : null,
      onClick: () => go(r.id)
    }, [
      el('span', { class: 'navbtn-ico', text: r.icon, 'aria-hidden': 'true' }),
      el('span', { class: 'navbtn-txt', text: r.label })
    ]));
  });
}

// ============================================================
// RENDER
// ============================================================

function render() {
  if (!currentUser) return;
  renderNav();
  renderRail();

  const route = routeById(currentId());
  route.render($('#view'), {
    date: currentDate,
    setDate,
    user: currentUser
  });
}

function setDate(iso) {
  currentDate = iso;
  const wk = weekStart(iso);
  if (wk !== watchedWeek) {
    watchedWeek = wk;
    watchWeek(iso);
  }
  render();
}

// ============================================================
// RELOJ Y ESTADO DE CONEXIÓN
// ============================================================

function startClock() {
  const node = $('#clock');
  let lastDay = todayISO();

  const tick = () => {
    const now = new Date();
    const h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    node.textContent = `${h12}:${m} ${period}`;

    // Si cruzamos la medianoche con la app abierta, "hoy" cambia
    const nowDay = todayISO();
    if (nowDay !== lastDay) {
      const wasOnOldToday = currentDate === lastDay;
      lastDay = nowDay;
      if (wasOnOldToday) setDate(nowDay); else render();
    }
  };

  tick();
  setInterval(tick, 15000);
}

function startConnectionWatch() {
  const dot = $('#status-dot');
  const paint = () => {
    const on = navigator.onLine;
    dot.dataset.state = on ? 'online' : 'offline';
    dot.title = on ? 'Conectado' : 'Sin internet — se guarda local y sube al volver';
  };
  window.addEventListener('online', () => { paint(); toast('Conexión restablecida'); });
  window.addEventListener('offline', () => { paint(); toast('Sin internet — se guarda local'); });
  paint();

  onError(() => {
    dot.dataset.state = 'error';
    dot.title = 'Error leyendo la base de datos. Revisa las reglas de Firestore.';
  });
}

// ============================================================
// ATAJOS DE TECLADO
// ============================================================

function startShortcuts() {
  document.addEventListener('keydown', (e) => {
    // No molestar mientras escribe
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if ($('#app').hidden) return;

    if (e.key === 'ArrowLeft')  { setDate(addDays(currentDate, -1)); }
    else if (e.key === 'ArrowRight') { setDate(addDays(currentDate, 1)); }
    else if (e.key === 't' || e.key === 'T') { setDate(todayISO()); }
    else if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      openTaskForm(currentDate, null, { defaultArea: blockFor(currentDate).area });
    }
  });
}

// ============================================================
// LOGIN
// ============================================================

function setupLoginButton() {
  const btn = $('#btn-google');
  const errBox = $('#auth-error');

  btn.addEventListener('click', async () => {
    errBox.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Abriendo Google…';
    try {
      await login();
    } catch (e) {
      console.error(e);
      errBox.textContent = authErrorText(e);
      errBox.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Entrar con Google';
    }
  });
}

function showAuthError(message) {
  const errBox = $('#auth-error');
  errBox.textContent = message;
  errBox.hidden = false;
  const btn = $('#btn-google');
  btn.disabled = false;
  btn.textContent = 'Entrar con Google';
}

// ============================================================
// ARRANQUE
// ============================================================

async function boot() {
  if (!isConfigured) {
    showScreen('setup');
    return;
  }

  setupLoginButton();
  startClock();
  startConnectionWatch();
  startShortcuts();

  onChange(() => { if (currentUser) render(); });
  onRoute(() => { closeModal(); render(); });

  // Si volvemos de una redirección de Google, recoge el resultado
  await catchRedirect();

  watchAuth(
    (user) => {
      currentUser = user;
      setUser(user.uid);
      watchedWeek = null;
      showScreen('app');
      setDate(todayISO());
    },
    () => {
      currentUser = null;
      stopWatching();
      showScreen('auth');
    },
    (email) => {
      currentUser = null;
      stopWatching();
      showScreen('auth');
      showAuthError(`La cuenta ${email} no tiene acceso a este panel.`);
    }
  );
}

boot().catch((e) => {
  console.error('[boot]', e);
  showScreen('auth');
  showAuthError('Algo falló al arrancar: ' + (e.message || e));
});
