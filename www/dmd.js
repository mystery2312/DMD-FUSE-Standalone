const canvas = document.getElementById('dmdCanvas');
const ctx = canvas.getContext('2d');
const VERTICAL_OFFSET = 0;

// Important : pas de lissage pour garder le style rétro
ctx.imageSmoothingEnabled = false;

const imgData = ctx.createImageData(128, 64);

// --- ÉLÉMENTS DE L'INTERFACE APPLICATION ---
const ipInput = document.getElementById('ip-input');
const connectBtn = document.getElementById('connect-btn');
const configBar = document.getElementById('config-bar');

// Charger automatiquement l'IP sauvegardée au précédent démarrage si elle existe
const savedIP = localStorage.getItem('pincab_ip');
if (savedIP) {
    ipInput.value = savedIP;
}

// Déclencheur au clic sur "Connexion"
connectBtn.addEventListener('click', () => {
    const ip = ipInput.value.trim();
    if (!ip) {
        alert("Veuillez saisir l'adresse IP de votre PC !");
        return;
    }

    // Sauvegarde en mémoire locale dans la tablette
    localStorage.setItem('pincab_ip', ip);

    // Cache la barre de saisie pour laisser place nette à la backglass
    configBar.style.display = 'none';

    // Initialisation du WebSocket sur le port dynamique 8090
    const PORT_SERVEUR = "8080"; // Mets 8080 ou 8090 selon ton config.json du PC
    const ws = new WebSocket(`ws://${ip}:${PORT_SERVEUR}`);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
        console.log("🚀 Connecté avec succès au DMDServer !");
    };

    ws.onmessage = (event) => {
        const data = new Uint8Array(event.data);
        
        // Si la donnée n'est pas 12288, on ne fait rien pour éviter le cisaillage
        if (data.length === 12288) {
            for (let i = 0; i < 4096; i++) {
                const idx = i * 3;
                const dest = i * 4;
                imgData.data[dest]     = data[idx];
                imgData.data[dest + 1] = data[idx + 1];
                imgData.data[dest + 2] = data[idx + 2];
                imgData.data[dest + 3] = 255;
            }
            
            // On efface tout le canvas proprement
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // On dessine le buffer à la position 0,0 exacte
            // On utilise un canvas temporaire pour le rendu
            const tmp = document.createElement('canvas');
            tmp.width = 128; tmp.height = 64;
            tmp.getContext('2d').putImageData(imgData, 0, 0);
            
            // Dessin final (le navigateur étire grâce au CSS)
            ctx.drawImage(tmp, 0, VERTICAL_OFFSET); 
        }
    };

    ws.onerror = (error) => {
        console.error("Erreur WebSocket:", error);
        alert("Impossible de se connecter au PC. Vérifiez l'IP et que DMDServer.exe est lancé !");
        configBar.style.display = 'flex'; // Réaffiche la barre en cas d'erreur
    };

    ws.onclose = () => {
        console.log("Connexion perdue avec le serveur.");
        configBar.style.display = 'flex'; // Réaffiche la barre si le serveur se coupe
    };
});

// ASTUCE : Si tu as besoin de faire réapparaître la barre de config (ex: changement d'IP),
// touche l'écran de ta tablette simultanément avec 3 doigts.
window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 3) {
        configBar.style.display = 'flex';
    }
});