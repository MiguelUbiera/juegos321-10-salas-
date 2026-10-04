# Cronómetro de actividad · nota para la conversación del sitio

El cronómetro está hecho en su carpeta. Esto es lo que el sitio necesita saber para ponerlo en el panel y publicarlo. El sitio no se tocó.

## Qué publicar y dónde

Solo `index.html`, `tarjeta.html`, `favicon.svg`, `icono.svg`, `vista.webp` y `ficha.json`, en una carpeta sin tildes ni números; por ejemplo `herramientas/cronometro/actividad/`. Todas las rutas internas son relativas. `fuente/`, `construir.py`, `probar.py` y esta nota no se publican.

## La versión compacta: `tarjeta.html`

El panel de cronómetros no puede poner la herramienta entera en el carrusel: ocupa toda la pantalla y no es esa la ventana. Por eso la entrega trae además **la carta**, que es lo que el carrusel coloca.

- Es un `<article class="carta" data-s321="tarjeta" data-cronometro="actividad">` con el ícono grande, el antetítulo, el nombre, el lema y **tres claves**. Sin explicaciones —viven dentro de la herramienta— y sin guion: es una pieza quieta, así que poner diez en pantalla no cuesta nada.
- **Se escala con una sola medida.** Todo va en `em` sobre la variable `--carta` (16 px por defecto, 21 em de ancho ≈ 336 × 459 px). El panel le baja `--carta` a las cartas del fondo y se la sube a la del frente; no hay que tocar ninguna otra cifra. A las que no están al frente les pone `data-fondo="si"`, que apaga el botón y los toques.
- El botón «Abrir el cronómetro» apunta al campo `abrir` de la ficha, en la misma pestaña.
- Sale de `fuente/tarjeta.html`, `fuente/tarjeta.css` y `ficha.json` con `construir.py`. El sitio puede publicarla tal cual, o copiar el marcado y el CSS a su plantilla del panel; lo que no debe hacer es escribir los textos a mano, porque entonces la ficha y la carta se separan.

Cuando haya más cronómetros, todas las cartas serán iguales salvo el ícono, el nombre y las claves: el carrusel se construye una vez.

## La barra: `data-s321="barra"`

Arriba del todo hay una barra fiel a la de la portada: el mismo fondo, 64 px más su línea, y la marca a la izquierda (`<img src="favicon.svg">` y el nombre, con su ™ como en el sitio) que lleva a `/`. No trae menús: el sitio pone ahí su barra común. Lleva `view-transition-name: s321-barra`.

## La carga: `data-s321="carga"`

Es la de las secuencias, copiada de `segmentedDocument`: el suelo con su halo, el isotipo de siete piezas con la animación `pieza`, el nombre, la frase «Preparando el cronómetro…» y la raya. Dos diferencias, a propósito:

- Va **debajo de la barra** (`top: 65px`), no a pantalla entera: así la barra se queda quieta y solo cambia el contenido.
- Justo después va `<script>window.S321_CARGA_T0 = performance.now()</script>`, que marca cuándo empezó a componerse el isotipo. Se retira con un fundido de 250 ms cuando las fuentes están cargadas y el estado recuperado, y dura al menos lo que tarda en componerse el isotipo (su última pieza se enciende a los 1.16 s; nunca menos de 0.8 s). Con «reducir movimiento», quieta y sin raya.

Cuando el sitio la saque a una pieza común, esta página la puede tomar de ahí.

## La vuelta al panel

Al principio del guion (`fuente/guion.js`) están las constantes `VOLVER = '/#herramienta-cronometro'` e `ID = 'actividad'`. Hoy «‹ Cronómetros» y la miga «Cronómetros» llevan a `/#herramienta-cronometro/actividad`. Si el sitio quiere otro formato, se cambia esa línea y se vuelve a construir. Si el JS fallara, el enlace escrito en el HTML lleva a `/#herramienta-cronometro`. «Inicio» y la marca llevan a `/`. Nada abre otra pestaña.

## La tarjeta

La dibuja el sitio con `ficha.json`, `icono.svg` y `vista.webp`:

- Campos: `antetitulo` (en minúsculas; la tarjeta lo pone en versalitas), `nombre`, `lema`, `para_que`, `como_funciona`, `ideas` (tres, para el panel de información de la herramienta; la tarjeta puede usarlas o no), `incluye` (las etiquetas), `abrir`, `icono`, `vista`, `version`, `fecha`. `instruccion` es la frase que la herramienta lleva dentro, por si hace falta.
- `**…**` marca la negrita de los textos: una sola en `como_funciona` (hoy, «no se detiene») y una en cada idea.
- **La ficha se escribe una vez y sirve dos veces.** Los mismos `antetitulo`, `para_que`, `como_funciona` e `ideas` que dibujan la tarjeta son los que la herramienta muestra en su panel de información: `construir.py` los lee de `ficha.json` y los mete en el HTML al construir. Si el sitio corrige un texto de la tarjeta, hay que volver a construir la herramienta para que diga lo mismo por dentro — nunca se editan los dos por separado.
- `vista.webp` es la pieza real con datos de muestra (03:42.6 en marcha, meta 5:00 al 74 %, sin marcas), 1280 × 800, 32 KB. Es una imagen fija y no la herramienta viva: cargarla en cada tarjeta pesa, y el sitio no deja mostrar una página dentro de otra.

## El paso suave entre páginas

La página declara `@view-transition { navigation: auto; }` (y lo apaga con «reducir movimiento»). Solo actúa si la portada también lo declara. Para que la barra se quede quieta, la barra de la portada necesita el mismo `view-transition-name: s321-barra`.

Dentro de la propia página se usa la misma técnica para entrar y salir de pantalla completa: el cambio va dentro de `document.startViewTransition`, y la pieza y la cifra llevan `view-transition-name` (`s321-pieza`, `s321-cifra`) para que el navegador las mueva de un estado al otro en vez de saltar. Son tres nombres en total —`s321-barra`, `s321-pieza`, `s321-cifra`—: **el sitio no debe repetirlos** en otra pieza de la misma página, porque un nombre de transición tiene que ser único.

Los paneles —ajustes, los dos menús y la hoja de comparación— entran y salen con animación. Si el sitio reutiliza estas piezas, la regla es que lo que entra con una animación sale con la suya, y que con «reducir movimiento» todo ocurre al instante.

## Colores: cuatro diferencias entre la portada y la marca

El cronómetro usa los de la marca (`Paleta_de_Colores.txt`). Conviene que el sitio diga si estas fueron a propósito:

| Token del sitio | En el sitio | En la marca |
|---|---|---|
| `--te-base` | `#a8512f` | `#b04a2a` (terracota base) |
| `--pe-claro` | `#346375` | `#2c5c70` (petróleo claro). `#346375` es la «línea de panel» de la paleta nocturna |
| `--ti-base` | `#3d2523` | `#2e2622` (tinta media). `#3d2523` es el fondo de la tarjeta de misión 1 |
| `--f1-claro` | `#f2e2dc` | `#f0dccf` (velo terracota). Esta cuarta no estaba en el encargo |

## Los dos límites de seguridad

- `X-Frame-Options: DENY`: ninguna página se muestra dentro de otra. Por eso el cronómetro se abre como página propia y la tarjeta usa una imagen, no un `iframe`.
- `Permissions-Policy: microphone=()`: no hay micrófono. Por eso no hay botón de dictado; en tableta y teléfono el teclado del equipo ya dicta en cualquier campo.

La herramienta usa la API de pantalla completa y la de pantalla despierta (Wake Lock). La política de hoy no las bloquea; si algún día se amplía, que no incluya `fullscreen=()` ni `screen-wake-lock=()`.

## El panel de información, y por qué el pie dice tan poco

Al abrirse, la herramienta enseña a la derecha —en el mismo lienzo, sin recuadro aparte— qué es y qué se puede hacer con ella: el antetítulo «Un reloj para toda la clase», el para qué, el cómo funciona y tres ideas para la clase. Se oculta con la «i» de la esquina superior derecha y se retira sola en cuanto se toma la primera marca. Es la primera herramienta del menú: conviene que las demás repitan la misma disposición —reloj o pieza a la izquierda, información desplegable a la derecha, tercer botón «i»— para que el maestro aprenda el gesto una vez.

Debajo del nombre de la herramienta no hay instrucción: ahí va, en grande, **el nombre que el maestro le pone a la dinámica**, que es un campo de escritura, sin ninguna raya debajo salvo al tocarlo o pasarle el cursor. Y el pie dice solo `© Secuencia321`: dónde estamos ya lo dicen la barra y las migas.

**Iniciar, Marca y Reiniciar son solo ícono**, igual que en el semáforo: el propio dibujo dice qué hacen, sin repetirlo en letras. El texto sigue en el marcado para quien usa lector de pantalla, y Reiniciar sigue cambiando a «toca otra vez» al pedir el segundo toque. La cifra corre siempre en segundos enteros —no hay nada que elegir ahí—; lo único que se pregunta en Ajustes es la meta, en minutos y segundos.

**La lista de marcas no se abre sola.** Cada ronda empieza con la columna oculta, aunque se esté marcando: se ve a pedido, desde el ícono de la lista junto a Reiniciar («Mostrar marcas»). Ahí mismo, y también en ese ícono de la lista una vez hay alguna ronda guardada, está siempre disponible «Comparar rondas»: se puede abrir en cualquier momento, y si todavía no hay al menos dos rondas con nombres puestos, explica qué falta en vez de mostrar una tabla vacía.

## Lo que este cronómetro hace y ningún otro hará

Conviene que el sitio lo sepa al escribir el panel, porque es lo que distingue esta tarjeta de las demás: **reiniciar no borra, guarda**. La lista de marcas es una ronda; al reiniciar se archiva con su nombre y su número («Equipos 1», «Equipos 2») y empieza otra. Después, **Comparar** cruza los mismos nombres de todas las rondas en una tabla: una fila por persona, una columna por ronda, el mejor tiempo destacado y cuánto cambió de la primera vez a la última. Eso convierte el cronómetro en una forma de evaluar —el mismo grupo dos veces, un grupo contra otro, cada quien contra sí mismo— y es lo que dicen su lema, su «para qué» y sus tres ideas.

**El cupo de marcas**, en Ajustes, es lo que le dice a una ronda cuándo está completa: se activa y se pone cuántas marcas la forman —tres, cuatro, las que sean—. Mientras se marca, una cifra sobre el propio botón de Marca cuenta «2 / 4», «3 / 4»…; al llegar al cupo se tiñe de terracota y la pieza da un destello discreto. No bloquea ni archiva por su cuenta —se puede seguir marcando de más si hace falta—: es un aviso de que ya se puede reiniciar, para archivar esa ronda y pasar a la siguiente con el mismo cupo. Es de toda la ronda, no de cada marca, así que sigue puesto de una ronda a otra.

Todo vive en el navegador del equipo. Nada sale de ahí.

## Otros detalles

- Las tipografías se piden a Google Fonts con la misma dirección que la portada, así el navegador las reutiliza. Se cargan sin bloquear el primer pintado para que la carga salga enseguida.
- Guarda su estado en el navegador con la clave `s321-cronometro-actividad`, esquema `v: 3` (el cupo de marcas se sumó sin cambiar el número: es un dato más, y el navegador que aún no lo conocía lo toma apagado). Además del estado del reloj y de las marcas en curso, guarda `rondas`: las listas ya terminadas, cada una con su nombre base, su número, su precisión y sus marcas. Son de ese navegador y ese equipo; no viajan a ningún servidor y nadie más las ve. El tope son veinte rondas: al pasarlo, la más vieja se deja caer.
- No lee nada del sitio ni llama a ninguna API.

© Secuencia321
