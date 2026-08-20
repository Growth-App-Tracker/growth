// ============================================================
// GROWTH — navegación
//
// Cada fase añade rutas a esta lista. `rail: true` significa
// que esa vista usa el riel de los 7 días arriba.
// ============================================================

import { renderHoy } from './views/hoy.js';
import { renderAjustes } from './views/ajustes.js';

export const ROUTES = [
  { id: 'hoy',     label: 'Hoy',     icon: '▣', render: renderHoy,     rail: true  },
  { id: 'ajustes', label: 'Sistema', icon: '⚙', render: renderAjustes, rail: false }
];

const DEFAULT = 'hoy';

export function routeById(id) {
  return ROUTES.find((r) => r.id === id) || ROUTES.find((r) => r.id === DEFAULT);
}

/** Lee la ruta actual de la barra de direcciones. */
export function currentId() {
  const raw = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
  return routeById(raw).id;
}

export function go(id) {
  const next = routeById(id).id;
  if (currentId() === next) return;
  location.hash = '#/' + next;
}

export function onRoute(cb) {
  window.addEventListener('hashchange', () => cb(currentId()));
}
