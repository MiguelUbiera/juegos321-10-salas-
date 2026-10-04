# Semáforo de exposición · nota para la conversación del sitio

El cronómetro está hecho en su carpeta, sobre la casa común (`_comun/`). Esto es lo que el sitio necesita saber para ponerlo en el panel y publicarlo. El sitio no se tocó.

## Qué publicar y dónde

Solo `index.html`, `tarjeta.html`, `favicon.svg`, `icono.svg`, `vista.webp` y `ficha.json`, en una carpeta sin tildes ni números; por ejemplo `herramientas/cronometro/semaforo/`. Todas las rutas internas son relativas. `fuente/`, `construir.py` y esta nota no se publican.

## La versión compacta: `tarjeta.html`

Igual que en Etapas: un `<article class="carta" data-s321="tarjeta" data-cronometro="actividad">` con el ícono, el antetítulo, el nombre, el lema y tres claves, escalado con `--carta`. Sale de `fuente/tarjeta.html` y `ficha.json` con `construir.py`; cuando el panel tenga más de un cronómetro, esta carta encaja en el mismo carrusel sin tocar nada.

## La barra, la carga y las migas

Las tres son idénticas a las de Etapas, copiadas de la casa sin cambios: la barra fiel a la de la portada (`view-transition-name: s321-barra`), la pantalla de carga con el isotipo de siete piezas y `window.S321_CARGA_T0`, y las migas `Inicio › Herramientas › Cronómetros › Semáforo de exposición` (solo «Inicio» enlaza; las demás son texto). No hay una vuelta especial por JavaScript: si el sitio quiere que «Cronómetros» lleve a algún sitio, es cuestión de poner el `href` en esa migaja al montarla en su plantilla.

## La tarjeta

La dibuja el sitio con `ficha.json`, `icono.svg` y `vista.webp`, con los mismos campos que Etapas (`antetitulo`, `nombre`, `lema`, `para_que`, `como_funciona`, `ideas`, `incluye`, `abrir`, `icono`, `vista`, `version`, `fecha`, `instruccion`). Los mismos `antetitulo`, `para_que`, `como_funciona` e `ideas` alimentan también el panel de información de la herramienta: si el sitio corrige un texto de la tarjeta, hay que volver a construir para que diga lo mismo por dentro.

`vista.webp` (1280 × 800) muestra la pieza real con datos de muestra: tres expositores, el primero ya cerrado con su marca discreta «cerca del máximo», el segundo presentando con la cifra en verde.

## El paso suave entre páginas

Igual que en Etapas: `@view-transition { navigation: auto; }`, apagado con «reducir movimiento», y los mismos tres nombres de transición (`s321-barra`, `s321-pieza`, `s321-cifra`) — el sitio no debe repetirlos en otra pieza de la misma página. Pantalla completa no pasa por la transición, por la misma razón ya conocida (el aviso del navegador llega a medio agrandar la ventana).

## Colores

No se usó ningún color nuevo: los tres estados del semáforo son de la propia paleta de la marca —verde de acierto, terracota claro y terracota hondo—, los mismos tonos que ya usan las etapas de Cronómetro por etapas para sus estados de aviso y de agotado.

## Los dos límites de seguridad

Los mismos de siempre: `X-Frame-Options: DENY` (por eso la tarjeta usa una imagen y no un `iframe`) y `Permissions-Policy: microphone=()` (no hay dictado; el teclado del equipo ya dicta en cualquier campo). La herramienta usa pantalla completa y pantalla despierta (Wake Lock); la política de hoy no las bloquea.

## Pantalla completa: una diferencia con el resto de la casa

En los demás cronómetros, entrar en pantalla completa oculta Información, Ajustes y Reiniciar —solo queda el reloj y el botón de salir—. Aquí, por pedido de Miguel tras probarlo en clase, **Ajustes se queda a mano** también en pantalla completa: quien modera puede corregir el mínimo o el máximo sin salir de la proyección. Información y Reiniciar se ocultan igual que en Etapas, con una sola excepción: cuando la ronda ya terminó —Iniciar y Siguiente se apagan solos porque no queda ningún candidato— Reiniciar aparece, solo como ícono y del mismo tamaño que los otros dos mandos, con un pulso suave que avisa que es lo único que queda por tocar; el doble toque de confirmación se conserva, con el mismo cambio de color que ya usa en la ventana normal. El nombre de quien expone, además, crece bastante más en pantalla completa que en la ventana normal —se lee de lejos igual que la cifra.

## Ocultar la lista de expositores

Un cuarto botón en la cabecera (antes de «Información») esconde o vuelve a mostrar la columna de expositores; con ella oculta, el reloj ocupa todo el ancho. El botón vive en la cabecera —no dentro de la propia lista— para que siga a mano y siempre haya vuelta atrás. La preferencia queda guardada, igual que la del panel de información.

## El panel de información

Al abrirse, la herramienta enseña a la derecha —mismo sitio que en Etapas: reloj a la izquierda, información desplegable a la derecha, botón «i» en la cabecera— qué es y qué se puede hacer con ella. A diferencia de Etapas, aquí **no se retira sola** al pasar al segundo expositor: como una ronda de exposiciones puede tener muchos turnos y no solo dos o tres etapas, se deja que el usuario la cierre cuando ya no la necesite, y esa preferencia queda guardada.

Debajo del nombre de la herramienta no hay instrucción ni título fijo: ahí va, en grande, el nombre de la actividad, que es un campo de escritura con placeholder «Actividad». El pie dice solo `© Secuencia321`.

## Lo que este cronómetro hace y ningún otro hará

**El semáforo.** El tiempo de cada turno se reparte una sola vez para toda la ronda —un mínimo, un máximo y un aviso de cierre (30 s, 1 min o 2 min antes del máximo)— y la cifra cambia de color sola según en qué tramo está: el tono de siempre mientras hay tiempo de sobra, cálido al entrar en el tramo de cierre, encendido al pasar el máximo. Encima del reloj, a la izquierda, una etiqueta pequeña —con su punto de color y su nombre: «En espera», «En curso», «Ve cerrando», «Tiempo agotado»— dice en qué momento está la ronda sin que el moderador tenga que anunciarlo; no es un adorno mudo, así que no hace falta adivinar qué significa.

**Quién presenta.** Un campo sin caja, sin rótulo y anclado a la derecha —crece hacia la izquierda según el nombre— refleja y edita en vivo el nombre de quien tiene el turno ahora mismo; cambiarlo ahí actualiza también su fila en la lista, y viceversa. Va en cursiva y en el terracota de la marca, para distinguirse a simple vista del nombre de la actividad —ese sí derecho y en el tono oscuro de siempre— aunque comparten la misma letra elegante del resto de la casa, no la de la cifra.

**Los botones de la cabecera, discretos mientras se presenta.** Lista, Información, Ajustes y Pantalla completa se apagan casi del todo en cuanto el reloj corre, para no competir con la cifra; con solo tocarlos, pasarles el cursor o enfocarlos vuelven a verse enteros. En pausa se ven siempre normales.

**La lista de expositores.** Se arma antes de empezar —o se completa sobre la marcha, incluso con el reloj corriendo— con solo el nombre de cada quien; cada fila pendiente lleva sus flechas para reordenarla, su lápiz y su papelera, y quitar a alguien ofrece deshacer. El orden puede ser **secuencial** (el de la lista) o **al azar**: cambiar de uno a otro solo reparte de nuevo a quienes faltan por pasar, nunca a quien ya presentó ni a quien está presentando. La columna entera se puede ocultar desde la cabecera (ver más arriba).

**Iniciar, Siguiente y Reiniciar.** Iniciar/Pausar y Siguiente/Terminar son solo ícono —el propio dibujo ya dice qué hacen, sin repetir en texto lo que la cifra ya cuenta— y viven discretos, a la esquina de los mandos. Reiniciar conserva su texto porque cambia a «Toca otra vez» al pedir el segundo toque de confirmación. Al pasar al siguiente expositor **el turno que empieza queda en espera, nunca arranca solo**: quien presenta puede tardar en llegar al frente, así que hace falta un toque en Iniciar para arrancarlo, y mientras tanto la etiqueta de estado ya dice «En espera» y el nombre de quien sigue está a la vista. Cada turno cerrado queda en la lista con su tiempo y, si corresponde, una marca discreta —«bajo el mínimo», «cerca del máximo» o cuánto se pasó del máximo—; el turno corriente no lleva etiqueta. La tecla <kbd>B</kbd> deshace el último cierre y retoma ese turno donde se dejó, sin perder el tiempo que ya había corrido ni arrancarlo de nuevo solo.

**Reiniciar** vuelve toda la ronda al principio con la misma lista de expositores —no la borra—, con el mismo toque doble de confirmación que usa Etapas.

**Los ajustes son de toda la ronda, no de cada expositor**: tiempo (mínimo, máximo, aviso, segundos o décimas) y en vivo (parpadear al agotarse, sonar al cruzar cada marca, mantener la pantalla despierta). No hay eventos guardados ni tabla de comparación: cada ronda es su propia sesión, y lo único que se archiva es el historial discreto de la lista mientras dura.

**En pantalla táctil, la pantalla completa se pide en horizontal**, igual que en Etapas, y se suelta al salir.

## Otros detalles

- Las tipografías se piden a Google Fonts igual que en el resto de la casa, sin bloquear el primer pintado.
- Guarda su estado en el navegador con la clave `s321-cronometro-semaforo`, esquema `v: 1`: el nombre de la actividad, los tiempos y ajustes, la lista de expositores con su historial de la ronda actual, y si el reloj estaba corriendo. Es de ese navegador y ese equipo; no viaja a ningún servidor.
- No lee nada del sitio ni llama a ninguna API.

© Secuencia321
