/** El texto y el enlace de cada tipo de notificación viven en
 * @clearwork/shared (issue #112): el backend necesita exactamente la
 * misma lógica para decidir el cuerpo de un correo, así que hay una sola
 * fuente de verdad en vez de mantenerla por duplicado. Este módulo se
 * conserva como punto de entrada para no tocar los sitios que ya
 * importaban desde aquí. */
export { notificationMessage, notificationLink } from "@clearwork/shared";
