# Vocabulario con audio: consigna, contexto y devolución

Corrección del 13 de noviembre de 2026.

## Problema

Los ejercicios de reconocimiento y traducción compartían una presentación genérica de audio. En los de traducción se oía una palabra aislada y se elegía una opción en español. Después, la devolución destacaba esa traducción; la palabra inglesa y su ejemplo quedaban dentro de la explicación, en ocasiones plegada. La relación entre lo escuchado, la palabra evaluada y la traducción podía resultar confusa. Además, una palabra aislada no aclara el sentido de términos con varios usos, como turnover.

Esta corrección responde a ese patrón verificado en el banco. El reporte del usuario no identificó una fila concreta; no se atribuye un error de reproducción o pronunciación a un iPhone específico sin esa comprobación.

## Comportamiento

- **Reconocer la palabra:** se reproduce la palabra o expresión inglesa y se elige su escritura en inglés. La solución no se muestra antes de responder, salvo que se abra voluntariamente la transcripción.
- **Interpretar el significado:** se indica qué palabra hay que interpretar y se reproduce la oración inglesa completa, con esa palabra presente. Se elige su significado en español según el contexto.
- **Después de responder:** quedan visibles la palabra inglesa, la respuesta correcta, la elección incorrecta cuando la hay y un ejemplo completo con el término destacado. El significado y la explicación en español se distinguen del texto inglés. Se puede repetir el audio y, en reconocimiento, escuchar también el ejemplo completo.
- Las preguntas ya revisadas que piden comprender un mensaje conservan su consigna y su audio contextual; no reciben una etiqueta antigua de otra palabra. Su devolución muestra la respuesta y permite revisar el mensaje original.

Por ejemplo, turnover se presenta con la oración: “High staff turnover made it hard to build an experienced team.” La consigna identifica turnover y la corrección distingue la palabra del significado “rotación de personal”. El botón de audio reproduce el inglés, no la traducción.

## Alcance y registros

En la corrección original, el banco contenía 125 filas con audio en vocabulario: 55 de reconocimiento, 55 de significado y 15 de comprensión de mensajes ya revisados. Las 55 filas de significado ahora usan una oración completa y una consigna que identifica el término. Los 110 ejercicios de palabra/significado tienen datos explícitos de término, significado y ejemplo; esos datos se descartan cuando una revisión reemplaza la actividad por otra contextual.

Se conservan las 2.000 listas de opciones, el orden de sus opciones y las claves de respuesta. No se borran ni reinterpretan como preguntas nuevas los registros de los mismos objetivos léxicos: intentos, aciertos y SRS mantienen sus identificadores. Reproducir un audio no vuelve a puntuar. Las 275 preguntas de las unidades revisadas, sus explicaciones, todas las tareas de producción y la biblioteca de doce audios humanos permanecen iguales.

No se incorpora un proveedor de voz nuevo ni una API de pago. Se sigue usando la síntesis de voz disponible en el navegador. Esta corrección no amplía la cantidad de unidades con revisión pedagógica completa.

## Verificación

La suite original de `tests/vocabulary-audio.cjs` recorrió los 125 audios con selección correcta e incorrecta: 250 casos de interfaz, además de dos casos independientes (significado de turnover y reconocimiento de headache), repetición por teclado, texto completo sin huecos, idioma enviado al motor de voz, ausencia de puntuación duplicada, manejo de metadatos incoherentes, preservación de registros, recarga, exportación y presentación a 320 px en modo claro y oscuro.

La comparación del banco completo confirma 55 cambios de consigna y 55 de contenido de voz, con todas las opciones y claves conservadas. También pasan las pruebas de las unidades B1 revisadas, devolución de listening y confiabilidad del guardado.

Las pruebas instrumentan la entrada a speechSynthesis y verifican su texto e idioma. No certifican la pronunciación o la disponibilidad de las voces de un iPhone físico. Si un dispositivo presenta otro fallo de reproducción, hace falta identificar ese caso.

## Actualización tras revisar compras

La revisión de [comparaciones y compras](pedagogy-b1-comparisons-shopping.md) reemplazó diez filas de palabra/significado por cinco mensajes contextuales. La suite actual recorre 120 audios con dos selecciones cada uno (240 casos): 50 de reconocimiento, 50 de significado y 20 de comprensión de mensajes. Se conserva la separación de idiomas y no se alteran las otras actividades revisadas.
