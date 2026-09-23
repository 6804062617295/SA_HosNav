import re

with open('frontend/staff/app.js', 'r') as f:
    content = f.read()

# 1. Add API setup at the top
api_setup = """
const API_URL = 'https://hosnav.onrender.com';

const state = {
    logged: !!localStorage.getItem('staff_token'),
    toast: '',
    patients: [],
    showQR: null
};

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
    try {
        const res = await fetch(`${API_URL}/api/queues`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('staff_token')}` 
            },
            body: JSON.stringify({ destination_id: 1 }) // Hardcode Triage for now
        });
        const data = await res.json();
        if (data.success) {
            state.showQR = { number: data.data.queue_number, token: data.data.token };
            fetchQueues();
        } else {
            notify(data.message || 'Error creating queue');
        }
    } catch (err) {
        notify('Network error');
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
        } else {
            notify(data.message || 'Access Denied');
        }
    } catch (err) {
        notify('Failed to connect to server');
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

function handleLogout() {
    localStorage.removeItem('staff_token');
    localStorage.removeItem('staff_user');
    state.logged = false;
    state.patients = [];
    render();
}

function renderQRModal() {
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
            <div style="background:#fff; padding:30px; border-radius:12px; text-align:center; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                <h2 style="margin-top:0">Queue: ${state.showQR.number}</h2>
                <p style="color:#666; margin-bottom: 20px;">Ask the patient to scan this QR code to track their queue status.</p>
                <div id="qrcode" style="display:flex; justify-content:center; margin-bottom: 20px;"></div>
                <button class="btn secondary" style="width: 100%;" onclick="state.showQR = null; render();">Close</button>
            </div>
        </div>
    `;
}

"""

# Replace state initialization
content = re.sub(r'const state = \{.*?\};', api_setup, content, flags=re.DOTALL)

# Modify login function inputs to have IDs and call handleLogin()
login_html_old = """
                <label>Staff ID</label>
                <input class="input" placeholder="Enter staff ID">

                <label>Password</label>
                <input class="input" type="password" placeholder="••••••••">

                <button class="btn primary" onclick="state.logged=true;render()">Log in to dashboard</button>
"""
login_html_new = """
                <label>Staff Email</label>
                <input id="staff-email" class="input" placeholder="Enter staff email" value="admin@hospital.local">

                <label>Password</label>
                <input id="staff-pass" class="input" type="password" placeholder="••••••••" value="password123">

                <button class="btn primary" onclick="handleLogin()">Log in to dashboard</button>
"""
content = content.replace(login_html_old, login_html_new)

# Modify dashboard table mapping
table_map_old = """    let rows = state.patients
        .map(
            (p, i) => `
        <tr>
            <td><b>${p[0]}</b></td>
            <td>${p[1]}</td>
            <td><span class="status ${p[3]}">${p[2]}</span></td>
            <td>
                ${
                    i === 0
                        ? '<button class="btn ghost action" onclick="notify(\\\'Referral panel ready\\\')">Forward</button>'
                        : `<select onchange="action(${i},this.value)">
                                <option value="">Action</option>
                                <option value="call">Call</option>
                                <option value="processing">Processing</option>
                                <option value="completed">Completed</option>
                                <option value="skipped">Skipped</option>
                            </select>`
                }
            </td>
        </tr>
    `
        )
        .join('');"""

table_map_new = """    let rows = state.patients
        .map(
            (p) => `
        <tr>
            <td><b>${p.queue_number}</b></td>
            <td>Guest</td>
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
"""
content = content.replace(table_map_old, table_map_new)

# Replace 'Waiting now' and 'In progress' with dynamic lengths
content = re.sub(r"state\.patients\.filter\(\(p\) => p\[2\] === 'Waiting'\)\.length", "state.patients.filter(p => p.status === 'Waiting').length", content)
content = re.sub(r"state\.patients\.filter\(\(p\) => p\[2\] === 'In progress'\)\.length", "state.patients.filter(p => p.status === 'Processing' || p.status === 'Called').length", content)

# Replace create queue button
btn_old = """<button class="btn primary" style="width: 100%;" onclick="notify('Generated Queue QR for Triage / Registration')">Generate Queue QR</button>"""
btn_new = """<button class="btn primary" style="width: 100%;" onclick="createQueue()">Generate Queue QR</button>"""
content = content.replace(btn_old, btn_new)

# Replace staff info in sidebar
staff_old = """                    <div>
                        <b>--</b>
                        <small>--</small>
                    </div>"""
staff_new = """                    <div>
                        <b style="cursor:pointer;" onclick="handleLogout()">Log Out</b>
                        <small>Staff/Admin</small>
                    </div>"""
content = content.replace(staff_old, staff_new)

# Append QR Modal to return value
return_str_old = """${state.toast ? `<div class="toast"><i class="ph ph-check-circle"></i> ${state.toast}</div>` : ''}
    `;"""
return_str_new = """${state.toast ? `<div class="toast"><i class="ph ph-check-circle"></i> ${state.toast}</div>` : ''}
        ${state.showQR ? renderQRModal() : ''}
    `;"""
content = content.replace(return_str_old, return_str_new)

# Replace old dummy action logic with fetchQueues trigger at bottom
action_logic = """function action(i, v) {
    if (!v) return;
    state.patients[i][2] = v === 'call' ? 'Called' : v === 'hold' ? 'On hold' : 'Skipped';
    state.patients[i][3] = v === 'hold' ? 'hold' : v === 'call' ? 'progressing' : 'hold';
    notify(`${state.patients[i][0]} marked as ${state.patients[i][2].toLowerCase()}`);
}

function callNext() {
    let p = state.patients.find((p) => p[2] === 'Waiting');
    if (p) {
        p[2] = 'Called';
        p[3] = 'progressing';
        notify(`${p[0]} has been called`);
    } else {
        notify('No waiting patients');
    }
}

function refer() {
    notify(`Referral to ${$('#dest').value} dispatched`);
}"""

content = content.replace(action_logic, """
function callNext() {
    let p = state.patients.find(p => p.status === 'Waiting');
    if(p) {
        updateStatus(p.queue_id, 'Called');
    } else {
        notify('No waiting patients');
    }
}
function refer() { notify('Referral feature coming soon'); }
""")

# Setup initial fetch
render_call = """render();"""
render_call_new = """render();
if (state.logged) {
    fetchQueues();
    setInterval(fetchQueues, 5000);
}
"""
content = content.replace(render_call, render_call_new)

with open('frontend/staff/app.js', 'w') as f:
    f.write(content)
