/**
 * Un proxy que retiene, como Cisco Umbrella (folio 3640-01): recibe del
 * servidor la respuesta ENTERA y sólo entonces se la da al navegador, con las
 * cabeceras. Si el navegador se va antes, sigue leyendo del servidor hasta el
 * final —por eso el servidor terminó la respuesta de las 16:14 aunque la
 * página la hubiera dado por perdida—.
 *
 *   'al_final'  la suelta en cuanto el servidor termina (Umbrella).
 *   'tarde'     la suelta `retrasoMs` después (el escaneo que tarda).
 *   'nunca'     la tira: cierra la conexión sin responder.
 */
import http from 'node:http';

export type Modo = 'al_final' | 'tarde' | 'nunca';

export interface Paso { ruta: string; msServidor: number; bytes: number; clienteSeFue: boolean; soltada: boolean }

export function proxyQueRetiene(destino: number, modo: Modo, retrasoMs = 0):
    Promise<{ puerto: number; registro: Paso[]; cerrar: () => void }> {
    const registro: Paso[] = [];
    const servidor = http.createServer((req, res) => {
        const partes: Buffer[] = [];
        req.on('data', (d: Buffer) => partes.push(d));
        req.on('end', () => {
            const cuerpo = Buffer.concat(partes);
            const t0 = Date.now();
            let clienteSeFue = false;
            res.on('close', () => { if (!res.writableEnded) clienteSeFue = true; });
            const cabeceras: http.OutgoingHttpHeaders = { ...req.headers };
            delete cabeceras['transfer-encoding'];
            delete cabeceras.connection;
            cabeceras.host = `127.0.0.1:${destino}`;
            cabeceras['content-length'] = String(cuerpo.length);
            const arriba = http.request(
                { host: '127.0.0.1', port: destino, method: req.method, path: req.url, headers: cabeceras },
                (r) => {
                    const trozos: Buffer[] = [];
                    r.on('data', (d: Buffer) => trozos.push(d));
                    r.on('end', () => {
                        const todo = Buffer.concat(trozos);
                        const paso: Paso = { ruta: req.url || '', msServidor: Date.now() - t0, bytes: todo.length, clienteSeFue, soltada: false };
                        registro.push(paso);
                        if (modo === 'nunca') { res.destroy(); return; }
                        const soltar = () => {
                            paso.clienteSeFue = clienteSeFue;
                            if (res.destroyed || clienteSeFue) return;
                            const salida: http.OutgoingHttpHeaders = { ...r.headers };
                            delete salida['transfer-encoding'];
                            delete salida.connection;
                            salida['content-length'] = String(todo.length);
                            res.writeHead(r.statusCode || 502, salida);
                            res.end(todo);
                            paso.soltada = true;
                        };
                        if (modo === 'tarde') setTimeout(soltar, retrasoMs); else soltar();
                    });
                });
            arriba.on('error', () => res.destroy());
            arriba.end(cuerpo);
        });
    });
    return new Promise((resolve) => servidor.listen(0, '127.0.0.1', () => {
        const dir = servidor.address();
        resolve({
            puerto: typeof dir === 'object' && dir ? dir.port : 0,
            registro,
            cerrar: () => { servidor.closeAllConnections?.(); servidor.close(); },
        });
    }));
}
