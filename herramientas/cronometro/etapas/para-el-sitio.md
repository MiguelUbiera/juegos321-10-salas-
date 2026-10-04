# Cronómetro por etapas · nota para la conversación del sitio

El cronómetro está hecho en su carpeta, sobre la casa común (`_comun/`). Esto es lo que el sitio necesita saber para ponerlo en el panel y publicarlo. El sitio no se tocó.

## Qué publicar y dónde

Solo `index.html`, `tarjeta.html`, `favicon.svg`, `icono.svg`, `vista.webp` y `ficha.json`, en una carpeta sin tildes ni números; por ejemplo `herramientas/cronometro/etapas/`. Todas las rutas internas son relativas. `fuente/`, `construir.py`, `probar.py` y esta nota no se publican.

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

Al principio del guion (`fuente/guion.js`) están las constantes `VOLVER = '/#herramienta-cronometro'` e `ID = 'etapas'`. Hoy «‹ Cronómetros» y la miga «Cronómetros» llevan a `/#herramienta-cronometro/etapas`. Si el sitio quiere otro formato, se cambia esa línea y se vuelve a construir. Si el JS fallara, el enlace escrito en el HTML lleva a `/#herramienta-cronometro`. «Inicio» y la marca llevan a `/`. Nada abre otra pestaña.

## La tarjeta

La dibuja el sitio con `ficha.json`, `icono.svg` y `vista.webp`:

- Campos: `antetitulo` (en minúsculas; la tarjeta lo pone en versalitas), `nombre`, `lema`, `para_que`, `como_funciona`, `ideas` (tres, para el panel de información de la herramienta; la tarjeta puede usarlas o no), `incluye` (las etiquetas), `abrir`, `icono`, `vista`, `version`, `fecha`. `instruccion` es la frase que la herramienta lleva dentro, por si hace falta.
- `**…**` marca la negrita de los textos: una sola en `como_funciona` (aquí, «no se corta nada») y una en cada idea.
- **La ficha se escribe una vez y sirve dos veces.** Los mismos `antetitulo`, `para_que`, `como_funciona` e `ideas` que dibujan la tarjeta son los que la herramienta muestra en su panel de información: `construir.py` los lee de `ficha.json` y los mete en el HTML al construir. Si el sitio corrige un texto de la tarjeta, hay que volver a construir la herramienta para que diga lo mismo por dentro — nunca se editan los dos por separado.
- `vista.webp` es la pieza real con datos de muestra (la segunda etapa en marcha, reparto de 45:00 en tres tramos), 1280 × 800. Es una imagen fija y no la herramienta viva: cargarla en cada tarjeta pesa, y el sitio no deja mostrar una página dentro de otra.

## El paso suave entre páginas

La página declara `@view-transition { navigation: auto; }` (y lo apaga con «reducir movimiento»). Solo actúa si la portada también lo declara. Para que la barra se quede quieta, la barra de la portada necesita el mismo `view-transition-name: s321-barra`.

Pantalla completa **no** pasa por una transición de vista, y conviene que el sitio no la añada: el aviso del navegador llega mientras la ventana todavía se agranda, así que la transición congela una foto del tamaño viejo encima de la página viva y la suelta de golpe — se ve como un tirón. La pieza y la cifra conservan su `view-transition-name` (`s321-pieza`, `s321-cifra`) solo para el paso entre páginas. Son tres nombres en total —`s321-barra`, `s321-pieza`, `s321-cifra`—: **el sitio no debe repetirlos** en otra pieza de la misma página, porque un nombre de transición tiene que ser único.

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

Al abrirse, la herramienta enseña a la derecha —en el mismo lienzo, sin recuadro aparte— qué es y qué se puede hacer con ella: el antetítulo «El reparto del tiempo, a la vista», el para qué, el cómo funciona y tres ideas para la clase. Se oculta con la «i» de la esquina superior derecha y se retira sola en cuanto se pasa a la segunda etapa. Es la disposición de la casa: conviene que las demás repitan —reloj o pieza a la izquierda, información desplegable a la derecha, tercer botón «i»— para que el maestro aprenda el gesto una vez.

Debajo del nombre de la herramienta no hay instrucción: ahí va, en grande, **el nombre que el maestro le pone a la dinámica**, que es un campo de escritura. Y el pie dice solo `© Secuencia321`: dónde estamos ya lo dicen la barra y las migas.

## Lo que este cronómetro hace y ningún otro hará

**El reparto.** Las etapas llevan nombre y tiempo previsto, y entre todas llenan la barra: cada tramo ocupa su parte del total planeado, encerrado en punteado, y el relleno dice lo que va corrido. Esa barra es el mapa de lo planeado y no se mueve: una etapa que se pasa llena su tramo y se raya, pero no crece, y la lista de la izquierda dice cuánto se fue de más. Un toque cierra la etapa y abre la siguiente; la última termina la actividad, y entonces la cifra grande pasa a decir el total.

Nada dice «clase»: el total se llama **Total**, porque la herramienta vale igual para un taller por estaciones, un examen por bloques o una competencia por turnos. El sitio no debería reintroducir la palabra en el panel.

**Los colores de las etapas** salen de la paleta, en el orden de las misiones: terracota, verde de acierto, petróleo, ciruela, y dos tonos hondos si alguien llega a seis. El máximo son ocho etapas y el mínimo dos. **Los eventos guardados usan la misma escala**: cada tanda se reconoce por su color en el menú de la lista, en la cabecera de la comparación y en la fila del ganador. Si el panel llega a listar eventos por su cuenta, que use ese mismo orden de colores.

**La comparación.** Cruza los eventos guardados con el de ahora por el nombre de la etapa: una fila por etapa, una columna por evento, lo previsto delante y, al final, **quién tardó menos** —con su nombre y su color, o «empate» si coinciden—. No es una tabla de tiempos más: la última columna es la que contesta la pregunta que el maestro trae. Se abre desde el menú de la cabecera de la lista, no desde los mandos.

**Editar donde se ve.** Cada fila de la lista lleva su lápiz —nombre y tiempo de esa etapa, ahí mismo— y al final va la silueta de la que podría venir: trazo discontinuo y un «+», sin rótulo. Se añade y se quita a cualquier hora, también con el reloj andando, y todo lo que se quita ofrece deshacer. El panel de ajustes queda para repartir el tiempo de un vistazo, y se abre por su propio botón de la cabecera.

**Elegir es tomar.** Tocar una etapa la elige: saca sus flechas para llevarla a otro sitio de la columna —con el tiempo que ya se le midió— y, si esa etapa corrió o está corriendo, el botón de Reiniciar pasa a ser el suyo y lo dice: «Reiniciar Inicio». Sin gestos nuevos y sin avisos que leer.

**Guardar es empezar otra.** Al terminar la tanda, el mismo botón que iba pasando etapas ofrece «Guardar»: la archiva con su nombre y su número y abre otra con el **estándar de la casa** —tres etapas, Inicio · Desarrollo · Cierre, de 10, 20 y 10 minutos— y el encabezado «Etapas». No hay que reiniciar. Se vuelve al estándar a propósito: heredar el reparto anterior hacía que la nueva pasara por la misma puesta en cero.

**Los ajustes son del sistema, no de las etapas.** El panel de la cabecera lleva los avisos, el parpadeo de los últimos segundos, el sonido y «pasar sola a la siguiente». Las etapas —nombres, tiempos, cuántas y en qué orden— se cambian en la lista, con el lápiz de cada fila.

**«Borrar todo» barre la herramienta entera**: eventos, evento en marcha, reparto, nombre de la actividad, ajustes y la memoria del navegador. Vuelve como recién abierta, con su deshacer.

**En pantalla táctil, la pantalla completa se pide en horizontal** (`screen.orientation.lock('landscape')`): la cifra es ancha y de pie se parte. Se suelta al salir. En escritorio ni se intenta, así que la política de permisos del sitio no necesita nada nuevo.

**Dos íconos en el encabezado de la lista, y son dos cosas.** La lista despliega los eventos guardados y la comparación; el menos **recoge** las etapas dejando el encabezado en su sitio. Ocultar el panel entero es del menú de abajo, junto a Reiniciar. Mirando un evento guardado aparece además una **X** para eliminarlo, con su deshacer.

## El carrusel en órbita

La nota de la carpeta pide un carrusel con profundidad, al estilo Cover Flow: el activo al frente, los vecinos orbitando, más pequeños y translúcidos. La carta está preparada para eso y no necesita nada más:

- **Escala entera con `--carta`.** Una sola medida en píxeles; todo lo demás va en `em` sobre ella. La del frente con 16, las del fondo con 10 u 11.
- **Se recoge con `data-fondo="si"`.** En el fondo se esconden el lema, las claves y el botón: de lejos se leen el ícono y el nombre, y lo demás solo hace ruido. También apaga los toques.
- **Se atenúa con `--fondo-velo`** (de 0 a 1), sin tocar el CSS de la carta.
- **Se gira desde fuera.** El `transform` —rotación, profundidad, desplazamiento— lo pone el panel; la carta ya trae `transform-style` y `backface-visibility` para que el giro no se vea plano ni dentado.

Con eso, el panel solo tiene que colocar N cartas en una órbita y animar tres variables. Los textos y el ícono ya se los da cada ficha.

## Otros detalles

- Las tipografías se piden a Google Fonts con la misma dirección que la portada, así el navegador las reutiliza. Se cargan sin bloquear el primer pintado para que la carga salga enseguida.
- Guarda su estado en el navegador con la clave `s321-cronometro-etapas`, esquema `v: 2`. Además del reparto y del evento en curso, guarda `eventos`: las tandas ya terminadas, cada una con su nombre base, su número, su total, sus etapas y sus cortes. Son de ese navegador y ese equipo; no viajan a ningún servidor y nadie más las ve. El tope son veinte eventos: al pasarlo, el más viejo se deja caer.
- No lee nada del sitio ni llama a ninguna API.

© Secuencia321
