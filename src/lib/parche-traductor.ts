/**
 * EL TRADUCTOR DEL NAVEGADOR YA NO TUMBA LA PANTALLA (24-nov-2026).
 *
 * Un usuario Platinum de habla inglesa (Sonora) lee las respuestas con el
 * traductor de Chrome. El traductor no traduce «encima»: SUSTITUYE cada nodo
 * de texto por un <font> con el texto traducido. React no se entera, y cuando
 * después quiere quitar o mover uno de esos nodos —el contador «N palabras»
 * al terminar, un aviso que aparece y desaparece— le pide al padre que quite
 * un hijo que ya no es suyo:
 *
 *     NotFoundError: Failed to execute 'removeChild' on 'Node':
 *     The node to be removed is not a child of this node.
 *
 * Es una excepción dentro del commit de React, y React desmonta la
 * aplicación entera: la pantalla en blanco, en cada respuesta («100% de las
 * veces y usan los créditos»). Las 15 respuestas de esa noche se terminaron
 * y se guardaron en el servidor; lo que moría era la página.
 *
 * Reproducido con React 18.3.1 y un traductor simulado que hace lo mismo que
 * el de Chrome: sin esto, React desmonta todo («insertBefore … not a child»);
 * con esto, la respuesta se pinta y el resto sigue vivo.
 *
 * Lo que hace: si el nodo a quitar ya no es hijo de quien lo quita, se quita
 * de donde esté (o se da por quitado); si el nodo de referencia para insertar
 * ya no es hijo directo, se inserta antes del ancestro que sí lo es. Es el
 * remedio conocido del problema (facebook/react#11538). Va en <head>, antes
 * de que React arranque, y una sola vez aunque el guion se repita.
 *
 * Lo que NO hace: traducir mejor. Un texto que React actualiza después de
 * traducido puede quedarse con la traducción vieja; el cuerpo de la
 * respuesta no, porque lo escribe `useRevelado` añadiendo nodos nuevos.
 */
export const PARCHE_TRADUCTOR = `(function(){try{
var P=typeof Node==='function'&&Node.prototype;
if(!P||P.__iurexiaTraductor)return;
P.__iurexiaTraductor=true;
var quitar=P.removeChild,meter=P.insertBefore;
P.removeChild=function(h){
if(h&&h.parentNode!==this){if(h.parentNode)return quitar.call(h.parentNode,h);return h;}
return quitar.apply(this,arguments);};
P.insertBefore=function(n,r){
if(r&&r.parentNode!==this){var a=r;while(a&&a.parentNode!==this)a=a.parentNode;return meter.call(this,n,a||null);}
return meter.apply(this,arguments);};
}catch(e){}})();`
