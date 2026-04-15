const API_BASE = 'http://localhost:8080/api';
let currentUserId = null;
let currentUserName = null;

// ─── DOM Elements ───────────────────────────────────────────────
const sections = {
    login: document.getElementById('login-section'),
    registration: document.getElementById('registration-section'),
    viewTask: document.getElementById('view-task-section'),
    dashboard: document.getElementById('dashboard-section'),
    admin: document.getElementById('admin-section')
};

let currentUserIsAdmin = false;

const navBtns = {
    login: document.getElementById('nav-login'),
    register: document.getElementById('nav-register'),
    dashboard: document.getElementById('nav-dashboard'),
    admin: document.getElementById('nav-admin'),
    logout: document.getElementById('nav-logout')
};

const alertBox = document.getElementById('alert-box');
const themeToggleBtn = document.getElementById('theme-toggle');

// ─── Theme Logic ────────────────────────────────────────────────
themeToggleBtn.addEventListener('click', () => {
    const root = document.documentElement;
    const isDark = root.getAttribute('data-theme') === 'dark';
    if (isDark) {
        root.removeAttribute('data-theme');
        themeToggleBtn.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        root.setAttribute('data-theme', 'dark');
        themeToggleBtn.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    }
});

// Restore theme
if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggleBtn.textContent = '☀️';
}

// ─── Auth State Management ──────────────────────────────────────
function setLoggedInUI(userName, isAdmin) {
    navBtns.login.style.display = 'none';
    navBtns.register.style.display = 'none';
    navBtns.dashboard.style.display = isAdmin ? 'none' : '';
    navBtns.admin.style.display = isAdmin ? '' : 'none';
    navBtns.logout.style.display = '';
    const greeting = document.getElementById('user-greeting');
    greeting.textContent = `Welcome, ${isAdmin ? '🛡️ ' : ''}${userName}`;
    greeting.style.display = 'block';
}

function setLoggedOutUI() {
    navBtns.login.style.display = '';
    navBtns.register.style.display = '';
    navBtns.dashboard.style.display = 'none';
    navBtns.admin.style.display = 'none';
    navBtns.logout.style.display = 'none';
    document.getElementById('user-greeting').style.display = 'none';
}

function loginUser(userData) {
    currentUserId = userData.id;
    currentUserName = userData.name;
    currentUserIsAdmin = userData.isAdmin === true;
    localStorage.setItem('loggedInUser', JSON.stringify(userData));
    setLoggedInUI(userData.name, currentUserIsAdmin);
    if (currentUserIsAdmin) {
        openAdminPanel();
    } else {
        openTaskView(userData.id, userData.name);
    }
}

function logoutUser() {
    currentUserId = null;
    currentUserName = null;
    currentUserIsAdmin = false;
    localStorage.removeItem('loggedInUser');
    setLoggedOutUI();
    switchSection('login');
}

// ─── Navigation Logic ───────────────────────────────────────────
function switchSection(sectionName) {
    Object.values(sections).forEach(sec => sec?.classList.remove('active'));
    sections[sectionName]?.classList.add('active');

    Object.values(navBtns).forEach(btn => btn?.classList.remove('active'));
    if (sectionName === 'login') navBtns.login?.classList.add('active');
    if (sectionName === 'registration') navBtns.register?.classList.add('active');
    if (sectionName === 'viewTask') navBtns.dashboard?.classList.add('active');
    if (sectionName === 'dashboard') navBtns.dashboard?.classList.add('active');
    if (sectionName === 'admin') navBtns.admin?.classList.add('active');
}

navBtns.login.addEventListener('click', () => switchSection('login'));
navBtns.register.addEventListener('click', () => switchSection('registration'));
navBtns.dashboard.addEventListener('click', () => {
    if (currentUserId && currentUserName) {
        openTodaysTaskModal();
    }
});
navBtns.admin.addEventListener('click', () => {
    if (currentUserId && currentUserIsAdmin) {
        openAdminPanel();
    }
});

// ─── Today's Task Modal ─────────────────────────────────────────
const todaysOverlay = document.getElementById('todays-task-overlay');
const todaysCloseBtn = document.getElementById('close-todays-task');

async function openTodaysTaskModal() {
    const overlay = todaysOverlay;
    const listContainer = document.getElementById('todays-task-list');
    const titleEl = document.getElementById('todays-task-date');
    const subtitleEl = document.getElementById('todays-task-subtitle');

    // Format today's date
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayISO = `${yyyy}-${mm}-${dd}`;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const todayReadable = now.toLocaleDateString('en-US', options);

    titleEl.innerHTML = `📅 Today's Tasks`;
    subtitleEl.textContent = todayReadable;

    listContainer.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-muted);">Loading...</div>';

    // Show overlay
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    try {
        const res = await fetch(`${API_BASE}/users/${currentUserId}/tasks`);
        const allTasks = await res.json();

        // Filter tasks for today
        const todaysTasks = allTasks.filter(task => task.taskDate === todayISO);
        
        // Find pending tasks
        const pendingTasks = allTasks.filter(task => {
            if (!task.taskDate) return false;
            const tDate = task.taskDate.trim();
            const isNotCompleted = task.completed === false || task.completed === 'false' || task.completed === null || task.completed === undefined;
            return tDate < todayISO && isNotCompleted;
        });
        pendingTasks.forEach(pt => pt.isPending = true);
        
        window.currentTodaysTasks = [...todaysTasks, ...pendingTasks];

        listContainer.innerHTML = '';
        const copyBtn = document.getElementById('copy-todays-task');
        const sendBtn = document.getElementById('send-todays-task');

        if (window.currentTodaysTasks.length === 0) {
            if (copyBtn) copyBtn.style.display = 'none';
            if (sendBtn) sendBtn.style.display = 'none';
            listContainer.innerHTML = `
                <div class="todays-task-empty">
                    <div class="todays-task-empty-icon">🎉</div>
                    <h3>No tasks for today!</h3>
                    <p>Enjoy your free time or add new tasks from the dashboard.</p>
                </div>
            `;
            return;
        }

        if (copyBtn) copyBtn.style.display = 'flex';
        if (sendBtn) sendBtn.style.display = 'flex';

        window.currentTodaysTasks.forEach((task, index) => {
            const item = document.createElement('div');
            item.className = `todays-task-item${task.completed ? ' todays-task-item--done' : ''}`;
            item.id = `today-task-${task.id}`;
            item.style.animationDelay = `${index * 0.08}s`;

            item.innerHTML = `
                <div class="todays-task-item-header">
                    <span class="todays-task-item-subject">${task.subject || 'Untitled Task'}</span>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <span class="todays-task-item-time">${task.timing || 'No time set'}</span>
                        <button class="btn btn-icon" onclick="copySingleTask(${task.id})" title="Copy this task" style="padding:0.2rem; color:var(--text-muted); background:none; border:none; cursor:pointer;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                        <button class="btn btn-icon" onclick="sendSingleTaskWhatsApp(${task.id})" title="Send via WhatsApp" style="padding:0.2rem; color:var(--text-muted); background:none; border:none; cursor:pointer;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </div>
                </div>
                <div class="todays-task-item-details">
                    <div><strong>Class:</strong> ${task.className || '-'}</div>
                    <div><strong>Session:</strong> ${task.sessionDetails || '-'}</div>
                    <div><strong>Mentor:</strong> ${task.mentor || '-'}</div>
                    <div><strong>Unit:</strong> ${task.unit || '-'}</div>
                    <div><strong>Topics:</strong> ${task.topicsToCover || '-'}</div>
                    <div><strong>Status:</strong> <span class="status-badge ${task.completed ? 'badge-completed' : 'badge-in-progress'}" id="today-badge-${task.id}">${task.completed ? 'Completed' : 'In Progress'}</span> ${task.isPending ? '<span class="status-badge" style="background:#EF4444; margin-left:8px;">Pending Task</span>' : ''}</div>
                </div>
                <div class="todays-task-item-footer">
                    <button
                        class="btn todays-complete-btn ${task.completed ? 'todays-complete-btn--done' : ''}"
                        id="today-complete-btn-${task.id}"
                        onclick="toggleTodayTaskComplete(${task.id}, this)"
                    >
                        ${task.completed ? '✓ Completed' : 'Mark Complete'}
                    </button>
                </div>
            `;
            listContainer.appendChild(item);
        });
    } catch (err) {
        listContainer.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--danger-color);">Failed to load tasks.</div>';
    }
}

function closeTodaysTaskModal() {
    todaysOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

todaysCloseBtn.addEventListener('click', closeTodaysTaskModal);

todaysOverlay.addEventListener('click', (e) => {
    if (e.target === todaysOverlay) {
        closeTodaysTaskModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (todaysOverlay.classList.contains('active')) closeTodaysTaskModal();
        if (typeof adminTasksOverlay !== 'undefined' && adminTasksOverlay && adminTasksOverlay.classList.contains('active')) closeAdminTasksModal();
    }
});
// ─── Copy All Tasks ───────────────────────────────────────────────
const copyTodaysTaskBtn = document.getElementById('copy-todays-task');
if (copyTodaysTaskBtn) {
    copyTodaysTaskBtn.addEventListener('click', () => {
        if (!window.currentTodaysTasks || window.currentTodaysTasks.length === 0) return;
        
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        
        let hours = now.getHours();
        let minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0'+minutes : minutes;
        const loginTime = hours + ':' + minutes + ' ' + ampm;
        
        let text = `*Date:* ${dd}/${mm}/${yyyy}\n*Login Time:* ${loginTime} \n\n*Today's Tasks:*\n\n`;
        
        const actualTodaysTasks = window.currentTodaysTasks.filter(t => !t.isPending);
        const actualPendingTasks = window.currentTodaysTasks.filter(t => t.isPending);

        const appendTasksToText = (tasksList) => {
            let out = '';
            tasksList.forEach(task => {
                if (task.timing) {
                    out += `*(${task.timing})*\n`;
                }
                if (task.sessionDetails) {
                    let formattedSession = task.sessionDetails.replace(/\s*Hour\s*/gi, '').trim();
                    out += `*Session ${formattedSession} :*\n\n`;
                }
                
                if (task.subject || task.className) {
                    let subjLine = task.subject ? task.subject : '';
                    if (task.className) {
                         subjLine += subjLine ? ` for ${task.className}` : task.className;
                    }
                    if (subjLine) out += `* ${subjLine}\n`;
                }
                if (task.topicsToCover) {
                    const topics = task.topicsToCover.split('\n').filter(t => t.trim() !== '');
                    topics.forEach(t => {
                        out += `* ${t.trim()}\n`;
                    });
                }
                out += `\n`;
            });
            return out;
        };

        if (actualTodaysTasks.length > 0) {
            text += appendTasksToText(actualTodaysTasks);
        } else {
            text += `No new tasks for today.\n\n`;
        }

        if (actualPendingTasks.length > 0) {
            text += `*Pending Tasks:*\n\n`;
            text += appendTasksToText(actualPendingTasks);
        }
        
        text += `*(6:00 PM – 8:00 PM)*\n\n* Updating Excel sheets with today’s tasks\n* Assigning assessments on Interview Desk for tomorrow’s class\n`;

        navigator.clipboard.writeText(text).then(() => {
            showCelebrationToast('All tasks copied to clipboard!');
        }).catch(err => {
            console.error('Could not copy text: ', err);
            showAlert('Failed to copy tasks', true);
        });
    });
}

// ─── Copy Single Task ──────────────────────────────────────────────
window.copySingleTask = function(taskId) {
    if (!window.currentTodaysTasks) return;
    
    const task = window.currentTodaysTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    minutes = minutes < 10 ? '0'+minutes : minutes;
    const loginTime = hours + ':' + minutes + ' ' + ampm;
    
    let text = `*Date:* ${dd}/${mm}/${yyyy}\n*Login Time:* ${loginTime} \n\n*Today's Tasks:*\n\n`;
    
    if (task.timing) {
        text += `*(${task.timing})*\n`;
    }
    if (task.sessionDetails) {
        let formattedSession = task.sessionDetails.replace(/\s*Hour\s*/gi, '').trim();
        text += `*Session ${formattedSession} :*\n\n`;
    }
    
    if (task.subject || task.className) {
        let subjLine = task.subject ? task.subject : '';
        if (task.className) {
             subjLine += subjLine ? ` for ${task.className}` : task.className;
        }
        if (subjLine) text += `* ${subjLine}\n`;
    }
    if (task.topicsToCover) {
        const topics = task.topicsToCover.split('\n').filter(t => t.trim() !== '');
        topics.forEach(t => {
            text += `* ${t.trim()}\n`;
        });
    }
    text += `\n`;
    
    text += `*(6:00 PM – 8:00 PM)*\n\n* Updating Excel sheets with today’s tasks\n* Assigning assessments on Interview Desk for tomorrow’s class\n`;

    navigator.clipboard.writeText(text).then(() => {
        showCelebrationToast('Task copied to clipboard!');
    }).catch(err => {
        console.error('Could not copy text: ', err);
        showAlert('Failed to copy task', true);
    });
};

// ─── Send All Tasks via WhatsApp ──────────────────────────────
const sendTodaysTaskBtn = document.getElementById('send-todays-task');
if (sendTodaysTaskBtn) {
    sendTodaysTaskBtn.addEventListener('click', () => {
        if (!window.currentTodaysTasks || window.currentTodaysTasks.length === 0) return;
        
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        
        let hours = now.getHours();
        let minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0'+minutes : minutes;
        const loginTime = hours + ':' + minutes + ' ' + ampm;
        
        let text = `*Date:* ${dd}/${mm}/${yyyy}\n*Login Time:* ${loginTime} \n\n*Today's Tasks:*\n\n`;
        
        const actualTodaysTasks = window.currentTodaysTasks.filter(t => !t.isPending);
        const actualPendingTasks = window.currentTodaysTasks.filter(t => t.isPending);

        const appendTasksToText = (tasksList) => {
            let out = '';
            tasksList.forEach(task => {
                if (task.timing) {
                    out += `*(${task.timing})*\n`;
                }
                if (task.sessionDetails) {
                    let formattedSession = task.sessionDetails.replace(/\s*Hour\s*/gi, '').trim();
                    out += `*Session ${formattedSession} :*\n\n`;
                }
                
                if (task.subject || task.className) {
                    let subjLine = task.subject ? task.subject : '';
                    if (task.className) {
                         subjLine += subjLine ? ` for ${task.className}` : task.className;
                    }
                    if (subjLine) out += `* ${subjLine}\n`;
                }
                if (task.topicsToCover) {
                    const topics = task.topicsToCover.split('\n').filter(t => t.trim() !== '');
                    topics.forEach(t => {
                        out += `* ${t.trim()}\n`;
                    });
                }
                out += `\n`;
            });
            return out;
        };

        if (actualTodaysTasks.length > 0) {
            text += appendTasksToText(actualTodaysTasks);
        } else {
            text += `No new tasks for today.\n\n`;
        }

        if (actualPendingTasks.length > 0) {
            text += `*Pending Tasks:*\n\n`;
            text += appendTasksToText(actualPendingTasks);
        }
        
        text += `*(6:00 PM – 8:00 PM)*\n\n* Updating Excel sheets with today’s tasks\n* Assigning assessments on Interview Desk for tomorrow’s class\n`;

        const encodedMessage = encodeURIComponent(text);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
    });
}

// ─── Send Single Task via WhatsApp ─────────────────────────────────
window.sendSingleTaskWhatsApp = function(taskId) {
    if (!window.currentTodaysTasks) return;
    
    const task = window.currentTodaysTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    minutes = minutes < 10 ? '0'+minutes : minutes;
    const loginTime = hours + ':' + minutes + ' ' + ampm;
    
    let text = `*Date:* ${dd}/${mm}/${yyyy}\n*Login Time:* ${loginTime} \n\n*Today's Tasks:*\n\n`;
    
    if (task.timing) {
        text += `*(${task.timing})*\n`;
    }
    if (task.sessionDetails) {
        let formattedSession = task.sessionDetails.replace(/\s*Hour\s*/gi, '').trim();
        text += `*Session ${formattedSession} :*\n\n`;
    }
    
    if (task.subject || task.className) {
        let subjLine = task.subject ? task.subject : '';
        if (task.className) {
             subjLine += subjLine ? ` for ${task.className}` : task.className;
        }
        if (subjLine) text += `* ${subjLine}\n`;
    }
    if (task.topicsToCover) {
        const topics = task.topicsToCover.split('\n').filter(t => t.trim() !== '');
        topics.forEach(t => {
            text += `* ${t.trim()}\n`;
        });
    }
    text += `\n`;
    
    text += `*(6:00 PM – 8:00 PM)*\n\n* Updating Excel sheets with today’s tasks\n* Assigning assessments on Interview Desk for tomorrow’s class\n`;
    
    const encodedMessage = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
};

// ─── Complete Button in Today's Task Modal ──────────────────────────
window.toggleTodayTaskComplete = async function(taskId, btn) {
    const isCurrentlyDone = btn.classList.contains('todays-complete-btn--done');
    const newState = !isCurrentlyDone;

    // Loading state
    btn.disabled = true;
    btn.classList.add('todays-complete-btn--loading');
    btn.innerHTML = '<span class="btn-spinner"></span> Saving...';

    try {
        const res = await fetch(`${API_BASE}/tasks/${taskId}/complete?completed=${newState}`, { method: 'PATCH' });
        if (!res.ok) throw new Error('Failed');

        // Update button
        btn.classList.remove('todays-complete-btn--loading');
        if (newState) {
            btn.classList.add('todays-complete-btn--done');
            btn.innerHTML = '\u2713 Completed';
            document.getElementById(`today-badge-${taskId}`)?.setAttribute('class', 'status-badge badge-completed');
            document.getElementById(`today-badge-${taskId}`).textContent = 'Completed';
            document.getElementById(`today-task-${taskId}`)?.classList.add('todays-task-item--done');
            if (typeof confetti === 'function') {
                confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, zIndex: 99999,
                    colors: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#EC4899'] });
            }
            showCelebrationToast('Task done! Great work! 🎉');
        } else {
            btn.classList.remove('todays-complete-btn--done');
            btn.innerHTML = 'Mark Complete';
            document.getElementById(`today-badge-${taskId}`)?.setAttribute('class', 'status-badge badge-in-progress');
            if (document.getElementById(`today-badge-${taskId}`)) document.getElementById(`today-badge-${taskId}`).textContent = 'In Progress';
            document.getElementById(`today-task-${taskId}`)?.classList.remove('todays-task-item--done');
        }
    } catch (e) {
        btn.classList.remove('todays-complete-btn--loading');
        btn.innerHTML = isCurrentlyDone ? '\u2713 Completed' : 'Mark Complete';
        showAlert('Failed to update task.', true);
    } finally {
        btn.disabled = false;
    }
};
navBtns.logout.addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
        logoutUser();
        showAlert('Logged out successfully.');
    }
});

// Auth page cross-links
document.getElementById('goto-register').addEventListener('click', (e) => {
    e.preventDefault();
    switchSection('registration');
});
document.getElementById('goto-login').addEventListener('click', (e) => {
    e.preventDefault();
    switchSection('login');
});

// Dashboard navigation
document.getElementById('back-to-dashboard').addEventListener('click', () => {
    if (currentUserId && currentUserName) {
        openTaskView(currentUserId, currentUserName);
    }
});
document.getElementById('goto-edit-tasks').addEventListener('click', () => {
    if (currentUserId && currentUserName) {
        openEditDashboard(currentUserId, currentUserName);
    }
});

// ─── Flash Messages ─────────────────────────────────────────────
function showAlert(message, isError = false) {
    alertBox.textContent = message;
    alertBox.className = `alert ${isError ? 'alert-error' : 'alert-success'}`;
    setTimeout(() => {
        alertBox.classList.add('hidden');
    }, 3500);
}

// ─── Password Visibility Toggle ─────────────────────────────────
window.togglePasswordVisibility = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁';
    }
};

// ─── Login Form ─────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const submitBtn = document.getElementById('login-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            showAlert(`Welcome back, ${data.name}! 🎉`);
            document.getElementById('login-form').reset();
            loginUser(data);
        } else {
            showAlert(data.message || 'Invalid email or password.', true);
        }
    } catch (err) {
        showAlert('Server Error. Please try again.', true);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
    }
});

// ─── Registration Form ──────────────────────────────────────────
document.getElementById('registration-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const department = document.getElementById('department').value.trim();
    const role = document.getElementById('role').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;

    if (password !== confirmPassword) {
        showAlert('Passwords do not match.', true);
        return;
    }

    if (password.length < 6) {
        showAlert('Password must be at least 6 characters.', true);
        return;
    }

    const submitBtn = document.getElementById('register-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
        const res = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, department, role, password })
        });

        const data = await res.json();

        if (res.ok) {
            showAlert('Account created successfully! 🚀');
            document.getElementById('registration-form').reset();
            // Auto-login after registration
            loginUser(data);
        } else {
            showAlert(data.message || 'Registration failed. Email may already exist.', true);
        }
    } catch (err) {
        showAlert('Server Error. Please try again.', true);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
});

// ─── Task View (Read-Only Cards) ────────────────────────────────
async function openTaskView(userId, userName) {
    currentUserId = userId;
    currentUserName = userName;

    document.getElementById('view-task-title').textContent = `${userName}'s Tasks`;
    switchSection('viewTask');
    
    const container = document.getElementById('task-cards-container');
    container.innerHTML = '<div style="text-align:center; padding: 3rem; color: var(--text-muted);">Loading tasks...</div>';
    
    try {
        const res = await fetch(`${API_BASE}/users/${userId}/tasks`);
        const tasks = await res.json();
        window.currentTasks = tasks;
        container.innerHTML = '';
        
        renderMonthlyProgress(tasks, container);

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <h3>No tasks yet</h3>
                    <p>Click "Edit Tasks" to add your first task!</p>
                </div>
            `;
            return;
        }
        
        tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = `task-card ${task.completed ? 'completed-task' : ''}`;
            
            const handlingHours = parseInt(task.totalHoursHandling) || 0;

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <div>
                        <h3 class="task-title" style="margin: 0 0 0.5rem 0; font-size: 1.4rem; font-weight: 700; color: var(--text-main); letter-spacing: -0.02em;">${task.subject || 'No Subject'}</h3>
                        <div style="font-size: 0.95rem; font-weight: 500; color: var(--text-muted);">${task.timing || 'No Time'}</div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                        <input type="checkbox" class="toggle-switch" title="Toggle Completion" ${task.completed ? 'checked' : ''} onchange="toggleTaskComplete(this, ${task.id})">
                        <span class="status-badge ${task.completed ? 'badge-completed' : 'badge-in-progress'}">
                            ${task.completed ? 'Completed' : 'In Progress'}
                        </span>
                    </div>
                </div>

                <div class="task-meta-row" style="margin-top: 1rem;">
                    <div><strong style="color: var(--text-main);">Day:</strong> ${task.dayOfWeek || '-'}</div>
                    <div><strong style="color: var(--text-main);">Date:</strong> ${task.taskDate || '-'}</div>
                </div>

                <div class="task-meta-row">
                    <div style="grid-column: 1 / -1;"><strong style="color: var(--text-main);">Class:</strong> ${task.className || '-'} <span style="opacity: 0.7;">(Session ${task.sessionDetails || '-'})</span></div>
                </div>
                
                <div class="task-meta-row" style="border-bottom: none;">
                    <div style="grid-column: 1 / -1;"><strong style="color: var(--text-main);">Hours Handling:</strong> ${handlingHours} hr / ${task.totalFreeHours || '0'} free</div>
                </div>

                <div class="task-meta-row" style="border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
                    <div><strong style="color: var(--text-main);">Mentor:</strong> ${task.mentor || '-'}</div>
                    <div><strong style="color: var(--text-main);">Unit:</strong> ${task.unit || '-'}</div>
                </div>

                <div class="task-meta-row">
                    <div style="grid-column: 1 / -1;"><strong style="color: var(--text-main);">Topics:</strong> ${task.topicsToCover || '-'}</div>
                </div>

                <div class="task-meta-row">
                    <div style="grid-column: 1 / -1;">
                        <strong style="color: var(--text-main);">PPT:</strong> ${task.pptLink ? `<a href="${task.pptLink}" target="_blank" style="color:var(--primary-color); font-weight:500; text-decoration:none;">View Document ↗</a>` : '-'}
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        showAlert('Failed to fetch tasks.', true);
    }
}

window.toggleTaskComplete = async function(checkbox, taskId) {
    const isCompleted = checkbox.checked;
    const card = checkbox.closest('.task-card');
    const badge = card.querySelector('.status-badge');
    
    if (isCompleted) {
        card.classList.add('completed-task');
        if (badge) {
            badge.className = 'status-badge badge-completed';
            badge.textContent = 'Completed';
        }
        
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                zIndex: 9999,
                colors: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#EC4899']
            });
        }
        showCelebrationToast('Great job! 🎉 One task down, keep it up!');
    } else {
        card.classList.remove('completed-task');
        if (badge) {
            badge.className = 'status-badge badge-in-progress';
            badge.textContent = 'In Progress';
        }
    }

    if (window.currentTasks) {
        const t = window.currentTasks.find(x => x.id === taskId);
        if (t) t.completed = isCompleted;
        renderMonthlyProgress(window.currentTasks, document.getElementById('task-cards-container'));
    }

    try {
        await fetch(`${API_BASE}/tasks/${taskId}/complete?completed=${isCompleted}`, { method: 'PATCH' });
    } catch (e) {
        console.error("Failed to toggle completion status.");
    }
}

// ─── Monthly Progress ───────────────────────────────────────────
function renderMonthlyProgress(tasks, container) {
    const monthlyStats = {};
    tasks.forEach(task => {
        if (!task.taskDate) return;
        const dateObj = new Date(task.taskDate);
        if (isNaN(dateObj)) return;
        const monthYear = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        if (!monthlyStats[monthYear]) {
            monthlyStats[monthYear] = { total: 0, completed: 0 };
        }
        monthlyStats[monthYear].total += 1;
        if (task.completed) {
            monthlyStats[monthYear].completed += 1;
        }
    });

    const progressContainerDivId = 'monthly-progress-wrapper';
    let progressWrapper = document.getElementById(progressContainerDivId);
    if (!progressWrapper) {
        progressWrapper = document.createElement('div');
        progressWrapper.id = progressContainerDivId;
        progressWrapper.style.marginBottom = '2rem';
        container.parentNode.insertBefore(progressWrapper, container);
    }
    
    if (Object.keys(monthlyStats).length > 0) {
        let sortedMonths = Object.keys(monthlyStats).sort((a,b) => new Date(a) - new Date(b));
        let progressHtml = `<h3 style="margin-bottom: 1rem; font-size: 1.2rem; font-weight: 700; color: var(--text-main); letter-spacing: -0.02em;">Monthly Progress</h3><div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem;">`;
        for (const month of sortedMonths) {
            const stats = monthlyStats[month];
            const percent = Math.round((stats.completed / stats.total) * 100) || 0;
            progressHtml += `
                <div style="padding: 1.25rem; border: 1px solid var(--border-color); border-radius: var(--border-radius); background: var(--bg-card); box-shadow: var(--shadow-sm); transition: transform 0.2s;">
                    <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.75rem; color: var(--text-main);">${month}</div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.5rem; color: var(--text-muted); font-weight: 500;">
                        <span>${stats.completed} / ${stats.total} Tasks</span>
                        <span style="color: var(--primary-color); font-weight: 700;">${percent}%</span>
                    </div>
                    <div class="progress-track" style="height: 8px; background-color: var(--secondary-color); border-radius: 999px; overflow: hidden;">
                        <div class="progress-fill" style="width: ${percent}%; height: 100%; background-color: var(--primary-color); transition: width 0.5s ease-out;"></div>
                    </div>
                </div>
            `;
        }
        progressHtml += `</div>`;
        progressWrapper.innerHTML = progressHtml;
    } else {
        progressWrapper.innerHTML = '';
    }
}

// ─── Celebration Toast ──────────────────────────────────────────
function showCelebrationToast(message) {
    let toast = document.getElementById('celebration-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'celebration-toast';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<span style="font-size: 1.5rem;">🏆</span> <span>${message}</span>`;
    toast.className = 'celebration-toast show';
    
    setTimeout(() => {
        toast.className = 'celebration-toast';
    }, 3000);
}

// ─── Task Edit Dashboard ────────────────────────────────────────
async function openEditDashboard(userId, userName) {
    currentUserId = userId;
    currentUserName = userName;
    document.getElementById('dashboard-title').textContent = `Edit ${userName}'s Tasks`;
    switchSection('dashboard');
    
    document.getElementById('task-tbody').innerHTML = '';
    
    try {
        const res = await fetch(`${API_BASE}/users/${userId}/tasks`);
        const tasks = await res.json();
        
        if (tasks.length === 0) {
            addTaskRow();
        } else {
            tasks.forEach(task => addTaskRow(task));
        }
    } catch (err) {
        showAlert('Failed to fetch tasks.', true);
    }
}

// Add a Row to the Grid
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function addTaskRow(task = {}) {
    const tbody = document.getElementById('task-tbody');
    const tr = document.createElement('tr');

    tr.innerHTML = `
        <td>
            <input type="hidden" class="t-completed" value="${task.completed ? 'true' : 'false'}">
            <select class="t-day">
                ${daysOfWeek.map(d => `<option value="${d}" ${task.dayOfWeek === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
        </td>
        <td><input type="text" class="t-week" value="${task.week || ''}" placeholder="e.g. Week 1"></td>
        <td><input type="date" class="t-date" value="${task.taskDate || ''}"></td>
        <td><input type="number" class="t-handle" value="${task.totalHoursHandling || ''}" placeholder="0"></td>
        <td><input type="number" class="t-free" value="${task.totalFreeHours || ''}" placeholder="0"></td>
        <td><input type="text" class="t-session" value="${task.sessionDetails || ''}" placeholder="Session"></td>
        <td><input type="text" class="t-class" value="${task.className || ''}" placeholder="Class"></td>
        <td><input type="text" class="t-timing" value="${task.timing || ''}" placeholder="e.g. 10:00 AM"></td>
        <td><input type="text" class="t-mentor" value="${task.mentor || ''}" placeholder="Mentor Name"></td>
        <td><input type="text" class="t-subject" value="${task.subject || ''}" placeholder="Subject"></td>
        <td><input type="text" class="t-unit" value="${task.unit || ''}" placeholder="Unit"></td>
        <td><textarea class="t-topics" placeholder="Topics...">${task.topicsToCover || ''}</textarea></td>
        <td><input type="text" class="t-ppt" value="${task.pptLink || ''}" placeholder="Link"></td>
        <td><button class="delete-btn" onclick="this.closest('tr').remove()">X</button></td>
    `;
    tbody.appendChild(tr);
}

document.getElementById('add-task-row').addEventListener('click', () => addTaskRow());

// Save All Tasks
document.getElementById('save-tasks').addEventListener('click', async () => {
    if (!currentUserId) return;

    const rows = document.querySelectorAll('#task-tbody tr');
    const tasksToSave = Array.from(rows).map(row => ({
        dayOfWeek: row.querySelector('.t-day').value,
        week: row.querySelector('.t-week').value,
        taskDate: row.querySelector('.t-date').value,
        totalHoursHandling: parseInt(row.querySelector('.t-handle').value) || null,
        totalFreeHours: parseInt(row.querySelector('.t-free').value) || null,
        sessionDetails: row.querySelector('.t-session').value,
        className: row.querySelector('.t-class').value,
        timing: row.querySelector('.t-timing').value,
        mentor: row.querySelector('.t-mentor').value,
        subject: row.querySelector('.t-subject').value,
        unit: row.querySelector('.t-unit').value,
        topicsToCover: row.querySelector('.t-topics').value,
        pptLink: row.querySelector('.t-ppt').value,
        completed: row.querySelector('.t-completed').value === 'true'
    }));

    try {
        const res = await fetch(`${API_BASE}/users/${currentUserId}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tasksToSave)
        });

        if (res.ok) {
            showAlert('Tasks saved successfully!');
            openTaskView(currentUserId, currentUserName);
        } else {
            showAlert('Failed to save tasks.', true);
        }
    } catch (err) {
        showAlert('Server Error.', true);
    }
});

// ─── Download Excel ─────────────────────────────────────────────
document.getElementById('export-btn').addEventListener('click', () => {
    if (!currentUserId) return;
    window.open(`${API_BASE}/users/${currentUserId}/tasks/export`, '_blank');
});

document.getElementById('export-btn-view').addEventListener('click', () => {
    if (!currentUserId) return;
    window.open(`${API_BASE}/users/${currentUserId}/tasks/export`, '_blank');
});

const adminExportAllBtn = document.getElementById('admin-export-all-btn');
if (adminExportAllBtn) {
    adminExportAllBtn.addEventListener('click', () => {
        if (!currentUserId || !currentUserIsAdmin) return;
        window.open(`${API_BASE}/admin/users/tasks/export-all?adminId=${currentUserId}`, '_blank');
    });
}

// ─── Admin Panel ───────────────────────────────────────────────
const adminRegisterBtn = document.getElementById('admin-register-btn');
const adminRegisterFormCard = document.getElementById('admin-register-form-card');
const adminRegisterCancelBtn = document.getElementById('admin-register-cancel');

if (adminRegisterBtn) {
    adminRegisterBtn.addEventListener('click', () => {
        adminRegisterFormCard.style.display = 'block';
    });
}
if (adminRegisterCancelBtn) {
    adminRegisterCancelBtn.addEventListener('click', () => {
        adminRegisterFormCard.style.display = 'none';
        document.getElementById('admin-register-form').reset();
    });
}

async function openAdminPanel() {
    switchSection('admin');
    const tbody = document.getElementById('admin-users-tbody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading users...</td></tr>';
    
    try {
        const res = await fetch(`${API_BASE}/admin/users?adminId=${currentUserId}`);
        if (!res.ok) throw new Error('Unauthorized');
        const users = await res.json();
        
        tbody.innerHTML = '';
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No users found.</td></tr>';
            return;
        }
        
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${user.name}</strong></td>
                <td>${user.email}</td>
                <td>${user.department}</td>
                <td>${user.role || '-'}</td>
                <td><span class="status-badge badge-in-progress">${user.taskCount}</span></td>
                <td><span class="status-badge ${user.isAdmin ? 'badge-completed' : ''}" style="background-color: ${user.isAdmin ? '#6366f1' : 'var(--secondary-color)'}; color: ${user.isAdmin ? 'white' : 'var(--text-main)'}">${user.isAdmin ? 'Admin' : 'User'}</span></td>
                <td>
                    <div style="display:flex; gap:0.5rem;">
                        <button class="btn btn-secondary" style="padding:0.4rem 0.75rem; font-size:0.8rem;" onclick="adminViewUserTasks(${user.id}, '${user.name}')">View Tasks</button>
                        ${user.id !== currentUserId ? `<button class="delete-btn" style="padding:0.4rem; font-size:0.8rem;" onclick="adminDeleteUser(${user.id}, '${user.name}')">Delete</button>` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--danger-color);">Error loading users.</td></tr>';
    }
}

document.getElementById('admin-register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUserId || !currentUserIsAdmin) return;
    
    const name = document.getElementById('admin-reg-name').value;
    const email = document.getElementById('admin-reg-email').value;
    const department = document.getElementById('admin-reg-dept').value;
    const role = document.getElementById('admin-reg-role').value;
    const password = document.getElementById('admin-reg-password').value;
    const isAdmin = document.getElementById('admin-reg-isadmin').value === 'true';
    
    try {
        const res = await fetch(`${API_BASE}/admin/register?adminId=${currentUserId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, department, role, password, isAdmin })
        });
        
        const data = await res.json();
        if (res.ok) {
            showAlert('User registered successfully');
            document.getElementById('admin-register-form').reset();
            document.getElementById('admin-register-form-card').style.display = 'none';
            openAdminPanel(); // refresh list
        } else {
            showAlert(data.message || 'Registration failed', true);
        }
    } catch (err) {
        showAlert('Server error', true);
    }
});

window.adminDeleteUser = async function(userId, userName) {
    if (!confirm(`Are you sure you want to permanently delete user "${userName}" and all their tasks?`)) return;
    
    try {
        const res = await fetch(`${API_BASE}/admin/users/${userId}?adminId=${currentUserId}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            showAlert('User deleted successfully');
            openAdminPanel(); // refresh list
        } else {
            showAlert('Failed to delete user', true);
        }
    } catch (err) {
        showAlert('Server error', true);
    }
};

const adminTasksOverlay = document.getElementById('admin-tasks-overlay');
const adminTasksCloseBtn = document.getElementById('close-admin-tasks');

window.adminViewUserTasks = async function(userId, userName) {
    const titleEl = document.getElementById('admin-tasks-title');
    const subtitleEl = document.getElementById('admin-tasks-subtitle');
    const listContainer = document.getElementById('admin-tasks-list');
    
    titleEl.textContent = `${userName}'s Tasks`;
    subtitleEl.textContent = 'All tasks (Read-only)';
    listContainer.innerHTML = '<div style="text-align:center; padding: 2rem;">Loading...</div>';
    
    adminTasksOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    try {
        const res = await fetch(`${API_BASE}/admin/users/${userId}/tasks?adminId=${currentUserId}`);
        const tasks = await res.json();
        
        listContainer.innerHTML = '';
        if (tasks.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; padding:2rem;">This user has no tasks.</div>';
            return;
        }
        
        tasks.sort((a,b) => new Date(b.taskDate) - new Date(a.taskDate));
        
        tasks.forEach(task => {
            const item = document.createElement('div');
            item.className = 'todays-task-item';
            item.innerHTML = `
                <div class="todays-task-item-header">
                    <span class="todays-task-item-subject">${task.subject || 'Untitled'} (${task.taskDate})</span>
                    <span class="status-badge ${task.completed ? 'badge-completed' : 'badge-in-progress'}">${task.completed ? 'Completed' : 'In Progress'}</span>
                </div>
                <div class="todays-task-item-details">
                    <div><strong>Day:</strong> ${task.dayOfWeek || '-'}</div>
                    <div><strong>Week:</strong> ${task.week || '-'}</div>
                    <div><strong>Class:</strong> ${task.className || '-'}</div>
                    <div><strong>Session:</strong> ${task.sessionDetails || '-'}</div>
                    <div><strong>Time:</strong> ${task.timing || '-'}</div>
                    <div><strong>Mentor:</strong> ${task.mentor || '-'}</div>
                </div>
            `;
            listContainer.appendChild(item);
        });
    } catch (err) {
        listContainer.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--danger-color);">Error loading tasks.</div>';
    }
};

window.closeAdminTasksModal = function() {
    if (adminTasksOverlay) {
        adminTasksOverlay.classList.remove('active');
        if (!document.getElementById('todays-task-overlay').classList.contains('active')) {
            document.body.style.overflow = '';
        }
    }
};

if (adminTasksCloseBtn) {
    adminTasksCloseBtn.addEventListener('click', closeAdminTasksModal);
}
if (adminTasksOverlay) {
    adminTasksOverlay.addEventListener('click', (e) => {
        if (e.target === adminTasksOverlay) closeAdminTasksModal();
    });
}


// ─── Initialize: Check Session ──────────────────────────────────
(function init() {
    const savedUser = localStorage.getItem('loggedInUser');
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            if (userData && userData.id && userData.name) {
                currentUserId = userData.id;
                currentUserName = userData.name;
                currentUserIsAdmin = userData.isAdmin === true;
                setLoggedInUI(userData.name, currentUserIsAdmin);
                if (currentUserIsAdmin) {
                    openAdminPanel();
                } else {
                    openTaskView(userData.id, userData.name);
                }
                return;
            }
        } catch (e) {
            localStorage.removeItem('loggedInUser');
        }
    }
    // Default: show login
    setLoggedOutUI();
    switchSection('login');
})();
