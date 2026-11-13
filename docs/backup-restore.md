# Copias de seguridad de Klevy

## Uso

En **Mi aprendizaje → Mi progreso → Datos y reinicio**:

1. **Descargar copia de seguridad** guarda un archivo JSON con el progreso de este navegador. En iPhone, guardalo en Archivos; para trasladarlo a otro dispositivo, enviá ese archivo.
2. **Restaurar copia de seguridad** permite elegir un archivo. Klevy lo valida y muestra su fecha (si la tiene), nivel, respuestas, expresiones y borradores de escritura, comparados con el estado actual.
3. **Restaurar y reemplazar progreso** confirma el reemplazo. Elegir el archivo o cancelar no reemplaza nada. La app se recarga después del guardado.
4. Dentro de la misma pantalla, **Revisar estado anterior** permite recuperar el estado previo a la última restauración. **Descargar copia anterior** permite conservarlo como archivo.

La importación **reemplaza** los registros de este navegador; no suma ni fusiona perfiles. Incluye lo presente en la copia: respuestas e historial, ruta, repasos, cuaderno, autoevaluaciones, borradores y actividades en curso. No incluye grabaciones temporales ni cambia el tema visual del dispositivo. No agrega sincronización automática.

Hay **una sola copia automática anterior** por navegador/origen. Se reemplaza en cada restauración, incluso cuando se vuelve a un estado anterior. Descargala antes si querés conservar más versiones. Borrar todo el progreso también borra esta copia automática; no elimina archivos ya descargados. Borrar datos del navegador puede eliminar tanto el progreso como la copia automática: conservá un archivo fuera del navegador.

El archivo se lee localmente y no se sube a un servidor. La navegación normal de noticias/audio puede seguir consultando sus servicios, pero no recibe el contenido del archivo. La copia contiene los textos y las notas que escribiste; compartila solo con quien quieras dar acceso a esos datos.

## Compatibilidad y validación

Las nuevas exportaciones usan `{format:"klevy-backup",version:1,createdAt,data}`. También se aceptan las copias anteriores con el estado directamente en la raíz, incluido un BOM UTF-8. Un JSON de otra aplicación, un formato/versionado incompatible, estructuras incorrectas, claves de contaminación de prototipos, URL inseguras o archivos mayores a 8 MiB se rechazan sin importar registros.

Las copias antiguas pasan por las mismas migraciones de contenido que el progreso habitual: las respuestas de preguntas revisadas pueden pasar al historial y las guías conservan sus revisiones anteriores. No se reescriben esas respuestas como si fueran de las nuevas preguntas. La cifra de respuestas no indica cuántas preguntas actuales distintas se practicaron.

La copia automática contiene el estado activo previo al reemplazo. Si el guardado previo era ilegible, conserva además los bytes originales en `storedBeforeRestore` dentro del JSON descargable; no intenta interpretar ni importar esos bytes corruptos.

## Guardado y concurrencia

Se conserva la clave principal `english-path-offline`. La copia automática se guarda por separado en `klevy-before-restore`. La importación comprueba la instantánea persistida y el estado activo de la vista previa, guarda primero la copia anterior y recién después escribe el estado importado. Si no se puede guardar la copia automática, se detiene. Si falla la escritura principal, se intenta reponer la copia automática que había antes; la escritura principal de localStorage es indivisible por clave y conserva el valor previo ante cuota insuficiente.

Los cambios detectados en otra pestaña o desde la vista previa invalidan la confirmación. Después de restaurar, los callbacks de la sesión anterior no pueden volver a guardar su estado mientras se recarga. Esta protección compara instantáneas de localStorage; no es una transacción entre varias claves ni una base de datos multiusuario. No fusiona cambios simultáneos.

El archivo `backup.js` contiene el diálogo y la validación. El núcleo de guardado conserva exportación básica y muestra un mensaje para recargar si el módulo de restauración no pudo cargarse. Los tests cubren fallos de lectura/cuota y perfiles aislados; Safari/iPhone físico sigue siendo una comprobación de dispositivo.
