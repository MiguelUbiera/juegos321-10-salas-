# Cronómetro Carrera de equipos · nota para la conversación del sitio

El cronómetro está hecho en su carpeta, sobre la casa común (`_comun/`). Esto es lo que el sitio necesita saber para ponerlo en el panel y publicarlo. El sitio no se tocó.

## Qué publicar y dónde

Solo `index.html`, `tarjeta.html`, `favicon.svg`, `icono.svg`, `vista.webp` y `ficha.json`, en una carpeta sin tildes ni números; por ejemplo `herramientas/cronometro/carrera/`. Todas las rutas internas son relativas. `fuente/`, `construir.py`, `probar.py` y esta nota no se publican.

## La versión compacta: `tarjeta.html`

El panel de cronómetros no puede poner la herramienta entera en el carrusel: ocupa toda la pantalla y no es esa la ventana. Por eso la entrega trae además **la carta**, que es lo que el carrusel coloca.

- Es un `<article class="carta" data-s321="tarjeta" data-cronometro="carrera">` con el ícono grande, el antetítulo, el nombre, el lema y **tres claves**. Sin explicaciones —viven dentro de la herramienta— y sin guion: es una pieza quieta, así que poner diez en pantalla no cuesta nada.
- **Se escala con una sola medida.** Todo va en `em` sobre la variable `--carta` (16 px por defecto, 21 em de ancho ≈ 336 × 459 px). El panel le baja `--carta` a las cartas del fondo y se la sube a la del frente; no hay que tocar ninguna otra cifra. A las que no están al frente les pone `data-fondo="si"`, que apaga el botón y los toques.
- El botón «Abrir el cronómetro» apunta al campo `abrir` de la ficha, en la misma pestaña.
- Sale de `fuente/tarjeta.html`, `fuente/tarjeta.css` y `ficha.json` con `construir.py`. El sitio puede publicarla tal cual, o copiar el marcado y el CSS a su plantilla del panel; lo que no debe hacer es escribir los textos a mano, porque entonces la ficha y la carta se separan.

Es la quinta carta de la familia: solo cambian el ícono, el nombre y las claves.

## La barra: `data-s321="barra"`

Arriba del todo hay una barra fiel a la de la portada: el mismo fondo, 64 px más su línea, y la marca a la izquierda (`<img src="favicon.svg">` y el nombre) que lleva a `/`. No trae menús: el sitio pone ahí su barra común. Lleva `view-transition-name: s321-barra`.

## La carga: `data-s321="carga"`

Es la de las secuencias: el isotipo de siete piezas, el nombre, «Preparando el cronómetro…» y la raya. Se retira con un fundido cuando las fuentes están cargadas y el estado recuperado, y dura al menos lo que tarda el isotipo en componerse (nunca menos de 0.8 s). Con «reducir movimiento», quieta y sin raya.

## Las migas y la vuelta al panel

«Herramientas» y «Cronómetros» van sin enlace propio —son texto, no botón— tal como quedaron en el cronómetro por etapas; solo «Inicio» y la marca llevan a `/`. Si el sitio decide más adelante enlazar «Cronómetros» a un ancla del panel, conviene hacerlo a la vez en los cuatro cronómetros ya construidos, para que no digan cosas distintas.

## La tarjeta y la ficha

La dibuja el sitio con `ficha.json`, `icono.svg` y `vista.webp`:

- Campos: `antetitulo` (en minúsculas; la tarjeta lo pone en versalitas), `nombre`, `lema`, `para_que`, `como_funciona`, `ideas` (tres, para el panel de información de la herramienta; la tarjeta puede usarlas o no), `incluye` (las etiquetas), `abrir`, `icono`, `vista`, `version`, `fecha`. `instruccion` es la frase que la herramienta lleva dentro, por si hace falta.
- `**…**` marca la negrita de los textos: una en `como_funciona` («el primer puesto no es lo único que cuenta») y una en cada idea.
- **La ficha se escribe una vez y sirve dos veces.** Los mismos `antetitulo`, `para_que`, `como_funciona` e `ideas` que dibujan la tarjeta son los que la herramienta muestra en su panel de información: `construir.py` los lee de `ficha.json` y los mete en el HTML al construir. Si el sitio corrige un texto de la tarjeta, hay que volver a construir la herramienta para que diga lo mismo por dentro — nunca se editan los dos por separado.
- `vista.webp` es la pieza real con datos de muestra (una carrera de cuatro equipos en marcha, dos ya llegados), 1280 × 800. Es una imagen fija y no la herramienta viva. **Pendiente:** sigue siendo la captura de la versión anterior del diseño (con la escala de tiempo por fuera); hay que rehacerla sobre el diseño actual antes de publicar.

## El paso suave entre páginas

La página declara `@view-transition { navigation: auto; }` (y lo apaga con «reducir movimiento»), igual que las demás. La pieza y la cifra conservan `view-transition-name` (`s321-pieza`, `s321-cifra`) para el paso entre páginas; son los mismos tres nombres de siempre —`s321-barra`, `s321-pieza`, `s321-cifra`— y el sitio no debe repetirlos en otra pieza de la misma página.

Los paneles —información y ajustes— entran y salen con animación. Con «reducir movimiento», todo ocurre al instante.

## Colores

Usa los mismos tokens de marca que el resto de la familia (`Paleta_de_Colores.txt`), sin ninguno nuevo. Los seis colores de equipo (`--eq1`…`--eq6`) son los mismos terracota, verde, petróleo, ciruela y dos hondos que ya usa el cronómetro por etapas para sus tramos — así un carril y un tramo se leen como el mismo tipo de cosa en las dos herramientas.

## Los dos límites de seguridad

- `X-Frame-Options: DENY`: ninguna página se muestra dentro de otra. Por eso el cronómetro se abre como página propia y la tarjeta usa una imagen, no un `iframe`.
- `Permissions-Policy: microphone=()`: no hay micrófono; no hace falta para esta herramienta.

Usa la API de pantalla completa, la de pantalla despierta (Wake Lock) y el sonido sintetizado (Web Audio, sin archivos de audio). Ninguna necesita permiso adicional del sitio.

## El panel de información

Con la «i» de la esquina superior derecha se abre a la derecha —en el mismo lienzo, sin recuadro aparte— y enseña qué es y para qué sirve: el antetítulo «la misma salida, un tiempo por equipo», el para qué, el cómo funciona y tres ideas para la clase. A diferencia de Actividad y Etapas, aquí **empieza cerrada** en vez de abierta: la pantalla principal ya reparte su ancho entre la cifra y los carriles, y no sobra sitio para abrir la información por defecto sin apretar la pista. Tampoco **se retira sola** al avanzar la carrera —no hay un momento natural en que deje de servir, porque los equipos pueden marcar su llegada en cualquier orden— así que queda a criterio del maestro abrirla y cerrarla cuando la necesite.

Debajo del nombre de la herramienta no hay instrucción fija: ahí va, en grande, **el nombre que el maestro le pone a la actividad**, un campo de escritura. El pie dice solo `© Secuencia321`.

## Lo que este cronómetro hace y ningún otro hará

**Salida única, llegada individual.** Todos los equipos comparten el mismo reloj desde que arranca; cada uno marca su propia llegada tocando el visto de su carril (o las teclas 1–6), y ese carril se congela con su tiempo y su puesto. Tocar el puesto lo deshace, por si alguien se equivocó al marcar. No hay una «ronda» que archivar ni una comparación entre tandas: es una sola carrera a la vez, y punto.

**Las alertas son individuales.** En Ajustes se configura un intervalo («alertar cada 1 minuto», por ejemplo); cada equipo que sigue corriendo recibe un aviso visual en su propio carril al cumplirse cada intervalo, y el que ya llegó deja de recibirlos —no es un reloj compartido con una meta única, es un aviso por equipo que respeta cuánto lleva corriendo cada uno.

**Reiniciar empieza otra carrera y no archiva la anterior** — a diferencia de Actividad (que guarda rondas) y Etapas (que guarda eventos), aquí «Reiniciar» borra los tiempos para correr de nuevo con los mismos equipos. Es una diferencia a propósito: una carrera de equipos se repite muchas veces seguidas en una clase y pedir que cada vuelta se archive y se nombre sería más fricción que ayuda. Como red de seguridad ante un toque accidental, reiniciar pide un segundo toque y dejas cinco segundos para deshacerlo desde el aviso que aparece abajo.

**Los equipos se administran en Ajustes, no en la pista.** De 2 a 6 equipos, con nombre y color; se añaden y se quitan antes de la salida (quedan fijos en cuanto arranca el reloj, para que nadie cambie las reglas a mitad de carrera). El nombre de cada equipo también se puede tocar y corregir directamente en su carril mientras no ha llegado.

**Los mandos son solo íconos.** A diferencia de Actividad y Etapas —que rotulan sus botones—, aquí «Seguir/Pausa» y «Reiniciar» son un botón redondo y uno discreto, sin texto: el nombre de la actividad y los carriles ya ocupan la atención, y los dos mandos se aprenden a la primera.

## Otros detalles

- Las tipografías se piden a Google Fonts con la misma dirección que la portada. Se cargan sin bloquear el primer pintado.
- Guarda su estado en el navegador con la clave `s321-cronometro-carrera`, esquema `v: 2`. Guarda la actividad, los equipos con su nombre y su tiempo de llegada, el intervalo de alertas y los interruptores de Ajustes; si la pestaña se recarga con la carrera en marcha, sigue exactamente donde iba. No guarda un historial de carreras anteriores.
- No lee nada del sitio ni llama a ninguna API.

© Secuencia321
