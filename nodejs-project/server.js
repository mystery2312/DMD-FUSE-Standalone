const net = require('net');
const WebSocket = require('ws');
const fs = require('fs');
const os = require('os');

// ==========================================
//    RÉGLAGES D'ALIGNEMENT DU DMD (CHIRURGICAL)
// ==========================================
const pixels_h = 59; // Ajuste de 0 à 127 pour l'horizontal
const lignes_v = 1;  // Ajuste de 0 à 31 pour la verticale
const GLOBAL_OFFSET = (lignes_v * 384) + (pixels_h * 3);

const HEADER = Buffer.from('DMDStream');
const FRAME_SIZE = 12288;
let buffer = Buffer.alloc(0);

// ==========================================
//    CHARGEMENT DE LA CONFIGURATION DYNAMIQUE
// ==========================================
let tcpPort = 6789;
let wsPort = 8080;

try {
    if (fs.existsSync('./config.json')) {
        const configData = fs.readFileSync('./config.json', 'utf8');
        const config = JSON.parse(configData);
        if (config.tcp_port) tcpPort = config.tcp_port;
        if (config.ws_port) wsPort = config.ws_port;
    } else {
        fs.writeFileSync('./config.json', JSON.stringify({ tcp_port: 6789, ws_port: 8080 }, null, 2));
    }
} catch (err) {
    console.log("⚠️ Failed to read config.json, using default values.");
}

// ==========================================
//    RÉCUPÉRATION DE L'ADRESSE IP DE LA TABLETTE
// ==========================================
const interfaces = os.networkInterfaces();
let localIP = "127.0.0.1";
for (let interfaceName in interfaces) {
    for (let iface of interfaces[interfaceName]) {
        if (iface.family === 'IPv4' && !iface.internal) {
            localIP = iface.address;
            break;
        }
    }
}

// ==========================================
//    LANCEMENT DU SERVEUR WEBSOCKET (Vers l'UI web locale)
// ==========================================
const wss = new WebSocket.Server({ port: wsPort });

// ==========================================
//    LANCEMENT DU SERVEUR TCP (Écoute de VPX sur le réseau Wi-Fi)
// ==========================================
const tcpServer = net.createServer((socket) => {
    socket.on('data', (data) => {
        buffer = Buffer.concat([buffer, data]);
        
        let start = buffer.indexOf(HEADER);
        
        while (start !== -1) {
            if (buffer.length < start + HEADER.length + GLOBAL_OFFSET + FRAME_SIZE) {
                break;
            }

            const startOfFrame = start + HEADER.length + GLOBAL_OFFSET;
            const frame = buffer.slice(startOfFrame, startOfFrame + FRAME_SIZE);
            
            // Envoi vers l'application web (WebView) de la tablette en local
            wss.clients.forEach(c => { 
                if (c.readyState === WebSocket.OPEN) c.send(frame); 
            });

            buffer = buffer.slice(start + HEADER.length + FRAME_SIZE);
            start = buffer.indexOf(HEADER);
        }
    });
});

// Écoute explicite sur toutes les interfaces réseau d'Android
tcpServer.listen(tcpPort, '0.0.0.0');

console.log("=================================================");
console.log("            DMD FUSE EMBARQUÉ ACTIVÉ             ");
console.log(` -> Listen VPX (TCP)  : Port ${tcpPort}`);
console.log(` -> Send to UI (WS)   : Port ${wsPort}`);
console.log(` -> Tablet IP (Wi-Fi) : ${localIP}`);
console.log("=================================================");

