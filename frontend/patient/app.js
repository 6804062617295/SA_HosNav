
const API_URL = 'https://hosnav.onrender.com';


window.stopScannerAndGoBack = () => {
    const hasAccess = !!(localStorage.getItem('queueToken') || localStorage.getItem('hosnav_token'));
    let dest = 'home';
    if (state.page === 'qrlogin' && !hasAccess) {
        dest = 'login';
    }
    if (window._activeQr) {
        window._activeQr.stop().catch(()=>{}).finally(() => go(dest));
    } else {
        go(dest);
    }
};

window.renderSearchResults = () => {
    const query = (state.searchQuery || '').toLowerCase();
    const filtered = window.HOSPITAL_LOCATIONS.filter(l => !query || l.name.toLowerCase().includes(query) || l.tag.toLowerCase().includes(query));
    const listEl = document.getElementById('search-results-list');
    if (listEl) {
        listEl.innerHTML = filtered.map(l => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
                <div>
                    <b style="font-size:14px; color:#1e293b; display:block;">${l.name}</b>
                    <small class="muted">Floor ${l.floor} &middot; ${l.tag}</small>
                </div>
                <button class="btn secondary" style="padding:6px 12px; font-size:12px;" onclick="loadRouteToLocation(${l.id})">
                    Navigate
                </button>
            </div>
        `).join('') + (filtered.length === 0 ? '<p class="muted" style="text-align:center; padding:20px;">No matching destinations found</p>' : '');
    }
};


// --- Render Free Tier Cold Start Handler ---
(function() {
    fetch(API_URL + '/api/health').catch(()=>{}); // Eager wake up
    let isWakingToastShown = false;
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
        let timeoutId;
        if (url && url.includes(API_URL) && !url.includes('/api/health')) {
            timeoutId = setTimeout(() => {
                if (!isWakingToastShown) {
                    isWakingToastShown = true;
                    const msg = 'Server is waking up from sleep. This may take ~50s...';
                    if (typeof window.showToast === 'function') window.showToast(msg, 'info');
                    else if (typeof notify === 'function') notify(msg);
                    else alert(msg);
                }
            }, 4000);
        }
        try { 
            const res = await originalFetch.apply(this, args); 
            isWakingToastShown = false;
            return res;
        } finally { 
            if (timeoutId) clearTimeout(timeoutId); 
        }
    };
})();
// -------------------------------------------



window.showScanUI = function(text = "Processing...") {
    if (navigator.vibrate) navigator.vibrate(150);
    let container = document.getElementById('scan-overlay-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'scan-overlay-container';
        container.innerHTML = `
            <div class="scan-bottom-sheet">
                <div class="scan-icon-wrapper" id="scan-ui-icon">
                    <div class="scan-spinner"></div>
                </div>
                <h3 id="scan-ui-text" style="margin:0; font-size:18px; color:var(--navy);">${text}</h3>
            </div>
        `;
        const appShell = document.querySelector('.app-shell') || document.body;
        appShell.appendChild(container);
    } else {
        document.getElementById('scan-ui-icon').innerHTML = '<div class="scan-spinner"></div>';
        document.getElementById('scan-ui-text').innerText = text;
    }
    void container.offsetWidth;
    container.classList.add('active');
};

window.completeScanUI = function(success, text, callback) {
    let container = document.getElementById('scan-overlay-container');
    if (!container) {
        if(callback) callback();
        return;
    }
    const icon = document.getElementById('scan-ui-icon');
    const textEl = document.getElementById('scan-ui-text');
    
    if (success) {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        icon.innerHTML = '<i class="ph-fill ph-check-circle" style="color:var(--primary); font-size:60px;"></i>';
        textEl.innerText = text || "Success!";
    } else {
        if (navigator.vibrate) navigator.vibrate([50, 100, 50, 100]);
        icon.innerHTML = '<i class="ph-fill ph-warning-circle" style="color:#ff3b30; font-size:60px;"></i>';
        textEl.innerText = text || "Invalid QR";
    }
    
    setTimeout(() => {
        container.classList.remove('active');
        setTimeout(() => {
            if (callback) callback();
        }, 300);
    }, success ? 800 : 1500); 
};

window.showToast = function(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = 'custom-toast ' + type;
    
    let icon = 'ph-info';
    if (type === 'error') icon = 'ph-warning-circle';
    if (type === 'success') icon = 'ph-check-circle';
    
    toast.innerHTML = '<i class="ph ' + icon + '" style="font-size:20px;"></i> <span>' + message + '</span>';
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('closing');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
};

window.HOSPITAL_LOCATIONS = [

        { id: 14, name: 'Food Court', floor: 1, tag: 'Facility' },
        { id: 12, name: 'Pharmacy', floor: 1, tag: 'Service' },
        { id: 13, name: 'Payment', floor: 1, tag: 'Cashier' },
        { id: 7,  name: 'Treatment Room', floor: 1, tag: 'Treatment' },
        { id: 8,  name: 'Examination Room 1', floor: 1, tag: 'Clinic' },
        { id: 9,  name: 'Examination Room 2', floor: 1, tag: 'Clinic' },
        { id: 10, name: 'Examination Room 3', floor: 1, tag: 'Clinic' },
        { id: 11, name: 'Examination Room 4', floor: 1, tag: 'Clinic' },
        { id: 16, name: 'Blood Draw', floor: 2, tag: 'Lab' },
        { id: 17, name: 'X-ray', floor: 2, tag: 'Imaging' },
        { id: 15, name: 'Vaccine Clinic', floor: 2, tag: 'Clinic' },
        { id: 18, name: 'Specialized Waiting Room', floor: 2, tag: 'Waiting' },
        { id: 19, name: 'ENT', floor: 2, tag: 'Clinic' },
        { id: 20, name: 'Eye Clinic', floor: 2, tag: 'Clinic' },
        { id: 21, name: 'Skin Clinic', floor: 2, tag: 'Clinic' },
        { id: 22, name: 'Dental Clinic', floor: 2, tag: 'Clinic' }
    
];

const state = {
    page: document.body.dataset.page || "login",
    auth: document.body.dataset.auth || "login",
    query: "",
    destination: "Cardiology Clinic",
    sos: false,
    queueToken: new URLSearchParams(window.location.search).get('token') || localStorage.getItem('queueToken'),
    currentQueue: null,
    routeData: JSON.parse(localStorage.getItem('hosnav_routeData') || 'null'),
    routeStep: parseInt(localStorage.getItem('hosnav_routeStep') || '0'),
    currentNode: parseInt(localStorage.getItem('hosnav_currentNode') || '1')
};

// Global Auth Guard: Kick out unauthorized users
const protectedPages = ['home', 'search', 'queue', 'route', 'map', 'scan', 'notifications', 'profile', 'complete'];
if (protectedPages.includes(state.page)) {
    const hasAccess = !!(localStorage.getItem('queueToken') || localStorage.getItem('hosnav_token'));
    if (!hasAccess) {
        window.location.href = 'qr-login.html';
    }
}

const html = String.raw;
const $ = (s) => document.querySelector(s);
const go = (p) => {
    window.location.href = {
        login: "index.html",
        register: "register.html",
        home: "home.html",
        search: "search.html",
        queue: "queue.html",
        route: "route.html",
        map: "map.html",
        qrlogin: "qr-login.html",
        scan: "scan.html",
        notifications: "notifications.html",
        profile: "profile.html",
        complete: "complete.html",
    }[p];
};
window.render = () => {
    const el = document.getElementById("app");
    if (el) el.innerHTML = pages[state.page]();
};
const nav = (a) =>
    `<nav class="nav">${[
        ["home", "ph-house", "Home"],
        ["search", "ph-magnifying-glass", "Search"],
        ["queue", "ph-queue", "Queue"],
        ["profile", "ph-user", "Profile"],
    ]
        .map(
            (x) =>
                `<button class="${a === x[0] ? "active" : ""}" onclick="go('${x[0]}')"><span><i class="ph ${x[1]}"></i></span>${x[2]}</button>`,
        )
        .join("")}</nav>`;
const topbar = (t, forceHideBell = false) => {
    const isScanPage = ['qrlogin', 'scan'].includes(state.page);
    const hideBell = forceHideBell || isScanPage || ['login', 'complete'].includes(state.page);
    
    let rightAction = '';
    if (isScanPage) {
        rightAction = `<button class="icon-btn" style="background:#f1f5f9; width:36px; height:36px; display:flex; align-items:center; justify-content:center; padding:0; border:none;" onclick="stopScannerAndGoBack()"><i class="ph ph-x" style="font-size:20px;"></i></button>`;
    } else if (!hideBell) {
        rightAction = `<button class="icon-btn" onclick="go('notifications')"><i class="ph ph-bell"></i></button>`;
    }

    return `<div class="topbar"><div class="brand" style="display:flex; align-items:center; gap:8px;"><img src="assets/Rlogo.png" style="height: 28px;"><span>Hospital<span style="color:#1466d9">Nav</span></span></div>${rightAction}</div>${t ? `<div class="header-row"><div><p class="eyebrow">Hospital companion</p><h1>${t}</h1></div></div>` : ""}`;
};
function login() {
    let r = state.auth === "register";
    return html`<section class="screen login">
        <div class="login-head">
            <img src="assets/Rlogo.png" style="width: 72px; height: 72px; margin-bottom: 24px; border-radius: 18px;">
            <p class="eyebrow">Your care, made simpler</p>
            <h1>${r ? "Create your account" : "Welcome to HospitalNav"}</h1>
            <p class="muted">
                ${r ? "Keep your visits, queue updates, and navigation in one place." : "Find your way, follow your queue, and stay informed throughout your visit."}
            </p>
        </div>
        <div class="auth-card">
            <p class="label" id="auth-error" style="color: red; margin-bottom: 10px; display: none;"></p>
            <p class="label">
                ${r ? "Register with email" : "Sign in with email"}
            </p>
            ${r ? '<label class="field">Full name</label><input id="auth-name" class="input" placeholder="Your full name">' : ""}
            <label class="field">Email address</label>
            <input id="auth-email" class="input" type="email" placeholder="you@email.com"/>
            ${r ? `<label class="field">Verification code</label>
            <div style="display:flex;gap:8px">
                <input id="auth-otp" class="input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit code"/>
                <button id="otp-btn" class="btn secondary" style="width:auto;white-space:nowrap" onclick="sendOtp()">Send code</button>
            </div>` : ""}
            <label class="field">Password</label>
            <input id="auth-password" class="input" type="password" placeholder="••••••••"/>
            <button class="btn primary" style="margin-top:18px" onclick="handleAuth(${r})">
                ${r ? "Create account" : "Log in"}
            </button>
            <button class="btn ghost" style="margin-top:10px" onclick="go('${r ? "login" : "register"}')">
                ${r ? "I already have an account" : "Create an account"}
            </button>
            <div class="or">or</div>
            <button class="btn secondary" onclick="go('qrlogin')">
                Scan appointment QR
            </button>
            <p class="muted center" style="font-size:12px;margin-top:10px">
                For patients with a queue who prefer not to register.
            </p>
        </div>
        <footer>Secure hospital access · Your information stays private</footer>
    </section>`;
}
function home() {
    const hasQueue = !!state.currentQueue;
    
    return html`<section class="screen">
        ${topbar("Home")}

        <div style="background: #eaf4ff; color: #1466d9; padding: 12px 16px; border-radius: 12px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; font-weight: 600;">
            <i class="ph ph-map-pin" style="font-size: 24px;"></i>
            <div>
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.8;">Current Location</div>
                <div style="font-size: 15px;">${localStorage.getItem('hosnav_currentLocationName') || 'Scan Queue or Checkpoint QR'}</div>
            </div>
        </div>
        
        <div class="card appointment ${hasQueue && state.currentQueue.status === 'Called' ? 'pulse-called' : ''}">
            <p class="label">${hasQueue ? "Destination" : "Welcome"}</p>
            <h2>${hasQueue ? state.currentQueue.destination_name : "No Queue"}</h2>
            <p class="muted" style="margin-bottom:15px;">${hasQueue ? "Track your queue or get route." : "Scan QR to get your queue."}</p>
            
            <div style="display:flex; gap:10px;">
                ${hasQueue ? 
                `<button class="btn route-btn" style="flex:1;" onclick="go('route')">
                    Get route →
                </button>
                <button class="btn primary" style="flex:1;" onclick="go('queue')">
                    View Queue
                </button>` 
                : 
                `<button class="btn primary" style="flex:1;" onclick="go('qrlogin')">
                    <i class="ph ph-qr-code"></i> Scan QR
                </button>`
                }
            </div>
        </div>

        ${hasQueue ? `
        <div class="stats">
            <div class="card stat" style="margin-bottom:0;">
                <p class="label">Queue</p>
                <strong>${state.currentQueue.queue_number}</strong>
                <p class="muted">${state.currentQueue.status}</p>
            </div>
            <div class="card stat" style="margin-bottom:0;">
                <p class="label">Wait time</p>
                <strong>-- min</strong>
                <p class="muted">Updating</p>
            </div>
        </div>
        ` : ''}

        <div class="card" style="${hasQueue ? 'margin-top:12px;' : ''}">
            <p class="label">Timeline</p>
            <div class="timeline">
                <div class="step ${hasQueue ? 'done' : ''}">Get Queue</div>
                <div class="step ${hasQueue && state.currentQueue.status === 'Called' ? 'active' : ''}">Go to clinic</div>
                <div class="step ${hasQueue && state.currentQueue.status === 'Completed' ? 'done' : ''}">Service done</div>
            </div>
        </div>
    </section>
    ${nav("home")}`;
}
function search() {
    setTimeout(window.renderSearchResults, 0); // Render list after DOM loads
    return html`<section class="screen">
        ${topbar("Find a destination")}
        <div class="search" style="margin-bottom: 12px;">
            <input class="input" placeholder="Search room, clinic, service..." value="${state.searchQuery || ''}" oninput="state.searchQuery = this.value; window.renderSearchResults();" autofocus />
        </div>
        <div class="card" style="padding: 12px;">
            <p class="label" style="margin-bottom: 10px;">Available Destinations</p>
            <div id="search-results-list" style="display:flex; flex-direction:column; gap:8px; max-height: 380px; overflow-y: auto;">
            </div>
        </div>
    </section>
    ${nav("search")}`;
}
function queue() {
    if(!state.currentQueue) {
        return html`<section class="screen center">
            ${topbar("Your queue")}
            <p class="muted" style="margin-top: 100px;">No active queue found.</p>
            <button class="btn secondary" style="margin-top: 20px" onclick="go('qrlogin')">Scan Queue QR</button>
    </section>
    ${nav("queue")}`;
    }
    
    let q = state.currentQueue;
    let badgeColor = q.status === 'Called' ? 'var(--blue)' : q.status === 'Processing' ? 'var(--primary)' : q.status === 'Waiting' ? '#888' : '#333';
    
    return html`<section class="screen">
        ${topbar("Your queue")}
        <div class="card center ${q.status === 'Called' ? 'pulse-called' : ''}">
            <p class="label">Your number</p>
            <div class="queue-number" style="color: ${q.status === 'Called' ? 'var(--blue)' : '#000'}">${q.queue_number}</div>
            <span class="badge" style="background:${badgeColor}; color:white; border:none;">${q.status}</span>
            <p class="muted" style="margin-top:10px;">Destination: <b>${q.destination_name}</b></p>
        </div>
        <div class="card">
            <p class="label">Queue progress</p>
            ${q.status === 'Waiting' ? '<div class="progress"><i></i></div><p style="margin-top:12px; color:#1e293b; font-weight:500; font-size:14px; background:#f1f5f9; padding:10px 12px; border-radius:8px; border-left:4px solid var(--blue);">Please complete your registration and wait to be called in the <b>General Waiting Room</b> (Floor 1).</p>' : 
             q.status === 'Called' ? '<div class="progress" style="background:var(--blue)"></div><b style="color:var(--blue); display:block; margin-top:10px">Please proceed to the counter!</b>' :
             q.status === 'Processing' ? '<b style="color:var(--primary); display:block; margin-top:10px">In consultation</b>' :
             '<b style="display:block; margin-top:10px">Queue finished.</b>'}
        </div>
    </section>
    ${nav("queue")}`;
}



async function loadRouteToLocation(locationId) {
    try {
        const fromNode = state.currentNode || 'waiting-room';
        const res = await fetch(`${API_URL}/api/navigation/route?from_node=${fromNode}&to_location=${locationId}`);
        const data = await res.json();
        if (data.success) {
            state.routeData = data.data;
            state.routeStep = 0;
            localStorage.setItem('hosnav_routeData', JSON.stringify(data.data));
            localStorage.setItem('hosnav_routeStep', '0');
            go('map');
        } else {
            showToast(data.message || 'Could not find a route');
        }
    } catch(e) {
        showToast('Connection lost. Please try again.', 'error');
    }
}

async function loadRoute() {
    if (!state.currentQueue) return;
    try {
        const fromNode = state.currentNode || 'waiting-room'; // Default to General Waiting Room
        const toLocation = state.currentQueue.destination_id;
        const res = await fetch(`${API_URL}/api/navigation/route?from_node=${fromNode}&to_location=${toLocation}`);
        const data = await res.json();
        if (data.success) {
            state.routeData = data.data;
            state.routeStep = 0;
            localStorage.setItem('hosnav_routeData', JSON.stringify(data.data));
            localStorage.setItem('hosnav_routeStep', '0');
            const appEl = document.getElementById("app");
            if (appEl && !["qrlogin", "scan", "map"].includes(state.page)) appEl.innerHTML = pages[state.page]();
        } else {
            showToast(data.message || 'Could not find a route');
        }
    } catch(e) {
        showToast('Connection lost. Please try again.', 'error');
    }
}

function route() {
    if (!state.routeData) {
        loadRoute();
        return html`<section class="screen center">
            ${topbar("Route preview")}
            <p>Loading route...</p>
        </section>`;
    }
    
    // Find destination node info
    const destNode = state.routeData.nodes_info[state.routeData.nodes_info.length - 1];
    
    return html`<section class="screen">
        ${topbar("Route preview")}
        <div class="card">
            <p class="label">From</p>
            <b>${(state.routeData.nodes_info.find(n => n.node_id === state.routeData.path[0]) || {}).name || localStorage.getItem('hosnav_currentLocationName') || 'Current Location'}</b>
            <p class="muted" style="margin:12px 0">↓</p>
            <p class="label">To</p>
            <b>${(state.currentQueue && state.currentQueue.destination_name) || (destNode ? destNode.name : "Destination")}</b>
        </div>
        <div class="stats">
            <div class="card stat">
                <p class="label">Distance</p>
                <strong>${state.routeData.total_distance}m</strong>
            </div>
            <div class="card stat">
                <p class="label">Time</p>
                <strong>~${Math.ceil(state.routeData.total_distance / 60)} min</strong>
            </div>
        </div>
        <button class="btn primary" onclick="go('map')">
            Start navigation
        </button>
    </section>`;
}

function nextStep() {
    if (state.routeData && state.routeStep < state.routeData.instructions.length - 1) {
        state.routeStep++;
        localStorage.setItem('hosnav_routeStep', state.routeStep.toString());
        if (window.render) window.render();
    } else {
        // Arrival: update current node
        if (state.routeData && state.routeData.instructions.length > 0) {
            const lastInst = state.routeData.instructions[state.routeData.instructions.length - 1];
            state.currentNode = lastInst.to;
            localStorage.setItem('hosnav_currentNode', state.currentNode.toString()); const dNode = state.routeData.nodes_info.find(n => n.node_id === lastInst.to); if(dNode) localStorage.setItem('hosnav_currentLocationName', (dNode.name || 'Node ' + dNode.node_id) + ' (Floor ' + dNode.node_floor + ')');
        }
        localStorage.removeItem('hosnav_routeData');
        localStorage.removeItem('hosnav_routeStep');
        state.routeData = null;
        state.routeStep = 0;
        go('complete');
    }
}

function map() {
    if (!state.routeData) {
        go('route');
        return '';
    }

    if (state.routeData.instructions.length === 0) {
        return html`<section class="screen">
            ${topbar("", true)}
            <div class="center" style="padding-top:100px;">
                <div class="mark" style="margin:0 auto 24px;background:#24a477">✓</div>
            <p class="eyebrow">You are already here</p>
            <h1>Arrived</h1>
            <p class="muted">You are already at your destination.</p>
            <button class="btn primary" style="margin-top:28px" onclick="go('home')">Return to home
            </button>
        </div>
    </section>`;
}

    const step = state.routeData.instructions[state.routeStep];
    const isLast = state.routeStep === state.routeData.instructions.length - 1;
    
    // Find current floor based on the "from" node of the current step
    const stepNode = state.routeData.nodes_info.find(n => n.node_id === step.from);
    const currentFloor = stepNode ? stepNode.node_floor : 1;
    const floorImg = currentFloor === 1 ? 'assets/map/floor 1.svg' : 'assets/map/floor 2.svg';

    // Generate polyline points for the remaining nodes in the path that belong to the current floor
    let startIndex = state.routeData.path.indexOf(step.from);
    if (startIndex === -1) startIndex = 0;

    let polylinePoints = [];
    let currentX = 0, currentY = 0;
    let nextX = 0, nextY = 0;
    
    for (let i = startIndex; i < state.routeData.path.length; i++) {
        let id = state.routeData.path[i];
        const n = state.routeData.nodes_info.find(x => x.node_id === id);
        if (n && n.node_floor == currentFloor) {
            polylinePoints.push(`${n.pos_x},${n.pos_y}`);
            if (id === step.from) {
                currentX = n.pos_x;
                currentY = n.pos_y;
            }
            if (id === step.to) {
                nextX = n.pos_x;
                nextY = n.pos_y;
            }
        } else if (n && n.node_floor != currentFloor) {
            // Stop drawing polyline if it goes to another floor
            break;
        }
    }
    
    const polylineStr = polylinePoints.join(" ");

    // Determine if it's the first step on this floor (to show overview map)
    let isFirstStepOnFloor = true;
    if (state.routeStep > 0) {
        const prevStep = state.routeData.instructions[state.routeStep - 1];
        const prevStepNode = state.routeData.nodes_info.find(n => n.node_id === prevStep.from);
        if (prevStepNode && prevStepNode.node_floor === currentFloor) {
            isFirstStepOnFloor = false;
        }
    }

    // ViewBox zoom logic
    let viewBox = "0 0 500 500";
    if (!isFirstStepOnFloor && currentX && nextX) {
        const cx = (currentX + nextX) / 2;
        const cy = (currentY + nextY) / 2;
        let vX = Math.max(0, cx - 125);
        let vY = Math.max(0, cy - 125);
        if (vX + 250 > 500) vX = 500 - 250;
        if (vY + 250 > 500) vY = 500 - 250;
        viewBox = `${vX} ${vY} 250 250`;
    }

    return html`<section class="screen">
        ${topbar("Navigation")}
        <div class="mapbox" style="position:relative; background:#fff; overflow:hidden; border-radius:12px;">
            <svg viewBox="${viewBox}" width="100%" height="100%" style="display:block; max-width:500px; margin:0 auto; background:#f4f6fa; border:1px solid #e6ebf0; transition: all 0.8s ease-in-out;">
                <image href="${floorImg}" width="500" height="500" preserveAspectRatio="none" />
                <polyline points="${polylineStr}" fill="none" stroke="var(--blue)" stroke-width="4" stroke-linejoin="round" stroke-dasharray="8 4" opacity="0.8" />
                <circle cx="${currentX}" cy="${currentY}" r="6" fill="var(--blue)">
                    <animate attributeName="r" values="6;20" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="${currentX}" cy="${currentY}" r="7" fill="var(--blue)" stroke="#fff" stroke-width="2" />
            </svg>
        </div>
        <div class="card instruction" style="margin-top:12px">
            <b>${step.instruction}</b>
            <p class="muted">Distance: ${Number(step.distance).toFixed(1)}m</p>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button class="btn secondary" style="flex: 1; padding: 12px 10px; font-size: 14px;" onclick="go('scan')">
                <i class="ph ph-qr-code"></i> Checkpoint
            </button>
            ${isLast 
                ? html`<button class="btn primary" style="flex: 2" onclick="nextStep()">Finish</button>` 
                : html`<button class="btn primary" style="flex: 2" onclick="nextStep()">Next Step</button>`
            }
        </div>
    </section>`;
}
function qrlogin() {
    return html`<section class="screen login center">
        ${topbar("")}
        <div id="reader" style="width: 100%; min-height: 250px; background: #eee; border-radius: 12px; overflow: hidden; margin-top: 20px;"></div>
        <h2 style="margin-top:20px;">Scan your appointment QR</h2>
        <p class="muted">
            Access your queue and navigation without an account.
        </p>
        <div style="margin-top:20px; display:flex; gap:10px;">
            <input id="token-input" class="input" style="text-align:center; flex:1;" placeholder="Or enter Token manually" value="${state.queueToken || ''}">
            <button class="btn primary" onclick="handleQRScan($('#token-input').value)">Connect</button>
        </div>
    </section>`;
}

function scan() {
    return html`<section class="screen center">
        ${topbar("Scan Checkpoint QR")}
        <div id="reader" style="width: 100%; max-width: 300px; min-height: 250px; background: #eee; border-radius: 12px; overflow: hidden; margin: 0 auto 20px;"></div>
        <h2>Lost your way?</h2>
        <p class="muted">
            Scan a nearby QR checkpoint to update your location and recalculate the route.
        </p>
        <button class="btn ghost" style="margin-top:10px" onclick="if(window.checkpointQrCode) window.checkpointQrCode.stop().then(()=>go('home')).catch(()=>go('home')); else go('home');">Cancel</button>
    </section>`;
}
function notifications() {
    let notis = [];
    try {
        notis = JSON.parse(localStorage.getItem('hosnav_notis')) || [];
    } catch(e){}

    if (notis.length === 0) {
        return html`<section class="screen">
            ${topbar("Notifications")}
            <div style="text-align:center; margin-top:50px; color:#888;">
                <i class="ph ph-bell-slash" style="font-size: 48px;"></i>
                <p>No new notifications</p>
            </div>
    </section>
    ${nav("")}`;
    }

    return html`<section class="screen">
        ${topbar("Notifications")}
        <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">
            <button class="btn ghost" style="padding:4px 8px; font-size:12px;" onclick="localStorage.removeItem('hosnav_notis'); go('notifications');">Clear all</button>
        </div>
        ${notis.map(n => `
        <div class="card" style="border-left: 4px solid ${n.type === 'alert' ? '#e53935' : '#1e88e5'};">
            <b>${n.title}</b>
            <p class="muted">${n.message}</p>
            <small style="color:#aaa; font-size:10px;">${new Date(n.time).toLocaleTimeString()}</small>
        </div>
        `).join('')}
    </section>
    ${nav("")}`;
}
function profile() {
    let userStr = localStorage.getItem('hosnav_user');
    let user = userStr ? JSON.parse(userStr) : { name: 'Guest User', email: 'guest@hospital' };
    let initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return html`<section class="screen">
        ${topbar("My profile")}
        <div class="card profile-row">
            <div class="big-avatar">${initials}</div>
            <div>
                <h2>${user.name}</h2>
                <p class="muted">${user.email}</p>
            </div>
        </div>
        <div class="card">
            <div class="list-item">Personal information</div>
            <div class="list-item">Language · English</div>
            <div class="list-item">Accessibility settings</div>
        </div>
        <button class="btn ghost" onclick="localStorage.clear(); go('login');">Log out</button>
    </section>
    ${nav("profile")}`;
}
function complete() {
    return html`<section class="screen">
        ${topbar("", true)}
        <div class="center" style="padding-top:100px;">
            <div class="mark" style="margin:0 auto 24px;background:#24a477">✓</div>
        <p class="eyebrow">Navigation complete</p>
        <h1>You’ve arrived</h1>
        <p class="muted">You have reached your destination.</p>
        <button
            class="btn primary"
            style="margin-top:28px"
            onclick="go('home')"
        >
            Return to home
        </button>
    </section>`;
}
const pages = {
    login,
    home,
    search,
    scan,
    queue,
    route,
    map,
    qrlogin,
    notifications,
    profile,
    complete,
};
$("#app").innerHTML = pages[state.page]();

function startRobustCamera(onSuccess) {
    const readerEl = document.getElementById('reader');
    if (readerEl) readerEl.innerHTML = ''; // Force clear any ghost UI

    setTimeout(() => {
        Html5Qrcode.getCameras().then(devices => {
            if (devices && devices.length) {
                let cameraId = devices.length > 1 ? devices[devices.length - 1].id : devices[0].id;
                if(window._activeQr) {
                    try { window._activeQr.stop(); } catch(e){}
                }
                window._activeQr = new Html5Qrcode("reader");
                window._activeQr.start(cameraId, { fps: 2, qrbox: {width: 250, height: 250} }, (decodedText) => {
                    window._activeQr.stop().then(() => onSuccess(decodedText)).catch(() => onSuccess(decodedText));
                }, undefined).catch(err => {
                    // Fallback to environment facingMode if ID fails
                    window._activeQr.start({ facingMode: "environment" }, { fps: 2, qrbox: {width: 250, height: 250} }, (text) => {
                        window._activeQr.stop().then(() => onSuccess(text)).catch(() => onSuccess(text));
                    }, undefined).catch(err2 => showToast("Camera start failed: " + err2));
                });
            } else {
                showToast("No cameras found on your device.", 'error');
            }
        }).catch(err => {
            showToast("Camera permission error: " + err);
        });
    }, 300);
}

if (state.page === 'qrlogin') {
    startRobustCamera((decodedText) => {
        window.showScanUI('Linking Queue...');
        let token = decodedText;
        if(token.includes('token=')) {
            token = token.split('token=')[1].split('&')[0];
        }
        const tokenInput = document.getElementById('token-input');
        if (tokenInput) tokenInput.value = token;
        handleQRScan(token);
    });
}

if (state.page === 'scan') {
    startRobustCamera((decodedText) => {
        window.showScanUI('Finding location...');
        handleCheckpointScan(decodedText);
    });
}

async function handleCheckpointScan(code) {
    try {
        const res = await fetch(`${API_URL}/api/navigation/checkpoint/${encodeURIComponent(code)}`);
        const data = await res.json();
        if (data.success) {
            state.currentNode = data.data.node_id;
            localStorage.setItem('hosnav_currentNode', state.currentNode.toString());
            localStorage.setItem('hosnav_currentLocationName', `${data.data.location_name} (Floor ${data.data.floor})`);
            
            if (state.routeData && state.routeData.path && state.routeData.path.length > 0) {
                const destId = state.routeData.path[state.routeData.path.length - 1];
                const rRes = await fetch(`${API_URL}/api/navigation/route?from_node=${state.currentNode}&to_node=${destId}`);
                const rData = await rRes.json();
                if (rData.success) {
                    state.routeData = rData.data;
                    state.routeStep = 0;
                    localStorage.setItem('hosnav_routeData', JSON.stringify(rData.data));
                    localStorage.setItem('hosnav_routeStep', '0');
                    window.completeScanUI(true, `Location updated:${data.data.location_name}`, () => go('map'));
                    return;
                }
            }
            window.completeScanUI(true, `Location updated:${data.data.location_name}`, () => go('home'));
        } else {
            window.completeScanUI(false, 'Invalid Checkpoint QR', () => go('home'));
        }
    } catch (e) {
        window.completeScanUI(false, 'Connection error', () => go('home'));
    }
}

setInterval(pollQueue, 5000);

async function pollQueue() {
    if(!state.queueToken) return;
    try {
        const res = await fetch(`${API_URL}/api/queues/track/${state.queueToken}`);
        const data = await res.json();
        if(data.success) {
            if (data.data.status === 'Completed' || data.data.status === 'Skipped') {
                showToast('Your queue has been ' + data.data.status.toLowerCase() + '. Thank you!');
                localStorage.removeItem('queueToken');
                localStorage.removeItem('hosnav_currentNode');
                localStorage.removeItem('hosnav_currentLocationName');
                state.queueToken = null;
                state.currentQueue = null;
                go('home');
                return;
            }
            if(state.currentQueue && state.currentQueue.status !== data.data.status) {
                let notis = [];
                try { notis = JSON.parse(localStorage.getItem('hosnav_notis')) || []; } catch(e){}
                notis.unshift({
                    title: `Queue Status: ${data.data.status}`,
                    message: `Your queue is now ${data.data.status}. Destination: ${data.data.destination_name}`,
                    time: new Date().toISOString(),
                    type: data.data.status === 'Called' ? 'alert' : 'info'
                });
                localStorage.setItem('hosnav_notis', JSON.stringify(notis));

                if(data.data.status === 'Called') {
                    showToast('It is your turn! Please go to ' + data.data.destination_name);
                }
            }
            
            // Prevent flickering by only re-rendering if queue data actually changed
            const prevStr = JSON.stringify(state.currentQueue || {});
            state.currentQueue = data.data;
            const newStr = JSON.stringify(state.currentQueue || {});
            
            if (prevStr !== newStr) {
                const appEl = document.getElementById("app");
                if (appEl && !["qrlogin", "scan", "map"].includes(state.page)) appEl.innerHTML = pages[state.page](); 
            }
        }
    } catch(err){}
}

async function handleQRScan(token, silent = false) {
    if(!token) return;
    try {
        const headers = {};
        const userToken = localStorage.getItem('hosnav_token');
        if (userToken) {
            headers['Authorization'] = `Bearer ${userToken}`;
        }
        const res = await fetch(`${API_URL}/api/queues/track/${token}`, { headers });
        if (!res.ok && res.status !== 404) throw new Error('Network response was not ok');
        const data = await res.json();
        
        if(data.success) {
            if (data.data.status === 'Completed' || data.data.status === 'Skipped') {
                if (!silent) {
                    window.completeScanUI(false, 'This queue has already ended.', () => {
                        localStorage.removeItem('queueToken');
                        localStorage.removeItem('hosnav_currentNode');
                        localStorage.removeItem('hosnav_currentLocationName');
                        state.queueToken = null;
                        state.currentQueue = null;
                        go('home'); // Ensure we return home
                    });
                    return;
                }
                localStorage.removeItem('queueToken');
                localStorage.removeItem('hosnav_currentNode');
                localStorage.removeItem('hosnav_currentLocationName');
                state.queueToken = null;
                state.currentQueue = null;
                return;
            }
            
            const oldToken = localStorage.getItem('queueToken');
            localStorage.setItem('queueToken', token);
            state.queueToken = token;
            state.currentQueue = data.data;
            
            if (oldToken !== token || !localStorage.getItem('hosnav_currentNode')) {
                localStorage.setItem('hosnav_currentNode', '76');
                localStorage.setItem('hosnav_currentLocationName', 'General Waiting Room (Floor 1)');
                state.currentNode = 76;
            }
            
            if(!silent && state.page !== 'queue') {
                window.completeScanUI(true, 'Linked to Queue!', () => go('queue'));
            } else {
                if(!silent && document.getElementById('scan-overlay-container')) {
                    window.completeScanUI(true, 'Linked to Queue!', () => {
                        const appEl = document.getElementById("app");
                        if (appEl && !["qrlogin", "scan", "map"].includes(state.page)) appEl.innerHTML = pages[state.page]();
                    });
                } else {
                    const appEl = document.getElementById("app");
                    if (appEl && !["qrlogin", "scan", "map"].includes(state.page)) appEl.innerHTML = pages[state.page]();
                }
            }
        } else {
            if(!silent) {
                window.completeScanUI(false, 'QR code is incorrect or expired', () => {
                    localStorage.removeItem('queueToken');
                    localStorage.removeItem('hosnav_currentNode');
                    localStorage.removeItem('hosnav_currentLocationName');
                    state.queueToken = null;
                });
            } else {
                localStorage.removeItem('queueToken');
                localStorage.removeItem('hosnav_currentNode');
                localStorage.removeItem('hosnav_currentLocationName');
                state.queueToken = null;
            }
        }
    } catch(err) {
        if(!silent) window.completeScanUI(false, 'Connection lost', () => go('home'));
    }
}

async function syncActiveQueue() {
    if(state.queueToken) {
        await handleQRScan(state.queueToken, true).catch(()=>null);
    }
    else if(localStorage.getItem('hosnav_token')) {
        try {
            const res = await fetch(`${API_URL}/api/queues/my-active`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('hosnav_token')}` }
            });
            const data = await res.json();
            if(data.success && data.hasQueue) {
                await handleQRScan(data.token, true);
            }
        } catch(e) {}
    }
}
syncActiveQueue();

async function sendOtp() {
    const email = document.getElementById('auth-email').value;
    const errorEl = document.getElementById('auth-error');
    const btn = document.getElementById('otp-btn');
    errorEl.style.display = 'none';

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        errorEl.textContent = 'Please enter a valid email address';
        errorEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    try {
        const response = await fetch(API_URL + '/api/auth/register/otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        showToast(result.message, 'success');
        let s = 60;
        btn.textContent = `Resend (${s})`;
        const t = setInterval(() => {
            if (--s > 0) return (btn.textContent = `Resend (${s})`);
            clearInterval(t);
            btn.textContent = 'Resend code';
            btn.disabled = false;
        }, 1000);
    } catch (err) {
        btn.disabled = false;
        errorEl.textContent = err.message || 'Connection lost. Please try again.';
        errorEl.style.display = 'block';
    }
}

async function handleAuth(isRegister) {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name = isRegister ? document.getElementById('auth-name').value : undefined;
    const otp = isRegister ? document.getElementById('auth-otp').value.trim() : undefined;
    const errorEl = document.getElementById('auth-error');

    if (!email || !password || (isRegister && (!name || !otp))) {
        errorEl.textContent = 'Please fill in all fields';
        errorEl.style.display = 'block';
        return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        errorEl.textContent = 'Please enter a valid email address';
        errorEl.style.display = 'block';
        return;
    }

    try {
        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
        const response = await fetch(API_URL + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(isRegister ? { email, password, name, otp } : { email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (isRegister) {
                showToast('Account created successfully!', 'success');
                go('login');
            } else {
                localStorage.setItem('hosnav_token', result.token);
                localStorage.setItem('hosnav_user', JSON.stringify(result.user));
                showToast('Welcome, ' + result.user.name, 'success');
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
