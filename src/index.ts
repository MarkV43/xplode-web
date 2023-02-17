import init from '../../xplode-wasm/pkg/index.js';
import { BoardComponent } from './board';
import { initialize } from './connection';

async function main() {
    await init();

    const el = BoardComponent();
    document.body.appendChild(el);

    initialize();
}

main();