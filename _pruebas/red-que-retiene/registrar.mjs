// node --import ./_pruebas/red-que-retiene/registrar.mjs …
import { register } from 'node:module';

register('./ganchos.mjs', import.meta.url);
