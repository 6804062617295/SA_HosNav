const API_URL = 'https://hosnav.onrender.com';

const state = {
    logged: !!localStorage.getItem('staff_token'),
    toast: '',
    patients: [],
    showQR: null // Will hold the token and queue number if QR is generated
};

const $ = (s) => document.querySelector(s);

function notify(t) {
    state.toast = t;
    render();
    setTimeout(() => {
        state.toast = '';
        render();
    }, 3000);
}

// ---------------- API Calls ----------------

async function handleLogin() {
    const email = $('#staff-email').value;
    const password = $('#staff-pass').value;

    try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (data.success && (data.user.role === 'STAFF' || data.user.role === 'ADMIN')) {
            localStorage.setItem('staff_token', data.token);
            localStorage.setItem('staff_user', JSON.stringify(data.user));
            state.logged = true;
            fetchQueues(); // Load data
        } else {
            notify(data.message || 'Access Denied: Staff only.');
        }
    } catch (err) {
        notify('Failed to connect to server');
    }
}

function handleLogout() {
    localStorage.removeItem('staff_token');
    localStorage.removeItem('staff_user');
    state.logged = false;
    state.patients = [];
    render();
}

async function fetchQueues() {
    if (!state.logged) return;
    try {
        const res = await fetch(`${API_URL}/api/queues`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('staff_token')}` }
        });
        const data = await res.json();
        if (data.success) {
            state.patients = data.data;
            render();
        }
    } catch (err) {
        console.error('Failed to fetch queues');
    }
}

async function createQueue() {
    // For prototype: Send to Triage (Assume location_id 1 is Triage/Entrance)
    try {
        const res = await fetch(`${API_URL}/api/queues`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}` 
            },
            body: JSON.stringify({ destination_id: 1 })
        });
        const data = await res.json();
        if (data.success) {
            state.showQR = {
                number: data.data.queue_number,
                token: data.data.token
            };
            fetchQueues(); // reload list
        } else {
            notify(data.message || 'Error creating queue');
        }
    } catch (err) {
        notify('Network error');
    }
}

async function updateStatus(id, newStatus) {
    try {
        const res = await fetch(`${API_URL}/api/queues/${id}/status`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}` 
            },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            notify(`Queue ${id} updated to ${newStatus}`);
            fetchQueues();
        }
    } catch (err) {
        notify('Failed to update status');
    }
}

// ---------------- UI Rendering ----------------

function login() {
    return `
        <section class="login">
            <div class="login-card">
                <div class="mark"><i class="ph ph-first-aid-kit"></i></div>
                <div class="brand">Hospital<span>Nav</span> Staff</div>
                <h1>Welcome back</h1>
                <p class="muted">Sign in to manage your department queue and patient flow.</p>

                <label>Staff Email</label>
                <input id="staff-email" class="input" placeholder="Enter staff email" value="admin@hospital.local">

                <label>Password</label>
                <input id="staff-pass" class="input" type="password" placeholder="••••••••" value="password123">

                <button class="btn primary" onclick="handleLogin()">Log in to dashboard</button>
                <p class="muted" style="text-align:center;font-size:12px;margin-top:18px">Authorized hospital personnel only</p>
            </div>
        </section>
    `;
}

function dashboard() {
    let rows = state.patients
        .map(
            (p) => `
        <tr>
            <td><b>${p.queue_number}</b></td>
            <td>Guest Patient</td>
            <td>
                <span class="badge ${p.status.toLowerCase()}">${p.status}</span>
            </td>
            <td>
                <div class="dropdown">
                    <button class="icon-btn">Action ▾</button>
                    <div class="dropdown-content">
                        <button onclick="updateStatus(${p.queue_id}, 'Called')">Call Queue</button>
                        <button onclick="updateStatus(${p.queue_id}, 'Processing')">Process</button>
                        <button onclick="updateStatus(${p.queue_id}, 'Completed')">Complete</button>
                        <button onclick="updateStatus(${p.queue_id}, 'Skipped')">Skip</button>
                    </div>
                </div>
            </td>
        </tr>
    `
        )
        .join('');

    if (rows === '') {
        rows = '<tr><td colspan="4" style="text-align:center; padding: 20px;">No queues found.</td></tr>';
    }

    return `
        <header class="header">
            <div class="brand">Hospital<span>Nav</span> Staff</div>
            <div style="display:flex; gap:16px; align-items:center;">
                <button class="btn primary" onclick="createQueue()">+ Create Queue (Standard Entry)</button>
                <div class="avatar" onclick="handleLogout()" style="cursor:pointer;" title="Log out">AS</div>
            </div>
        </header>
        
        <main class="dashboard">
            <div class="stats">
                <div class="stat-card">
                    <p class="muted">Waiting in Triage</p>
                    <h2>${state.patients.filter(p => p.status === 'Waiting').length}</h2>
                </div>
                <div class="stat-card">
                    <p class="muted">Processing</p>
                    <h2>${state.patients.filter(p => p.status === 'Called' || p.status === 'Processing').length}</h2>
                </div>
                <div class="stat-card">
                    <p class="muted">Completed Today</p>
                    <h2>${state.patients.filter(p => p.status === 'Completed').length}</h2>
                </div>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Queue No.</th>
                            <th>Patient Name</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        </main>
        
        ${state.showQR ? renderQRModal() : ''}
    `;
}

function renderQRModal() {
    // We will generate the QR code right after the HTML is injected to DOM
    setTimeout(() => {
        if ($('#qrcode')) {
            $('#qrcode').innerHTML = '';
            new QRCode(document.getElementById("qrcode"), {
                text: window.location.origin + "/frontend/patient/qr-login.html?token=" + state.showQR.token,
                width: 200,
                height: 200
            });
        }
    }, 50);

    return `
        <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:999;">
            <div style="background:#fff; padding:30px; border-radius:12px; text-align:center; max-width: 400px;">
                <h2>Queue Created: ${state.showQR.number}</h2>
                <p style="color:#666; margin-bottom: 20px;">Ask the patient to scan this QR code to track their queue status.</p>
                <div id="qrcode" style="display:flex; justify-content:center; margin-bottom: 20px;"></div>
                <button class="btn secondary" style="width: 100%;" onclick="state.showQR = null; render();">Close</button>
            </div>
        </div>
    `;
}

function render() {
    $('#app').innerHTML = state.logged ? dashboard() : login();
    if (state.toast) {
        let t = document.createElement('div');
        t.className = 'toast';
        t.innerText = state.toast;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2900);
    }
}

// Initial boot
render();
if (state.logged) {
    fetchQueues();
    // Poll every 10 seconds for staff
    setInterval(fetchQueues, 10000);
}
