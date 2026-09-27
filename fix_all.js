const fs = require('fs');

// 1. Fix Staff App Checkpoints
let staff = fs.readFileSync('frontend/staff/app.js', 'utf8');
staff = staff.replace('function renderCheckpointsTab() {', 
\`function renderCheckpointsTab() {
    if (!state.checkpoints || state.checkpoints.length === 0) fetchCheckpoints();\`);
fs.writeFileSync('frontend/staff/app.js', staff);

// 2. Clean Patient App
let code = fs.readFileSync('frontend/patient/app.js', 'utf8');
const splitIndex = code.indexOf("if (state.page === 'qrlogin') {");
if (splitIndex !== -1) {
    code = code.substring(0, splitIndex);
}

const appendCode = \`if (state.page === 'qrlogin') {
    setTimeout(() => {
        window.html5QrCode = new Html5Qrcode("reader");
        window.html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: {width: 250, height: 250} },
            (decodedText) => {
                let token = decodedText;
                if(token.includes('token=')) {
                    token = token.split('token=')[1].split('&')[0];
                }
                const tokenInput = document.getElementById('token-input');
                if (tokenInput) tokenInput.value = token;
                
                window.html5QrCode.stop().then(() => {
                    handleQRScan(token);
                }).catch(err => {
                    handleQRScan(token);
                });
            },
            (errorMessage) => {}
        ).catch((err) => {
            console.error("Camera start failed", err);
        });
    }, 100);
}

if (state.page === 'scan') {
    setTimeout(() => {
        window.checkpointQrCode = new Html5Qrcode("checkpoint-reader");
        window.checkpointQrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: {width: 250, height: 250} },
            (decodedText) => {
                let code = decodedText;
                window.checkpointQrCode.stop().then(() => {
                    handleCheckpointScan(code);
                }).catch(err => {
                    handleCheckpointScan(code);
                });
            },
            (errorMessage) => {}
        ).catch((err) => {
            console.error("Camera start failed", err);
        });
    }, 100);
}

async function handleCheckpointScan(code) {
    try {
        const res = await fetch(\\\`\\\${API_URL}/api/navigation/checkpoint/\\\${encodeURIComponent(code)}\\\`);
        const data = await res.json();
        if (data.success) {
            state.currentNode = data.data.node_id;
            sessionStorage.setItem('hosnav_currentNode', state.currentNode.toString());
            sessionStorage.setItem('hosnav_currentLocationName', \\\`\\\${data.data.location_name} (Floor \\\${data.data.floor})\\\`);
            
            alert(\\\`Location updated: \\\${data.data.location_name}\\\`);
            
            if (state.routeData && state.routeData.path && state.routeData.path.length > 0) {
                const destId = state.routeData.path[state.routeData.path.length - 1];
                const rRes = await fetch(\\\`\\\${API_URL}/api/navigation/route?from_node=\\\${state.currentNode}&to_node=\\\${destId}\\\`);
                const rData = await rRes.json();
                if (rData.success) {
                    state.routeData = rData.data;
                    state.routeStep = 0;
                    sessionStorage.setItem('hosnav_routeData', JSON.stringify(rData.data));
                    sessionStorage.setItem('hosnav_routeStep', '0');
                    go('map');
                    return;
                }
            }
            go('home');
        } else {
            alert('Invalid Checkpoint QR');
            go('home');
        }
    } catch (e) {
        alert('Connection error');
        go('home');
    }
}

setInterval(pollQueue, 5000);

async function pollQueue() {
    if(!state.queueToken) return;
    try {
        const res = await fetch(\\\`\\\${API_URL}/api/queues/track/\\\${state.queueToken}\\\`);
        const data = await res.json();
        if(data.success) {
            if (data.data.status === 'Completed' || data.data.status === 'Skipped') {
                alert('Your queue has been ' + data.data.status.toLowerCase() + '. Thank you!');
                localStorage.removeItem('queueToken');
                state.queueToken = null;
                state.currentQueue = null;
                go('home');
                return;
            }
            if(state.currentQueue && state.currentQueue.status !== data.data.status) {
                let notis = [];
                try { notis = JSON.parse(localStorage.getItem('hosnav_notis')) || []; } catch(e){}
                notis.unshift({
                    title: \\\`Queue Status: \\\${data.data.status}\\\`,
                    message: \\\`Your queue is now \\\${data.data.status}. Destination: \\\${data.data.destination_name}\\\`,
                    time: new Date().toISOString(),
                    type: data.data.status === 'Called' ? 'alert' : 'info'
                });
                localStorage.setItem('hosnav_notis', JSON.stringify(notis));

                if(data.data.status === 'Called') {
                    alert('It is your turn! Please go to ' + data.data.destination_name);
                }
            }
            state.currentQueue = data.data;
            const appEl = document.getElementById("app");
            if (appEl) appEl.innerHTML = pages[state.page](); 
        }
    } catch(err){}
}

async function handleQRScan(token, silent = false) {
    if(!token) return;
    try {
        const headers = {};
        const userToken = localStorage.getItem('hosnav_token');
        if (userToken) {
            headers['Authorization'] = \\\`Bearer \\\${userToken}\\\`;
        }
        const res = await fetch(\\\`\\\${API_URL}/api/queues/track/\\\${token}\\\`, { headers });
        if (!res.ok && res.status !== 404) throw new Error('Network response was not ok');
        const data = await res.json();
        
        if(data.success) {
            if (data.data.status === 'Completed' || data.data.status === 'Skipped') {
                if (!silent) alert('This queue has already ended.');
                localStorage.removeItem('queueToken');
                state.queueToken = null;
                state.currentQueue = null;
                return;
            }
            
            localStorage.setItem('queueToken', token);
            state.queueToken = token;
            state.currentQueue = data.data;
            
            if (!sessionStorage.getItem('hosnav_currentNode')) {
                sessionStorage.setItem('hosnav_currentNode', '76');
                sessionStorage.setItem('hosnav_currentLocationName', 'General Waiting Room (Floor 1)');
            }
            
            if(!silent && state.page !== 'queue') {
                go('queue');
            } else {
                const appEl = document.getElementById("app");
                if (appEl) appEl.innerHTML = pages[state.page]();
            }
        } else {
            if(!silent) alert('QR code is incorrect or expired');
            localStorage.removeItem('queueToken');
            state.queueToken = null;
        }
    } catch(err) {
        if(!silent) alert('Connection lost');
    }
}

async function syncActiveQueue() {
    if(state.queueToken) {
        await handleQRScan(state.queueToken, true).catch(()=>null);
    }
    else if(localStorage.getItem('hosnav_token')) {
        try {
            const res = await fetch(\\\`\\\${API_URL}/api/queues/my-active\\\`, {
                headers: { 'Authorization': \\\`Bearer \\\${localStorage.getItem('hosnav_token')}\\\` }
            });
            const data = await res.json();
            if(data.success && data.hasQueue) {
                await handleQRScan(data.token, true);
            }
        } catch(e) {}
    }
}
syncActiveQueue();

async function handleAuth(isRegister) {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name = isRegister ? document.getElementById('auth-name').value : undefined;
    const errorEl = document.getElementById('auth-error');
    
    if (!email || !password || (isRegister && !name)) {
        errorEl.textContent = 'Please fill in all fields';
        errorEl.style.display = 'block';
        return;
    }

    if (!/^\\S+@\\S+\\.\\S+$/.test(email)) {
        errorEl.textContent = 'Please enter a valid email address';
        errorEl.style.display = 'block';
        return;
    }

    try {
        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
        const response = await fetch(API_URL + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(isRegister ? { email, password, name } : { email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (isRegister) {
                alert('Account created successfully!');
                go('login');
            } else {
                localStorage.setItem('hosnav_token', result.token);
                localStorage.setItem('hosnav_user', JSON.stringify(result.user));
                alert('Welcome, ' + result.user.name);
                go('home');
            }
        } else {
            errorEl.textContent = result.message || 'Login failed';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Connection lost. Please try again.';
        errorEl.style.display = 'block';
    }
}
\`;

fs.writeFileSync('frontend/patient/app.js', code + appendCode);

// 3. Cache buster
let sw = fs.readFileSync('frontend/patient/sw.js', 'utf8');
sw = sw.replace('v23', 'v24');
fs.writeFileSync('frontend/patient/sw.js', sw);
