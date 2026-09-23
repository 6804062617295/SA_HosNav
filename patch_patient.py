import re

with open('frontend/patient/app.js', 'r') as f:
    content = f.read()

# Add queue token support
urlParams = """
const state = {
    page: document.body.dataset.page || "login",
    auth: document.body.dataset.auth || "login",
    query: "",
    destination: "Cardiology Clinic",
    sos: false,
    queueToken: new URLSearchParams(window.location.search).get('token') || localStorage.getItem('queueToken'),
    currentQueue: null
};
"""
content = re.sub(r'const state = \{.*?\};', urlParams, content, flags=re.DOTALL)

# Update qrlogin
qr_old = """function qrlogin() {
    return html`<section class="screen login center">
        ${topbar("")}
        <div class="qrbox"></div>
        <h2>Scan your appointment QR</h2>
        <p class="muted">
            Access your queue and navigation without an account.
        </p>
        <button
            class="btn primary"
            style="margin-top:25px"
            onclick="go('queue')"
        >
            Simulate Scan (Demo)
        </button>
    </section>`;
}"""

qr_new = """function qrlogin() {
    return html`<section class="screen login center">
        ${topbar("")}
        <div class="qrbox"></div>
        <h2>Scan your appointment QR</h2>
        <p class="muted">
            Access your queue and navigation without an account.
        </p>
        <input id="token-input" class="input" style="text-align:center; margin-top:20px;" placeholder="Or enter Token manually" value="${state.queueToken || ''}">
        <button
            class="btn primary"
            style="margin-top:15px"
            onclick="handleQRScan($('#token-input').value)"
        >
            Connect Queue
        </button>
    </section>`;
}

async function handleQRScan(token) {
    if(!token) return alert('Enter a token');
    try {
        const res = await fetch(`${API_URL}/api/queues/track/${token}`);
        const data = await res.json();
        if(data.success) {
            localStorage.setItem('queueToken', token);
            state.queueToken = token;
            state.currentQueue = data.data;
            go('queue');
        } else {
            alert('Invalid or expired QR code');
        }
    } catch(err) {
        alert('Network error');
    }
}"""
content = content.replace(qr_old, qr_new)

# Update queue
q_old = """function queue() {
    return html`<section class="screen">
        ${topbar("Your queue")}
        <div class="card center">
            <p class="label">Your number</p>
            <div class="queue-number">A-124</div>
            <span class="badge">Waiting</span>
        </div>
        <div class="card">
            <p class="label">Queue progress</p>
            <div class="progress"><i></i></div>
            <b>A-123 serving now</b>
            <p class="muted">1 patient ahead · estimated 3 minutes</p>
        </div>
        ${nav("queue")}
    </section>`;
}"""

q_new = """function queue() {
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
    if(state.page !== 'queue' || !state.queueToken) return;
    try {
        const res = await fetch(`${API_URL}/api/queues/track/${state.queueToken}`);
        const data = await res.json();
        if(data.success) {
            // Check if status changed to Called and notify
            if(state.currentQueue && state.currentQueue.status !== 'Called' && data.data.status === 'Called') {
                alert('📣 YOUR QUEUE HAS BEEN CALLED! Please proceed to ' + data.data.destination_name);
            }
            state.currentQueue = data.data;
            $("#app").innerHTML = pages[state.page](); // Re-render silently
        }
    } catch(err){}
}
"""
content = content.replace(q_old, q_new)

# Add polling initiator at the bottom
init_old = """$("#app").innerHTML = pages[state.page]();

// Backend API URL"""

init_new = """$("#app").innerHTML = pages[state.page]();

// Queue Polling
setInterval(pollQueue, 5000);
if(state.queueToken) {
    handleQRScan(state.queueToken).catch(()=>null);
}

// Backend API URL"""
content = content.replace(init_old, init_new)

with open('frontend/patient/app.js', 'w') as f:
    f.write(content)

