# Cronómetro de bloques · nota para la conversación del sitio

El cronómetro está hecho en su carpeta, sobre la casa común (`_comun/`). Esto es lo que el sitio necesita saber para ponerlo en el panel y publicarlo. El sitio no se tocó.

## Qué publicar y dónde

Solo `index.html`, `tarjeta.html`, `favicon.svg`, `icono.svg`, `vista.webp` y `ficha.json`, en una carpeta sin tildes ni números; por ejemplo `herramientas/cronometro/bloques/`. Todas las rutas internas son relativas. `fuente/`, `construir.py` y esta nota no se publican.

## La versión compacta: `tarjeta.html`

El panel de cronómetros no puede poner la herramienta entera en el carrusel: ocupa toda la pantalla y no es esa la ventana. Por eso la entrega trae además **la carta**, que es lo que el carrusel coloca.

- Es un `<article class="carta" data-s321="tarjeta" data-cronometro="bloques">` con el ícono grande, el antetítulo, el nombre, el lema y **tres claves**. Sin explicaciones —viven dentro de la herramienta— y sin guion: es una pieza quieta, así que poner diez en pantalla no cuesta nada.
- **Se escala con una sola medida.** Todo va en `em` sobre la variable `--carta` (16 px por defecto, 21 em de ancho ≈ 336 × 459 px). El panel le baja `--carta` a las cartas del fondo y se la sube a la del frente; no hay que tocar ninguna otra cifra. A las que no están al frente les pone `data-fondo="si"`, que apaga el botón y los toques.
- El botón «Abrir el cronómetro» apunta al campo `abrir` de la ficha, en la misma pestaña.
- Sale de `fuente/tarjeta.html`, `fuente/tarjeta.css` y `ficha.json` con `construir.py`. El sitio puede publicarla tal cual, o copiar el marcado y el CSS a su plantilla del panel; lo que no debe hacer es escribir los textos a mano, porque entonces la ficha y la carta se separan.

Es exactamente la misma pieza que ya usan Actividad y Etapas: el carrusel se construye una vez y sirve para los cinco cronómetros.

## La barra: `data-s321="barra"`

Arriba del todo hay una barra fiel a la de la portada: el mismo fondo, 64 px más su línea, y la marca a la izquierda (`<img src="favicon.svg">` y el nombre) que lleva a `/`. No trae menús: el sitio pone ahí su barra común. Lleva `view-transition-name: s321-barra`, heredado de la casa común —no hay nada propio que tocar aquí.

## La carga: `data-s321="carga"`

Es la misma pieza de siempre, copiada de la casa: el suelo con su halo, el isotipo de siete piezas con la animación `pieza`, el nombre, la frase «Preparando el cronómetro…» y la raya. Va debajo de la barra (`top: 65px`), no a pantalla entera, y se retira con un fundido de 250 ms cuando las fuentes están cargadas —con un tope de 3.2 s por si algo se demora. Con «reducir movimiento», queda quieta y sin raya. Nada propio de Bloques aquí tampoco.

## La vuelta al panel

A diferencia de Etapas —que tiene su propio botón «‹ Cronómetros» con una ruta escrita en el guion, porque necesita volver a un evento guardado—, Bloques no lleva esa lógica: es la misma miga estática que usan Actividad y Semáforo. «Inicio» y la marca llevan a `/`; «Herramientas» y «Cronómetros» son texto sin enlace, a la espera de que el panel exista. Cuando el sitio tenga la ruta del panel de cronómetros, esos dos tramos de la miga se pueden convertir en enlaces sin tocar nada del guion propio —no dependen de ninguna constante interna.

## La tarjeta

La dibuja el sitio con `ficha.json`, `icono.svg` y `vista.webp`:

- Campos: `antetitulo` (en minúsculas; la tarjeta lo pone en versalitas), `nombre`, `lema`, `para_que`, `como_funciona`, `ideas` (cuatro, para el panel de información de la herramienta), `aprendizajes` (los conceptos que trabaja, ver más abajo), `incluye` (las etiquetas), `abrir`, `icono`, `vista`, `version`, `fecha`. `instruccion` es la frase que la herramienta lleva dentro, por si hace falta.
- `**…**` marca la negrita de los textos: una en `como_funciona` («no mide con precisión: mide para que se vea crecer») y una en cada idea.
- **La ficha se escribe una vez y sirve dos veces.** Los mismos `antetitulo`, `para_que`, `como_funciona`, `ideas` y ahora también `aprendizajes` que dibujan la tarjeta son los que la herramienta muestra en su panel de información: `construir.py` los lee de `ficha.json` y los mete en el HTML al construir. Si el sitio corrige un texto de la tarjeta, hay que volver a construir la herramienta para que diga lo mismo por dentro.
- `vista.webp` es la pieza real con datos de muestra (una actividad de lectura, seis bloques ya caídos de una meta de diez, reloj en pausa a los 6:22), 1280 × 800.

### Un campo nuevo: `aprendizajes`

Esta ficha estrena `aprendizajes`: una lista corta de los conceptos que la herramienta trabaja (para Bloques: medida del tiempo, agrupación y conteo, sistema sexagesimal, relación entre minutos y segundos). Antes no existía. Para que se vea dentro de la herramienta —debajo de las ideas, como un grupo de etiquetas— se amplió `_comun/molde.py`: la función que arma el panel de información (`panel_info`) ahora también busca `aprendizajes` en la ficha y, si está, agrega esa sección. Es un cambio en la casa común, así que alcanza a los cinco cronómetros por igual —pero es retrocompatible: en la ficha de un cronómetro que no tenga el campo, la sección simplemente no aparece, nada se rompe. Vale la pena que el sitio lo sepa porque, si algún día quiere mostrar `aprendizajes` también en la tarjeta o en el panel general, el dato ya está ahí, escrito una sola vez.

## El paso suave entre páginas

La página declara `@view-transition { navigation: auto; }` (y lo apaga con «reducir movimiento»), heredado de la casa. Solo actúa si la portada también lo declara. La pieza conserva su `view-transition-name: s321-pieza` para el paso entre páginas. Una diferencia con los demás: Bloques no tiene el `s321-cifra` que sí llevan Actividad, Etapas y Semáforo, porque en Bloques el tiempo no vive en un recuadro aparte (`.cifra-caja`) sino escrito en el centro mismo de la rueda, dentro del SVG. No hace falta que el sitio haga nada por eso; es solo para que no sorprenda si se lo compara con los otros tres.

Pantalla completa **no** pasa por una transición de vista, y conviene que el sitio no la añada: el aviso del navegador llega mientras la ventana todavía se agranda, así que la transición congela una foto del tamaño viejo encima de la página viva y la suelta de golpe.

Son tres nombres de transición en total en toda la casa —`s321-barra`, `s321-pieza`, `s321-cifra`—: **el sitio no debe repetirlos** en otra pieza de la misma página, porque un nombre de transición tiene que ser único.

Los paneles —ajustes e información— entran y salen con animación. Si el sitio reutiliza estas piezas, la regla es que lo que entra con una animación sale con la suya, y que con «reducir movimiento» todo ocurre al instante.

## Los dos límites de seguridad

- `X-Frame-Options: DENY`: ninguna página se muestra dentro de otra. Por eso el cronómetro se abre como página propia y la tarjeta usa una imagen, no un `iframe`.
- `Permissions-Policy: microphone=()`: no hay micrófono ni falta le hace.

La herramienta usa la API de pantalla completa, la de bloqueo de orientación en pantallas táctiles y la de pantalla despierta (Wake Lock) mientras el reloj corre —igual que Actividad y Semáforo—. La política de hoy no las bloquea; si algún día se amplía, que no incluya `fullscreen=()`, `screen-wake-lock=()` ni `screen-orientation=()`.

## El panel de información

Al abrirse, la herramienta enseña a la derecha —en el mismo lienzo, sin recuadro aparte— qué es y qué se puede hacer con ella: el antetítulo «el tiempo que se ve crecer», el para qué, el cómo funciona, cuatro ideas para la clase y ahora los aprendizajes que trabaja. Se oculta con la «i» de la esquina superior derecha y se retira sola en cuanto cae el primer bloque, para no taparlo. Es la disposición de la casa: reloj o pieza a la izquierda, información desplegable a la derecha, tercer botón «i».

Debajo del nombre de la herramienta no hay instrucción fija: ahí va, en grande, **el nombre que el maestro le pone a la actividad**, que es un campo de escritura. Y el pie dice solo `© Secuencia321`.

## Lo que este cronómetro hace y ningún otro hará

**La acumulación, no el reparto ni las rondas.** Bloques no reparte un total entre tramos (eso es Etapas) ni cuenta rondas de semáforo: una rueda de sesenta marcas se llena una y otra vez —cada vuelta dura un minuto de forma predeterminada, o lo que se elija— y, cada vez que se completa, cae un bloque entero a la bandeja. Los bloques se acumulan a la vista, agrupados de cinco o de diez, hasta llegar a la meta. No hay lista de tramos ni panel de comparación: la herramienta entera es el reloj, la rueda y la bandeja.

**Tres modos, no tres herramientas.** Libre no tiene meta obligatoria más allá de la que se le ponga; Estaciones agrega un botón «Nueva estación» que archiva los bloques logrados con su número y vacía la bandeja para el siguiente grupo —una memoria liviana, de la sesión, no guardada entre recargas—; Reto fija la meta en ocho bloques y anima a superar el propio tiempo. Cambiar de modo no reinicia nada por sí solo.

**Reiniciar borra, no rebobina.** El botón de reiniciar pide un segundo toque en tres segundos (el mismo patrón de confirmación que en Etapas para «Borrar todo») y, al confirmarse, vuelve la rueda, la bandeja y el reloj a cero. No hay deshacer: la seguridad está en el doble toque, no en poder arrepentirse después.

**Pantalla completa siempre visible, a propósito.** En el resto de la casa, entrar en pantalla completa (`html.pc`) oculta los botones de información, ajustes y reiniciar —la idea es una cifra sola, sin distracciones. En Bloques esos tres botones **se quedan a la vista** incluso en pantalla completa: es una decisión de Miguel, repetida más de una vez durante el prototipo, porque acá se sigue tocando «Nueva estación» y se sigue mirando la meta mientras la clase trabaja. El CSS propio de Bloques (`fuente/propio.css`) trae, al final, un bloque que anula esa regla de la casa con mayor especificidad —queda comentado ahí mismo como la única excepción entre los cinco cronómetros—. Si algún día se revisa esa convención general de pantalla completa, conviene revisar primero esta excepción para no perderla sin querer.

## Otros detalles

- Las tipografías se piden a Google Fonts con la misma dirección que la portada. Se cargan sin bloquear el primer pintado.
- Guarda su estado en el navegador con la clave `s321-cronometro-bloques`, esquema `v: 1`: el nombre de la actividad, la duración del bloque, la meta, el modo, los ajustes, los bloques caídos, las estaciones de la sesión y el tiempo transcurrido. Es de ese navegador y ese equipo; no viaja a ningún servidor. Si estaba corriendo al recargar, vuelve en pausa —nunca de un tirón— para no sorprender a nadie.
- No lee nada del sitio ni llama a ninguna API.
- Un detalle de infraestructura, aparte de esta herramienta: al construir, `molde.py` avisó que no encontró el favicon de la habilidad en su ruta de siempre (`Habilidad/secuencia321-generator/recursos/favicon.svg`) —parece que esa carpeta ya no está—. No afectó nada porque Bloques ya traía su propio `favicon.svg`, pero si otro cronómetro se reconstruye sin tener el suyo de antemano, se va a topar con el mismo aviso.

© Secuencia321
