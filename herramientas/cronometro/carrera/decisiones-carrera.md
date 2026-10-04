# Cronómetro 5 · Carrera de equipos — decisiones de construcción

Este documento acompaña la entrega. Cuenta qué se construyó, qué se tomó tal cual del prompt que trajiste (el que armó otra IA como base) y qué se cambió con criterio propio, y por qué. Está construido en `05_Carrera/`, sobre el molde de la casa (`_comun/molde.py`, `_comun/casa.css`), exactamente como Actividad y Etapas — no se tocó nada de la casa común: todo lo propio de esta herramienta vive en sus tres archivos de `fuente/`.

## Qué es y qué no es

Una carrera de equipos: todos salen a la vez con el mismo reloj, y cada equipo marca su propia llegada al terminar. No reparte un total entre tramos (eso es Etapas) ni guarda rondas para compararlas entre sí (eso es Actividad) ni acumula bloques visuales (eso es Bloques). Aquí se compara una sola cosa: **cuánto tardó cada equipo en la misma tarea**, todos arrancando juntos. Sirve para una tanda de problemas, un relevo, clasificar tarjetas, armar una figura, un reto de estimación — cualquier actividad que varios equipos resuelven al mismo tiempo y terminan en momentos distintos.

## Lo que se hereda tal cual de la casa

Todo el chrome de siempre, sin tocarlo: la barra, la carga, las migas, el fondo del escenario, la pieza crema con su `p-cab` (ícono, campo de actividad, los tres botones de aplicación), el panel de ajustes desplegable, pantalla completa con la reducción de chrome (`html.pc`), los view-transitions de barra/pieza/cifra, el aviso con deshacer, y el pie con solo `© Secuencia321`. El campo de actividad es el `.dinamica` de siempre. Los campos de minutos y segundos de la meta usan el mismo `.campo-num` con teclado numérico que ya usa Etapas para su reparto. Los íconos de los botones —información, ajustes, pantalla completa, sumar equipo, quitar equipo, terminó— salen todos del sprite compartido `iconos.svg`; no se dibujó ninguno nuevo.

## Lo propio: los carriles, el podio y el editor de equipos

La pantalla principal no es solo la cifra, como en Actividad: se reparte entre la cifra (moderada y fija, ya no crece automáticamente para llenar todo el alto) y la pista de carriles, que es lo que hay que leer de un vistazo durante la carrera. Cada carril lleva su número (también es la tecla que lo marca), su nombre editable, una barra de avance y, a la derecha, un botón que cambia según el estado: un visto mientras el equipo sigue corriendo, y su puesto («1.º», «2.º +17 s») en cuanto llega — tocar el puesto deshace la llegada, por si alguien se equivocó al marcar. Debajo de los carriles va un podio discreto: una tira de globos con los tres primeros y su tiempo, no una tabla.

Los colores de los seis equipos posibles son los mismos que ya usa Etapas para sus tramos —terracota, verde, petróleo, ciruela, y dos hondos si hacen falta cinco o seis—, para que un carril y un tramo se lean como el mismo tipo de cosa en toda la familia.

Por debajo de cierto ancho de pieza, cada carril se reacomoda solo (número y nombre arriba, barra abajo con todo el ancho) con una `@container` query — no hizo falta JavaScript para eso.

## El tiempo compartido: cómo quedó resuelto

El prompt pedía un tiempo de referencia que no detiene la carrera ni descalifica a nadie, y ahí es donde tomé una decisión de diseño que el prompt dejaba abierta: en vez de dibujar una barra de progreso aparte para ese tiempo (que hubiera competido por espacio con la cifra y los carriles, y hubiera sido una segunda cosa que leer), es **una línea discontinua que cruza la escala y los carriles**, con un puntito arriba. Dimensiona la pista, se ve de un vistazo dónde está la meta respecto a cada equipo, y no ocupa un solo píxel de más. Al pasarla, lo único que cambia es una nota neutra junto al puesto de quien llegó después — «fuera de tiempo», en el mismo tono visual que los demás puestos, nunca en rojo ni con un ícono de error: informa, no penaliza. Eso sí estaba explícito en tu encargo y se respetó al pie de la letra.

## Botones: solo íconos

Seguir/pausar y reiniciar van sin texto, como pediste — un botón redondo grande para el primero, uno chico y discreto para el segundo, ambos ya del lenguaje de mandos de la casa. Reiniciar pide un segundo toque en tres segundos antes de hacer nada, igual que en Etapas: nadie borra una carrera por un roce en la pizarra.

## Ajustes

Dos grupos, en la rejilla de dos columnas de siempre:

**Equipos** — de 2 a 6, cada uno con su color, su nombre (editable ahí mismo o directamente en su carril) y un botón para quitarlo. Se administran antes de la salida; en cuanto arranca el reloj quedan fijos —ni se añaden ni se quitan a mitad de carrera— para que nadie cambie las reglas ya empezada.

**Tiempo compartido** — los minutos y segundos de referencia, y tres interruptores: avisar antes de llegar al tiempo, destacar al pasarlo, sonido al llegar cada equipo. Más abajo, un segundo grupo pequeño para el taller: mantener la pantalla despierta y campana al terminar la carrera entera.

## Panel de información

Se abre por defecto, a la derecha, en el mismo lienzo — el mecanismo `con-info` de siempre, con su botón «i» en la cabecera. Con una diferencia a propósito frente a Actividad y Etapas: **no se retira sola**. Las otras herramientas la cierran en un momento natural (la primera marca, la primera etapa) porque ese momento existe; aquí no lo hay, porque los equipos pueden llegar en cualquier orden y no hay un "primer evento" que marque que ya se entendió la mecánica. Queda a criterio de quien la usa cerrarla cuando quiera más sitio para los carriles.

## Pantalla completa

Igual que en el resto de la familia: se va la barra, las migas, el pie; el botón «i» se oculta, como en toda la casa en este modo. **Ajustes y Reiniciar son la excepción** —ver la «Tercera vuelta» más abajo—: a diferencia de Actividad y Etapas, aquí conviene tenerlos a mano sin salir de pantalla completa. La cifra crece bastante más que en el resto de la familia y la pista de carriles es lo que más aprovecha el alto extra.

## Reiniciar: por qué sí borra (con una red de seguridad)

Aquí está la diferencia de función más marcada frente a Actividad (que guarda rondas) y Etapas (que guarda eventos): **reiniciar borra los tiempos de la carrera y empieza otra, sin archivar la anterior.** Es una decisión a propósito, no un descuido — una carrera de equipos se repite muchas veces seguidas en una misma clase (una tanda, luego otra, luego otra), y pedir que cada vuelta se guarde con nombre y se pueda comparar después sería más fricción que ayuda: esa necesidad ya la cubren Actividad y Etapas, cada una a su manera, y repetirla aquí sería la misma herramienta con otra piel.

Como red de seguridad, reiniciar sí deja un margen: además del doble toque para confirmar, aparece el mismo aviso con «Deshacer» que usa el resto de la casa para acciones que se pueden lamentar, con cinco segundos para recuperar la carrera completa —equipos, tiempos y todo— si el reinicio fue un error.

## `ficha.json`

```json
{
  "id": "carrera",
  "orden": 5,
  "nombre": "Carrera de equipos",
  "antetitulo": "la misma salida, un tiempo por equipo",
  "lema": "Todos salen a la vez; cada equipo marca su propia llegada.",
  "para_que": "Cualquier reto que varios equipos resuelven al mismo tiempo y terminan en momentos distintos: una tanda de problemas, un relevo de ejercicios, clasificar tarjetas, armar una figura, un reto de estimación. Lo que se compara es cuánto tardó cada uno, no quién empezó antes.",
  "como_funciona": "Todos los equipos salen con el mismo reloj. Cada uno marca su propia llegada al terminar: su carril se congela, guarda el tiempo y muestra el puesto. El primer puesto no es lo único que cuenta: antes de darlo por bueno conviene revisar el procedimiento, la cooperación o si el resultado está correcto.",
  "ideas": ["…tres ideas para la clase…"],
  "incluye": ["Hasta 6 equipos", "Salida y llegada por equipo", "Tiempo compartido de referencia", "Pantalla completa"],
  "instruccion": "Escribe el nombre de la actividad, arma los equipos en Ajustes y da la salida.",
  "abrir": "index.html", "icono": "icono.svg", "vista": "vista.webp",
  "version": "1.0", "fecha": "2026-09-21"
}
```

(el texto completo de `ideas` va en el archivo; aquí se resume para no repetirlo).

## Teclas

`Espacio` da la salida o pausa · `1`–`6` marcan la llegada de cada equipo · `R` reinicia (con el mismo doble toque) · `P` pantalla completa.

## Qué cambié de tu prompt (el que armó la otra IA), y por qué

Lo tomé como pediste: como base para trabajar, no como instrucciones a seguir al pie de la letra. La mayor parte se respetó — la idea central, el tiempo compartido sin descalificar, los mandos de solo ícono, la administración de equipos en Ajustes, quitar los decimales. Esto es lo que ajusté:

- **El panel de información no es una ventana modal ni una hoja aparte, como el prompt lo dejaba abierto a interpretar** («modal / barra lateral / superposición»). Es el panel lateral fijo de toda la casa —el mismo mecanismo que ya usan Actividad y Etapas—, porque esa es la convención que hace que un maestro que ya conoce un cronómetro de la familia reconozca el gesto en los demás sin tener que aprenderlo de nuevo. Inventar un modal aquí habría roto esa coherencia por una sola herramienta.
- **Las alertas del tiempo compartido** se simplificaron a los dos interruptores que Etapas ya usa para lo mismo (avisar antes / destacar al pasar), más uno de sonido — en vez de una lista larga de opciones por evento. La casa ya había resuelto este problema exactamente una vez; usar esa solución en las cinco herramientas es lo que las hace sentir como una familia y no como cinco maneras distintas de preguntar lo mismo.
- **El tiempo compartido se dibuja como una marca en la escala, no como una segunda barra de progreso** — ver la sección de arriba. El prompt pedía la función (una referencia que no detiene ni descalifica) pero no decía cómo debía verse, y una barra aparte hubiera sido redundante con los carriles.
- **La meta no tiene límite de tiempo tipo cuenta regresiva**: es una referencia de lectura, nunca un cronómetro que se agota. Esto ya lo pedía tu encargo explícitamente y se respetó sin cambios.
- **Nombres de equipos por defecto** («Los Primos», «Las Fracciones», «Equipo Pi», «Los Enteros») en vez de «Equipo 1», «Equipo 2» — un detalle menor, pero es más fácil identificar un carril por un nombre que por un número repetido en dos sitios (el carril y la tecla).

## Lo que decidí sin devolverlo como pregunta

El ícono propio de la herramienta (tres carriles de colores con la meta cruzándolos) sale directamente del elemento más distintivo de la pantalla, siguiendo el mismo criterio que ya tienen el reloj de Actividad y la barra repartida de Etapas: el ícono es un resumen visual de lo que la herramienta hace, no un cronómetro genérico. El panel de información no se cierra sola —ver arriba— porque no hay un momento natural para hacerlo, y forzar uno artificial (por ejemplo, al primer equipo en llegar) hubiera sido arbitrario. Reiniciar borra en vez de archivar, con la razón explicada arriba; si más adelante hace falta guardar carreras para compararlas entre grupos, es una conversación aparte, no algo que se coló por accesorio.

## Un problema que salió recién al probarlo

Construí la herramienta y la probé de verdad en un navegador antes de entregarla —no solo revisando el código—, y encontré un error real: como esta herramienta no tiene la columna de "lista" que sí tienen Actividad y Etapas (aquí no hay eventos guardados que mostrar ahí), el reloj y el panel de información terminaban compitiendo por el mismo lugar en la pantalla y el reloj se quedaba con ancho cero — invisible. Quedó corregido diciéndole explícitamente a cada uno en qué columna va, sin tocar nada de la casa común. Lo cuento porque es el tipo de cosa que solo aparece al probar la herramienta funcionando, no leyendo el código, y ya quedó resuelto y probado.

## Segunda vuelta: lo que cambió después de probarla tú mismo

Esto ya no viene del prompt original ni de mi primera entrega: lo pediste después de correr la herramienta de verdad y verla en pantalla, con capturas señaladas a mano. Queda anotado aparte, con la misma lógica de siempre —qué cambió y por qué—, para que este documento siga contando la historia real de la herramienta.

**Se fue el tiempo compartido; llegaron las alertas por equipo.** La marca de referencia en la escala —la línea discontinua, la nota «fuera de tiempo»— desaparece por completo, junto con la escala misma. En su lugar, Ajustes tiene un intervalo configurable («alertar cada 1 min», por ejemplo): cada equipo que sigue corriendo recibe un aviso —un anillo de su propio color alrededor de su carril, con sonido opcional— cada vez que se cumple ese intervalo desde la salida. El que ya llegó no vuelve a recibirlo, porque el aviso se calcula por equipo, no por un reloj único para todos. Es una idea más simple de aplicar ahora mismo que la versión más grande que describiste —con pausa individual por equipo y tiempo que se arrastra entre etapas—, que quedó fuera de esta entrega a propósito (ver más abajo).

**Las advertencias, solo donde se pierde algo.** El aviso con «Deshacer» —el único tipo de advertencia que queda en la herramienta— sigue apareciendo exactamente donde ya aparecía: al quitar un equipo en Ajustes y al reiniciar la carrera. No se agregó ni se quitó ningún otro aviso; era el único lugar donde existía.

**La pantalla principal, reorganizada.** El reloj y los carriles ya no se apilan: la cifra manda y se lleva las tres cuartas partes del ancho, con los carriles en una columna a su derecha —se reacomodan solo en una sola columna cuando la pantalla es angosta. El campo de «Actividad» perdió la línea punteada de abajo (en todos sus estados, no solo sin foco), quedó un poco más grande y bajó para alinearse mejor con el ícono. Los botones de seguir/pausar y reiniciar se hicieron más chicos. El panel de información ahora empieza cerrado en vez de abierto —antes competía por espacio con la cifra y los carriles desde el primer vistazo—; se abre igual que siempre con la «i» de la esquina. Por último, ya no queda el texto «Nadie ha llegado todavía» en el podio vacío: simplemente no muestra nada hasta que llega el primer equipo.

**Lo que describiste y todavía no construí: pausa individual por equipo.** Es la parte más grande de lo que pediste, y la dejé fuera de esta entrega a propósito, no por descuido. Lo que describiste —poder pausar el reloj de un equipo en particular sin detener a los demás, pensado para carreras con varias etapas— es un cambio de fondo en cómo funciona el cronómetro, no un ajuste visual, y lo explicaste como una idea todavía abierta, con dos maneras distintas de resolver qué pasa con el tiempo sobrante de un equipo al pasar a la siguiente etapa (que se lo lleve consigo, o que cada etapa empiece de cero para todos). Prefiero preguntarte cuál de las dos quieres —o si es la otra idea que mencionaste, un tiempo total fijo con pausas individuales al terminar— antes de construir cualquiera, porque son dos herramientas distintas por dentro y adivinar mal significa rehacerla.

## Tercera vuelta: lo que probaste tú mismo, en pantalla completa

Esto viene de una segunda ronda de pruebas tuyas, ya con capturas de la pantalla completa en uso real de salón.

**Ajustes y reiniciar, ahora sí disponibles en pantalla completa.** Actividad y Etapas los ocultan ahí a propósito —todo se prepara antes de empezar—, pero en Carrera se justifica lo contrario: revisar el intervalo de alertas o reiniciar la carrera son cosas que pueden hacer falta a media clase, sin salir de pantalla completa. Se pisa esa regla de la casa solo para esta herramienta, sin tocar `casa.css`. La información («i») se queda oculta, como en el resto de la familia —no lo pediste para ella.

**Lo que reportaste como "no funciona" en pantalla completa era, en realidad, dos cosas separadas.** Añadir o quitar equipos, y configurar el intervalo de alerta, ya funcionaban —lo comprobé de nuevo—, pero el botón de Ajustes que los abre estaba oculto por la regla de arriba, así que no había forma de llegar a ellos sin salir de pantalla completa; ya quedó resuelto. Aparte, los equipos se fijan al dar la salida —es a propósito, para que nadie cambie las reglas a mitad de carrera— así que «Añadir equipo» no hace nada mientras la carrera está corriendo; el aviso «Los equipos quedaron fijos al dar la salida» ya lo explica en el propio panel.

**El cronómetro, más grande en pantalla completa; los mandos, más chicos y más lejos.** Antes, el tamaño de la cifra no cambiaba nada al entrar a pantalla completa —una fórmula que no le tocaba a esta herramienta—; ahora sí crece bastante ahí, pensado para leerse desde el fondo de un salón. Seguir/pausa se encogió y se alejó de la cifra, con reiniciar de vuelta a su lado.

**El puesto ya no se separa del carril de su equipo.** Cuando la pista queda angosta —que en esta herramienta es casi siempre, porque comparte pantalla con la cifra—, antes el visto o el puesto de cada equipo se armaban todos juntos arriba, en su propia fila, separados de las barras de colores; como esos botones no llevan color, no se distinguía cuál era de cuál. Ahora se quedan siempre en la misma fila que la barra de su equipo, al final, para que la posición ya diga de quién es.

**El podio ya no se amontona.** Antes, si no cabían los tres primeros lugares en una fila, se apilaban uno debajo del otro. Ahora se quedan siempre en una sola fila horizontal; si no caben todos, esa fila se desliza en vez de apilarse.

**El campo de «Actividad», otra vez más grande.** Subió un 25% más sobre el tamaño de la ronda anterior, y bajó un poco más para quedar a nivel del ícono.

**Una pregunta que dejo abierta, no adiviné una respuesta:** preguntaste dónde se configura cuánto dura la carrera completa. Ahora mismo no existe eso —desde la ronda anterior, por pedido tuyo, esta herramienta no tiene un tiempo total ni cuenta regresiva: cada equipo corre hasta que marca su propia llegada, sin límite. Lo que sí hay es el intervalo de alertas («avisar cada 1 minuto»), que es distinto: es un recordatorio que se repite, no un límite que corta la carrera. Si quieres un tiempo total además de eso —una carrera que se corte sola a los, por ejemplo, 4 minutos—, dímelo y lo agrego; no quise construirlo sin confirmarlo porque no sé si es lo que buscas o si con el intervalo de alertas ya te basta.

## Cuarta vuelta: un error real y una limpieza de la pantalla completa

Esta ronda salió de probar tú mismo en pantalla completa, con capturas de la herramienta ya en uso. Encontré un error mío real y aplicé una serie de simplificaciones que pediste.

**El error: Ajustes se quedaba pegado en pantalla completa y no había forma de cerrarlo.** Vino de cómo forcé el panel a mostrarse en pantalla completa la ronda pasada: la regla no distinguía entre «mostrado» y «cerrado», así que el botón «Cerrar» sí actualizaba el estado por dentro, pero la pantalla nunca reflejaba el cierre. Con eso pegado encima de todo, el cronómetro se veía roto —no era una impresión, realmente lo estaba. Ya quedó corregido y esta vez lo probé abriendo y cerrando el panel varias veces seguidas en pantalla completa antes de darlo por bueno, no solo una vez como la ronda pasada, que fue justo lo que dejó pasar el error.

**El podio, fuera.** La tira con los tres primeros lugares y su tiempo, debajo de los carriles, se quita por completo —tanto el elemento como el código que lo llenaba. Ya no hace falta: el carril de cada equipo, congelado con su puesto, ya cuenta esa historia.

**El puesto, sin el «+N s».** Antes cada puesto mostraba, además del número, cuánto tiempo llevaba de diferencia con el primero («2.º +17 s»). Se quita esa parte: ahora solo dice «1.º», «2.º», «3.º», «4.º» — la diferencia ya se ve a simple vista en las barras.

**Se quitó la lista de teclas de Ajustes.** Ese bloque («Espacio: salida o pausa», «1–6: marcar la llegada», etc.) desaparece de la pantalla. Ojo: esto quita la lista visible, no las teclas en sí —Espacio, R, 1–6 y P siguen funcionando igual que antes. Si en realidad querías que las teclas dejaran de responder, dímelo y las desactivo también.

**La barra de scroll de Equipos, que aparecía sin hacer falta.** Con 4 o hasta 6 equipos, el contenido casi siempre cabe entero en la caja, pero un redondeo de un par de píxeles del navegador —más visible en Windows, donde la barra no es delgada— hacía aparecer una barra de scroll igual. Ahora se mide de verdad si hace falta antes de mostrarla; con pantallas muy bajas, donde de verdad no caben los 6 equipos, la barra sigue apareciendo cuando corresponde.

**Pantalla completa: cifra bastante más grande, mandos más lejos y abajo, «Actividad» más arriba.** La cifra creció de forma notable, pensada para leerse desde el fondo del salón; los mandos de seguir/reiniciar se alejaron y bajaron; y el campo de «Actividad» subió, porque estaba calibrado contra el ícono normal y en pantalla completa el ícono es más chico, así que el mismo margen lo dejaba más bajo de lo que se ve en el resto de la pantalla.

## Quinta vuelta: la píldora del tiempo se recortaba, y «preliminar» quedó claro

Una captura tuya con un círculo alrededor de los puestos mostró un error de verdad: la cifra del tiempo de cada equipo (el «00:03» dentro de la barra de color) se veía cortada por la izquierda, con un par de manchitas de color donde debería estar el número. No era una pieza fuera de lugar ni algo que yo hubiera tocado esta ronda —ya existía— sino que la columna donde vive esa píldora podía quedar más angosta que la propia píldora, y como esa columna recorta lo que no cabe, se comía un pedazo. Pasaba casi siempre que la pantalla no era angosta de verdad, sino que el panel de información estaba abierto al lado. Ya tiene un mínimo garantizado para que la píldora quepa siempre entera, se mida donde se mida.

De paso aclaraste algo que yo tenía entendido al revés: «pantalla preliminar» es la pantalla normal, la de antes de entrar a pantalla completa —no pantalla completa, como asumí en la vuelta pasada. Con eso corregido:

**En la pantalla normal (preliminar): el número del cronómetro, triplicado.** Se veía chico; ahora es tres veces más grande, tanto de lado con los carriles como cuando se apila arriba de ellos en una ventana angosta.

**En pantalla completa: el número se redujo un 30%, y los mandos se agrandaron un 25%.** Con la cifra ya bien grande desde la vuelta pasada, ahora se achica un poco para dejar más equilibrio; seguir y reiniciar crecieron y se movieron más abajo y hacia la izquierda. El número y su «Finalizada»/«Corriendo» subieron con él, así que ya no quedan a la misma altura que la fila de equipos — quedan a otro nivel, tal como pediste.

## Sexta vuelta: el nombre del equipo ya se puede escribir en dos líneas

Todo esto salió de otra captura tuya, ya en pantalla completa.

**El nombre de cada equipo ahora crece solo, como «Actividad».** Antes era un campo de una sola línea que recortaba con puntos suspensivos («Las Fr…») si el nombre no cabía. Ahora es del mismo tipo que el campo de Actividad: si el nombre es largo, se envuelve en una segunda línea —o una tercera, si hace falta— y la fila entera crece con él, sin que se le monte encima ni se corte. El resto de la fila (el número, la barra, el puesto) se queda centrado con ella, así que no pierden su alineación aunque una fila sea más alta que las de al lado. También ensanché un poco la columna del nombre y separé más el puesto de la barra, para que un nombre largo tenga aire de sobra antes de necesitar la segunda línea.

**En pantalla completa: el número del cronómetro, un 20% más grande; el botón de seguir, un 20% más chico.** Había quedado grande de más al lado de reiniciar —ya vuelve a la proporción de antes entre los dos. Ambos botones tienen ahora un poco de relieve —una sombra que se acorta y el botón que baja al presionarlo— para que no se sientan tan planos.

**Los mandos, más abajo y más a la izquierda; los equipos, pegados al pie.** Seguir/reiniciar se alejó más del número, y la fila de equipos ya no se centra verticalmente sino que se asienta cerca del borde inferior —para que el número (ya subido) y los equipos queden claramente en niveles distintos.

Una aclaración: donde pediste medidas exactas en «líneas» o «letras» para separaciones puntuales, usé mi criterio para el tamaño real en píxeles —tomarlas al pie de la letra habría dejado espacios exagerados que no caben con 5 o 6 equipos en pantalla. Si al verlo alguna separación te queda corta o larga, dímelo con esa referencia («un poco más», «bastante menos») y la ajusto.

## Séptima vuelta: el tiempo se rediseñó, y el número bajó en pantalla completa

**El tiempo de cada equipo ya no se marca mientras corre —solo al llegar—, y perdió su recuadro blanco.** Antes, todos los carriles mostraban un número que corría en vivo dentro de un recuadro blanco sobre la barra; era eso, precisamente, lo que se veía «superpuesto» al pasar de pantalla completa a la normal. Ahora la barra avanza sola, sin número, mientras el equipo sigue corriendo; en cuanto marca su llegada, ahí aparece su tiempo —sin caja, en letra clara escrita directamente sobre el color del equipo, a la izquierda de su barra. Si un equipo llega muy rápido y su barra queda angosta al lado de las demás, la barra le reserva el ancho mínimo para que el número siempre tenga dónde sentarse sobre el color, nunca por fuera de él.

**En pantalla completa: el número había quedado pegado arriba, junto a «Actividad»; ya bajó.** También se corrió un poco a la izquierda. Seguir y reiniciar crecieron otro 20% los dos por igual —se veían chicos.

## Octava vuelta: el menú de Ajustes, más limpio; los equipos, por fin bien abajo en pantalla completa

Esta ronda junta dos capturas: una del menú de Ajustes (la lista de equipos, sin círculo, solo comentada por escrito) y otra de pantalla completa, «En pausa», con un círculo sobre el equipo «2 · Las Fracciones».

**El menú de Ajustes: letra un poco más chica, sin la frase de abajo, y sin la barra de scroll que sobraba.** Bajé un punto el tamaño de toda la letra del panel —el título, los rótulos, los nombres de equipo, los campos de alerta, el botón «Añadir equipo»—, siempre dentro del propio Ajustes, sin tocar esos mismos elementos en el resto de la herramienta. Quité la frase «De 2 a 6 equipos. Se fijan al dar la salida.» que estaba bajo ese botón. Y la barra de scroll horizontal que aparecía bajo la lista de equipos —un sobrante de un par de píxeles, del mismo tipo que ya habíamos resuelto en vertical en la Cuarta vuelta, más visible en Windows— ya no puede aparecer; de paso, la «X» de quitar equipo quedó un poco más chica y discreta, como pediste. El campo del nombre, dentro de Ajustes, ya se comportaba como una celda de Excel —se desplaza solo para mostrar la parte que estás escribiendo—, así que ahí no hacía falta tocar nada.

**En pantalla completa: encontré por qué «bajar el grupo de equipos» no se notaba, y lo corregí de raíz.** La ronda pasada dejé una regla para asentar los equipos cerca del pie de la pantalla, pero esa regla nunca tuvo efecto real: el bloque de equipos ya estaba estirado para llenar todo el espacio disponible, así que no quedaba nada de sobra para empujar hacia abajo — pedías que bajara y, aunque el código lo intentaba, no había dónde. Ya corregido: el grupo de equipos ocupa solo el espacio que necesita y se asienta bien al fondo, notoriamente más abajo que antes, lejos del número.

**La letra o el nombre que se montaba sobre el número del equipo, al pasar el mouse por encima, ya no se monta.** En pantalla completa, la insignia de color de cada equipo se había agrandado en una ronda anterior, pero la columna donde vive seguía con el ancho de antes —más angosta que la insignia—, así que se salía un poco de su celda y el resaltado del nombre, al pasar el mouse, quedaba encima de ella. Ya tiene el ancho correcto.

**Las filas de equipos, un 20% más grandes en pantalla completa** —la insignia, la barra, el nombre y el tiempo—, aplicado después de bajar el grupo, tal como pediste.

## Novena vuelta: un ajuste fino de lo ya corregido, en las dos pantallas

Esta ronda pedías «mucho cuidado» para ver si aquí podíamos frenar las idas y vueltas. Cada cambio se hizo por separado, sin tocar los demás, y probé los dos escenarios —4 y 6 equipos, con el mouse encima de los nombres— antes de dar esto por bueno.

**En pantalla preliminar (la normal, antes de entrar a pantalla completa):**

- El número del cronómetro ya no queda centrado: se alinea a la izquierda, pegado al borde de la tarjeta, junto con «Actividad» —donde señalaste con la línea vertical.
- La insignia, la barra, el nombre y el puesto de cada equipo son un 25% más grandes.

**En pantalla completa:**

- El grupo de equipos subió —ya no queda pegado tan al fondo como en la ronda pasada.
- Seguir y reiniciar, otro 20% más grandes.
- La insignia y el nombre de cada equipo, la letra un poco más chica que en la ronda pasada.
- La barra de cada equipo (con su tiempo dentro), otro 20% más grande.
- El botón de marcar la llegada (la pastilla con el visto), más chico y discreto.

Al agrandar el número dentro de la barra en pantalla completa, encontré que se salía un poco de su casilla en pantallas más angostas —el mismo tipo de error que ya habíamos resuelto una vez en la pantalla preliminar, ahora repetido por el tamaño nuevo. Ya tiene su propio mínimo en pantalla completa y lo probé en varios anchos, no solo el más grande.

Una aclaración sobre dos frases tuyas que interpreté como una sola idea: entendí que «aléjalo del lienzo derecho, colócalo donde pasa la línea vertical negra» seguía hablando del número en la pantalla preliminar —no de un tercer elemento nuevo—, porque la línea vertical que dibujaste solo aparece en esa captura. Si en realidad te referías a otra cosa, dímelo y lo corrijo.

© Secuencia321
