const API_URL = 'https://hosnav.onrender.com';
const PATIENT_URL = 'https://hosnavpatient.vercel.app'; // Patient PWA Vercel URL

const state = {
    logged: !!localStorage.getItem('staff_token'),
    toast: '',
    patients: [],
    showQR: null
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

async function fetchQueues() {
    if (!state.logged) return;
    try {
        const res = await fetch(`${API_URL}/api/queues`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('staff_token')}` }
        });
        const data = await res.json();
        if (data.success) {
            state.patients = data.data;
            // อย่าเพิ่งวาดจอใหม่ถ้ารูป QR ยังโชว์อยู่ (กัน QR กระพริบ)
            if (!state.showQR) {
                render();
            }
        }
    } catch (err) {
        console.error('Failed to fetch queues');
    }
}

async function createQueue() {
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
            state.showQR = { number: data.data.queue_number, token: data.data.token };
            render(); // วาดจอใหม่ทันทีเพื่อให้ Modal เด้งขึ้นมา
            fetchQueues(); // ดึงคิวล่าสุดมาอัปเดต (จะไม่ทำให้จอกระพริบซ้ำเพราะโดนบล็อก render ไว้ใน fetchQueues)
        } else {
            notify(data.message || 'Could not create queue');
        }
    } catch (err) {
        notify('Connection lost');
    }
}

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
            fetchQueues();
            startPolling();
        } else {
            notify(data.message || 'Email or password incorrect');
        }
    } catch (err) {
        notify('Connection lost');
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
        notify('Could not update status');
    }
}

function handleLogout() {
    localStorage.removeItem('staff_token');
    localStorage.removeItem('staff_user');
    state.logged = false;
    state.patients = [];
    if(window.pollingInterval) clearInterval(window.pollingInterval);
    render();
}

function renderQRModal() {
    setTimeout(() => {
        if ($('#qrcode')) {
            $('#qrcode').innerHTML = '';
            new QRCode(document.getElementById("qrcode"), {
                text: PATIENT_URL + "/frontend/patient/qr-login.html?token=" + state.showQR.token,
                width: 200,
                height: 200
            });
        }
    }, 50);

    return `
        <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:999;">
            <div style="background:#fff; padding:30px; border-radius:12px; text-align:center; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                <h2 style="margin-top:0">Queue: ${state.showQR.number}</h2>
                <p style="color:#666; margin-bottom: 20px;">Ask the patient to scan this QR code to track their queue status.</p>
                <div id="qrcode" style="display:flex; justify-content:center; margin-bottom: 20px;"></div>
                <button class="btn secondary" style="width: 100%;" onclick="state.showQR = null; render();">Close</button>
            </div>
        </div>
    `;
}

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
            <td>${p.patient_name || 'Guest'}</td>
            <td><span class="status ${p.status.toLowerCase()}">${p.status}</span></td>
            <td>
                <select onchange="updateStatus(${p.queue_id}, this.value); this.value=''">
                    <option value="">Action...</option>
                    <option value="Called">Call</option>
                    <option value="Processing">Processing</option>
                    <option value="Completed">Completed</option>
                    <option value="Skipped">Skipped</option>
                </select>
            </td>
        </tr>
    `
        )
        .join('');
        
    if(rows === '') rows = '<tr><td colspan="4" style="text-align:center;padding:20px;">No queues in system</td></tr>';

    return `
        <section class="dashboard">
            <aside class="sidebar">
                <div class="brand">Hospital<span>Nav</span></div>
                <p class="portal-sub">Staff portal</p>
                <button class="side-link active"><i class="ph ph-users-three"></i> Queue management</button>
                <button class="side-link"><i class="ph ph-chart-bar"></i> Workload insights</button>
                <button class="side-link"><i class="ph ph-gear"></i> Settings</button>
                <div class="staff">
                    <div class="avatar"><i class="ph ph-user"></i></div>
                    <div>
                        <b style="cursor:pointer;" onclick="handleLogout()">Log Out</b>
                        <small>Staff/Admin</small>
                    </div>
                </div>
            </aside>

            <main class="main">
                <div class="top">
                    <div>
                        <h1>Queue management</h1>
                        <p class="muted">--</p>
                    </div>
                    <button class="btn primary" onclick="callNext()"><i class="ph ph-megaphone"></i> Call next queue</button>
                </div>

                <div class="overview">
                    <div class="card metric">
                        <p class="label">Waiting now</p>
                        <strong>${state.patients.filter(p => p.status === 'Waiting').length}</strong>
                        <p class="muted">Patients in queue</p>
                    </div>
                    <div class="card metric">
                        <p class="label">In progress</p>
                        <strong>${state.patients.filter(p => p.status === 'Processing' || p.status === 'Called').length}</strong>
                        <p class="muted">Current consultations</p>
                    </div>
                    <div class="card metric">
                        <p class="label">Avg. wait</p>
                        <strong>--</strong>
                        <p class="muted">--</p>
                    </div>
                </div>

                <div class="grid">
                    <div class="card table-card">
                        <div class="card-head">
                            <h2>Waiting patients</h2>
                            <span class="tag">Live queue</span>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Queue</th>
                                    <th>Patient</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>

                    <div>
                        <div class="card">
                            <p class="label">Create Queue</p>
                            <p class="muted" style="margin-bottom: 12px;">Mock Kiosk Ticket Generation (Standard Entry)</p>
                            <button class="btn primary" style="width: 100%;" onclick="createQueue()">Generate Queue QR</button>
                        </div>
                        <br>
                        <div class="card active-patient">
                            <p class="label">Current patient</p>
                            <div class="person">
                                <div class="avatar"><i class="ph ph-user"></i></div>
                                <div>
                                    <h2>--</h2>
                                    <p class="muted">--</p>
                                </div>
                            </div>
                            <p class="muted">Complete the consultation, then route the patient to their next service.</p>
                        </div>

                        <div class="card form-card">
                            <h2>Forward patient</h2>
                            <p class="muted">Send patient to the next service point.</p>

                            <label>Queue to forward</label>
                            <select id="fwd-queue" class="input">
                                <option value="">Select queue...</option>
                                ${state.patients.filter(p => p.status !== 'Completed' && p.status !== 'Skipped').map(p => `<option value="${p.queue_id}">${p.queue_number}</option>`).join('')}
                            </select>

                            <label>Next service step</label>
                            <select id="dest" class="input">
                                <option value="1">Triage & Registration</option>
                                <option value="2">Cardiology Clinic</option>
                                <option value="3">Orthopedics</option>
                                <option value="4">X-Ray Department</option>
                                <option value="5">Pharmacy & Cashier</option>
                            </select>

                            <button class="btn primary" onclick="forwardQueue()"><i class="ph ph-paper-plane-tilt"></i> Forward</button>
                        </div>
                    </div>
                </div>
            </main>
        </section>
        
        <div style="position:fixed; bottom:10px; right:15px; z-index:100;">
            <button onclick="clearAllQueues()" style="background:none; border:none; color:#ccc; font-size:12px; cursor:pointer;">[Clear All Queues]</button>
        </div>

        ${state.toast ? `<div class="toast"><i class="ph ph-check-circle"></i> ${state.toast}</div>` : ''}
        ${state.showQR ? renderQRModal() : ''}
    `;
}

async function clearAllQueues() {
    if (!confirm('Are you sure you want to clear ALL queues? This cannot be undone.')) return;
    try {
        const res = await fetch(`${API_URL}/api/queues/clear`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('staff_token')}` }
        });
        const data = await res.json();
        if (data.success) {
            notify('All queues cleared!');
            fetchQueues();
        }
    } catch (err) {
        notify('Connection lost');
    }
}

function callNext() {
    let p = state.patients.find(p => p.status === 'Waiting');
    if(p) {
        updateStatus(p.queue_id, 'Called');
    } else {
        notify('No waiting patients');
    }
}

async function forwardQueue() {
    const queueId = $('#fwd-queue').value;
    const destId = $('#dest').value;
    if(!queueId) return notify('Select a queue to forward');
    try {
        const res = await fetch(`${API_URL}/api/queues/${queueId}/forward`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}` 
            },
            body: JSON.stringify({ destination_id: parseInt(destId) })
        });
        const data = await res.json();
        if (data.success) {
            notify(`Queue forwarded successfully`);
            fetchQueues();
        } else {
            notify(data.message || 'Could not send queue');
        }
    } catch (err) {
        notify('Connection lost. Could not send queue.');
    }
}

function render() {
    $('#app').innerHTML = state.logged ? dashboard() : login();
}

function startPolling() {
    if(window.pollingInterval) clearInterval(window.pollingInterval);
    window.pollingInterval = setInterval(fetchQueues, 5000);
}

render();
if (state.logged) {
    fetchQueues();
    startPolling();
}
