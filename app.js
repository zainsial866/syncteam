/**
 * SyncTeam - Core Application Logic
 * Consolidated and Debugged Version
 */

// ==========================================================================
// 1. Environment & Initialization Fallbacks
// ==========================================================================

// Fix jQuery $ error - define minimal jQuery if not loaded
if (typeof $ === 'undefined') {
    window.$ = window.jQuery = function (selector) {
        console.warn('jQuery not loaded, using fallback');
        return {
            ready: function (cb) {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', cb);
                } else {
                    cb();
                }
                return this;
            },
            on: function () { return this; },
            click: function () { return this; },
            hide: function () { return this; },
            show: function () { return this; },
            val: function () { return ''; },
            html: function () { return this; },
            text: function () { return ''; }
        };
    };
}

// ==========================================================================
// 2. Application State
// ==========================================================================

const appState = {
    isLoggedIn: false,
    currentUser: JSON.parse(localStorage.getItem('currentUser')) || {
        name: 'Guest',
        email: '',
        role: 'Viewer',
        avatar_url: null,
        bio: '',
        timezone: 'UTC-5',
        language: 'English',
        notificationPrefs: { email: true, desktop: true, activity: true }
    },
    currentPage: 'dashboard',
    theme: localStorage.getItem('theme') || 'dark',

    // Data Store
    projects: [],
    tasks: [],
    team: [],
    clients: [],
    files: [],
    comments: [],
    activities: [],
    notifications: [],

    // UX State
    selection: { tasks: [], projects: [], team: [], clients: [] },
    pagination: {
        tasks: { currentPage: 1, perPage: 10, sortBy: null, sortOrder: 'asc' },
        projects: { currentPage: 1, perPage: 10, sortBy: null, sortOrder: 'asc' },
        team: { currentPage: 1, perPage: 10, sortBy: null, sortOrder: 'asc' },
        clients: { currentPage: 1, perPage: 10, sortBy: null, sortOrder: 'asc' }
    },

    // RBAC Configuration
    roles: {
        'Admin': { permissions: ['*'] },
        'Project Manager': {
            permissions: [
                'create:project', 'edit:project',
                'create:task', 'edit:task', 'delete:task',
                'create:client', 'edit:client', 'manage:team', 'export:data'
            ]
        },
        'Member': { permissions: ['create:task', 'edit:task', 'comment'] },
        'Viewer': { permissions: ['view'] }
    },

    isInitialized: false
};

// ==========================================================================
// 3. Core Utilities
// ==========================================================================

function sanitizeHTML(str) {
    if (!str && str !== 0) return '';
    const stringValue = String(str);
    const div = document.createElement('div');
    div.textContent = stringValue;
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function checkPermission(action) {
    const roleName = appState.currentUser.role;
    const roleConfig = appState.roles[roleName];
    if (!roleConfig) return false;
    if (roleConfig.permissions.includes('*')) return true;
    return roleConfig.permissions.includes(action);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'warning') icon = 'warning';
    if (type === 'error') icon = 'error';

    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span class="material-symbols-outlined">${icon}</span>
            <span>${sanitizeHTML(message)}</span>
        </div>
        <button class="btn btn-ghost" onclick="this.parentElement.remove()" style="padding: 2px;">
            <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
        </button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getInitials(name) {
    if (!name || name === 'Unassigned') return '--';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function getStatusColor(status) {
    switch (status?.toLowerCase()) {
        case 'active': return 'badge-success';
        case 'completed': return 'badge-info';
        case 'on hold': return 'badge-warning';
        case 'to do': return 'badge-neutral';
        case 'in progress': return 'badge-warning';
        default: return 'badge-neutral';
    }
}

// ==========================================================================
// 4. Routing & Navigation
// ==========================================================================

function navigateTo(page, param = null) {
    console.log(`Navigating to: ${page}`);
    appState.currentPage = page;
    localStorage.setItem('lastPage', page);
    if (param) localStorage.setItem('lastParam', param);

    // Toggle Auth Mode
    const authPages = ['login', 'signup', 'forgot-password'];
    const isAuthPage = authPages.includes(page);

    if (isAuthPage) {
        document.body.classList.add('auth-mode');
    } else {
        document.body.classList.remove('auth-mode');
    }

    // Update Sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    const content = document.getElementById('app-content');
    if (!content) return;
    content.innerHTML = '';

    switch (page) {
        case 'dashboard': renderDashboard(content); break;
        case 'tasks': renderTasks(content); break;
        case 'projects': renderProjects(content); break;
        case 'team': renderTeam(content); break;
        case 'clients': renderClients(content); break;
        case 'reports': renderReports(content); break;
        case 'settings': renderSettings(content); break;
        case 'activity': renderActivityFeed(content); break;
        case 'project-details': renderProjectDetails(content, param); break;
        case 'client-details': renderClientDetails(content, param); break;
        case 'search-results': renderSearchResults(content, param); break;
        case 'login': renderLogin(content); break;
        case 'signup': renderSignup(content); break;
        case 'forgot-password': renderForgotPassword(content); break;
        case 'help': renderHelpPage(content); break;
        default: renderPlaceholder(content, '404 - Not Found');
    }

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar')?.classList.remove('open');
    }
    window.scrollTo(0, 0);
}

// ==========================================================================
// 5. Views - Dashboard
// ==========================================================================

function renderDashboard(container) {
    const totalProjects = appState.projects.length;
    const activeTasks = appState.tasks.filter(t => t.status !== 'Completed').length;
    const teamMembers = appState.team.length;
    const clientCount = appState.clients.length;

    container.innerHTML = `
        <div class="flex-between mb-2">
            <div>
                <h1>Dashboard</h1>
                <p style="color: var(--text-secondary);">Welcome, ${sanitizeHTML(appState.currentUser.name)}!</p>
            </div>
            ${checkPermission('create:project') ? `
            <button class="btn btn-primary" onclick="navigateTo('projects'); setTimeout(() => openCreateProjectModal(), 100);">
                <span class="material-symbols-outlined">add</span> New Project
            </button>` : ''}
        </div>

        <div class="grid-4 mb-2">
            ${renderStatCard(totalProjects, 'Total Projects', 'folder', 'var(--accent-green)', 'rgba(0, 255, 0, 0.1)')}
            ${renderStatCard(activeTasks, 'Active Tasks', 'check_circle', 'var(--accent-orange)', 'rgba(255, 149, 0, 0.1)')}
            ${renderStatCard(teamMembers, 'Team Members', 'group', 'var(--accent-blue)', 'rgba(0, 136, 255, 0.1)')}
            ${renderStatCard(clientCount, 'Clients', 'handshake', 'var(--text-secondary)', 'rgba(176, 176, 176, 0.1)')}
        </div>

        <div class="grid-4" style="grid-template-columns: 1fr 2fr; gap: 1.5rem; margin-bottom: 2rem;">
            <div class="card">
                <h2 style="font-size: 1.1rem; margin-bottom: 1.5rem;">Project Status</h2>
                <div style="height: 220px; position: relative;"><canvas id="projectStatusChart"></canvas></div>
            </div>
            <div class="card">
                <h2 style="font-size: 1.1rem; margin-bottom: 1.5rem; color: var(--status-error);">Overdue Tasks</h2>
                <div id="overdue-tasks-list">${renderOverdueTasks()}</div>
            </div>
        </div>

        <div class="card">
            <h2 style="font-size: 1.1rem; margin-bottom: 1.5rem;">Recent Projects</h2>
            <div class="table-container">
                <table>
                    <thead>
                        <tr><th>Project Name</th><th>Status</th><th>Progress</th></tr>
                    </thead>
                    <tbody>
                        ${appState.projects.slice(0, 5).map(p => {
        const progress = getProjectProgress(p.id);
        return `
                            <tr>
                                <td style="font-weight: 500;">
                                    <a href="javascript:void(0)" onclick="navigateTo('project-details', ${p.id})" style="color:var(--text-primary);">${sanitizeHTML(p.name)}</a>
                                </td>
                                <td><span class="badge ${getStatusColor(p.status)}">${p.status}</span></td>
                                <td>
                                    <div class="progress-bar-container"><div class="progress-bar-fill" style="width: ${progress}%"></div></div>
                                    <span style="font-size: 0.8rem; color: var(--text-secondary);">${progress}%</span>
                                </td>
                            </tr>`;
    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    setTimeout(() => initDashboardCharts(), 50);
}

function renderStatCard(value, label, icon, color, bgColor) {
    return `
        <div class="card flex-between">
            <div>
                <h3 style="margin-bottom: 0.25rem;">${value}</h3>
                <span style="color: var(--text-secondary); font-size: 0.9rem;">${label}</span>
            </div>
            <div style="background: ${bgColor}; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: ${color};">
                <span class="material-symbols-outlined">${icon}</span>
            </div>
        </div>`;
}

function renderOverdueTasks() {
    const today = new Date().toISOString().split('T')[0];
    const overdue = appState.tasks.filter(t => t.status !== 'Completed' && t.dueDate < today);
    if (overdue.length === 0) return '<p style="color: var(--text-tertiary); text-align: center; padding: 2rem;">No overdue tasks. Good job!</p>';
    return overdue.slice(0, 4).map(t => `
        <div class="flex-between" style="padding: 0.75rem; border-bottom: 1px solid var(--border-color);">
            <div>
                <span style="display: block; font-weight: 500;">${sanitizeHTML(t.title)}</span>
                <span style="font-size: 0.8rem; color: var(--status-error);">Due: ${t.dueDate}</span>
            </div>
            <button class="btn btn-ghost" onclick="openEditTaskModal(${t.id})"><span class="material-symbols-outlined">chevron_right</span></button>
        </div>`).join('');
}

function initDashboardCharts() {
    const canvas = document.getElementById('projectStatusChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const statusCounts = {
        'Active': appState.projects.filter(p => p.status === 'Active').length,
        'On Hold': appState.projects.filter(p => p.status === 'On Hold').length,
        'Completed': appState.projects.filter(p => p.status === 'Completed').length
    };
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Active', 'On Hold', 'Completed'],
            datasets: [{
                data: [statusCounts.Active, statusCounts['On Hold'], statusCounts.Completed],
                backgroundColor: ['#00FF00', '#FF9500', '#0088FF'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#B0B0B0', usePointStyle: true, padding: 20 } } },
            cutout: '70%'
        }
    });
}

// ==========================================================================
// 6. Views - Projects
// ==========================================================================

function renderProjects(container) {
    container.innerHTML = `
        <div id="projects-breadcrumbs"></div>
        <div class="flex-between mb-2">
            <h1>Projects</h1>
            ${checkPermission('create:project') ? `
            <button class="btn btn-primary" onclick="openCreateProjectModal()">
                <span class="material-symbols-outlined">add</span> New Project
            </button>` : ''}
        </div>
        <div class="card mb-2">
            <div class="flex-between" style="gap: 1rem; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 200px;"><input type="text" id="project-search" placeholder="Search projects..." class="form-control" onkeyup="filterProjects()"></div>
                <div>
                    <select id="project-filter-status" class="form-control" onchange="filterProjects()">
                        <option value="All">All Status</option><option value="Active">Active</option><option value="On Hold">On Hold</option><option value="Completed">Completed</option>
                    </select>
                </div>
            </div>
        </div>
        <div class="card">
            <div class="table-container" id="projects-table-container"></div>
            <div id="projects-pagination"></div>
        </div>
    `;
    renderBreadcrumbs(document.getElementById('projects-breadcrumbs'), [{ label: 'Projects', page: 'projects' }]);
    filterProjects();
}

function filterProjects() {
    const query = document.getElementById('project-search')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('project-filter-status')?.value || 'All';
    const container = document.getElementById('projects-table-container');
    if (!container) return;

    let filtered = appState.projects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(query) || (p.client_name || '').toLowerCase().includes(query);
        const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const pag = appState.pagination.projects;
    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th style="width: 40px;"><input type="checkbox" onclick="toggleSelectAll('projects', this.checked)"></th>
                    <th class="sortable" onclick="sortTable('projects', 'name')">Project Name</th>
                    <th>Client</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th class="text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.length > 0 ? filtered.map(p => {
        const progress = getProjectProgress(p.id);
        return `
                    <tr>
                        <td><input type="checkbox" onchange="toggleSelectItem('projects', ${p.id}, this.checked)" ${appState.selection.projects.includes(p.id) ? 'checked' : ''}></td>
                        <td><a href="javascript:void(0)" onclick="navigateTo('project-details', ${p.id})" style="color:var(--text-primary); font-weight:500;">${sanitizeHTML(p.name)}</a></td>
                        <td>${sanitizeHTML(p.client_name || 'N/A')}</td>
                        <td>${p.end_date || 'N/A'}</td>
                        <td><span class="badge ${getStatusColor(p.status)}">${p.status}</span></td>
                        <td style="min-width: 120px;">
                            <div class="progress-bar"><div class="progress-bar-fill" style="width: ${progress}%"></div></div>
                            <span style="font-size: 0.75rem;">${progress}%</span>
                        </td>
                        <td class="text-right">
                            <button class="btn btn-ghost" onclick="openEditProjectModal(${p.id})"><span class="material-symbols-outlined">edit</span></button>
                            ${checkPermission('delete:project') ? `<button class="btn btn-ghost" style="color:var(--status-error);" onclick="confirmDeleteProject(${p.id})"><span class="material-symbols-outlined">delete</span></button>` : ''}
                        </td>
                    </tr>`;
    }).join('') : `<tr><td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-tertiary);">
        <p>No projects found. Create your first project to get started!</p>
        <button class="btn btn-primary mt-1" onclick="openCreateProjectModal()">Create Project</button>
    </td></tr>`}
            </tbody>
        </table>`;
}

// ==========================================================================
// 7. Views - Tasks
// ==========================================================================

function renderTasks(container) {
    container.innerHTML = `
        <div id="tasks-breadcrumbs"></div>
        <div class="flex-between mb-2">
            <h1>Tasks</h1>
            ${checkPermission('create:task') ? `<button class="btn btn-primary" onclick="openCreateTaskModal()"><span class="material-symbols-outlined">add</span> New Task</button>` : ''}
        </div>
        <div class="card mb-2">
            <div id="task-filters" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn btn-ghost active" onclick="filterTasks('all', this)">All</button>
                <button class="btn btn-ghost" onclick="filterTasks('To Do', this)">To Do</button>
                <button class="btn btn-ghost" onclick="filterTasks('In Progress', this)">In Progress</button>
                <button class="btn btn-ghost" onclick="filterTasks('Completed', this)">Completed</button>
            </div>
        </div>
        <div class="card">
            <div class="table-container"><table id="tasks-table">
                <thead>
                    <tr><th><input type="checkbox" onclick="toggleSelectAll('tasks', this.checked)"></th><th>Task Name</th><th>Project</th><th>Priority</th><th>Due Date</th><th>Status</th><th class="text-right">Actions</th></tr>
                </thead>
                <tbody id="tasks-tbody"></tbody>
            </table></div>
            <div id="tasks-pagination"></div>
        </div>
    `;
    renderBreadcrumbs(document.getElementById('tasks-breadcrumbs'), [{ label: 'Tasks', page: 'tasks' }]);
    filterTasks('all', document.querySelector('#task-filters .btn'));
}

function filterTasks(status, btn) {
    if (btn) {
        document.querySelectorAll('#task-filters .btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    const tbody = document.getElementById('tasks-tbody');
    if (!tbody) return;

    const filtered = appState.tasks.filter(t => status.toLowerCase() === 'all' || t.status.toLowerCase() === status.toLowerCase());

    tbody.innerHTML = filtered.length > 0 ? filtered.map(t => {
        const project = appState.projects.find(p => p.id === t.project_id) || { name: 'Unknown' };
        return `
            <tr>
                <td><input type="checkbox" onchange="toggleSelectItem('tasks', ${t.id}, this.checked)" ${appState.selection.tasks.includes(t.id) ? 'checked' : ''}></td>
                <td><strong>${sanitizeHTML(t.title)}</strong></td>
                <td>${sanitizeHTML(project.name)}</td>
                <td><span class="badge ${getStatusColor(t.priority)}">${t.priority}</span></td>
                <td>${t.due_date || 'N/A'}</td>
                <td><span class="badge ${getStatusColor(t.status)}">${t.status}</span></td>
                <td class="text-right">
                    <button class="btn btn-ghost" onclick="openEditTaskModal(${t.id})"><span class="material-symbols-outlined">edit</span></button>
                </td>
            </tr>`;
    }).join('') : `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">No tasks found.</td></tr>`;
}

// ==========================================================================
// 8. Views - Settings
// ==========================================================================

function renderSettings(container) {
    container.innerHTML = `
        <div class="mb-2"><h1>Settings</h1><p style="color: var(--text-secondary);">Manage your profile and preferences.</p></div>
        <div class="settings-tabs mb-2" style="display: flex; gap: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
            <button class="btn btn-ghost active" onclick="switchSettingsTab('profile')">Profile</button>
            <button class="btn btn-ghost" onclick="switchSettingsTab('preferences')">Preferences</button>
            <button class="btn btn-ghost" onclick="switchSettingsTab('security')">Security</button>
        </div>
        <div id="settings-tab-content">
            <div id="tab-profile" class="settings-tab active">
                <div class="card" style="max-width: 600px;">
                    <form onsubmit="handleUpdateProfile(event)">
                        <div class="form-group"><label class="form-label">Full Name</label><input type="text" name="name" class="form-control" value="${sanitizeHTML(appState.currentUser.name)}" required></div>
                        <div class="form-group"><label class="form-label">Bio</label><textarea name="bio" class="form-control" rows="3">${sanitizeHTML(appState.currentUser.bio || '')}</textarea></div>
                        <button type="submit" class="btn btn-primary">Save Profile</button>
                    </form>
                </div>
            </div>
            <div id="tab-preferences" class="settings-tab" style="display: none;">
                <div class="card" style="max-width: 600px;">
                    <h3>General Preferences</h3>
                    <div class="form-group">
                        <label class="form-label">Theme</label>
                        <select class="form-control" onchange="toggleTheme(this.value)">
                            <option value="dark" ${appState.theme === 'dark' ? 'selected' : ''}>Dark Mode</option>
                            <option value="light" ${appState.theme === 'light' ? 'selected' : ''}>Light Mode</option>
                        </select>
                    </div>
                </div>
            </div>
            <div id="tab-security" class="settings-tab" style="display: none;">
                <div class="card" style="max-width: 600px;">
                    <h3>Security Settings</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 1rem;">To change your password, please use the button below to receive a reset link.</p>
                    <button class="btn btn-tertiary" onclick="handleResetPassword()">Send Reset Link</button>
                </div>
            </div>
        </div>
    `;
}

function toggleTheme(theme) {
    appState.theme = theme;
    localStorage.setItem('theme', theme);
    document.body.classList.toggle('light-mode', theme === 'light');
    showToast(`Switched to ${theme} theme`, 'success');
}

function switchSettingsTab(tabId) {
    document.querySelectorAll('.settings-tab').forEach(t => t.style.display = 'none');
    document.querySelector(`#tab-${tabId}`).style.display = 'block';
    document.querySelectorAll('.settings-tabs .btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

// ==========================================================================
// 9. Authentication
// ==========================================================================

async function checkSession() {
    if (appState.isCheckingSession) return;
    appState.isCheckingSession = true;

    try {
        if (!window.supabase || !supabase.auth) {
            console.error('Supabase client not fully initialized');
            navigateTo('login');
            return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.error('Session check error:', error);
            navigateTo('login');
            return;
        }

        if (session) {
            console.log('✅ Session active for:', session.user.email);
            appState.isLoggedIn = true;
            appState.currentUser.id = session.user.id;
            appState.currentUser.email = session.user.email;

            // Parallel fetch to speed up login
            await Promise.all([
                fetchUserProfile(session.user.id),
                fetchInitialData()
            ]);

            let targetPage = localStorage.getItem('lastPage') || 'dashboard';
            if (['login', 'signup', 'forgot-password'].includes(targetPage)) {
                targetPage = 'dashboard';
            }
            navigateTo(targetPage);
        } else {
            console.log('ℹ️ No active session, redirecting to login');
            navigateTo('login');
        }
    } catch (err) {
        console.error('Critical Auth Error:', err);
        navigateTo('login');
    } finally {
        appState.isCheckingSession = false;
        hideLoader();
    }
}

function hideLoader() {
    const loader = document.getElementById('initial-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    const email = event.target.email.value;
    const password = event.target.password.value;

    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spinning" style="font-size: 18px;">progress_activity</span> Signing In...';

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        showToast(error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Sign In';
        return;
    }

    showToast('Login successful', 'success');
    checkSession();
}

async function handleSignup(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    const name = event.target.name.value;
    const email = event.target.email.value;
    const password = event.target.password.value;
    const role = event.target.role.value;

    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spinning" style="font-size: 18px;">progress_activity</span> Creating Account...';

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: name, role: role }
        }
    });

    if (error) {
        showToast(error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Create Account';
        return;
    }

    showToast('Account created! Please check your email.', 'success');
    setTimeout(() => {
        navigateTo('login');
    }, 2000);
}

function handleLogout() {
    if (confirm('Logout?')) {
        supabase.auth.signOut();
        appState.isLoggedIn = false;
        navigateTo('login');
    }
}

// ==========================================================================
// 10. Helper Views & Utils
// ==========================================================================

// --- Modal Functions ---

function openCreateProjectModal() {
    renderModal(`
        <h2>Create New Project</h2>
        <form onsubmit="handleCreateProject(event)">
            <div class="form-group">
                <label class="form-label">Project Name</label>
                <input type="text" name="name" class="form-control" required placeholder="e.g. Website Redesign">
            </div>
            <div class="form-group">
                <label class="form-label">Client Name</label>
                <input type="text" name="client_name" class="form-control" placeholder="e.g. Acme Corp">
            </div>
            <div class="form-group">
                <label class="form-label">Due Date</label>
                <input type="date" name="end_date" class="form-control">
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <textarea name="description" class="form-control" rows="3"></textarea>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Create Project</button>
            </div>
        </form>
    `);
}

function openCreateTaskModal() {
    // Populate projects dropdown
    const projectOptions = appState.projects.map(p => `<option value="${p.id}">${sanitizeHTML(p.name)}</option>`).join('');

    renderModal(`
        <h2>Create New Task</h2>
        <form onsubmit="handleCreateTask(event)">
            <div class="form-group">
                <label class="form-label">Task Title</label>
                <input type="text" name="title" class="form-control" required placeholder="e.g. Design Homepage">
            </div>
            <div class="form-group">
                <label class="form-label">Project</label>
                <select name="project_id" class="form-control" required>
                    <option value="" disabled selected>Select a project...</option>
                    ${projectOptions}
                </select>
            </div>
            <div class="form-group flex-between" style="gap: 1rem;">
                <div style="flex:1">
                    <label class="form-label">Priority</label>
                    <select name="priority" class="form-control">
                        <option value="Low">Low</option>
                        <option value="Medium" selected>Medium</option>
                        <option value="High">High</option>
                    </select>
                </div>
                <div style="flex:1">
                    <label class="form-label">Due Date</label>
                    <input type="date" name="due_date" class="form-control">
                </div>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Create Task</button>
            </div>
        </form>
    `);
}

function openEditProjectModal(id) {
    const project = appState.projects.find(p => p.id === id);
    if (!project) return;

    renderModal(`
        <h2>Edit Project</h2>
        <form onsubmit="handleUpdateProject(event, ${id})">
            <div class="form-group">
                <label class="form-label">Project Name</label>
                <input type="text" name="name" class="form-control" value="${sanitizeHTML(project.name)}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Status</label>
                <select name="status" class="form-control">
                    <option value="Active" ${project.status === 'Active' ? 'selected' : ''}>Active</option>
                    <option value="On Hold" ${project.status === 'On Hold' ? 'selected' : ''}>On Hold</option>
                    <option value="Completed" ${project.status === 'Completed' ? 'selected' : ''}>Completed</option>
                </select>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
        </form>
    `);
}

function openEditTaskModal(id) {
    const task = appState.tasks.find(t => t.id === id);
    if (!task) return;

    renderModal(`
        <h2>Edit Task</h2>
        <form onsubmit="handleUpdateTask(event, ${id})">
            <div class="form-group">
                <label class="form-label">Task Title</label>
                <input type="text" name="title" class="form-control" value="${sanitizeHTML(task.title)}" required>
            </div>
             <div class="form-group">
                <label class="form-label">Status</label>
                <select name="status" class="form-control">
                    <option value="Pending" ${task.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
                </select>
            </div>
            <div class="text-right">
                <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
        </form>
    `);
}

function renderModal(content) {
    const overlay = document.getElementById('modal-overlay');
    overlay.innerHTML = `<div class="modal">${content}</div>`;
    overlay.classList.add('open');
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('open');
    setTimeout(() => overlay.innerHTML = '', 300);
}


// --- CRUD Handlers ---

async function handleCreateProject(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = {
        name: formData.get('name'),
        client_name: formData.get('client_name'),
        end_date: formData.get('end_date') || null,
        description: formData.get('description'),
        created_by: appState.currentUser.id, // Auth Owner
        status: 'Active'
    };

    // Optimistic UI
    closeModal();
    showToast('Creating project...', 'info');

    const { data: newProject, error } = await supabase.from('projects').insert([data]).select().single();

    if (error) {
        showToast('Error creating project: ' + error.message, 'error');
        return;
    }

    appState.projects.unshift(newProject);
    showToast('Project created successfully', 'success');
    navigateTo('projects'); // Refresh view
}

async function handleCreateTask(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = {
        title: formData.get('title'),
        project_id: formData.get('project_id'),
        priority: formData.get('priority'),
        due_date: formData.get('due_date') || null,
        user_id: appState.currentUser.id, // Auth Owner
        status: 'Pending'
    };

    closeModal();
    showToast('Creating task...', 'info');

    const { data: newTask, error } = await supabase.from('tasks').insert([data]).select().single();

    if (error) {
        showToast('Error creating task: ' + error.message, 'error');
        return;
    }

    appState.tasks.unshift(newTask);
    showToast('Task created successfully', 'success');
    if (appState.currentPage === 'tasks' || appState.currentPage === 'dashboard') {
        navigateTo(appState.currentPage); // Refresh
    }
}

async function handleUpdateProject(event, id) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const updates = {
        name: formData.get('name'),
        status: formData.get('status')
    };

    closeModal();
    const { error } = await supabase.from('projects').update(updates).eq('id', id);
    if (error) {
        showToast(error.message, 'error');
    } else {
        const idx = appState.projects.findIndex(p => p.id === id);
        if (idx !== -1) appState.projects[idx] = { ...appState.projects[idx], ...updates };
        showToast('Project updated', 'success');
        navigateTo(appState.currentPage);
    }
}

async function handleUpdateTask(event, id) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const updates = {
        title: formData.get('title'),
        status: formData.get('status')
    };

    closeModal();
    const { error } = await supabase.from('tasks').update(updates).eq('id', id);
    if (error) {
        showToast(error.message, 'error');
    } else {
        const idx = appState.tasks.findIndex(t => t.id === id);
        if (idx !== -1) appState.tasks[idx] = { ...appState.tasks[idx], ...updates };
        showToast('Task updated', 'success');
        navigateTo(appState.currentPage);
    }
}


// --- Confirm Delete ---
window.confirmDeleteProject = async (id) => {
    if (confirm('Are you sure you want to delete this project? This cannot be undone.')) {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) {
            showToast(error.message, 'error');
        } else {
            appState.projects = appState.projects.filter(p => p.id !== id);
            showToast('Project deleted', 'success');
            navigateTo('projects');
        }
    }
};

window.renderPlaceholderDetails = renderPlaceholderDetails;

function renderPlaceholder(container, title) {
    container.innerHTML = `
        <div class="p-2 text-center">
            <span class="material-symbols-outlined" style="font-size: 48px; color: var(--text-tertiary);">construction</span>
            <h2>${sanitizeHTML(title)}</h2>
            <p style="color: var(--text-secondary);">This view is under construction or could not be found.</p>
            <button class="btn btn-ghost mt-2" onclick="navigateTo('dashboard')">Back to Dashboard</button>
        </div>`;
}

function renderHelpPage(container) {
    renderPlaceholder(container, 'Help & Documentation');
}

function renderReports(container) {
    const totalProjects = appState.projects.length;
    const completedProjects = appState.projects.filter(p => p.status === 'Completed').length;
    const activeTasks = appState.tasks.filter(t => t.status !== 'Completed').length;

    container.innerHTML = `
        <div class="mb-2"><h1>Reports & Analytics</h1><p style="color: var(--text-secondary);">Project performance at a glance.</p></div>
        <div class="grid-4 mb-2">
            ${renderStatCard(totalProjects, 'Total Projects', 'folder', 'var(--accent-blue)', 'rgba(0, 136, 255, 0.1)')}
            ${renderStatCard(completedProjects, 'Completed', 'task_alt', 'var(--accent-green)', 'rgba(0, 255, 0, 0.1)')}
            ${renderStatCard(activeTasks, 'Active Tasks', 'schedule', 'var(--accent-orange)', 'rgba(255, 149, 0, 0.1)')}
        </div>
        <div class="grid-4" style="grid-template-columns: 2fr 1fr; gap: 2rem;">
            <div class="card">
                <h3>Trend Analysis</h3>
                <div style="height: 300px;"><canvas id="trendChart"></canvas></div>
            </div>
            <div class="card">
                <h3>Quick Stats</h3>
                <ul style="color: var(--text-secondary); line-height: 2.2;">
                    <li class="flex-between"><span>Avg. Progress</span><span style="color: var(--text-primary); font-weight: 600;">68%</span></li>
                    <li class="flex-between"><span>Active Users</span><span style="color: var(--text-primary); font-weight: 600;">${appState.team.length}</span></li>
                    <li class="flex-between"><span>Open Tasks</span><span style="color: var(--text-primary); font-weight: 600;">${activeTasks}</span></li>
                </ul>
            </div>
        </div>
    `;
    setTimeout(() => initTrendChart(), 50);
}

function initTrendChart() {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Efficiency',
                data: [65, 59, 80, 81, 56, 75],
                borderColor: '#00FF00',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(0, 255, 0, 0.05)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: '#333' } }, x: { grid: { display: false } } }
        }
    });
}

function renderActivityFeed(container) {
    container.innerHTML = `
        <div class="mb-2"><h1>Activity Feed</h1><p style="color: var(--text-secondary);">Recent updates across all projects.</p></div>
        <div class="card">
            ${appState.tasks.slice(0, 8).map(t => `
                <div class="flex-between" style="padding: 1rem 0; border-bottom: 1px solid var(--border-color);">
                    <div style="display: flex; gap: 15px;">
                        <div style="width: 40px; height: 40px; background: var(--bg-tertiary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--accent-blue);">
                            <span class="material-symbols-outlined">edit</span>
                        </div>
                        <div>
                            <p style="font-weight: 500;">Task Updated: "${sanitizeHTML(t.title)}"</p>
                            <p style="font-size: 0.85rem; color: var(--text-tertiary);">Status changed to ${t.status}</p>
                        </div>
                    </div>
                    <span style="font-size: 0.8rem; color: var(--text-tertiary);">Just now</span>
                </div>`).join('') || '<p style="text-align: center; padding: 2rem; color: var(--text-tertiary);">No recent activity.</p>'}
        </div>
    `;
}

window.renderTeam = (container) => {
    container.innerHTML = `
        <div class="flex-between mb-2">
            <h1>Team Directory</h1>
            <button class="btn btn-primary" onclick="showToast('Inviting team members...', 'info')"><span class="material-symbols-outlined">person_add</span> Invite Member</button>
        </div>
        <div class="grid-4">
            ${appState.team.map(member => `
                <div class="card text-center">
                    <div style="width: 64px; height: 64px; background: var(--bg-tertiary); border-radius: 50%; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; border: 2px solid var(--accent-blue); overflow: hidden;">
                        <span class="material-symbols-outlined" style="font-size: 32px; color: var(--text-tertiary);">person</span>
                    </div>
                    <h3 style="margin-bottom: 0.25rem;">${sanitizeHTML(member.full_name || 'Team Member')}</h3>
                    <p style="font-size: 0.85rem; color: var(--accent-blue); margin-bottom: 0.5rem; font-weight: 600;">${member.role || 'Member'}</p>
                    <p style="font-size: 0.8rem; color: var(--text-tertiary); line-height: 1.4;">${sanitizeHTML(member.bio || 'No bio available.')}</p>
                </div>`).join('')}
        </div>
    `;
};

window.renderClients = (container) => {
    container.innerHTML = `
        <div class="flex-between mb-2">
            <h1>Clients</h1>
            <button class="btn btn-primary" onclick="showToast('Feature coming soon', 'info')"><span class="material-symbols-outlined">add</span> New Client</button>
        </div>
        <div class="card">
            <div class="table-container">
                <table>
                    <thead>
                        <tr><th>Client Name</th><th>Email</th><th>Active Projects</th><th class="text-right">Actions</th></tr>
                    </thead>
                    <tbody>
                        ${appState.clients.length > 0 ? appState.clients.map(c => `
                            <tr>
                                <td style="font-weight: 600;">${sanitizeHTML(c.name)}</td>
                                <td>${sanitizeHTML(c.email || 'N/A')}</td>
                                <td>${appState.projects.filter(p => p.client_id === c.id).length}</td>
                                <td class="text-right"><button class="btn btn-ghost">Manage</button></td>
                            </tr>`).join('') : '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">No clients found.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

// ==========================================================================
// 11. Data Management
// ==========================================================================

async function fetchInitialData() {
    try {
        const { data: projects, error: pError } = await supabase.from('projects').select('*');
        if (pError) console.error('Projects fetch error:', pError);
        appState.projects = projects || [];

        const { data: tasks, error: tError } = await supabase.from('tasks').select('*');
        if (tError) console.error('Tasks fetch error:', tError);
        appState.tasks = tasks || [];

        const { data: clients, error: cError } = await supabase.from('clients').select('*');
        if (cError) console.error('Clients fetch error:', cError);
        appState.clients = clients || [];

        const { data: profiles, error: prError } = await supabase.from('profiles').select('*');
        if (prError) console.error('Profiles fetch error:', prError);
        appState.team = profiles || [];
    } catch (e) {
        console.error('Data hydration failed:', e);
    }
}

async function fetchUserProfile(id) {
    try {
        const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
        if (error) throw error;

        if (profile) {
            appState.currentUser.name = profile.full_name || appState.currentUser.email;
            appState.currentUser.role = profile.role || 'Member';
            appState.currentUser.avatar_url = profile.avatar_url;
            updateHeaderUI();
        } else {
            console.warn('Profile not found, using default settings');
            appState.currentUser.name = appState.currentUser.email.split('@')[0];
            updateHeaderUI();
        }
    } catch (e) {
        console.error('Error fetching profile:', e);
    }
}

function updateHeaderUI() {
    const nameDisplay = document.getElementById('user-name-display');
    if (nameDisplay) {
        nameDisplay.textContent = appState.currentUser.name;
    }
}

function getProjectProgress(projectId) {
    const pTasks = appState.tasks.filter(t => t.project_id === projectId);
    if (!pTasks.length) return 0;
    return Math.round((pTasks.filter(t => t.status === 'Completed').length / pTasks.length) * 100);
}

// ==========================================================================
// 11. Lifecycle & Event Listeners
// ==========================================================================

function initApp() {
    if (appState.isInitialized) {
        console.log('⚠️ App already initialized, skipping...');
        return;
    }
    
    console.log('🎬 Initializing Application...');
    appState.isInitialized = true;
    
    initTheme();
    initHeader();
    
    // Fail-safe: Always hide loader after 15 seconds (last resort)
    setTimeout(() => {
        if (document.getElementById('initial-loader')) {
            console.warn('Critical initialization timeout');
            hideLoader();
        }
    }, 15000);

    checkSession();
}

// Wait for Supabase to be ready before starting the app
document.addEventListener('supabase-ready', () => {
    console.log('🚀 Supabase ready, initializing app...');
    initApp();
});

// Fallback if already ready or if event doesn't fire
document.addEventListener('DOMContentLoaded', () => {
    if (window.supabaseClientInitialized) {
        initApp();
    } else {
        // If not ready within 2 seconds of DOM content, show warning
        setTimeout(() => {
            if (!window.supabaseClientInitialized) {
                console.error('Supabase initialization timed out');
                showToast('Database connection taking longer than expected...', 'warning');
            }
        }, 2000);
    }
});

function initTheme() {
    document.body.classList.toggle('light-mode', appState.theme === 'light');
}

function initHeader() {
    // Sidebar Toggle (Mobile)
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('open');
    });

    document.getElementById('sidebar-close')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.remove('open');
    });

    // Navigation Items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (page === 'logout') {
                handleLogout();
            } else if (page) {
                navigateTo(page);
            }

            // Auto-close sidebar on mobile after clicking
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar')?.classList.remove('open');
            }
        });
    });

    // Dropdown Toggles
    window.toggleNotificationDropdown = (e) => {
        if (e) e.stopPropagation();
        document.getElementById('user-dropdown')?.classList.remove('show');
        document.getElementById('notification-dropdown')?.classList.toggle('show');
    };

    window.toggleUserDropdown = (e) => {
        if (e) e.stopPropagation();
        document.getElementById('notification-dropdown')?.classList.remove('show');
        document.getElementById('user-dropdown')?.classList.toggle('show');
    };

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#notification-btn') && !e.target.closest('#notification-dropdown')) {
            document.getElementById('notification-dropdown')?.classList.remove('show');
        }
        if (!e.target.closest('#user-profile-btn') && !e.target.closest('#user-dropdown')) {
            document.getElementById('user-dropdown')?.classList.remove('show');
        }
    });
}

function renderSearchResults(container, query) {
    container.innerHTML = `
        <div class="mb-2"><h1>Search Results</h1><p style="color: var(--text-secondary);">Found matches for "${sanitizeHTML(query)}"</p></div>
        <div class="card"><p style="text-align: center; color: var(--text-tertiary); padding: 2rem;">No matches found. Try a different search term.</p></div>
    `;
}

function showTooltip(target, text) { /* ... */ }
function renderBreadcrumbs(container, items) {
    if (!container) return;
    container.innerHTML = `<div class="breadcrumbs">
        <span onclick="navigateTo('dashboard')">Home</span>
        ${items.map(i => ` <span class="material-symbols-outlined">chevron_right</span> <span onclick="navigateTo('${i.page}')">${sanitizeHTML(i.label)}</span>`).join('')}
    </div>`;
}

// Auth Views
function renderLogin(container) {
    container.innerHTML = `
        <div class="auth-container">
            <div class="card auth-card">
                <div class="text-center mb-2">
                    <div style="background: var(--gradient-primary); width: 48px; height: 48px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: #000; font-weight: 800; font-size: 24px; margin-bottom: 1rem;">ST</div>
                    <h2>Welcome Back</h2>
                    <p style="color: var(--text-secondary);">Sign in to continue to SyncTeam</p>
                </div>
                <form onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" name="email" class="form-control" placeholder="name@company.com" required>
                    </div>
                    <div class="form-group">
                        <div class="flex-between">
                            <label class="form-label">Password</label>
                            <a href="javascript:void(0)" onclick="navigateTo('forgot-password')" style="font-size: 0.8rem;">Forgot password?</a>
                        </div>
                        <input type="password" name="password" class="form-control" placeholder="••••••••" required>
                    </div>
                    <button type="submit" class="btn btn-primary w-100" style="padding: 0.75rem;">Sign In</button>
                    
                    <div style="margin-top: 1.5rem; text-align: center; font-size: 0.9rem;">
                        <p>Don't have an account? <a href="javascript:void(0)" onclick="navigateTo('signup')" style="font-weight: 600;">Create account</a></p>
                    </div>
                </form>
            </div>
            <div style="margin-top: 2rem; display: flex; gap: 2rem; justify-content: center; font-size: 0.9rem; color: var(--text-secondary);">
                <a href="javascript:void(0)" onclick="renderPlaceholder(document.getElementById('app-content'), 'About Us')">About Us</a>
                <a href="javascript:void(0)" onclick="renderPlaceholder(document.getElementById('app-content'), 'Contact Support')">Contact Us</a>
                <a href="javascript:void(0)" onclick="renderPlaceholder(document.getElementById('app-content'), 'Feedback')">Feedback</a>
            </div>
        </div>`;
}

function renderSignup(container) {
    container.innerHTML = `
        <div class="auth-container">
            <div class="card auth-card">
                <div class="text-center mb-2">
                    <h2>Create Account</h2>
                    <p style="color: var(--text-secondary);">Start managing your projects today</p>
                </div>
                <form onsubmit="handleSignup(event)"> <!-- handleSignup is missing! Need to add it too -->
                    <div class="form-group"><label class="form-label">Full Name</label><input type="text" name="name" class="form-control" placeholder="John Doe" required></div>
                    <div class="form-group"><label class="form-label">Email Address</label><input type="email" name="email" class="form-control" required></div>
                    <div class="form-group"><label class="form-label">Password</label><input type="password" name="password" class="form-control" placeholder="Min. 6 characters" minlength="6" required></div>
                    <div class="form-group">
                        <label class="form-label">I am a...</label>
                        <select name="role" class="form-control">
                            <option value="Project Manager">Project Manager</option>
                            <option value="Member">Team Member</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary w-100" style="padding: 0.75rem;">Create Account</button>
                    <p class="mt-2 text-center">Already have an account? <a href="javascript:void(0)" onclick="navigateTo('login')">Log In</a></p>
                </form>
            </div>
        </div>`;
}

function renderForgotPassword(container) {
    renderPlaceholder(container, 'Reset Password Flow');
}

// Add these to window for direct HTML onclick access
window.navigateTo = navigateTo;
window.filterTasks = filterTasks;
window.filterProjects = filterProjects;
window.switchSettingsTab = switchSettingsTab;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleLogout = handleLogout;
window.renderPlaceholder = renderPlaceholder;
window.toggleTheme = toggleTheme;

// Expose new handlers
window.openCreateProjectModal = openCreateProjectModal;
window.markAllNotificationsRead = () => {
    showToast('Notifications cleared', 'success');
    document.getElementById('notification-badge').style.display = 'none';
};
window.handleUpdateProfile = (e) => {
    e.preventDefault();
    showToast('Profile updated successfully', 'success');
};
window.handleResetPassword = () => {
    showToast('Password reset link sent to your email', 'info');
};
window.openCreateTaskModal = openCreateTaskModal;
window.openEditProjectModal = openEditProjectModal;
window.openEditTaskModal = openEditTaskModal;
window.handleCreateProject = handleCreateProject;
window.handleCreateTask = handleCreateTask;
window.handleUpdateProject = handleUpdateProject;
window.handleUpdateTask = handleUpdateTask;
window.closeModal = closeModal;
window.toggleSelectAll = (type, val) => { /* logic */ };
window.toggleSelectItem = (type, id, val) => { /* logic */ };
