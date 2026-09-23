
const API_URL = 'https://hosnav.onrender.com';

const state = {
    page: document.body.dataset.page || "login",
    auth: document.body.dataset.auth || "login",
    query: "",
    destination: "Cardiology Clinic",
    sos: false,
    queueToken: new URLSearchParams(window.location.search).get('token') || localStorage.getItem('queueToken'),
    currentQueue: null,
    routeData: JSON.parse(sessionStorage.getItem('hosnav_routeData') || 'null'),
    routeStep: parseInt(sessionStorage.getItem('hosnav_routeStep') || '0'),
    currentNode: parseInt(sessionStorage.getItem('hosnav_currentNode') || '1')
};

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
        notifications: "notifications.html",
        profile: "profile.html",
        complete: "complete.html",
    }[p];
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
const topbar = (t) =>
    `<div class="topbar"><div class="brand">Hospital<span style="color:#1466d9">Nav</span></div><button class="icon-btn" onclick="go('notifications')"><i class="ph ph-bell"></i></button></div>${t ? `<div class="header-row"><div><p class="eyebrow">Hospital companion</p><h1>${t}</h1></div></div>` : ""}`;
function login() {
    let r = state.auth === "register";
    return html`<section class="screen login">
        <div class="login-head">
            <div class="mark">✚</div>
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
        
        <div class="card appointment">
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
        ${nav("home")}
    </section>`;
}
function search() {
    return html`<section class="screen">
        ${topbar("Find a destination")}
        <div class="search">
            <input class="input" placeholder="Room, doctor, department..." />
        </div>
        <div class="card">
            <p class="label">Quick destinations</p>
            <p class="muted" style="margin-top:10px">
                Pharmacy · X-Ray · Laboratory · Cardiology
            </p>
            <button
                class="btn secondary"
                style="margin-top:14px"
                onclick="go('route')"
            >
                Navigate to Cardiology
            </button>
        </div>
        ${nav("search")}
    </section>`;
}
function queue() {
    if(!state.currentQueue) {
        return html`<section class="screen center">
            ${topbar("Your queue")}
            <p class="muted" style="margin-top: 100px;">No active queue found.</p>
            <button class="btn secondary" style="margin-top: 20px" onclick="go('qrlogin')">Scan Queue QR</button>
            ${nav("queue")}
        </section>`;
    }
    
    let q = state.currentQueue;
    let badgeColor = q.status === 'Called' ? 'var(--blue)' : q.status === 'Processing' ? 'var(--primary)' : q.status === 'Waiting' ? '#888' : '#333';
    
    return html`<section class="screen">
        ${topbar("Your queue")}
        <div class="card center">
            <p class="label">Your number</p>
            <div class="queue-number" style="color: ${q.status === 'Called' ? 'var(--blue)' : '#000'}">${q.queue_number}</div>
            <span class="badge" style="background:${badgeColor}; color:white; border:none;">${q.status}</span>
            <p class="muted" style="margin-top:10px;">Destination: <b>${q.destination_name}</b></p>
        </div>
        <div class="card">
            <p class="label">Queue progress</p>
            ${q.status === 'Waiting' ? '<div class="progress"><i></i></div><p class="muted" style="margin-top:10px">Please wait until your number is called.</p>' : 
             q.status === 'Called' ? '<div class="progress" style="background:var(--blue)"></div><b style="color:var(--blue); display:block; margin-top:10px">Please proceed to the counter!</b>' :
             q.status === 'Processing' ? '<b style="color:var(--primary); display:block; margin-top:10px">In consultation</b>' :
             '<b style="display:block; margin-top:10px">Queue finished.</b>'}
        </div>
        ${nav("queue")}
    </section>`;
}

async function pollQueue() {
    if(!state.queueToken) return;
    try {
        const res = await fetch(`${API_URL}/api/queues/track/${state.queueToken}`);
        const data = await res.json();
        if(data.success) {
            // Check if status changed
            if(state.currentQueue && state.currentQueue.status !== data.data.status) {
                // Save notification
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
                    alert('📣 YOUR QUEUE HAS BEEN CALLED! Please proceed to ' + data.data.destination_name);
                }
            }
            state.currentQueue = data.data;
            const appEl = document.getElementById("app");
            if (appEl) appEl.innerHTML = pages[state.page](); // Re-render silently
        }
    } catch(err){}
}

async function loadRoute() {
    if (!state.currentQueue) return;
    try {
        const fromNode = state.currentNode || 1; // Default to 1 (Triage) if not set
        const toLocation = state.currentQueue.destination_id;
        const res = await fetch(`${API_URL}/api/navigation/route?from_node=${fromNode}&to_location=${toLocation}`);
        const data = await res.json();
        if (data.success) {
            state.routeData = data.data;
            state.routeStep = 0;
            sessionStorage.setItem('hosnav_routeData', JSON.stringify(data.data));
            sessionStorage.setItem('hosnav_routeStep', '0');
            const appEl = document.getElementById("app");
            if (appEl) appEl.innerHTML = pages[state.page]();
        } else {
            alert(data.message || 'Could not find a route');
        }
    } catch(e) {
        alert('Network error loading route');
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
            <b>Current Location (Node ${state.routeData.path[0]})</b>
            <p class="muted" style="margin:12px 0">↓</p>
            <p class="label">To</p>
            <b>${destNode ? destNode.name : state.currentQueue.destination_name}</b>
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
        sessionStorage.setItem('hosnav_routeStep', state.routeStep.toString());
        const appEl = document.getElementById("app");
        if (appEl) appEl.innerHTML = pages[state.page]();
    } else {
        sessionStorage.removeItem('hosnav_routeData');
        sessionStorage.removeItem('hosnav_routeStep');
        go('complete');
    }
}

function map() {
    if (!state.routeData) {
        go('route');
        return '';
    }

    if (state.routeData.instructions.length === 0) {
        return html`<section class="screen center" style="padding-top:150px">
            ${topbar("")}
            <div class="mark" style="margin:0 auto 24px;background:#24a477">✓</div>
            <p class="eyebrow">You are already here</p>
            <h1>Arrived</h1>
            <p class="muted">You are already at your destination.</p>
            <button class="btn primary" style="margin-top:28px" onclick="go('home')">Return to home</button>
        </section>`;
    }

    const step = state.routeData.instructions[state.routeStep];
    const isLast = state.routeStep === state.routeData.instructions.length - 1;

    return html`<section class="screen">
        ${topbar("Navigation")}
        <div class="mapbox" style="background: #e0e0e0; display:flex; align-items:center; justify-content:center; flex-direction:column; color:#666;">
            <!-- Real map UI will go here, currently placeholder -->
            <i class="ph ph-map-trifold" style="font-size:48px; opacity:0.5; margin-bottom:10px;"></i>
            <p>Map View Placeholder</p>
            <small>Walking from Node ${step.from} to Node ${step.to}</small>
        </div>
        <div class="card instruction">
            <b>${step.instruction}</b>
            <p class="muted">Distance: ${step.distance}m</p>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button class="btn secondary" style="flex: 1; padding: 12px 10px; font-size: 14px;" onclick="go('scan')">
                <i class="ph ph-qr-code"></i> Checkpoint
            </button>
            <button class="btn primary" style="flex: 1;" onclick="nextStep()">
                ${isLast ? "Arrive" : "Next step"}
            </button>
        </div>
    </section>`;
}
function qrlogin() {
    return html`<section class="screen login center">
        ${topbar("")}
        <div id="reader" style="width: 100%; border-radius: 12px; overflow: hidden; margin-top: 20px;"></div>
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
            localStorage.setItem('queueToken', token);
            state.queueToken = token;
            state.currentQueue = data.data;
            if(!silent && state.page !== 'queue') {
                go('queue');
            } else {
                // Re-render immediately on all pages to ensure data is fresh
                const appEl = document.getElementById("app");
                if (appEl) appEl.innerHTML = pages[state.page]();
            }
        } else {
            if(!silent) alert('Invalid or expired QR code');
            localStorage.removeItem('queueToken');
            state.queueToken = null;
        }
    } catch(err) {
        if(!silent) alert('Network error');
        // If it's a hard network error on load, we don't necessarily wipe the token, it might just be bad signal
    }
}
function scan() {
    return html`<section class="screen center">
        ${topbar("Scan Checkpoint QR")}
        <div class="qrbox" style="margin-bottom: 20px;">[ Camera View ]</div>
        <h2>Lost your way?</h2>
        <p class="muted">
            Scan a nearby QR checkpoint to update your location and recalculate the route.
        </p>
        <button
            class="btn primary"
            style="margin-top:25px"
            onclick="alert('Mock: Scanned QR Checkpoint. Location updated.'); go('map');"
        >
            Simulate Checkpoint Scan
        </button>
        <button class="btn ghost" style="margin-top:10px" onclick="go('map')">Cancel</button>
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
            ${nav("")}
        </section>`;
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
        ${nav("")}
    </section>`;
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
        <button class="btn ghost" onclick="localStorage.removeItem('hosnav_user'); localStorage.removeItem('hosnav_token'); go('login');">Log out</button
        >${nav("profile")}
    </section>`;
}
function complete() {
    return html`<section class="screen center" style="padding-top:150px">
        ${topbar("")}
        <div class="mark" style="margin:0 auto 24px;background:#24a477">✓</div>
        <p class="eyebrow">Navigation complete</p>
        <h1>You’ve arrived</h1>
        <p class="muted">Cardiology Clinic has been reached successfully.</p>
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

if (state.page === 'qrlogin') {
    setTimeout(() => {
        window.html5QrCode = new Html5Qrcode("reader");
        window.html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: {width: 250, height: 250} },
            (decodedText) => {
                let token = decodedText;
                if (decodedText.includes('token=')) {
                    token = decodedText.split('token=')[1];
                }
                $('#token-input').value = token;
                
                // Stop scanning after success to save battery
                window.html5QrCode.stop().then(() => {
                    handleQRScan(token);
                }).catch(err => {
                    handleQRScan(token);
                });
            },
            (errorMessage) => {
                // ignore errors
            }
        ).catch((err) => {
            console.error("Camera start failed", err);
        });
    }, 100);
}

// Queue Polling
setInterval(pollQueue, 5000);

async function syncActiveQueue() {
    // If they have a token in URL or localStorage, track it
    if(state.queueToken) {
        await handleQRScan(state.queueToken, true).catch(()=>null);
    }
    // If they are logged in but don't have a queueToken, check backend
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
            body: JSON.stringify(isRegister ? { email, password, name } : { email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (isRegister) {
                alert('Registration successful! You can now log in.');
                go('login');
            } else {
                // Save token and user info
                localStorage.setItem('hosnav_token', result.token);
                localStorage.setItem('hosnav_user', JSON.stringify(result.user));
                alert('Logged in successfully as ' + result.user.name);
                go('home');
            }
        } else {
            errorEl.textContent = result.message || 'Authentication failed';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Failed to connect to server';
        errorEl.style.display = 'block';
        console.error(err);
    }
}
