import { WasmGame, WasmTile } from "../../xplode-wasm/pkg";
import './board.scss';
import { sendMessage } from "./connection";

let GAME: WasmGame | undefined;
let WIDTH = 10;
let HEIGHT = 10;
let BOMBS = 10;
let ZOOM = 1.5;

export function BoardComponent(): HTMLElement {
    const container = document.createElement("div");
    container.classList.add('container');

    container.appendChild(topBarComponent());
    

    const table = document.createElement("table");

    table.classList.add('board');

    for (let i = 0; i < HEIGHT; i++) {
        let tr = document.createElement('tr');

        for (let j = 0; j < WIDTH; j++) {
            let td = document.createElement('td');

            td.dataset.x = j.toString();
            td.dataset.y = i.toString();

            td.onclick = td.oncontextmenu = td.onauxclick = handleClick;
            tr.appendChild(td);
        }

        table.appendChild(tr);
    }

    container.appendChild(table);

    return container;
}

function topBarComponent(): HTMLElement {
    const div = document.createElement("div");

    const params = document.createElement("fieldset");
    params.classList.add('params');

    const br = document.createElement('br');

    const sliderLabel = document.createElement('label');
    const slider = document.createElement('input');

    sliderLabel.innerText = "Zoom:";

    slider.type = "range";
    slider.step = "0.001";
    slider.min = "0.1";
    slider.max = "10";
    slider.value = ZOOM.toString();

    slider.onchange = slider.onmousemove = updateZoom;

    params.appendChild(sliderLabel);
    params.appendChild(slider);
    params.appendChild(br);
    
    const widthLabel = document.createElement('label');
    const width = document.createElement('input');
    const heightLabel = document.createElement('label');
    const height = document.createElement('input');
    const bombsLabel = document.createElement('label');
    const bombs = document.createElement('input');

    widthLabel.innerText = "Width:";
    heightLabel.innerText = "Height:";
    bombsLabel.innerText = "Bombs:";

    width.type = 'number';
    height.type = 'number';
    bombs.type = 'number';

    width.value = WIDTH.toString();
    height.value = HEIGHT.toString();
    bombs.value = BOMBS.toString();

    width.oninput = () => WIDTH = +width.value;
    height.oninput = () => HEIGHT = +height.value;
    bombs.oninput = () => BOMBS = +bombs.value;

    params.appendChild(widthLabel);
    params.appendChild(width);
    params.appendChild(br);
    params.appendChild(heightLabel);
    params.appendChild(height);
    params.appendChild(br);
    params.appendChild(bombsLabel);
    params.appendChild(bombs);
    params.appendChild(br);

    const button = document.createElement('button');
    button.innerText = "Restart";
    button.onclick = restartGame;

    params.appendChild(button);

    const seed = document.createElement('input');
    seed.value = "0";
    seed.disabled = true;
    seed.type = "number";
    seed.id = "seed-input";

    params.appendChild(seed);

    div.appendChild(params);

    // RTC

    const rtc = document.createElement("fieldset");
    
    const host = document.createElement("button");
    const connect = document.createElement("button");
    const disconnect = document.createElement("button");
    const offer = document.createElement("textarea");

    host.innerText = "Host";
    host.id = "host-button";
    host.name = "host-button";

    connect.innerText = "Connect";
    connect.id = "connect-button";
    connect.name = "connect-button";

    disconnect.innerText = "Disconnect";
    disconnect.disabled = true;
    disconnect.id = "disconnect-button";
    disconnect.name = "disconnect-button";

    offer.disabled = true;
    offer.id = "offer-input";


    rtc.appendChild(host);
    rtc.appendChild(connect);
    rtc.appendChild(disconnect);
    rtc.appendChild(offer);

    const msgBox = document.createElement("div");
    msgBox.classList.add("message-box");

    const messageLabel = document.createElement("label");
    messageLabel.htmlFor = "message";
    messageLabel.innerText = "Enter a message:";

    const message = document.createElement("input");
    message.type = "text";
    message.name = "message";
    message.id = "message";
    message.placeholder = "Message text";
    message.inputMode = "latin";
    message.size = 60;
    message.maxLength = 120;
    message.disabled = true;

    const send = document.createElement("button");
    send.innerText = "Send";
    send.id = "send-button";
    send.name = "send-button";
    send.disabled = true;

    msgBox.appendChild(messageLabel);
    msgBox.appendChild(message);
    msgBox.appendChild(send);

    rtc.appendChild(msgBox);

    div.appendChild(rtc);

    const receiveB = document.createElement("div");
    receiveB.classList.add("message-box");
    receiveB.id = "receive-box";

    const received = document.createElement("p");
    received.innerText = "Messages received:";

    receiveB.appendChild(received);

    div.appendChild(receiveB);

    return div;
}

let timer: NodeJS.Timeout = null;
function handleClick(event: MouseEvent) {
    event.preventDefault();

    if (timer !== null) {
        return;
    }

    timer = setTimeout(() => timer = null, 30);

    if (!(event.target instanceof HTMLTableCellElement))
        return;
        
    const el: HTMLTableCellElement = event.target;
    const x = +el.dataset.x;
    const y = +el.dataset.y;

    // Initialise game
    const init = GAME === undefined;
    if (init) {
        const seed = new BigUint64Array(1);
        crypto.getRandomValues(seed);

        (document.getElementById("seed-input") as HTMLInputElement).value = seed[0].toString();
        GAME = WasmGame.new_safe_zero_seeded(WIDTH, HEIGHT, BOMBS, x, y, seed[0]);

        sendMessage(`seed|${x}-${y}|${seed[0]}`);
    }

    const tile: WasmTile = GAME.get(x, y);

    // Check if trying to open a flagged tile
    if (event.button == 0 && tile.state == 1)
        return

    // Open a tile if clicked
    if (event.button == 0) {
        if (tile.state == 0) { // Closed
            openTile(x, y);
            if (!init)
                sendMessage(`open|${x}-${y}`);
        }
    } else if (event.button == 1) {
        if (tile.state == 2) { // Open
            // Check if the number of flags is satisfied
            let flagCount = 0;
            for (let i = Math.max(0, x-1); i < Math.min(x+2, GAME.get_width()); i++) {
                for (let j = Math.max(0, y-1); j < Math.min(y+2, GAME.get_height()); j++) {
                    const t = GAME.get(i, j);
                    if (t.state == 1) // Flag
                        flagCount++;
                }
            }
            if (tile.value.number == flagCount) {
                for (let i = Math.max(0, x-1); i < Math.min(x+2, GAME.get_width()); i++) {
                    for (let j = Math.max(0, y-1); j < Math.min(y+2, GAME.get_height()); j++) {
                        openTile(i, j);
                    }
                }
                sendMessage(`mopn|${x}-${y}`);
            }
        }
    } else if (event.button == 2) {
        
        GAME.flag(x, y);
        const st = GAME.get(x, y).state;
        if (st == 0) {
            sendMessage(`uflg|${x}-${y}`);
        } else if (st == 1) {
            sendMessage(`flag|${x}-${y}`);
        }
    }

    updateView(el);
}

function openTile(x: number, y: number) {
    const res = GAME.reveal(x, y);

    if (res === undefined)
        return;

    if (res.bomb) {
        setTimeout(() => alert("You lost"), 0);
    } else {
        updateView(document.querySelector(`.board>tr>td[data-x="${x}"][data-y="${y}"]`))
        if (res.number == 0) {
            for (let i = Math.max(0, x-1); i < Math.min(x+2, GAME.get_width()); i++) {
                for (let j = Math.max(0, y-1); j < Math.min(y+2, GAME.get_height()); j++) {
                    openTile(i, j);
                }
            }
        }
    }
}

function updateView(td: HTMLTableCellElement) {
    const tile = GAME.get(+td.dataset.x, +td.dataset.y);

    if (tile.state == 1) // Flag
        td.dataset.flag = 'true';
    else {
        delete td.dataset.flag;

        if (tile.state == 2) { // Open
            td.dataset.open = 'true';
            if (tile.value.bomb)
                td.dataset.bomb = 'true';
            else if (tile.value.number > 0)
                td.innerText = td.dataset.value = tile.value.number.toString();
        }
    }
}

function updateZoom(event: Event) {
    if (!(event.target instanceof HTMLInputElement))
        return
    
    ZOOM = +event.target.value;
    const zoom = event.target.value + 'rem';

    console.log(zoom);

    const el: HTMLTableElement = document.querySelector(".board");

    el.style.setProperty('--tile-size', zoom);
}

function restartGame() {
    GAME = undefined;
    document.body.innerText = "";

    document.body.appendChild(BoardComponent());

    sendMessage("clbd");
}

export function interpretCommand(command: string) {
    // console.log(`Received: "${command}"`);
    const main = command.substring(0, 4);
    const parts = command.split('|');
    const [x, y] = parts[1].split('-').map(e => +e);

    switch (main) {
        case "seed":
            const seed = BigInt(parts[2]);

            (document.getElementById("seed-input") as HTMLInputElement).value = seed.toString();
            GAME = WasmGame.new_safe_zero_seeded(WIDTH, HEIGHT, BOMBS, x, y, seed);

            openTile(x, y);
            break;
        case "open":
            openTile(x, y);
            break;
        case "clbd":
            restartGame();
            break;
        case "flag":
            GAME.set_flag(x, y, true);
            updateView(document.querySelector(`.board>tr>td[data-x="${x}"][data-y="${y}"]`))
            break;
        case "uflg":
            GAME.set_flag(x, y, false);
            updateView(document.querySelector(`.board>tr>td[data-x="${x}"][data-y="${y}"]`))
            break;
        case "mopn":
            for (let i = Math.max(0, x-1); i < Math.min(x+2, GAME.get_width()); i++) {
                for (let j = Math.max(0, y-1); j < Math.min(y+2, GAME.get_height()); j++) {
                    openTile(i, j);
                }
            }
            break;
    }
}