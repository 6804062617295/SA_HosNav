const state = {
    logged: false,
    toast: '',
    patients: [
        ['--', '--', 'In progress', 'progressing'],
        ['--', '--', 'Waiting', 'waiting'],
        ['--', '--', 'Waiting', 'waiting'],
        ['--', '--', 'Waiting', 'waiting']
    ]
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

function login() {
    return `
        <section class="login">
            <div class="login-card">
                <div class="mark"><i class="ph ph-first-aid-kit"></i></div>
                <div class="brand">Hospital<span>Nav</span> Staff</div>
                <h1>Welcome back</h1>
                <p class="muted">Sign in to manage your department queue and patient flow.</p>

                <label>Staff ID</label>
                <input class="input" placeholder="Enter staff ID">

                <label>Password</label>
                <input class="input" type="password" placeholder="••••••••">

                <button class="btn primary" onclick="state.logged=true;render()">Log in to dashboard</button>
                <p class="muted" style="text-align:center;font-size:12px;margin-top:18px">Authorized hospital personnel only</p>
            </div>
        </section>
    `;
}

function dashboard() {
    let rows = state.patients
        .map(
            (p, i) => `
        <tr>
            <td><b>${p[0]}</b></td>
            <td>${p[1]}</td>
            <td><span class="status ${p[3]}">${p[2]}</span></td>
            <td>
                ${
                    i === 0
                        ? '<button class="btn ghost action" onclick="notify(\'Referral panel ready\')">Forward</button>'
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
        .join('');

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
                        <b>--</b>
                        <small>--</small>
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
                        <strong>${state.patients.filter((p) => p[2] === 'Waiting').length}</strong>
                        <p class="muted">Patients in queue</p>
                    </div>
                    <div class="card metric">
                        <p class="label">In progress</p>
                        <strong>${state.patients.filter((p) => p[2] === 'In progress').length}</strong>
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
                            <button class="btn primary" style="width: 100%;" onclick="notify('Generated Queue QR for Triage / Registration')">Generate Queue QR</button>
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
                            <p class="muted">Send a digital referral and navigation route.</p>

                            <label>Next service step</label>
                            <select id="dest">
                                <option>--</option>
                            </select>

                            <label>Notes / instructions</label>
                            <input id="note" class="input" placeholder="Enter notes or instructions">

                            <button class="btn primary" onclick="refer()"><i class="ph ph-paper-plane-tilt"></i> Dispatch referral</button>
                        </div>
                    </div>
                </div>
            </main>
        </section>
        ${state.toast ? `<div class="toast"><i class="ph ph-check-circle"></i> ${state.toast}</div>` : ''}
    `;
}

function action(i, v) {
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
}

function render() {
    $('#app').innerHTML = state.logged ? dashboard() : login();
}

render();
