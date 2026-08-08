// Control de acceso de administración.
//
// La lista vive en un solo sitio: `@/lib/admins`. Aquí sólo queda el reenvío
// porque media aplicación ya importa `isAdmin` desde esta ruta, y mover todos
// los llamadores para renombrar una función es cambio sin beneficio.
//
// Antes esta lista NO incluía jdm.juridico@gmail.com mientras que la de
// campañas sí: dos listas contradictorias sobre quién manda.
export { esAdmin as isAdmin } from '@/lib/admins';
