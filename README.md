# GROWTH

Panel personal de operación. Un solo usuario. Dos negocios y lo personal en el mismo sistema.

**Fase 1 — El esqueleto.** Login, base de datos, vista del día con tareas detalladas.

---

## Cómo está hecho

Sin build system, sin npm. Son archivos que el navegador carga directo.

```
index.html            cascarón + pantallas de arranque, login y setup
firestore.rules       el candado de la base de datos
css/tokens.css        los 4 colores, tipografías, espaciado
css/app.css           estructura y componentes
js/config.js          ← AQUÍ va la configuración de Firebase
js/firebase.js        conexión y candado de acceso
js/store.js           guardar y leer datos (con caché offline)
js/schedule.js        los 7 bloques fijos + manejo de fechas
js/ui.js              medidores, modales, avisos, campos
js/taskform.js        formulario de tarea
js/router.js          navegación
js/app.js             arranque y control general
js/views/hoy.js       vista del día
js/views/ajustes.js   sistema
```

---

## Montaje (una sola vez)

### 1. Firebase

1. Entra a [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → nómbralo `growth`.
2. **Build → Firestore Database → Create database** → **Production mode** → región `nam5`.
3. **Build → Authentication → Get started → Google** → activar → guardar.
4. **⚙ Project settings → Your apps** → ícono `</>` (Web) → registra la app.
5. Copia el bloque `firebaseConfig` que aparece y pégalo en `js/config.js`.
6. **Firestore Database → pestaña Rules** → pega el contenido de `firestore.rules` → **Publish**.

### 2. GitHub Pages

1. Crea un repo nuevo llamado `growth` (público).
2. Sube estos archivos.
3. **Settings → Pages** → Source: `Deploy from a branch` → rama `main`, carpeta `/ (root)` → Save.
4. En 1–2 minutos tienes el enlace.

### 3. El último paso (sin esto el login falla)

Firebase → **Authentication → Settings → Authorized domains → Add domain** →
añade el dominio del enlace de GitHub Pages (ej. `agrohorseexpress.github.io`).

---

## Probar en la computadora

```bash
cd "Dashboard"
python3 -m http.server 8080
```

Abre `http://localhost:8080`. También hay que añadir `localhost` a los dominios
autorizados de Firebase para que el login funcione ahí.

---

## Atajos de teclado

| Tecla | Qué hace |
|---|---|
| `←` `→` | Día anterior / siguiente |
| `T` | Volver a hoy |
| `N` | Nueva tarea |
| `Esc` | Cerrar la ventana abierta |

---

## Cómo se guardan los datos

Todo cuelga de `users/{tu-uid}/`:

| Colección | Qué guarda |
|---|---|
| `tasks` | tareas de un día concreto |
| `routines` | tareas que se repiten cada semana (la plantilla) |
| `routineLogs` | qué recurrente marcaste en qué día |
| `settings` | preferencias |

Las recurrentes se guardan una sola vez, no una copia por semana. Se marcan
por día: marcar la del lunes no marca la del miércoles.
