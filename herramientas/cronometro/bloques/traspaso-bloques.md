# Cronómetro 4 · Minutos en bloques — encargo de traspaso

Para la conversación que tiene la habilidad y el repositorio: esto es lo que se decidió en la conversación del prototipo sobre cómo será y cómo se verá este cronómetro. Se construye en `5_Herramientas/01_Cronómetro/04_Bloques/`, sobre el molde de la casa (`_comun/molde.py`, `_comun/casa.css`), exactamente como Actividad y Etapas. Va acompañado de `prototipo-bloques.html`, en la misma carpeta: un HTML suelto, fuera del molde, solo para ver la mecánica funcionando. No es fuente de nada — la fuente de verdad es este documento.

## Qué es y qué no es

No mide con precisión. Mide para que se **vea** el tiempo construirse: cada bloque que se completa se queda ahí, a la vista. La idea que tiene que quedar clara con solo mirarlo: la rueda se reparte en sesenta partes iguales, se llenan una a una, y cuando se completa cae un bloque — igual que sesenta segundos hacen un minuto, solo que la duración del bloque ahora se puede elegir (ver «Ajustes»), así que en el caso por defecto (un minuto) la lectura sigue siendo literal: sesenta marcas, sesenta segundos. Es primaria y primer ciclo de secundaria: quien todavía no lee un reloj de un vistazo.

De los cuatro que hay hasta ahora, es el más distinto en su mecánica: Actividad mide con marcas y las guarda en rondas; Etapas reparte un total entre tramos con nombre; este no reparte ni guarda rondas — **acumula**, sin más. Por eso no lleva columna de lista ni comparación entre tandas: eso ya lo hacen los otros dos, y meterlo aquí sería la misma herramienta con otra piel.

## Lo que se hereda tal cual de la casa

Todo el chrome de siempre, sin tocarlo: la barra, la carga, las migas, el fondo del escenario con las cifras flotando, la pieza crema con su `p-cab` (ícono, campo de actividad, los tres botones de aplicación), el panel de ajustes desplegable con `aj-rejilla` de dos columnas, el panel de información sobre el mismo lienzo con su botón «i», pantalla completa con la misma reducción de chrome (`html.pc`), los view-transitions de barra/pieza/cifra, el aviso con deshacer, y el pie con solo `© Secuencia321`. Nada de esto se reinventa.

El campo de actividad **parte** del `.dinamica` de siempre — el guion textarea, placeholder «Actividad» en `--ti-guia` — pero aquí, a partir de la quinta vuelta, **sin el borde punteado que Actividad y Etapas sí llevan debajo del nombre**. Fue un pedido explícito («quita la línea debajo del nombre de la actividad, esa línea punteada no debe ir ahí») y se hizo tal cual, pero es una divergencia real del patrón compartido, no un ajuste de detalle: los otros dos cronómetros siguen mostrando esa línea. Vale la pena que quien construya lo sepa antes de copiar el `.dinamica` de Actividad/Etapas sin mirar — aquí el textarea queda sin `border-bottom`, sobre el lienzo, sin ninguna línea propia.

## Lo propio: la rueda y la bandeja

Sin lista lateral, pero **sí a dos columnas** — como la maqueta original, no en una sola columna centrada (esa fue mi primera versión, y no era la correcta: aquí hay sitio de sobra para poner el reloj a la izquierda y la bandeja a la derecha, y visualmente se parece mucho más al resto de la familia):

1. **La rueda**, columna izquierda — sesenta marcas en corona, como hoy, y ya más grande, varias vueltas de ajuste después de la primera versión. No ocupa medio ancho de la pieza: es más chica que en la versión de una sola columna, porque ya no tiene que cargar sola con toda la jerarquía visual — el protagonismo se lo sigue dando el tamaño y el centro, y crece de verdad en pantalla completa, donde se vuelve el elemento dominante (ver «Pantalla completa»). Las marcas se llenan una a una, en `--te-base`, alternando con `--pe-claro` cada diez marcas — la maqueta vieja lo hacía y se quedó: es la misma lectura de «grupos de diez» que después se repite en la bandeja. En el centro va el tiempo real transcurrido desde que se le dio a «Empezar» (minutos : segundos, con la tipografía de `.cifra` de siempre) — no el número de bloques: con eso alcanza para leer con precisión cuánto ha pasado, mientras la rueda y la bandeja cuentan la historia en bloques. El estado («Listo» / «En marcha» / …) ya no va arriba de la rueda: vive a su izquierda, en la misma fila, y la rueda usa el espacio libre que queda a la derecha en vez de quedar centrada sola en su columna — así el conjunto estado+rueda ocupa mejor el ancho disponible.
2. **La bandeja de bloques**, columna derecha — con todo el ancho que antes le faltaba. Un bloque por cada vez que la rueda se completa. Sin caja con borde: los bloques flotan sobre un fondo apenas distinto del papel, y llevan el mismo lenguaje de botón con relieve que ya usan `.b-app` y los mandos de la casa (degradado, realce arriba, sombra abajo) — no un cuadrado plano. Se colorean por su grupo de agrupación, alternando los dos tonos de petróleo, y el último bloque —el que cumple la meta— siempre en terracota, para que se note de un vistazo cuál cerró la meta. Aparecen con un surgir suave — un alzarse y aclararse de un cuarto de segundo, nunca el rebote exagerado de la maqueta vieja. El contenedor **no tiene un ancho fijo**: se calcula por script según cuántos bloques le tocan a la meta configurada, con una regla concreta — de a uno por fila hasta cinco bloques (una sola fila), y recién de ahí en adelante empieza a repartirse en varias filas. Queda reservado así desde antes de empezar — sin texto explicando qué va a pasar ahí, sin hueco vacío de sobra cuando la meta es chica. En pantalla completa los bloques también crecen (a juego con la rueda), y la bandeja recalcula su ancho con la nueva medida — igual si se sale.
3. **Controles**, debajo de las dos columnas, con todo el ancho, y deliberadamente discretos: van bien separados de la rueda y la bandeja, sin quedar pegados al borde inferior de la pieza (eso pasaba en una vuelta anterior), y son más chicos que en la primera versión — siguen siendo el mismo círculo de ícono de la casa, solo que no compiten en tamaño con lo que de verdad importa mirar.

Por debajo de un cierto ancho de pieza (pantalla angosta, columna del sitio muy estrecha) las dos columnas se apilan solas — la rueda arriba, la bandeja abajo — con una `@container` query, no con JavaScript: no hacía falta duplicar lógica para eso.

Entre la cabecera y el cuerpo hay ahora una separación clara (más espacio en blanco, más una línea fina) — en la primera versión el cuerpo quedaba pegado al campo de actividad, y se notaba. Dentro de la cabecera, el nombre de la actividad quedó alineado con la **base** del ícono cuadrado de al lado, no con su centro —el primer ajuste se quedó corto, así que esta vez se ancla directamente al pie de la fila, con un poquito de margen extra hacia abajo—. También creció un poco más de tamaño de letra, y su color bajó de intensidad (más translúcido) para que no compita tanto con la rueda por la atención.

El nombre de la actividad queda arriba, en la cabecera, como en toda la casa — la jerarquía que pedías lo pone cuarto, y en la práctica eso significa que va en el `p-cab` de siempre, no compitiendo con la rueda por el centro de la pieza.

Cuando se abre información, la columna de información entra a la derecha con el mismo mecanismo `con-info` de siempre; el par rueda/bandeja se acomoda en el ancho que quede, sin que la rueda deje de leerse.

**Se eliminó, del todo:** el rótulo «Minutos completos» sobre la bandeja (el prompt base ya lo pedía), el nombre del cronómetro como título visible (queda solo el `<span class="oculto">` para lectores de pantalla — la casa siempre necesita ese título accesible, aunque no se vea), el texto que explicaba qué iba a pasar en la bandeja vacía (sobraba: con el espacio ya calculado y reservado, no hace falta decir «aquí caerá un bloque»), y la palabra «Meta» delante de la cifra — arriba de la bandeja solo queda «5 bloques», sin más.

## Botones: solo íconos, y no es una excepción rara

Iniciar/pausar (▶ / ⏸) y reiniciar (↺) van sin texto, solo ícono — así lo pedía el encargo. Esto no rompe el sistema de botones de la casa: los tres botones de la cabecera (`btn-info`, `btn-ajustes`, `btn-pantalla`) **ya son** botones de solo ícono, con `aria-label` y `title` para quien no los ve. Aquí se hace lo mismo con los mandos principales: un círculo grande en terracota (`.b-app`, escalado) para iniciar/pausar, uno más chico en el tono neutro para reiniciar. La función se reconoce por el ícono, como pide el encargo, y sigue siendo accesible porque el `aria-label` no desaparece, solo el texto visible.

Reiniciar pide un segundo toque en tres segundos, igual que en Etapas (`data-confirmar`) — nadie borra una bandeja de bloques por un roce en la pizarra.

Una nota sobre el ícono de «Ajustes»: en el prototipo lo dibujé a mano (es un HTML suelto, sin acceso a `_comun/iconos.svg`), y el primer intento salió pareciendo un sol, no un ajuste — ya está cambiado por un ícono de deslizadores (tres líneas con un nodo cada una), que es lo que pediste. Pero eso es solo un parche de prototipo: en la construcción real, este botón **no debe dibujar un ícono nuevo** — debe usar `<use href="#i-ajustes"/>` contra el sprite `iconos.svg` de la casa, exactamente como ya hace Etapas (`fuente/cuerpo.html`, línea 75). Si ese símbolo ya existe y se ve bien en Etapas, aquí se hereda tal cual; si no, es una conversación sobre el sprite compartido, no sobre este cronómetro en particular.

## Ajustes

Dos grupos, en la misma rejilla de dos columnas de siempre.

**Duración y meta**
- **Duración de un bloque** — `1 min · 3 min · 5 min · Otra`, en un `.seg`, con el mismo patrón que «Bloques objetivo» (Otra abre un `.campo-num` con teclado numérico). Esto es nuevo, no estaba en el prompt base ni en la primera versión: la rueda seguía sesenta marcas siempre atadas a un minuto real, y no había forma de decirle que un bloque fuera de tres o cinco minutos. Ahora cada una de las sesenta marcas vale «duración ÷ 60» del tiempo real — con la duración por defecto (1 min) eso sigue siendo, literalmente, un segundo por marca, así que el caso más común no cambió en nada; con una duración mayor, la rueda pasa de leerse como «sesenta segundos» a leerse como «sesenta partes iguales del bloque», que sigue siendo la misma lección (agrupar, dividir en partes iguales), solo que ya no es exclusivamente sexagesimal-de-verdad para esos casos. Por eso el reloj central ya no muestra bloques completados : marca en curso, sino el tiempo real transcurrido desde que se empezó — así el número siempre es exacto, sea cual sea la duración que elegiste.
- Bloques objetivo: `5 · 10 · 15 · 20 · Personalizado` en un `.seg`; Personalizado abre un `.campo-num` con teclado numérico del propio dispositivo (`inputmode="numeric"`, igual que los minutos y segundos de Etapas — no hace falta un teclado en pantalla aparte, eso ya lo resuelve el atributo).
- Agrupar de: `5 · 10 · Libre`, también en `.seg`. Cambia solo cómo se acomoda la bandeja; no cambia la meta.

**Avisos**
- «Avisar antes de que se acabe» y «Parpadear en el tramo final» — los mismos dos interruptores de Etapas (`aj-avisar` / `aj-senal`), con el mismo significado: uno es la respiración temprana, el otro el parpadeo final. Ya no dicen «el minuto» ni «los últimos segundos» en el rótulo, para que sigan siendo ciertos con cualquier duración de bloque que se elija. No hacía falta inventar una lista de cuatro opciones para esto — ya existe, y lo aprendieron con Etapas.
- «Sonido al completar un bloque» — interruptor.
- «Sonido al llegar a la meta» — interruptor, como el «Campana al terminar todo» de Etapas.
- «Colorear la rueda de diez en diez» — interruptor, encendido por defecto. Este es el que traía la maqueta original y que casi quité por «simplificar»: quedó, y con razón — apaga solo el efecto visual de la rueda, no toca la bandeja (esa se sigue coloreando por grupo, siempre). Este interruptor en concreto se veía «fugado» de su fila en una revisión — era una etiqueta larga apretando la fila y deformando el interruptor, no un problema solo de este switch; ya no se deforma ninguno, tenga la etiqueta que tenga.
- El resaltado del último bloque y el halo de meta alcanzada (el mismo `.pieza.halo` de la casa) van siempre encendidos, sin interruptor: son la recompensa visual, no una opción que alguien vaya a apagar.

**Variantes**
- Modo: `Libre · Estaciones · Reto`, en un `.seg`. Reto fija la meta en 8 y cambia la frase de estado a «Completar 8 de 8». Estaciones habilita el botón aparte «Nueva estación» (ver abajo). Se quitaron Lectura y Limpieza — en la primera versión ofrecían una sugerencia de nombre fija («Tiempo de lectura», «Tiempo de organización del aula») como chip debajo del campo de actividad, y eso era decidir por el maestro qué se está haciendo. El campo de actividad se escribe siempre a mano, sin sugerencias de ningún tipo — el cronómetro no propone nombres.

## Panel de información

Mismo mecanismo de siempre —«i» arriba a la derecha, se abre por defecto y se retira sola al completarse el primer bloque, igual que Actividad se retira a la primera marca—, y la misma estructura de Etapas, en el mismo orden: título (antetítulo), **para qué**, **cómo funciona**, **ideas para la clase**. En la primera versión del prototipo se me quedó afuera el «para qué» — estaba en el borrador de la ficha pero nunca llegó al panel — y quedó corregido. Contenido:

- **Qué es** (antetítulo).
- **Para qué**: para qué sirve, con ejemplos concretos de uso en el aula (recoger el salón, leer en silencio, una tanda de ejercicios, una estación de trabajo, un reto contrarreloj) y a quién está pensado sobre todo.
- **Cómo funciona**: la rueda se llena mientras dura un bloque (un minuto de forma predeterminada, o lo que se configure); al completarse cae un bloque entero y se agrupa con los demás; todo se decide antes de empezar (duración del bloque, meta, agrupación); al llegar a la meta se detiene sola.
- **Ideas para la clase**: cuatro, no tres — se sumó una sobre el modo Reto que faltaba —, con las palabras clave resaltadas en negrita, igual que hace Etapas en las suyas.
- **Aprendizajes relacionados** — sección nueva, que Actividad y Etapas no tienen: medida del tiempo, agrupación y conteo, sistema sexagesimal, relación entre minutos y segundos.

Esa quinta sección no es solo texto de más: **toca `_comun/molde.py`**. La buena noticia es que solo hace falta enseñarle el campo nuevo — `para_que`, `como_funciona` e `ideas` ya los sabe pintar `panel_info()`, así que esos tres llegan solos en cuanto la ficha real los tenga. Falta enseñarle un quinto bloque —una lista corta, como `ideas` pero sin viñeta de bala si se quiere distinguir de las ideas de aula, o igual si no vale la pena la diferencia— leyendo `aprendizajes` de la ficha. Es un cambio en un archivo común, así que conviene hacerlo consciente: no rompe a Actividad ni a Etapas porque el campo es opcional (`if f.get(clave)`), pero sí es la primera vez que el molde crece.

## Pantalla completa

Se mantiene el botón y el mecanismo `html.pc` de siempre: se va la barra, las migas, el pie y la línea de teclas. **Todo lo demás queda igual que fuera de pantalla completa** — los botones «i» y de ajustes siguen activos, la columna de información se abre exactamente con el mismo mecanismo `con-info`, y si algo estaba abierto al entrar, sigue abierto (no se fuerza ningún cierre). Esto es una corrección sobre la primera versión de este documento (ver «Qué cambié» abajo): había decidido que esos botones desaparecieran en pantalla completa, y no era lo que querías — la misma composición tiene que sostenerse, solo que a mayor tamaño.

La rueda y los bloques crecen un 10 % más de lo que ya habían crecido en la vuelta anterior. Y el espacio arriba y abajo de la pieza se hizo más generoso y más parejo — antes quedaba más aire arriba que abajo, así que el bloque completo (estado, rueda, bandeja, mandos) se veía empujado hacia arriba, con «Meta cumplida» pegado a la cabecera y los mandos pegados al borde de abajo. Con más margen en ambos lados, ese bloque queda mejor repartido dentro de la pantalla.

Ítem aparte: en las capturas de esta vuelta, la barra «Secuencia321» y las migas de arriba seguían viéndose en pantalla completa, cuando deberían desaparecer del todo. La regla que los esconde depende de `:has()`, que en general funciona, pero le agregué un respaldo — el clic en pantalla completa ahora también marca `<body>` con una clase, y esa clase esconde lo mismo por una segunda vía. No lo mencionaste directamente, pero es del mismo tema que estabas revisando, así que lo dejo anotado por si lo notas: si en tu navegador ya no aparecen, este respaldo fue innecesario pero no estorba; si seguían apareciendo, esto lo resuelve.

## Estados y señales

`data-e`: `listo · marcha · pausa · final · cumplida` — los mismos nombres que ya usa Etapas para lo mismo (últimos segundos del bloque en curso, meta alcanzada), para que quien lea el código de los dos cronómetros reconozca el mismo lenguaje. El halo de meta cumplida es el `.pieza.halo::after` de la casa (el velo terracota), reutilizado tal cual — no hacía falta inventar un verde de éxito que no está en la paleta de estos cronómetros.

## Reiniciar, y el modo Estaciones

Reiniciar aquí **sí borra** — a propósito, y es la diferencia de función más marcada frente a Actividad y Etapas, donde reiniciar guarda una ronda o un evento. Una bandeja de bloques no es una lista de nombres que valga la pena comparar entre tandas; guardar «rondas de bloques» sería construir la comparación de Actividad con otro nombre, y el encargo pide justo lo contrario: que esta herramienta se distinga en la función, no que reaparezca la misma bajo otra piel.

Lo único que se conserva de esa idea de «no perder el rastro» es ligero, y solo en modo Estaciones: un botón aparte, «Nueva estación», que archiva cuántos bloques llenó la estación actual en una tira de cifras pequeñas debajo de la bandeja («Estación 1 · 5 — Estación 2 · 7 — …») y pone la bandeja en cero para la siguiente. No abre panel, no compara, no se guarda entre sesiones: es memoria visual de la clase de hoy, nada más.

## `ficha.json` (borrador)

```json
{
  "id": "bloques",
  "orden": 4,
  "nombre": "Minutos en bloques",
  "antetitulo": "el tiempo que se ve crecer",
  "lema": "Cada minuto que pasa se convierte en un bloque que se queda ahí.",
  "para_que": "Primaria y primer ciclo de secundaria, para quien todavía no lee un reloj de un vistazo: recoger el salón, leer en silencio, resolver una tanda de ejercicios, una estación de trabajo. Donde importa que se **vea** el tiempo pasar, no que se mida con precisión.",
  "como_funciona": "Una rueda de sesenta marcas se llena mientras dura un bloque —un minuto de forma predeterminada, o el tiempo que elijas—; al completarse, cae un bloque entero. Los bloques se acumulan a la vista, agrupados de cinco o de diez, hasta llegar a la meta que pusiste. **No mide con precisión**: mide para que se vea crecer.",
  "ideas": [
    "Pon la meta antes de empezar —cinco bloques para leer, diez para ordenar el salón— y la clase **ve cuánto le queda** sin preguntar.",
    "En modo Estaciones, cada grupo llena su propia bandeja **desde cero** al llegar a la mesa: se compara de un vistazo cuántos bloques llenó cada uno.",
    "En modo Reto, fija la meta y anímalos a **superar su propio tiempo** la próxima vez que se mida la misma tarea.",
    "Cuenta hacia atrás desde la meta con preguntas: «si ya van tres bloques, ¿cuántos minutos faltan para cinco?»."
  ],
  "aprendizajes": [
    "Medida del tiempo",
    "Agrupación y conteo",
    "Sistema sexagesimal",
    "Relación entre minutos y segundos"
  ],
  "incluye": ["Duración de bloque configurable", "Meta en bloques", "Agrupar de 5 o de 10", "Pantalla completa"],
  "instruccion": "Escribe el nombre de la actividad y pon la meta en bloques.",
  "abrir": "index.html",
  "icono": "icono.svg",
  "vista": "vista.webp",
  "version": "1.0",
  "fecha": "2026-09-21"
}
```

`aprendizajes` es el campo nuevo que necesita el retoque en `molde.py` descrito arriba.

## Teclas (con teclado)

`Espacio` iniciar o pausar · `R` reiniciar (con el mismo doble toque de confirmación) · `P` pantalla completa. No hace falta más: no hay etapas que recorrer ni marcas que tomar.

## Qué cambié del prompt refinado, y por qué

El prompt que trajiste es una base sólida y la mayoría se quedó igual; esto es lo que ajusté con criterio propio:

- **Las alertas de «al completar cada bloque» y de «los últimos 10 segundos»** pasaron de listas de tres o cuatro opciones cada una a los dos interruptores que Etapas ya usa para lo mismo (avisar / señal) más dos de sonido. Cuatro opciones por evento son más decisiones de las que un maestro va a tocar nunca, y la casa ya había resuelto este problema — usar esa solución en vez de inventar otra es justamente lo que mantiene el ecosistema coherente.
- **El «cambio de color temporal»** al completar un bloque no quedó como opción aparte: un destello ya es un cambio de color momentáneo, así que ofrecer las dos por separado era la misma cosa dos veces.
- **El resaltado del bloque final y el halo de meta alcanzada** se volvieron automáticos en vez de configurables (el prompt los dejaba abiertos con «permitir»). Son la recompensa de terminar; apagarlos no tiene un caso de uso real y sí es un interruptor más que mostrar.
- **«Modo estaciones»** no se implementó como un sistema de eventos guardados y comparables (que es lo que Actividad y Etapas ya hacen): quedó como una tira de memoria ligera, sin panel ni comparación, para no duplicar una función que esta herramienta no necesita repetir.
- El campo de actividad no necesitó ningún cambio de CSS de fondo en las primeras vueltas: el `.dinamica` de la casa ya cumplía lo que pedía el encargo (sin caja, transparente hasta que se usa). Sí necesitó un ajuste fino de espaciado (ver abajo) y, en la quinta vuelta, perdió el borde punteado por pedido explícito (ver «Lo que se hereda tal cual de la casa» — ahí queda anotada la divergencia con Actividad/Etapas).

Una aclaración sobre «colorear de diez en diez»: en mi primer borrador de este documento decía que lo había quitado a propósito. Fue un error — se me fue la mano «simplificando» algo que a ti te gustaba de la maqueta original y que no sobraba en absoluto. Verlo funcionar en el prototipo y comparar con lo que pediste dejó claro que sí debía quedarse, y quedó: en la rueda (interruptor propio) y, como extensión del mismo criterio, en la bandeja (coloreada por grupo, sin interruptor, siempre).

Y en general: la primera versión del prototipo tenía varios problemas reales que solo aparecieron al probarlo — el diseño de una sola columna no dejaba sitio para los controles en pantallas más bajas, el panel de información se quedaba mudo en pantalla completa (un descuido: la regla de CSS no ocultaba nada, y el JavaScript solo cerraba ajustes al entrar en pantalla completa, no información), y el campo de actividad calculaba su alto antes de que cargara la tipografía de la casa, así que el guion quedaba más arriba de donde debía. Los tres quedaron corregidos, junto con el cambio de columna y el retiro de las sugerencias fijas de nombre.

Una segunda vuelta de revisión trajo más correcciones reales, y una novedad:

- **El ícono de «Ajustes»** parecía un sol, no un ajuste — era un ícono dibujado a mano de más (el prototipo no tiene acceso al sprite real de la casa). Se corrigió por uno de deslizadores, y quedó anotado arriba, en «Botones», que la construcción real debe usar el símbolo compartido de `iconos.svg`, no dibujar uno nuevo.
- **La bandeja de bloques** tenía un borde punteado («esas líneas») y un ancho fijo del 100 % de su columna, así que con una meta chica (cinco bloques) sobraba muchísimo espacio vacío. Se quitó el borde, los bloques pasaron a tener relieve de botón (como el resto de los mandos de la casa, en vez de un color plano), y el ancho de la bandeja ahora se calcula según la meta configurada, no según la columna disponible.
- **El texto «Aquí caerá un bloque por cada minuto»** y la palabra «Meta» delante de la cifra se quitaron — no hacían falta, y menos ahora que el espacio ya está calculado y a la vista.
- **La rueda** creció un poco más y quedó mejor centrada en su columna; los mandos de iniciar/reiniciar bajaron de tamaño y se alejaron un poco más de la bandeja, para que se lean como mandos y no como protagonistas.
- **Duración de un bloque configurable** — esto sí es una novedad real sobre el prompt base, no una corrección: hasta ahora la rueda estaba atada a que un bloque fuera siempre un minuto real. Se agregó el ajuste (1 / 3 / 5 minutos, o personalizado) y, como consecuencia, el número del centro de la rueda cambió de significado: antes mostraba bloques completados y segundos del bloque en curso (que solo eran «minutos : segundos» de verdad si un bloque duraba exactamente un minuto); ahora muestra el tiempo real transcurrido desde que se empezó, que es exacto sin importar la duración elegida. Con la duración por defecto (1 min) esto se ve exactamente igual que antes — es un cambio que solo se nota si cambias la duración.

Una tercera vuelta corrigió más, y una de esas correcciones **revierte una decisión mía** de la vuelta anterior:

- **Pantalla completa con los botones ocultos fue un error mío.** En la vuelta pasada decidí que «i» y ajustes desaparecieran al entrar en pantalla completa, pensando que un botón sin nada que abrir era ruido. No era eso lo que pedías: querías la misma composición, solo con la rueda más grande. Ya quedó así — ver «Pantalla completa» arriba.
- **Faltaba el «Para qué»** en el panel de información — estaba escrito en el borrador de la ficha desde el principio, pero nunca lo puse en el HTML del prototipo. Ya está, en el mismo lugar y con el mismo nombre que usa Etapas.
- **El panel de información creció**: más contenido en «Cómo funciona», una cuarta idea (el modo Reto, que no tenía ninguna idea asociada todavía) y palabras clave resaltadas en negrita en las ideas, como ya hace Etapas.
- **La rueda creció de nuevo**, el espacio entre la cabecera y el cuerpo se hizo más claro (antes quedaba pegado al campo de actividad), el nombre de la actividad bajó unos píxeles para alinearse con el ícono, y los mandos de iniciar/reiniciar bajaron de tamaño otra vez y se alejaron más.

Una cuarta vuelta afinó lo mismo, porque los ajustes anteriores se quedaron cortos en dos casos y aparecieron dos problemas nuevos:

- **Los mandos quedaron pegados al borde de abajo** — bajarlos no es lo mismo que pegarlos: les faltaba aire debajo. La pieza ahora tiene más margen inferior, y en pantalla completa mucho más (ver arriba).
- **La alineación de «Actividad» con el ícono seguía sin quedar bien** — el primer ajuste (un padding fijo) no alcanzaba: quedaba a la mitad del ícono, no a su base. Se cambió por un anclaje real a la base de la fila, con un poco más de margen hacia abajo. De paso creció otro poco de tamaño y bajó de intensidad de color, para que no le gane protagonismo a la rueda.
- **En pantalla completa, rueda y bloques crecieron un 10 % más**, y se corrigió cómo se reparte el aire vertical (ver «Pantalla completa» arriba) para que «Meta cumplida» no quede pegado a la cabecera ni los mandos al borde de abajo.
- **La bandeja mantiene una sola fila hasta cinco bloques**, como pediste — antes mi fórmula la partía en dos filas incluso con solo cinco. Recién de seis en adelante empieza a repartirse en más de una fila.
- **El interruptor de «Colorear la rueda de diez en diez» se veía deformado** — no era un error de ese switch en particular, sino que cualquier interruptor con una etiqueta larga podía apretarse y perder su forma; ya no le pasa a ninguno.

Una quinta vuelta corrigió lo que las anteriores dejaron corto, y encontró la causa real de varios síntomas sueltos que venían apareciendo desde la tercera y cuarta:

- **La causa técnica de fondo**: la pieza solo declara contención de **ancho** (`container:pieza/inline-size`), pero varias medidas del prototipo usaban unidades de **alto** de contenedor (`cqh`/`cqb`) — que sin contención de alto no tienen de dónde leer la altura real de la pieza y caen, por especificación, en el alto de la ventana. Eso explica de un tirón varios reclamos sueltos de estas dos últimas vueltas: la rueda a veces se veía más grande de lo que su tope en píxeles debía permitir, y el espacio entre rueda, mandos y bandeja se sentía inconsistente según el tamaño de la ventana. Se cambiaron esas medidas a unidades de alto de **viewport** (`vh`), que sí funcionan de forma confiable en el resto del archivo.
- **Los mandos seguían muy abajo** — «sube el comando de pausar y avanzar, mira dónde queda, súbelo»: con la causa técnica ya corregida, se pudo bajar de verdad el margen superior de los mandos (antes rebotaba entre valores según la ventana; ahora es un valor estable y menor).
- **El estado («En marcha», etc.) pasó de estar arriba de la rueda a estar a su izquierda**, en la misma fila — «podría estar a la izquierda del reloj» — y la rueda, ya sin el estado encima, se corrió un poco hacia la derecha y hacia abajo dentro de su columna, aprovechando el espacio que quedaba libre: exactamente los otros dos pedidos de este mismo punto («por ese reloj baja», «puedes moverlo un poco más a la derecha, hay mucho espacio todavía»).
- **La alineación de «Actividad» con el favicón, tercer intento**: al quitarle el borde punteado al campo (punto siguiente) desapareció también el relleno invisible que ese borde llevaba debajo del texto, así que hizo falta menos margen negativo que antes para anclar el texto a la base del ícono — se ajustó en consecuencia.
- **Se quitó la línea punteada bajo el nombre de la actividad**, por pedido explícito y sin vuelta atrás: «esa línea punteada no debe ir ahí». Aplicado tal cual — pero es una divergencia real del `.dinamica` que comparten Actividad y Etapas, no un matiz menor, y queda anotada arriba, en «Lo que se hereda tal cual de la casa», para que quien construya no la pierda de vista ni la copie sin querer de los otros dos cronómetros.

## Lo que decidí sin devolverlo como pregunta

La rueda y la bandeja van lado a lado —rueda a la izquierda, bandeja a la derecha—, como en la maqueta original, apilándose solo si la pieza queda muy angosta. El ancho de la bandeja se calcula, no es fijo. Los bloques tienen relieve de botón. El reloj central muestra tiempo real transcurrido, no bloques completados, para que siga siendo exacto con cualquier duración de bloque. Los nombres de estado (`final`, `cumplida`) son los mismos que Etapas. El halo de meta reutiliza el de Actividad/Etapas en vez de inventar un verde de éxito. Las teclas son las mínimas necesarias. Nada de esto queda pendiente de tu revisión — si algo no te convence al verlo funcionar en el prototipo, se ajusta ahí mismo antes de construirlo de verdad.

© Secuencia321
