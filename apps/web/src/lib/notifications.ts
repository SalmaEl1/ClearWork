/** El texto de cada tipo de notificación vive en @clearwork/shared (issue
 * #112): el backend necesita exactamente la misma lógica para decidir el
 * cuerpo de un correo, así que hay una sola fuente de verdad en vez de
 * mantenerla por duplicado. Este módulo se conserva como punto de
 * entrada para no tocar los sitios que ya importaban desde aquí.
 * notificationLink (enlace por tipo) ya no se reexporta aquí: dentro de
 * la app ya no se navega al pinchar una notificación (issue #133), solo
 * lo sigue usando el correo, directamente desde @clearwork/shared. */
export { notificationMessage } from "@clearwork/shared";
