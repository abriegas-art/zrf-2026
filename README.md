# Zubiazpi Rural Fest 2026 · app de control

PWA (web app instalable en el móvil) para tesorería y organización del fest.
Lee las respuestas del Google Forms y escribe pagos, gastos, habitas y checklist en el mismo Google Sheet.

```
móvil (PWA en GitHub Pages)  ⇄  Apps Script (API gratis)  ⇄  Google Sheet del Forms
                                        ⇣
                                 Drive: fotos de tickets
```

## Ficheros

| Fichero | Qué es |
|---|---|
| `index.html` | La app completa (una sola página, lleva los stickers e incluye las 58 respuestas actuales como datos de demo) |
| `manifest.webmanifest` · `icon-*.png` | Para que se instale como app con icono |
| `sw.js` | Caché offline: la app abre aunque en Zubiazpi no haya cobertura |
| `apps-script/Code.gs` | Backend que se pega en el Google Sheet |

## Puesta en marcha (20 min)

### 1. Backend en el Google Sheet
1. Abre el Sheet de respuestas del Forms → **Extensiones → Apps Script**.
2. Borra lo que haya y pega el contenido de `apps-script/Code.gs`. Guarda.
3. Comprueba que la pestaña de respuestas se llama `Respuestas de formulario 1` (si no, cambia `SHEET_RESPUESTAS` arriba del todo).
4. **Implementar → Nueva implementación → tipo "Aplicación web"**: *Ejecutar como: Yo* · *Quién tiene acceso: Cualquier usuario*. Autoriza los permisos (Sheets + Drive).
5. Copia la URL que termina en `/exec`.
6. Pruébala en el navegador: `URL/exec?action=all` debe devolver un JSON con `respuestas`.

Las pestañas `Pagos`, `Gastos`, `Habitas` y `Checks` se crean solas la primera vez. Puedes editarlas a mano desde el Sheet sin romper nada.

### 2. Publicar la app en GitHub Pages
1. Crea un repo (p. ej. `zrf-2026`), sube **todo el contenido de esta carpeta** a la raíz (o a `/docs`).
2. Settings → Pages → *Deploy from a branch* → `main` / root. En un minuto tendrás `https://TUUSUARIO.github.io/zrf-2026/`.
3. Abre esa URL en el móvil → **Añadir a pantalla de inicio** (iPhone: Compartir; Android: menú ⋮ → Instalar).

> Si prefieres no usar GitHub: la app también funciona abriendo `index.html` directamente, pero entonces no se instala como app ni cachea offline.

### 3. Conectar la app
Más → **Ajustes**: pega la URL `/exec`, pon tu nombre (quién registra) y cambia el PIN (por defecto `DALE`). Guardar → sincroniza y sale el punto verde "conectado".

La app se refresca sola cada 60 s y cada vez que vuelves a ella. Si no hay cobertura, los pagos/gastos se guardan en el móvil y se suben al recuperar red ("N pendientes").

### 4. Repartir a la gente
Link público (sin PIN, solo consulta): `https://…/index.html?v=publico` — programa, precios, Bizum y "¿cómo voy?" (buscan su nombre y ven si tienen el pago registrado y su habita).

## Cómo decide la app las cosas

- **Bono** según la respuesta "¿Cuánto te quedas?": *txarri* 80 €, *txakur* 45 €, *me lo estoy pensando* → indeciso (cuenta 45 € en previsión). Si respondió *Seeeehh* a "¿Vienes a tocar?" → **grupo, no paga**.
- **Estado de pago**: manda la **3ª columna del Sheet ("Pagado?": Sí / No / N/A)**. Al registrar un pago de bono completo, o al pulsar "Marcar pagado", la app escribe "Sí" en esa celda. Los pagos de la app aportan importe, método y fecha; si alguien está en "Sí" sin importe registrado, el recaudado asume el precio de su bono. *"Dice que pagó"* = marcó "Sí" en "¿Has pagado?" (columna L) pero la columna C sigue en No.
- **Fianza**: la partida "Fianza" es recuperable; sale de caja pero no cuenta como gasto ni contra el tope del komando. El bote de 2025 no se incluye en ningún cálculo.
- **Gastos conocidos**: casa 1.900 + fianza 500 (Alex, 2.400 € en total), camisetas 455, pegatinas 28,57. En demo se cargan solos; con la API, Ajustes → "Cargar gastos conocidos".
- **Viernes** = txarri + grupos (+ indecisos si quieres). **Sábado** = todos.
- **Presupuesto** = partidas de la hoja "Previsión 2026" (3.848,83 €) y topes por komando de la hoja "Komando". Se comparan contra los gastos registrados. Si cambian cifras, edita `PARTIDAS` / `KOMANDOS` al principio del `<script>` de `index.html`.
- **Modo demo** (sin URL de API): usa las respuestas embebidas (y su columna "Pagado?") y los gastos conocidos. Lo que marques se queda en el móvil hasta conectar la API.

## Actualizar los datos embebidos
Los datos de demo son una foto de las respuestas a 14/10/2026. Con la API conectada no hacen falta. Si quieres refrescarlos sin API: regenera `index.html` con `build.py` (carpeta `src/`).


