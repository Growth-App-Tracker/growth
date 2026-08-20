// ============================================================
// GROWTH — conexión con Firebase y candado de acceso
// ============================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, onAuthStateChanged, setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

import { firebaseConfig, OWNER_EMAIL } from './config.js';

/** ¿Ya pegó la configuración de Firebase? */
export const isConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

export let app = null;
export let auth = null;
export let db = null;

if (isConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);

  // Caché local: la app abre al instante y sigue funcionando sin internet.
  // Los cambios se guardan y suben solos cuando vuelve la señal.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
}

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

/** ¿Estamos dentro de la app instalada en el celular? Ahí el popup no funciona bien. */
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

/**
 * Entra con Google. En el celular instalado usa redirección
 * porque las ventanas emergentes se bloquean.
 */
export async function login() {
  await setPersistence(auth, browserLocalPersistence);
  if (isStandalone()) {
    await signInWithRedirect(auth, provider);
    return null;
  }
  const res = await signInWithPopup(auth, provider);
  return res.user;
}

export function logout() {
  return signOut(auth);
}

/** Recoge el resultado si volvimos de una redirección de login. */
export function catchRedirect() {
  return getRedirectResult(auth).catch(() => null);
}

/**
 * Avisa cuando cambia la sesión.
 * Si entra un correo que no es el dueño, lo saca inmediatamente.
 */
export function watchAuth(onUser, onNoUser, onWrongAccount) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return onNoUser();

    if ((user.email || '').toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
      await signOut(auth);
      return onWrongAccount(user.email || 'desconocido');
    }
    onUser(user);
  });
}

/** Traduce los errores de Firebase a algo que se entienda. */
export function authErrorText(err) {
  const code = err && err.code ? err.code : '';
  const map = {
    'auth/unauthorized-domain':
      'Este dominio no está autorizado en Firebase. Ve a Authentication → Settings → Authorized domains y añádelo.',
    'auth/popup-blocked':
      'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes de este sitio e intenta otra vez.',
    'auth/popup-closed-by-user':
      'Cerraste la ventana de Google antes de terminar.',
    'auth/network-request-failed':
      'No hay conexión con Google. Revisa el internet.',
    'auth/operation-not-allowed':
      'Falta activar Google como método de acceso en Firebase → Authentication → Sign-in method.',
    'auth/cancelled-popup-request':
      'Se abrió más de una ventana de acceso. Intenta otra vez.'
  };
  return map[code] || (err && err.message) || 'No se pudo entrar.';
}
