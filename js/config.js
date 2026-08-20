// ============================================================
// GROWTH — configuración
//
// Pega aquí el bloque que te da Firebase en:
// Project settings ⚙ → Your apps → ícono </> (Web)
//
// Mientras los valores estén vacíos, la app enseña la pantalla
// de "Falta un paso" en vez de intentar conectarse.
// ============================================================

export const firebaseConfig = {
  apiKey:            "AIzaSyACljAYLAcHBg_Rz0pvnceFgURAs5XxURI",
  authDomain:        "growth-ec0d1.firebaseapp.com",
  projectId:         "growth-ec0d1",
  storageBucket:     "growth-ec0d1.firebasestorage.app",
  messagingSenderId: "503134890431",
  appId:             "1:503134890431:web:2565f6980693cc8646590a"
};

// Solo este correo puede entrar. Cualquier otro se rechaza,
// tanto aquí como en las reglas de Firestore.
export const OWNER_EMAIL = "christianbartholomew97@gmail.com";

// Nombre corto que se ve en el ícono del celular.
export const APP_NAME = "GROWTH";
