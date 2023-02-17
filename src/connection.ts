import { interpretCommand } from "./board";

const CONFIG = {
    iceServers: [
        {urls:'stun:stun01.sipphone.com'},
        {urls:'stun:stun.ekiga.net'},
        {urls:'stun:stun.fwdnet.net'},
        {urls:'stun:stun.ideasip.com'},
        {urls:'stun:stun.iptel.org'},
        {urls:'stun:stun.rixtelecom.se'},
        {urls:'stun:stun.schlund.de'},
        {urls:'stun:stun.l.google.com:19302'},
        {urls:'stun:stun1.l.google.com:19302'},
        {urls:'stun:stun2.l.google.com:19302'},
        {urls:'stun:stun3.l.google.com:19302'},
        {urls:'stun:stun4.l.google.com:19302'},
        {urls:'stun:stunserver.org'},
        {urls:'stun:stun.softjoys.com'},
        {urls:'stun:stun.voiparound.com'},
        {urls:'stun:stun.voipbuster.com'},
        {urls:'stun:stun.voipstunt.com'},
        {urls:'stun:stun.voxgratia.org'},
        {urls:'stun:stun.xten.com'},
        {
            urls: 'turn:numb.viagenie.ca',
            credential: 'muazkh',
            username: 'webrtc@live.com'
        },
        {
            urls: 'turn:192.158.29.39:3478?transport=udp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        },
        {
            urls: 'turn:192.158.29.39:3478?transport=tcp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        }
    ],
};

let pc: RTCPeerConnection;
let dc: RTCDataChannel;

export function initialize() {
    const log = (msg: string) => {
        const p = document.createElement("p");
        p.innerText = msg;
        document.getElementById("receive-box").appendChild(p);
    }

    pc = new RTCPeerConnection(CONFIG);
    dc = pc.createDataChannel("chat", {
        negotiated: true,
        id: 0,
    });
    dc.onmessage = e => interpretCommand(e.data);
    pc.oniceconnectionstatechange = () => log(pc.iceConnectionState);

    document.getElementById("host-button").onclick = hostRTC;
    document.getElementById("connect-button").onclick = connectRTC;

    pc.onconnectionstatechange = handleChange;
    pc.oniceconnectionstatechange = handleChange;

    handleChange();
}


async function hostRTC() {
    (document.getElementById("host-button") as HTMLButtonElement).disabled = true;
    (document.getElementById("connect-button") as HTMLButtonElement).disabled = true;

    await pc.setLocalDescription(await pc.createOffer());
    
    const offer = document.getElementById("offer-input") as HTMLTextAreaElement;

    pc.onicecandidate = async ({candidate}) => {
        if (candidate) return
        await navigator.clipboard.writeText(pc.localDescription.sdp);
        alert("Your offer is copied to your clipboard. Send it to your friend, and have them send you theirs");

        offer.disabled = false;
        offer.placeholder = "Paste your friends offer here, and press ENTER";
        offer.focus();
    };

    offer.onkeydown = e => {
        if (e.code != 'Enter' || pc.signalingState != 'have-local-offer') return;
        offer.disabled = true;
        pc.setRemoteDescription({
            type: "answer",
            sdp: offer.value,
        });
    };
}

async function connectRTC() {
    (document.getElementById("host-button") as HTMLButtonElement).disabled = true;
    (document.getElementById("connect-button") as HTMLButtonElement).disabled = true;
    (document.getElementById("connect-button") as HTMLButtonElement).disabled = true;

    const answer = document.getElementById("offer-input") as HTMLTextAreaElement;
    answer.placeholder = "Paste your friends offer here, and press ENTER";
    answer.disabled = false;
    answer.focus();

    answer.onkeydown = async e => {
        if (e.code != 'Enter' || pc.signalingState != 'stable') return;
        answer.disabled = true;
        await pc.setRemoteDescription({
            type: "offer",
            sdp: answer.value,
        });
        await pc.setLocalDescription(await pc.createAnswer());
        pc.onicecandidate = async ({candidate}) => {
            if (candidate) return;
            await navigator.clipboard.writeText(pc.localDescription.sdp);
            alert("Your offer is copied to the clipboard");
        };
    };
}

function handleChange() {
    console.log('%c' + new Date().toISOString() + ': ConnectionState: %c' + pc.connectionState + ' %cIceConnectionState: %c' + pc.iceConnectionState,
        'color:yellow', 'color:orange', 'color:yellow', 'color:orange');
}

export function sendMessage(msg: string) {
    if (dc !== undefined && dc.readyState == "open") {
        // console.log(`Sending "${msg}"`);
        dc.send(msg);
    }
}

