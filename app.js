// ==========================================================================
// App State & Mock Database
// ==========================================================================
const appState = {
    isLoggedIn: true, // Auto-login for dev/MVP
    currentUser: JSON.parse(localStorage.getItem('currentUser')) || {
        name: 'Demo User',
        email: 'demo@syncteam.com',
        role: 'Admin',
        avatar: null,
        bio: 'Project management professional and team lead.',
        timezone: 'UTC-5 (EST)',
        language: 'English',
        notificationPrefs: {
            email: true,
            desktop: true,
            activity: true
        }
    },
    currentPage: 'dashboard',
    theme: localStorage.getItem('theme') || 'dark', // 'dark' or 'light'

    // Selection state for bulk actions
    selection: {
        tasks: [],
        projects: [],
        team: [],
        clients: []
    },

    files: [], // { id, name, type, size, url, uploadedAt, entityType, entityId }
    comments: JSON.parse(localStorage.getItem('comments')) || [], // { id, entityType, entityId, text, userId, userName, timestamp }
    activities: JSON.parse(localStorage.getItem('activities')) || [], // { id, userId, userName, action, entityType, entityName, timestamp }
    notifications: JSON.parse(localStorage.getItem('notifications')) || [], // { id, type, message, read, timestamp }

    projects: [],
    tasks: [],
    team: [],
    clients: [],

    // UX Helpers
    tooltips: [], // Stores active tooltips
    breadcrumbs: [], // { label, page, param }

    // Pagination & Sorting State
    pagination: {
        tasks: { currentPage: 1, perPage: 10, sortBy: null, sortOrder: 'asc' },
        projects: { currentPage: 1, perPage: 10, sortBy: null, sortOrder: 'asc' },
        team: { currentPage: 1, perPage: 10, sortBy: null, sortOrder: 'asc' },
        clients: { currentPage: 1, perPage: 10, sortBy: null, sortOrder: 'asc' }
    },

    // RBAC Configuration (Phase 10)
    roles: {
        'Admin': {
            permissions: ['*'] // All access
        },
        'Project Manager': {
            permissions: [
                'create:project', 'edit:project',
                'create:task', 'edit:task', 'delete:task',
                'create:client', 'edit:client'
            ]
        },
        'Member': {
            permissions: [
                'create:task', 'edit:task'
            ]
        }
    }
};

/**
 * Global HTML escaping utility to prevent XSS
 * @param {string} str - The string to escape
 * @returns {string} - Escaped string
 */
function sanitizeHTML(str) {
    if (!str && str !== 0) return '';
    const stringValue = String(str);
    const div = document.createElement('div');
    div.textContent = stringValue;
    // Escape quotes for attribute safety
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Global permission check helper
 * @param {string} action - The action to check (e.g., 'delete:project')
 * @returns {boolean} - True if allowed
 */
function checkPermission(action) {
    const roleName = appState.currentUser.role;
    const roleConfig = appState.roles[roleName];
    if (!roleConfig) return false;

    if (roleConfig.permissions.includes('*')) return true;
    return roleConfig.permissions.includes(action);
}



// ==========================================================================
// Initialization and Header logic (Placeholder for implicit state)
// ==========================================================================

// ==========================================================================
// Tasks View & Logic
// ==========================================================================

function renderTasks(container) {
    container.innerHTML = `
        <div id="tasks-breadcrumbs"></div>
        <div class="flex-between mb-2">
            <h1>Tasks</h1>
            ${checkPermission('create:task') ? `
            <button class="btn btn-primary" onclick="openCreateTaskModal()" data-tooltip="Alt + N">
                <span class="material-symbols-outlined">add</span>
                New Task
            </button>
            ` : ''}
        </div>

        <div class="card mb-2">
            <div id="task-filters" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn btn-ghost active" onclick="filterTasks('all', this)">All Tasks</button>
                <button class="btn btn-ghost" onclick="filterTasks('to do', this)">To Do</button>
                <button class="btn btn-ghost" onclick="filterTasks('in progress', this)">In Progress</button>
                <button class="btn btn-ghost" onclick="filterTasks('completed', this)">Completed</button>
            </div>
            <!-- Hidden input to store current filter -->
            <input type="hidden" id="current-task-filter" value="all">
        </div>

        <div class="card">
            <div class="table-container">
                <table id="tasks-table">
                    <thead>
                        <tr>
                            <th style="width: 40px;">
                                <input type="checkbox" id="master-checkbox-tasks" class="table-checkbox" onclick="toggleSelectAll('tasks', this.checked)">
                            </th>
                            <th class="sortable" onclick="sortTable('tasks', 'title')">Task Name</th>
                            <th class="sortable" onclick="sortTable('tasks', 'projectId')">Project</th>
                            <th class="sortable" onclick="sortTable('tasks', 'assignee')">Assigned To</th>
                            <th class="sortable" onclick="sortTable('tasks', 'priority')">Priority</th>
                            <th class="sortable" onclick="sortTable('tasks', 'dueDate')">Due Date</th>
                            <th class="sortable" onclick="sortTable('tasks', 'status')">Status</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="tasks-tbody">
                        <!-- Populated by filterTasks() -->
                    </tbody>
                </table>
            </div>
            <div id="tasks-pagination"></div>
        </div>
    `;

    // Initial render
    renderBreadcrumbs(document.getElementById('tasks-breadcrumbs'), [
        { label: 'Tasks', page: 'tasks' }
    ]);
    filterTasks('all', document.querySelector('#task-filters .btn'));
}

function filterTasks(status, btnElement) {
    // Update active button state
    if (btnElement) {
        document.querySelectorAll('#task-filters .btn').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
        // Add specific style for active state if needed (usually handled by CSS using .active)
        btnElement.style.backgroundColor = 'var(--bg-tertiary)';
        btnElement.style.color = 'var(--text-primary)';
        // Reset others
        document.querySelectorAll('#task-filters .btn:not(.active)').forEach(btn => {
            btn.style.backgroundColor = 'transparent';
            btn.style.color = 'var(--text-secondary)';
        });
    }

    const tbody = document.getElementById('tasks-tbody');
    const paginationContainer = document.getElementById('tasks-pagination');
    if (!tbody) return;

    const filter = status.toLowerCase();
    let filtered = appState.tasks.filter(t => filter === 'all' || t.status.toLowerCase() === filter);

    // Apply sorting if set
    const pag = appState.pagination.tasks;
    if (pag.sortBy) {
        filtered = sortData(filtered, pag.sortBy, pag.sortOrder);

        // Update table headers to show sort direction
        document.querySelectorAll('#tasks-table th.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        const sortedHeader = Array.from(document.querySelectorAll('#tasks-table th.sortable')).find(th => {
            return th.textContent.toLowerCase().includes(pag.sortBy.toLowerCase()) ||
                (pag.sortBy === 'title' && th.textContent.includes('Task Name'));
        });
        if (sortedHeader) {
            sortedHeader.classList.add(pag.sortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    }

    // Paginate
    const paginated = paginateData(filtered, pag.currentPage, pag.perPage);

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <span class="material-symbols-outlined empty-state-icon">assignment_late</span>
                        <h3>No tasks found</h3>
                        <p style="color:var(--text-secondary);">Try adjusting your filters or create a new task.</p>
                        <button class="btn btn-primary mt-2" onclick="openCreateTaskModal()">Create Task</button>
                    </div>
                </td>
            </tr>`;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    tbody.innerHTML = paginated.map(t => {
        const project = appState.projects.find(p => p.id === parseInt(t.projectId)) || { name: `<span style="color:var(--status-error); font-style:italic;">Deleted Project</span>` };

        // Priority Badge Color
        let priorityColor = 'neutral';
        if (t.priority === 'High') priorityColor = 'error';
        if (t.priority === 'Medium') priorityColor = 'warning';
        if (t.priority === 'Low') priorityColor = 'success'; // User requested Low=Green

        // Status Badge Color
        let statusBadge = 'badge-neutral';
        if (t.status === 'Completed') statusBadge = 'badge-success';
        if (t.status === 'In Progress') statusBadge = 'badge-warning';

        const isSelected = appState.selection.tasks.includes(t.id);

        return `
            <tr draggable="true" 
                ondragstart="handleDragStart(event, ${t.id})" 
                ondragover="handleDragOver(event)" 
                ondrop="handleDrop(event, ${t.id})"
                style="cursor: grab;">
                <td>
                    <input type="checkbox" class="table-checkbox" 
                           ${isSelected ? 'checked' : ''} 
                           onchange="toggleSelectItem('tasks', ${t.id}, this.checked)">
                </td>
                <td style="font-weight: 500; color: var(--text-primary);">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${sanitizeHTML(t.title)}
                        ${t.blockedBy?.some(bid => appState.tasks.find(tk => tk.id === bid)?.status !== 'Completed') ?
                `<span class="material-symbols-outlined" style="font-size: 16px; color: var(--status-error);" title="Blocked by other tasks">lock</span>` : ''}
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 4px;">
                        ${t.subtasks?.length > 0 ? `<span style="color: var(--text-tertiary); font-size: 0.75rem;"><span class="material-symbols-outlined" style="font-size: 12px; vertical-align: middle;">format_list_bulleted</span> ${t.subtasks.filter(s => s.completed).length}/${t.subtasks.length}</span>` : ''}
                        ${t.timeSpent > 0 ? `<span style="color: var(--accent-blue); font-size: 0.75rem;"><span class="material-symbols-outlined" style="font-size: 12px; vertical-align: middle;">schedule</span> ${Math.floor(t.timeSpent / 3600)}h ${Math.floor((t.timeSpent % 3600) / 60)}m</span>` : ''}
                    </div>
                </td>
                <td>${sanitizeHTML(project.name)}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 24px; height: 24px; background: var(--bg-tertiary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700;">
                            ${getInitials(t.assignee)}
                        </div>
                        ${sanitizeHTML(t.assignee)}
                    </div>
                </td>
                <td><span class="badge badge-${priorityColor}">${t.priority}</span></td>
                <td>${t.dueDate}</td>
                <td><span class="badge ${statusBadge}">${t.status}</span></td>
                <td class="text-right">
                    <button class="btn btn-ghost" style="padding: 4px;" onclick="openEditTaskModal(${t.id})">
                        <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
                    </button>
                    ${checkPermission('delete:task') ? `
                    <button class="btn btn-ghost" style="padding: 4px; color: var(--status-error);" onclick="confirmDeleteTask(${t.id})">
                        <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                    </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');

    // Update master checkbox state
    const masterCheckbox = document.getElementById('master-checkbox-tasks');
    if (masterCheckbox) {
        masterCheckbox.checked = filtered.length > 0 && filtered.every(t => appState.selection.tasks.includes(t.id));
    }

    // Render pagination controls
    if (paginationContainer) {
        paginationContainer.innerHTML = renderPaginationControls(filtered.length, pag.currentPage, pag.perPage, 'tasks');
    }
}

function openCreateTaskModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.innerHTML = `
        <div class="modal">
            <div class="flex-between mb-2">
                <h2>New Task</h2>
                <button class="btn btn-ghost" onclick="closeModal()" style="padding: 4px;"><span class="material-symbols-outlined">close</span></button>
            </div>
            <form onsubmit="handleSaveTask(event, 'create')">
                <div class="form-group">
                    <label class="form-label">Task Title *</label>
                    <input type="text" name="title" class="form-control" required placeholder="e.g. Design Homepage">
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-control" rows="2"></textarea>
                </div>
                <div class="grid-4" style="grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <label class="form-label">Project *</label>
                        <select name="projectId" class="form-control" required>
                            <option value="">Select Project...</option>
                            ${appState.projects.map(p => `<option value="${p.id}">${sanitizeHTML(p.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Assign To</label>
                        <select name="assignee" class="form-control">
                            <option value="Unassigned">Unassigned</option>
                            ${appState.team.map(m => `<option value="${sanitizeHTML(m.name)}">${sanitizeHTML(m.name)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="grid-4" style="grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
                    <div>
                        <label class="form-label">Priority</label>
                        <select name="priority" class="form-control">
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Due Date</label>
                        <input type="date" name="dueDate" class="form-control" required>
                    </div>
                </div>
                
                <div class="flex-between" style="justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
                    <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Task</button>
                </div>
            </form>
        </div>
    `;
    modalOverlay.classList.add('open');
}

function openEditTaskModal(id) {
    const task = appState.tasks.find(t => t.id === id);
    if (!task) return;

    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.innerHTML = `
        <div class="modal" style="max-width: 700px;">
            <div class="flex-between mb-2">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <h2>Edit Task</h2>
                    <button id="timer-btn" class="btn ${task.timerStart ? 'btn-danger' : 'btn-secondary'} btn-sm" onclick="handleToggleTimer(${id})">
                        <span class="material-symbols-outlined ${task.timerStart ? 'spinning' : ''}">schedule</span>
                        ${task.timerStart ? 'Stop Timer' : 'Start Timer'}
                    </button>
                    ${task.timeSpent > 0 || task.timerStart ? `<span style="font-size: 0.85rem; color: var(--text-tertiary);">Total: ${Math.floor((task.timeSpent || 0) / 3600)}h ${Math.floor(((task.timeSpent || 0) % 3600) / 60)}m</span>` : ''}
                </div>
                <button class="btn btn-ghost" onclick="closeModal()" style="padding: 4px;"><span class="material-symbols-outlined">close</span></button>
            </div>
            
            <form onsubmit="handleSaveTask(event, 'edit', ${id})">
                <div class="grid-4" style="grid-template-columns: 1.5fr 1fr; gap: 1.5rem;">
                    <!-- Main details -->
                    <div>
                        <div class="form-group">
                            <label class="form-label">Task Title *</label>
                            <input type="text" name="title" class="form-control" value="${sanitizeHTML(task.title)}" required>
                        </div>
                        
                        <!-- Subtasks Area -->
                        <div id="subtasks-container" style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;"></div>
                        
                        <div class="attachments-section" style="margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                            <h3 style="font-size: 1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;">
                                <span class="material-symbols-outlined">attach_file</span> Attachments
                            </h3>
                            <div id="task-upload-container-${id}"></div>
                        </div>

                        <div id="task-comments-${id}" style="margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;"></div>
                    </div>

                    <!-- Sidebar details -->
                    <div style="background: var(--bg-tertiary); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <div class="form-group">
                            <label class="form-label">Project</label>
                            <select name="projectId" class="form-control" required>
                                 ${appState.projects.map(p => `<option value="${p.id}" ${p.id == task.projectId ? 'selected' : ''}>${sanitizeHTML(p.name)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Assign To</label>
                            <select name="assignee" class="form-control">
                                <option value="">Unassigned</option>
                                ${appState.team.map(m => `<option value="${m.id}" ${m.id === task.assigneeId || m.name === task.assignee ? 'selected' : ''}>${sanitizeHTML(m.name)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select name="status" class="form-control">
                                <option value="To Do" ${task.status === 'To Do' ? 'selected' : ''}>To Do</option>
                                <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Priority</label>
                            <select name="priority" class="form-control">
                                <option value="Low" ${task.priority === 'Low' ? 'selected' : ''}>Low</option>
                                <option value="Medium" ${task.priority === 'Medium' ? 'selected' : ''}>Medium</option>
                                <option value="High" ${task.priority === 'High' ? 'selected' : ''}>High</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Due Date</label>
                            <input type="date" name="dueDate" class="form-control" value="${task.dueDate}" required>
                        </div>

                        <!-- Task Dependencies -->
                        <div class="form-group" style="margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                            <label class="form-label" style="display: flex; align-items: center; gap: 4px;">
                                <span class="material-symbols-outlined" style="font-size: 16px;">lock</span> Blocked By
                            </label>
                            <div style="max-height: 120px; overflow-y: auto; border: 1px solid var(--border-color); padding: 8px; border-radius: 4px; background: var(--bg-primary);">
                                ${appState.tasks.filter(t => t.id !== id).map(t => `
                                    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; margin-bottom: 6px;">
                                        <input type="checkbox" onchange="handleToggleDependency(${id}, ${t.id}, this.checked)" ${task.blockedBy?.includes(t.id) ? 'checked' : ''}>
                                        <span class="truncate" title="${sanitizeHTML(t.title)}">${sanitizeHTML(t.title)}</span>
                                    </div>
                                `).join('') || '<span style="color:var(--text-tertiary); font-size:0.8rem;">No other tasks.</span>'}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex-between" style="justify-content: flex-end; gap: 1rem; margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
                    <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    `;
    modalOverlay.classList.add('open');

    // Initialize components
    renderSubtasksList(id);
    renderUploadArea(`task-upload-container-${id}`, 'tasks', id);
    renderComments('task', id);
}


async function handleSaveTask(event, mode, id = null) {
    event.preventDefault();

    const permission = mode === 'create' ? 'create:task' : 'edit:task';
    if (!checkPermission(permission)) {
        showToast(`You do not have permission to ${mode} tasks.`, 'error');
        return;
    }

    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spinning">progress_activity</span> Saving...';

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    // Resolve Assignee ID and Name
    let assigneeId = data.assignee || null;
    let assigneeName = 'Unassigned';
    if (assigneeId) {
        const user = appState.team.find(u => u.id === assigneeId);
        if (user) assigneeName = user.name;
    }

    if (mode === 'create') {
        const { data: newTask, error } = await supabase
            .from('tasks')
            .insert([{
                title: data.title,
                project_id: parseInt(data.projectId),
                assignee_id: assigneeId,
                assignee_name: assigneeName, // Denormalized for ease
                status: data.status,
                priority: data.priority,
                due_date: data.dueDate,
                time_spent: 0
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating task:', error);
            showToast('Error creating task: ' + error.message, 'error');
            btn.disabled = false;
            btn.innerHTML = 'Save Changes';
            return;
        }

        // Add to local appState
        // Normalize properties to match app structure
        const formatted = {
            ...newTask,
            projectId: newTask.project_id,
            assignee: newTask.assignee_name,
            assigneeId: newTask.assignee_id,
            dueDate: newTask.due_date,
            timeSpent: newTask.time_spent,
            subtasks: []
        };

        appState.tasks.unshift(formatted);
        showToast('Task created successfully', 'success');
        logActivity('created', 'task', data.title, newTask.id);

    } else {
        const { error } = await supabase
            .from('tasks')
            .update({
                title: data.title,
                project_id: parseInt(data.projectId),
                assignee_id: assigneeId,
                assignee_name: assigneeName,
                status: data.status,
                priority: data.priority,
                due_date: data.dueDate
            })
            .eq('id', id);

        if (error) {
            console.error('Error updating task:', error);
            showToast('Error updating task: ' + error.message, 'error');
            btn.disabled = false;
            btn.innerHTML = 'Save Changes';
            return;
        }

        // Update local state
        const task = appState.tasks.find(t => t.id === id);
        if (task) {
            task.title = data.title;
            task.projectId = parseInt(data.projectId);
            task.assignee = assigneeName;
            task.assigneeId = assigneeId;
            task.status = data.status;
            task.priority = data.priority;
            task.dueDate = data.dueDate;
            showToast('Task updated successfully', 'success');
            logActivity('updated', 'task', data.title, id);
        }
    }

    closeModal();
    refreshTableView('tasks');
}

async function handleToggleSubtask(taskId, subtaskId, completed) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) return;
    const subtask = task.subtasks.find(s => s.id === subtaskId);
    if (subtask) {
        const { error } = await supabase
            .from('subtasks')
            .update({ completed: completed })
            .eq('id', subtaskId);

        if (error) {
            console.error('Error updating subtask:', error);
            showToast('Error updating subtask', 'error');
            return;
        }

        subtask.completed = completed;
        // saveStateToStorage(); // No longer needed
        refreshTableView('tasks');
        renderSubtasksList(taskId);
    }
}

async function handleAddSubtask(taskId) {
    const input = document.getElementById('new-subtask-input');
    const title = input.value.trim();
    if (!title) return;

    const task = appState.tasks.find(t => t.id === taskId);
    if (task) {
        const { data: newSubtask, error } = await supabase
            .from('subtasks')
            .insert([{
                task_id: taskId,
                title: title,
                completed: false
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating subtask:', error);
            showToast('Error creating subtask', 'error');
            return;
        }

        if (!task.subtasks) task.subtasks = [];
        task.subtasks.push(newSubtask);
        input.value = '';
        // saveStateToStorage();
        renderSubtasksList(taskId);
        refreshTableView('tasks');
    }
}

async function handleRemoveSubtask(taskId, subtaskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (task) {
        const { error } = await supabase
            .from('subtasks')
            .delete()
            .eq('id', subtaskId);

        if (error) {
            showToast('Error deleting subtask', 'error');
            return;
        }

        task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
        // saveStateToStorage();
        renderSubtasksList(taskId);
        refreshTableView('tasks');
    }
}

function renderSubtasksList(taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    const container = document.getElementById('subtasks-container');
    if (!task || !container) return;

    container.innerHTML = `
        <div style="margin-top: 1rem;">
            <label class="form-label">Subtasks (${task.subtasks?.filter(s => s.completed).length || 0}/${task.subtasks?.length || 0})</label>
            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; padding-right: 4px;">
                ${task.subtasks?.map(s => `
                    <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-tertiary); padding: 8px 12px; border-radius: 6px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" ${s.completed ? 'checked' : ''} onchange="handleToggleSubtask(${taskId}, ${s.id}, this.checked)">
                            <span style="${s.completed ? 'text-decoration: line-through; color: var(--text-tertiary); font-size: 0.9rem;' : 'font-size: 0.9rem;'}">${sanitizeHTML(s.title)}</span>
                        </div>
                        <button class="btn btn-ghost btn-sm" onclick="handleRemoveSubtask(${taskId}, ${s.id})" style="color: var(--status-error); padding: 0 4px;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                        </button>
                    </div>
                `).join('') || '<p style="font-size: 0.85rem; color: var(--text-tertiary);">No subtasks yet.</p>'}
            </div>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
                <input type="text" id="new-subtask-input" class="form-control form-control-sm" placeholder="Add a subtask...">
                <button class="btn btn-secondary btn-sm" onclick="handleAddSubtask(${taskId})">Add</button>
            </div>
        </div>
    `;
}

function handleToggleTimer(taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.timerStart) {
        // Stop timer
        const elapsed = Math.floor((Date.now() - task.timerStart) / 1000);
        task.timeSpent = (task.timeSpent || 0) + elapsed;
        task.timerStart = null;
        showToast('Timer stopped', 'info');
    } else {
        // Start timer
        task.timerStart = Date.now();
        showToast('Timer started', 'success');
    }

    saveStateToStorage();
    refreshTableView('tasks');
    // Update modal UI if open
    const timerBtn = document.getElementById('timer-btn');
    if (timerBtn) {
        timerBtn.innerHTML = task.timerStart ?
            '<span class="material-symbols-outlined spinning">schedule</span> Stop Timer' :
            '<span class="material-symbols-outlined">schedule</span> Start Timer';
        timerBtn.className = task.timerStart ? 'btn btn-danger btn-sm' : 'btn btn-secondary btn-sm';
    }
}

// Drag & Drop Handlers
let draggedTaskId = null;

function handleDragStart(event, taskId) {
    draggedTaskId = taskId;
    // event.dataTransfer.setData('text/plain', taskId); // Some browsers need this
    event.currentTarget.classList.add('dragging');
    event.currentTarget.style.opacity = '0.5';
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

function handleDrop(event, targetTaskId) {
    event.preventDefault();
    if (draggedTaskId === null || draggedTaskId === targetTaskId) return;

    const dragIndex = appState.tasks.findIndex(t => t.id === draggedTaskId);
    const targetIndex = appState.tasks.findIndex(t => t.id === targetTaskId);

    if (dragIndex !== -1 && targetIndex !== -1) {
        const [removed] = appState.tasks.splice(dragIndex, 1);
        appState.tasks.splice(targetIndex, 0, removed);
        saveStateToStorage();
        refreshTableView('tasks');
        showToast('Task reordered', 'info');
    }

    draggedTaskId = null;
    document.querySelectorAll('tr[draggable="true"]').forEach(r => {
        r.classList.remove('dragging');
        r.style.opacity = '1';
    });
}

document.addEventListener('dragend', () => {
    draggedTaskId = null;
    document.querySelectorAll('tr[draggable="true"]').forEach(r => {
        r.classList.remove('dragging');
        r.style.opacity = '1';
    });
});


async function confirmDeleteTask(id) {
    if (!checkPermission('delete:task')) {
        showToast('You do not have permission to delete tasks.', 'error');
        return;
    }
    if (confirm('Are you sure you want to delete this task?')) {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

        if (error) {
            showToast('Error deleting task: ' + error.message, 'error');
            return;
        }

        appState.tasks = appState.tasks.filter(t => t.id !== id);
        showToast('Task deleted', 'success');

        if (appState.currentPage === 'tasks') {
            const status = document.querySelector('#task-filters .btn.active')?.innerText || 'All Tasks';
            filterTasks(status, document.querySelector('#task-filters .btn.active'));
        }
    }
}

function getInitials(name) {
    if (!name || name === 'Unassigned') return '--';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

// ... (Rest of Projects View & Logic)

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initSidebar();
    initHeaderInteractions();
    initGlobalUX();
    initGlobalUX();
    // startRealTimeSimulation(); // Disabled in favor of Supabase Realtime

    // Check Supabase Session
    checkSession();

    // Subscribe to Realtime Updates
    // We defer this slightly to ensure session is checked
});

let realtimeSubscription = null;

function subscribeToRealtime() {
    if (realtimeSubscription) return; // Already subscribed

    realtimeSubscription = supabase
        .channel('public-db-changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            (payload) => {
                handleRealtimeEvent(payload);
            }
        )
        .subscribe((status) => {
            console.log('Realtime subscription status:', status);
        });
}

function handleRealtimeEvent(payload) {
    const { eventType, table, new: newRecord, old: oldRecord } = payload;
    console.log('Realtime event:', eventType, table);

    if (table === 'tasks') {
        if (eventType === 'INSERT') {
            const exists = appState.tasks.find(t => t.id === newRecord.id);
            if (!exists) {
                appState.tasks.unshift(newRecord);
                showToast(`New task: ${newRecord.title}`, 'info');
            }
        } else if (eventType === 'UPDATE') {
            const index = appState.tasks.findIndex(t => t.id === newRecord.id);
            if (index !== -1) {
                appState.tasks[index] = { ...appState.tasks[index], ...newRecord };
                // If subtasks were fetched, we might lose them if we just overwrite. 
                // But newRecord from Supabase is just columns. Merge carefully.
                // Re-fetch subtasks? Or just keep existing subtasks array.
                // appState.tasks[index].subtasks = appState.tasks[index].subtasks; // Preserve local ref if needed
            }
        } else if (eventType === 'DELETE') {
            appState.tasks = appState.tasks.filter(t => t.id !== oldRecord.id);
        }
        refreshTableView('tasks');
    }
    else if (table === 'projects') {
        if (eventType === 'INSERT') {
            if (!appState.projects.find(p => p.id === newRecord.id)) {
                appState.projects.unshift(newRecord);
                showToast(`New project: ${newRecord.name}`, 'info');
            }
        } else if (eventType === 'UPDATE') {
            const index = appState.projects.findIndex(p => p.id === newRecord.id);
            if (index !== -1) {
                appState.projects[index] = { ...appState.projects[index], ...newRecord };
            }
        } else if (eventType === 'DELETE') {
            appState.projects = appState.projects.filter(p => p.id !== oldRecord.id);
        }
        refreshTableView('projects');
    }
    else if (table === 'clients') {
        if (eventType === 'INSERT') {
            if (!appState.clients.find(c => c.id === newRecord.id)) {
                appState.clients.unshift(newRecord);
            }
        } else if (eventType === 'UPDATE') {
            const index = appState.clients.findIndex(c => c.id === newRecord.id);
            if (index !== -1) {
                appState.clients[index] = { ...appState.clients[index], ...newRecord };
            }
        } else if (eventType === 'DELETE') {
            appState.clients = appState.clients.filter(c => c.id !== oldRecord.id);
        }
        if (appState.currentPage === 'clients') renderClientsTable();
    }
    else if (table === 'subtasks') {
        // For subtasks, we need to find the parent task and update it
        // Rather than complex merging, let's just re-fetch the specific task's subtasks?
        // Or simpler: find the task and update its subtasks array.

        // Strategy: We don't have task_id in DELETE payload usually (just ID).
        // INSERT/UPDATE has task_id.

        if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const taskId = newRecord.task_id;
            const task = appState.tasks.find(t => t.id === taskId);
            if (task) {
                if (!task.subtasks) task.subtasks = [];

                const subIndex = task.subtasks.findIndex(s => s.id === newRecord.id);
                if (subIndex !== -1) {
                    task.subtasks[subIndex] = newRecord;
                } else {
                    task.subtasks.push(newRecord);
                }
                renderSubtasksList(taskId);
                refreshTableView('tasks');
            }
        } else if (eventType === 'DELETE') {
            // We need to find which task had this subtask.
            // This is inefficient O(N*M). But dataset is small for MVP.
            for (const t of appState.tasks) {
                if (t.subtasks && t.subtasks.find(s => s.id === oldRecord.id)) {
                    t.subtasks = t.subtasks.filter(s => s.id !== oldRecord.id);
                    renderSubtasksList(t.id);
                    refreshTableView('tasks');
                    break;
                }
            }
        }
    }
}

async function checkSession() {
    // Get session from Supabase
    const { data: { session }, error } = await supabase.auth.getSession();

    if (session) {
        appState.isLoggedIn = true;
        appState.currentUser.email = session.user.email;
        appState.currentUser.id = session.user.id;

        // Fetch extended profile
        await fetchUserProfile(session.user.id);
        // Fetch workspace data
        await fetchInitialData();

        // Enable Realtime
        subscribeToRealtime();

        // Redirect if on login page
        const lastPage = localStorage.getItem('lastPage') || 'dashboard';
        navigateTo(lastPage);

        // Listen for auth changes (logout, etc.)
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                appState.isLoggedIn = false;
                appState.currentUser = { name: 'Guest', email: '', role: 'Viewer', avatar: null };
                navigateTo('login');
            }
        });

    } else {
        // No session
        appState.isLoggedIn = false;
        navigateTo('login');
    }
}

async function fetchUserProfile(userId) {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (profile) {
        appState.currentUser.name = profile.full_name || appState.currentUser.email;
        appState.currentUser.role = profile.role || 'Member';
        appState.currentUser.avatar = profile.avatar_url;
        appState.currentUser.bio = profile.bio;

        // Force update UI if already rendered
        if (document.getElementById('user-name-display')) {
            document.getElementById('user-name-display').innerText = appState.currentUser.name;
        }
    } else {
        // If profile doesn't exist yet (race condition?), try creating or just use defaults
        console.log('Profile not found, using defaults.');
    }
}

// ==========================================================================
// Theme Management
// ==========================================================================
function initTheme() {
    const body = document.body;
    if (appState.theme === 'light') {
        body.classList.add('light-mode');
    } else {
        body.classList.remove('light-mode');
    }
}

function toggleTheme() {
    appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', appState.theme);
    initTheme();
    showToast(`Switched to ${appState.theme} mode`, 'success');
}

// ==========================================================================
// Global UX (Tooltips, Breadcrumbs, Shortcuts)
// ==========================================================================

function initGlobalUX() {
    // Global Tooltips
    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (target) {
            showTooltip(target, target.dataset.tooltip);
        }
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (target) {
            hideTooltip();
        }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Alt + N: New Task
        if (e.altKey && e.key === 'n') {
            e.preventDefault();
            if (checkPermission('create:task')) {
                openCreateTaskModal();
            } else {
                showToast('Action restricted: Cannot create tasks.', 'info');
            }
        }
        // Alt + P: New Project
        if (e.altKey && e.key === 'p') {
            e.preventDefault();
            if (checkPermission('create:project')) {
                openCreateProjectModal();
            } else {
                showToast('Action restricted: Cannot create projects.', 'info');
            }
        }
        // / : Focus Search
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            document.querySelector('.search-bar input')?.focus();
        }
        // Esc: Close Modal
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

let activeTooltip = null;

function showTooltip(target, text) {
    hideTooltip();
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.innerText = text;
    document.body.appendChild(tooltip);

    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
    tooltip.style.top = `${rect.top - tooltipRect.height - 8}px`;
    activeTooltip = tooltip;
}

function hideTooltip() {
    if (activeTooltip) {
        activeTooltip.remove();
        activeTooltip = null;
    }
}

function renderBreadcrumbs(container, items) {
    if (!container) return;

    container.innerHTML = `
        <div class="breadcrumbs">
            <div class="breadcrumb-item" onclick="navigateTo('dashboard')">
                <span class="material-symbols-outlined" style="font-size: 18px; vertical-align: middle;">home</span> Dashboard
            </div>
            ${items.map((item, index) => `
                <span class="breadcrumb-separator material-symbols-outlined">chevron_right</span>
                <div class="breadcrumb-item" onclick="navigateTo('${item.page}', '${item.param ? sanitizeHTML(item.param) : ''}')">
                    ${sanitizeHTML(item.label)}
                </div>
            `).join('')}
        </div>
    `;
}
// ==========================================================================
// Routing & Navigation
// ==========================================================================
function navigateTo(page, param = null) {
    console.log(`Navigating to: ${page}`);
    appState.currentPage = page;
    localStorage.setItem('lastPage', page); // Use simple key for MVP
    if (param) localStorage.setItem('lastParam', param);

    // Update Sidebar Active State
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.page === page) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Render Content
    const content = document.getElementById('app-content');
    if (!content) return;
    content.innerHTML = ''; // Clear current content

    // Basic Router Switch
    switch (page) {
        case 'dashboard':
            renderDashboard(content);
            break;
        case 'tasks':
            renderTasks(content);
            break;
        case 'projects':
            renderProjects(content);
            break;
        case 'team':
            renderTeam(content);
            break;
        case 'clients':
            renderClients(content);
            break;
        case 'reports':
            renderReports(content);
            break;
        case 'help':
            renderHelpPage(content);
            break;
        case 'settings':
            renderSettings(content);
            break;
        case 'activity':
            renderActivityFeed(content);
            break;
        case 'project-details':
            renderProjectDetails(content, param);
            break;
        case 'client-details':
            renderClientDetails(content, param);
            break;
        case 'search-results':
            renderSearchResults(content, param);
            break;
        case 'login':
            renderLogin(content);
            break;
        case 'signup':
            renderSignup(content);
            break;
        case 'forgot-password':
            renderForgotPassword(content);
            break;
        default:
            renderPlaceholder(content, '404 - Not Found');
    }

    // Auto-scroll to top
    window.scrollTo(0, 0);
}

// ==========================================================================
// Team View & Logic
// ==========================================================================

function renderTeam(container) {
    container.innerHTML = `
        <div id="team-breadcrumbs"></div>
        <div class="flex-between mb-2">
            <h1>Team Members</h1>
            ${checkPermission('manage:team') ? `
            <button class="btn btn-primary" onclick="openInviteMemberModal()" data-tooltip="Invite colleagues">
                <span class="material-symbols-outlined">person_add</span>
                Invite Member
            </button>
            ` : ''}
        </div>

        <div class="card">
            <div class="table-container" id="team-table-container">
                <!-- Populated by renderTeamTable -->
            </div>
            <div id="team-pagination"></div>
        </div>
    `;
    renderBreadcrumbs(document.getElementById('team-breadcrumbs'), [
        { label: 'Team', page: 'team' }
    ]);
    renderTeamTable();
}

function renderTeamTable() {
    const container = document.getElementById('team-table-container');
    const paginationContainer = document.getElementById('team-pagination');
    if (!container) return;

    const pag = appState.pagination.team;
    let data = [...appState.team];

    // Apply sorting
    if (pag.sortBy) {
        data = sortData(data, pag.sortBy, pag.sortOrder);
    }

    // Paginate
    const paginated = paginateData(data, pag.currentPage, pag.perPage);

    if (data.length === 0) {
        container.innerHTML = '<p class="text-center p-2">No team members found.</p>';
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <table id="team-table">
            <thead>
                <tr>
                    <th style="width: 40px;">
                        <input type="checkbox" id="master-checkbox-team" class="table-checkbox" onclick="toggleSelectAll('team', this.checked)">
                    </th>
                    <th>Avatar</th>
                    <th class="sortable" onclick="sortTable('team', 'name')">Name</th>
                    <th class="sortable" onclick="sortTable('team', 'email')">Email</th>
                    <th class="sortable" onclick="sortTable('team', 'role')">Role</th>
                    <th>Projects</th>
                    <th class="text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${paginated.map(member => {
        const memberTasks = appState.tasks.filter(t => t.assignee === member.name);
        const uniqueProjects = [...new Set(memberTasks.map(t => t.projectId))].length;

        const isSelected = appState.selection.team.includes(member.id);

        return `
                        <tr>
                            <td>
                                <input type="checkbox" class="table-checkbox" 
                                       ${isSelected ? 'checked' : ''} 
                                       onchange="toggleSelectItem('team', ${member.id}, this.checked)">
                            </td>
                            <td>
                                <div style="width: 36px; height: 36px; background: var(--bg-tertiary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--text-primary);">
                                    ${getInitials(member.name)}
                                </div>
                            </td>
                            <td style="font-weight: 500; color: var(--text-primary);">${sanitizeHTML(member.name)}</td>
                            <td>${sanitizeHTML(member.email)}</td>
                            <td><span class="badge badge-neutral">${member.role}</span></td>
                            <td>${uniqueProjects} Active Projects</td>
                            <td class="text-right">
                                <button class="btn btn-ghost" style="padding: 4px;" onclick="showToast('Edit member not implemented in MVP', 'info')">
                                    <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
                                </button>
                                ${checkPermission('manage:team') ? `
                                <button class="btn btn-ghost" style="padding: 4px; color: var(--status-error);" onclick="confirmRemoveMember(${member.id})">
                                    <span class="material-symbols-outlined" style="font-size: 18px;">person_remove</span>
                                </button>
                                ` : ''}
                            </td>
                        </tr>
                    `;
    }).join('')}
            </tbody>
        </table>
    `;

    // Update master checkbox state
    const masterCheckbox = document.getElementById('master-checkbox-team');
    if (masterCheckbox) {
        masterCheckbox.checked = data.length > 0 && data.every(m => appState.selection.team.includes(m.id));
    }

    // Render pagination
    if (paginationContainer) {
        paginationContainer.innerHTML = renderPaginationControls(data.length, pag.currentPage, pag.perPage, 'team');
    }
}

function openInviteMemberModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.innerHTML = `
        <div class="modal">
            <div class="flex-between mb-2">
                <h2>Invite Team Member</h2>
                <button class="btn btn-ghost" onclick="closeModal()" style="padding: 4px;"><span class="material-symbols-outlined">close</span></button>
            </div>
            <form onsubmit="handleInviteMember(event)">
                <div class="form-group">
                    <label class="form-label">Email Address *</label>
                    <input type="email" name="email" class="form-control" required placeholder="colleague@syncteam.com">
                </div>
                <div class="form-group">
                    <label class="form-label">Role *</label>
                    <select name="role" class="form-control" required>
                        <option value="Member">Member</option>
                        <option value="Manager">Manager</option>
                        <option value="Admin">Admin</option>
                        <option value="Client">Client</option>
                    </select>
                </div>
                
                <div class="flex-between" style="justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
                    <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Send Invite</button>
                </div>
            </form>
        </div>
    `;
    modalOverlay.classList.add('open');
}

function handleInviteMember(event) {
    event.preventDefault();

    if (!checkPermission('manage:team')) {
        showToast('You do not have permission to invite members.', 'error');
        return;
    }

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    // Mock invite process
    const newMember = {
        id: Date.now(),
        name: data.email.split('@')[0], // Mock name from email
        email: data.email,
        role: data.role
    };

    appState.team.push(newMember);
    showToast(`Invitation sent to ${data.email}!`, 'success');
    logActivity('invited', 'team member', newMember.name);
    closeModal();
    if (appState.currentPage === 'team') renderTeamTable();
    saveStateToStorage();
}

function confirmRemoveMember(id) {
    if (!checkPermission('manage:team')) {
        showToast('Only Admins can manage team members.', 'error');
        return;
    }
    if (confirm('Are you sure you want to remove this member?')) {
        const member = appState.team.find(m => m.id === id);
        appState.team = appState.team.filter(m => m.id !== id);
        showToast('Member removed', 'success');
        if (member) logActivity('removed', 'team member', member.name);
        saveStateToStorage();
        if (appState.currentPage === 'team') renderTeamTable();
    }
}

// ==========================================================================
// Clients View & Logic
// ==========================================================================

function renderClients(container) {
    container.innerHTML = `
        <div id="clients-breadcrumbs"></div>
        <div class="flex-between mb-2">
            <h1>Clients</h1>
            ${checkPermission('create:client') ? `
            <button class="btn btn-primary" onclick="openAddClientModal()" data-tooltip="Add new business partner">
                <span class="material-symbols-outlined">add</span>
                New Client
            </button>
            ` : ''}
        </div>

        <div class="card">
            <div class="table-container" id="clients-table-container">
                <!-- Table populated by renderClientsTable -->
            </div>
            <div id="clients-pagination"></div>
        </div>
    `;
    renderBreadcrumbs(document.getElementById('clients-breadcrumbs'), [
        { label: 'Clients', page: 'clients' }
    ]);
    renderClientsTable();
}

function renderClientsTable() {
    const container = document.getElementById('clients-table-container');
    const paginationContainer = document.getElementById('clients-pagination');
    if (!container) return;

    const pag = appState.pagination.clients;
    let data = [...appState.clients];

    // Apply sorting
    if (pag.sortBy) {
        data = sortData(data, pag.sortBy, pag.sortOrder);
    }

    // Paginate
    const paginated = paginateData(data, pag.currentPage, pag.perPage);

    if (data.length === 0) {
        container.innerHTML = '<p class="text-center p-2">No clients found.</p>';
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <table id="clients-table">
            <thead>
                <tr>
                    <th style="width: 40px;">
                        <input type="checkbox" id="master-checkbox-clients" class="table-checkbox" onclick="toggleSelectAll('clients', this.checked)">
                    </th>
                    <th class="sortable" onclick="sortTable('clients', 'name')">Client Name</th>
                    <th class="sortable" onclick="sortTable('clients', 'company')">Company</th>
                    <th class="sortable" onclick="sortTable('clients', 'email')">Email</th>
                    <th class="sortable" onclick="sortTable('clients', 'phone')">Phone</th>
                    <th>Active Projects</th>
                    <th class="text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${paginated.map(client => {
        const projectCount = appState.projects.filter(p => p.client === client.name).length;
        const isSelected = appState.selection.clients.includes(client.id);

        return `
                        <tr>
                            <td>
                                <input type="checkbox" class="table-checkbox" 
                                       ${isSelected ? 'checked' : ''} 
                                       onchange="toggleSelectItem('clients', ${client.id}, this.checked)">
                            </td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="width: 32px; height: 32px; background: var(--bg-tertiary); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--accent-blue);">
                                        ${getInitials(client.name)}
                                    </div>
                                    <span style="font-weight: 500; color: var(--text-primary);">${sanitizeHTML(client.name)}</span>
                                </div>
                            </td>
                            <td>${sanitizeHTML(client.company)}</td>
                            <td>${sanitizeHTML(client.email)}</td>
                            <td>${sanitizeHTML(client.phone)}</td>
                            <td><span class="badge badge-success">${projectCount}</span></td>
                            <td class="text-right">
                                ${checkPermission('edit:client') ? `
                                <button class="btn btn-ghost" style="padding: 4px;" onclick="openEditClientModal(${client.id})">
                                    <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
                                </button>
                                ` : ''}
                                ${checkPermission('delete:client') ? `
                                <button class="btn btn-ghost" style="padding: 4px; color: var(--status-error);" onclick="confirmDeleteClient(${client.id})">
                                    <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                                </button>
                                ` : ''}
                            </td>
                        </tr>
                    `;
    }).join('')}
            </tbody>
        </table>
    `;

    // Update master checkbox state
    const masterCheckbox = document.getElementById('master-checkbox-clients');
    if (masterCheckbox) {
        masterCheckbox.checked = data.length > 0 && data.every(c => appState.selection.clients.includes(c.id));
    }

    // Render pagination
    if (paginationContainer) {
        paginationContainer.innerHTML = renderPaginationControls(data.length, pag.currentPage, pag.perPage, 'clients');
    }
}

// ==========================================================================
// Help & Support View
// ==========================================================================

function renderHelpPage(container) {
    container.innerHTML = `
        <div class="breadcrumbs">
            <div class="breadcrumb-item" onclick="navigateTo('dashboard')">Home</div>
            <span class="breadcrumb-separator material-symbols-outlined">chevron_right</span>
            <div class="breadcrumb-item">Help & Support</div>
        </div>
        <h1>Help & Documentation</h1>
        <div class="grid-4" style="grid-template-columns: repeat(2, 1fr); gap: 2rem;">
            <div class="card">
                <span class="material-symbols-outlined" style="font-size: 32px; color: var(--accent-blue);">keyboard</span>
                <h3>Keyboard Shortcuts</h3>
                <ul style="list-style: disc; padding-left: 1.5rem; color: var(--text-secondary);">
                    <li><strong>Alt + N</strong>: New Task</li>
                    <li><strong>Alt + P</strong>: New Project</li>
                    <li><strong>/</strong>: Focus Search</li>
                    <li><strong>Esc</strong>: Close Modals</li>
                </ul>
            </div>
            <div class="card">
                <span class="material-symbols-outlined" style="font-size: 32px; color: var(--accent-green);">task_alt</span>
                <h3>Advanced Tasks</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">Use the timer in the task modal to track time. Subtasks help you break down complex items.</p>
                <button class="btn btn-ghost btn-sm" onclick="navigateTo('tasks')">Explore Tasks</button>
            </div>
        </div>
    `;
}

// ==========================================================================
// Client Details View (Phase 9)
// ==========================================================================

function renderClientDetails(container, clientId) {
    const client = appState.clients.find(c => c.id == clientId);
    if (!client) {
        container.innerHTML = `<div class="empty-state"><h3>Client not found</h3><button class="btn btn-primary" onclick="navigateTo('clients')">Back to Clients</button></div>`;
        return;
    }

    const clientProjects = appState.projects.filter(p => p.client === client.name);

    container.innerHTML = `
        <div class="breadcrumbs">
            <div class="breadcrumb-item" onclick="navigateTo('clients')">Clients</div>
            <span class="breadcrumb-separator material-symbols-outlined">chevron_right</span>
            <div class="breadcrumb-item">${sanitizeHTML(client.name)}</div>
        </div>

        <div class="flex-between mb-2">
             <div style="display: flex; align-items: center; gap: 15px;">
                <div style="width: 60px; height: 60px; background: var(--bg-tertiary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700;">
                    ${getInitials(client.name)}
                </div>
                <div>
                    <h1>${sanitizeHTML(client.name)}</h1>
                    <p style="color: var(--text-secondary);">${sanitizeHTML(client.company) || 'Independent Client'}</p>
                </div>
            </div>
            <button class="btn btn-ghost" onclick="openEditClientModal(${client.id})">Edit Profile</button>
        </div>

        <div class="grid-4" style="grid-template-columns: 1fr 2fr; gap: 2rem;">
            <div>
                <div class="card mb-2">
                    <h3 style="font-size: 1rem;">Contact Information</h3>
                    <div style="margin-top: 1rem; font-size: 0.9rem;">
                        <p style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">mail</span> ${sanitizeHTML(client.email)}
                        </p>
                        <p style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">call</span> ${sanitizeHTML(client.phone)}
                        </p>
                    </div>
                </div>
                <div class="card">
                    <h3 style="font-size: 1rem;">Quick Stats</h3>
                    <div class="flex-between mt-1">
                        <span style="color: var(--text-secondary);">Total Projects</span>
                        <span style="font-weight: 600;">${clientProjects.length}</span>
                    </div>
                </div>
            </div>

            <div>
                <h2 style="font-size: 1.25rem;">Project History</h2>
                ${clientProjects.length > 0 ? `
                    <div class="table-container mt-1">
                        <table>
                            <thead>
                                <tr>
                                    <th>Project Name</th>
                                    <th>Status</th>
                                    <th>Deadline</th>
                                    <th class="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${clientProjects.map(p => `
                                    <tr>
                                        <td style="font-weight: 500;">${sanitizeHTML(p.name)}</td>
                                        <td><span class="badge ${p.status === 'Active' ? 'badge-success' : 'badge-neutral'}">${p.status}</span></td>
                                        <td>${p.deadline}</td>
                                        <td class="text-right">
                                            <button class="btn btn-ghost btn-sm" onclick="navigateTo('project-details', ${p.id})">View Details</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state">
                        <span class="material-symbols-outlined empty-state-icon">folder_off</span>
                        <p>No projects found for this client.</p>
                    </div>
                `}
            </div>
        </div>
    `;
}


function openAddClientModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.innerHTML = `
        <div class="modal">
            <div class="flex-between mb-2">
                <h2>Add New Client</h2>
                <button class="btn btn-ghost" onclick="closeModal()" style="padding: 4px;"><span class="material-symbols-outlined">close</span></button>
            </div>
            <form onsubmit="handleSaveClient(event, 'create')">
                <div class="form-group">
                    <label class="form-label">Client Name *</label>
                    <input type="text" name="name" class="form-control" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Company</label>
                    <input type="text" name="company" class="form-control">
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" name="email" class="form-control">
                </div>
                <div class="form-group">
                    <label class="form-label">Phone</label>
                    <input type="tel" name="phone" class="form-control">
                </div>
                <div class="flex-between" style="justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
                    <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Client</button>
                </div>
            </form>
        </div>
    `;
    modalOverlay.classList.add('open');
}

function openEditClientModal(id) {
    const client = appState.clients.find(c => c.id === id);
    if (!client) return;

    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.innerHTML = `
        <div class="modal">
            <div class="flex-between mb-2">
                <h2>Edit Client</h2>
                <button class="btn btn-ghost" onclick="closeModal()" style="padding: 4px;"><span class="material-symbols-outlined">close</span></button>
            </div>
            <form onsubmit="handleSaveClient(event, 'edit', ${id})">
                <div class="form-group">
                    <label class="form-label">Client Name *</label>
                    <input type="text" name="name" class="form-control" required value="${sanitizeHTML(client.name)}">
                </div>
                <div class="form-group">
                    <label class="form-label">Company</label>
                    <input type="text" name="company" class="form-control" value="${sanitizeHTML(client.company || '')}">
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" name="email" class="form-control" value="${sanitizeHTML(client.email || '')}">
                </div>
                <div class="form-group">
                    <label class="form-label">Phone</label>
                    <input type="tel" name="phone" class="form-control" value="${sanitizeHTML(client.phone || '')}">
                </div>
                <div class="flex-between" style="justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
                    <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    `;
    modalOverlay.classList.add('open');
}

async function handleSaveClient(event, mode, id = null) {
    event.preventDefault();

    const permission = mode === 'create' ? 'create:client' : 'edit:client';
    if (!checkPermission(permission)) {
        showToast(`You do not have permission to ${mode} clients.`, 'error');
        return;
    }

    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spinning">progress_activity</span> Saving...';

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    if (mode === 'create') {
        const { data: newClient, error } = await supabase
            .from('clients')
            .insert([{
                name: data.name,
                company: data.company,
                email: data.email,
                phone: data.phone
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating client:', error);
            showToast('Error creating client: ' + error.message, 'error');
            btn.disabled = false;
            btn.innerHTML = 'Add Client';
            return;
        }

        appState.clients.unshift(newClient);
        showToast('Client added successfully', 'success');
        logActivity('added', 'client', data.name);
    } else {
        const { error } = await supabase
            .from('clients')
            .update({
                name: data.name,
                company: data.company,
                email: data.email,
                phone: data.phone
            })
            .eq('id', id);

        if (error) {
            console.error('Error updating client:', error);
            showToast('Error updating client: ' + error.message, 'error');
            btn.disabled = false;
            btn.innerHTML = 'Save Changes';
            return;
        }

        const client = appState.clients.find(c => c.id === id);
        if (client) {
            client.name = data.name;
            client.company = data.company;
            client.email = data.email;
            client.phone = data.phone;
            showToast('Client updated successfully', 'success');
            logActivity('updated', 'client', data.name);
        }
    }

    closeModal();
    if (appState.currentPage === 'clients') renderClientsTable();
}

async function confirmDeleteClient(id) {
    if (!checkPermission('delete:client')) {
        showToast('You do not have permission to delete clients.', 'error');
        return;
    }
    if (confirm('Are you sure you want to delete this client?')) {
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);

        if (error) {
            showToast('Error deleting client: ' + error.message, 'error');
            return;
        }

        const client = appState.clients.find(c => c.id === id);
        appState.clients = appState.clients.filter(c => c.id !== id);
        showToast('Client deleted', 'success');
        if (client) logActivity('deleted', 'client', client.name);

        if (appState.currentPage === 'clients') renderClientsTable();
    }
}

function renderActivityFeed(container) {
    container.innerHTML = `
        <div class="mb-2">
            <h1>Activity Feed</h1>
            <p style="color: var(--text-secondary);">Real-time log of actions across the workspace.</p>
        </div>
        <div class="card">
            ${appState.activities.length === 0 ? `
                <div class="text-center p-3">
                    <span class="material-symbols-outlined" style="font-size: 48px; color: var(--text-tertiary);">history</span>
                    <p>No activity recorded yet.</p>
                </div>
            ` : `
                <ul class="activity-list">
                    ${appState.activities.map(a => `
                        <li class="activity-item" style="padding: 1rem; border-bottom: 1px solid var(--border-color); display: flex; gap: 1rem; align-items: start;">
                            <div class="activity-icon" style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 18px;">${getActivityIcon(a.action)}</span>
                            </div>
                            <div>
                                <p><strong>${sanitizeHTML(a.userName)}</strong> ${sanitizeHTML(a.action)} ${sanitizeHTML(a.entityType)}: <span style="color: var(--text-primary); font-weight: 500;">${sanitizeHTML(a.entityName)}</span></p>
                                <span style="font-size: 0.8rem; color: var(--text-tertiary);">${new Date(a.timestamp).toLocaleString()}</span>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            `}
        </div>
    `;
}

function getActivityIcon(action) {
    switch (action.toLowerCase()) {
        case 'created':
        case 'added':
        case 'invited': return 'add_circle';
        case 'updated': return 'edit';
        case 'deleted':
        case 'removed': return 'delete';
        case 'completed': return 'check_circle';
        default: return 'info';
    }
}
function renderProjectTableRows(projects) {
    if (projects.length === 0) {
        return '<div class="text-center p-3"><p>No projects found.</p></div>';
    }
    return `
        <div class="table-container">
            <table class="table-hover">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Client</th>
                        <th>Status</th>
                        <th>Progress</th>
                    </tr>
                </thead>
                <tbody>
                    ${projects.map(p => {
        const progress = getProjectProgress(p.id);
        return `
                            <tr style="cursor: pointer;" onclick="navigateTo('project-details', ${p.id})">
                                <td style="font-weight: 500; color: var(--text-primary);">${sanitizeHTML(p.name)}</td>
                                <td>${sanitizeHTML(p.client)}</td>
                                <td><span class="badge ${getStatusColor(p.status)}">${p.status}</span></td>
                                <td>
                                    <div class="progress-bar-container" style="width: 80px; display: inline-block; margin-right: 8px; vertical-align: middle;">
                                        <div class="progress-bar-fill" style="width: ${progress}%"></div>
                                    </div>
                                    <span style="font-size: 0.8rem; color: var(--text-secondary); vertical-align: middle;">${progress}%</span>
                                </td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function initNavigation() {
    // Sidebar Links
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (page === 'logout') {
                handleLogout();
            } else {
                navigateTo(page);
                // Close sidebar on mobile if open
                if (window.innerWidth <= 768) {
                    document.getElementById('sidebar').classList.remove('open');
                }
            }
        });
    });
}

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    const close = document.getElementById('sidebar-close');

    if (toggle) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    if (close) {
        close.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    // Close when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            e.target !== toggle &&
            !toggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        appState.isLoggedIn = false;
        showToast('Logged out successfully', 'info');
        // Simple reload or navigate to login
        // location.reload(); 
        // OR better:
        navigateTo('login');
    }
}

// ==========================================================================
// Views (Placeholders & Stubs)
// ==========================================================================

function renderPlaceholder(container, title) {
    container.innerHTML = `
        <div style="text-align: center; padding: 4rem;">
            <h2>${title.charAt(0).toUpperCase() + title.slice(1)}</h2>
            <p style="color: var(--text-secondary);">This page is under construction.</p>
        </div>
    `;
}

// ==========================================================================
// Reports Page
// ==========================================================================

function renderReports(container) {
    // Calculate metrics
    const completedProjects = appState.projects.filter(p => p.status === 'Completed').length;
    const activeProjects = appState.projects.filter(p => p.status === 'Active').length;
    const completedTasks = appState.tasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
    const totalBudget = appState.projects.reduce((sum, p) => sum + (parseInt(p.budget) || 0), 0);

    container.innerHTML = `
        <div class="report-header">
            <div>
                <h1>Reports & Analytics</h1>
                <p style="color: var(--text-secondary);">Overview of your team's performance</p>
            </div>
            <div class="export-group">
                <button class="btn btn-ghost export-btn" onclick="downloadCSV('tasks')">
                    <span class="material-symbols-outlined">download</span> Export Tasks
                </button>
                <button class="btn btn-ghost export-btn" onclick="downloadCSV('projects')">
                    <span class="material-symbols-outlined">download</span> Export Projects
                </button>
            </div>
        </div>
        
        <!-- Stats Grid -->
        <div class="grid-4 mb-2">
            <div class="card stat-card">
                <div class="stat-icon" style="background: rgba(var(--primary-color-rgb), 0.1); color: var(--primary-color);">
                    <span class="material-symbols-outlined">check_circle</span>
                </div>
                <div>
                    <h3>${completedProjects}</h3>
                    <p>Completed Projects</p>
                </div>
            </div>
            <div class="card stat-card">
                <div class="stat-icon" style="background: rgba(var(--warning-color-rgb), 0.1); color: var(--warning-color);">
                    <span class="material-symbols-outlined">pending_actions</span>
                </div>
                <div>
                    <h3>${activeProjects}</h3>
                    <p>Active Projects</p>
                </div>
            </div>
            <div class="card stat-card">
                <div class="stat-icon" style="background: rgba(var(--info-color-rgb), 0.1); color: var(--info-color);">
                    <span class="material-symbols-outlined">task_alt</span>
                </div>
                <div>
                    <h3>${completedTasks}</h3>
                    <p>Completed Tasks</p>
                </div>
            </div>
            <div class="card stat-card">
                <div class="stat-icon" style="background: rgba(var(--secondary-color-rgb), 0.1); color: var(--secondary-color);">
                    <span class="material-symbols-outlined">attach_money</span>
                </div>
                <div>
                    <h3>$${totalBudget.toLocaleString()}</h3>
                    <p>Total Budget</p>
                </div>
            </div>
        </div>

        <!-- Charts Grid -->
        <div class="reports-grid">
            <div class="card chart-card">
                <h3>Task Completion Trends</h3>
                <div class="chart-container">
                    <canvas id="tasksTrendChart"></canvas>
                </div>
            </div>
            <div class="card chart-card">
                <h3>Project Budget Distribution</h3>
                <div class="chart-container">
                    <canvas id="budgetDistChart"></canvas>
                </div>
            </div>
            <div class="card chart-card">
                <h3>Task Priority Distribution</h3>
                <div class="chart-container">
                    <canvas id="priorityDistChart"></canvas>
                </div>
            </div>
            <div class="card chart-card">
                <h3>Team Productivity</h3>
                <div class="table-container" style="margin-top: 0;">
                    <table id="productivity-table">
                        <thead>
                            <tr>
                                <th>Member</th>
                                <th>Tasks Done</th>
                                <th>Efficiency</th>
                            </tr>
                        </thead>
                        <tbody id="productivity-body">
                            <!-- Populated by initReportsData -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Initialize data and charts after render
    setTimeout(() => {
        initReportsData();
    }, 100);
}

function initReportsData() {
    // 1. Task Completion Trends (Last 7 Days)
    const last7Days = [];
    const completionData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        last7Days.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
        // Mock data logic or real if dates existed
        const count = appState.tasks.filter(t => (t.status === 'Completed' || t.status === 'Done') && (t.completedDate === dateStr || (!t.completedDate && i === 0))).length;
        completionData.push(count || Math.floor(Math.random() * 5)); // Mixed real/mock for demo
    }

    const ctxTrend = document.getElementById('tasksTrendChart')?.getContext('2d');
    if (ctxTrend) {
        new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Tasks Completed',
                    data: completionData,
                    borderColor: '#00cc66',
                    backgroundColor: 'rgba(0, 204, 102, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }

    // 2. Project Budget Distribution
    const projectNames = appState.projects.slice(0, 5).map(p => p.name);
    const budgetData = appState.projects.slice(0, 5).map(p => parseInt(p.budget) || 0);

    const ctxBudget = document.getElementById('budgetDistChart')?.getContext('2d');
    if (ctxBudget) {
        new Chart(ctxBudget, {
            type: 'bar',
            data: {
                labels: projectNames,
                datasets: [{
                    label: 'Budget ($)',
                    data: budgetData,
                    backgroundColor: '#0088ff',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // 3. Task Priority Distribution
    const priorities = ['High', 'Medium', 'Low'];
    const priorityCounts = priorities.map(p => appState.tasks.filter(t => t.priority === p).length);

    const ctxPriority = document.getElementById('priorityDistChart')?.getContext('2d');
    if (ctxPriority) {
        new Chart(ctxPriority, {
            type: 'doughnut',
            data: {
                labels: priorities,
                datasets: [{
                    data: priorityCounts,
                    backgroundColor: ['#ff4d4d', '#ff9500', '#0088ff'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                cutout: '70%'
            }
        });
    }

    // 4. Team Productivity Table
    const productivityBody = document.getElementById('productivity-body');
    if (productivityBody) {
        const productivityData = appState.team.map(member => {
            const done = appState.tasks.filter(t => t.assignee === member.name && (t.status === 'Completed' || t.status === 'Done')).length;
            const total = appState.tasks.filter(t => t.assignee === member.name).length;
            const efficiency = total > 0 ? Math.round((done / total) * 100) : 0;
            return { name: member.name, done, efficiency };
        }).sort((a, b) => b.done - a.done);

        productivityBody.innerHTML = productivityData.map(d => `
            <tr>
                <td>${sanitizeHTML(d.name)}</td>
                <td><strong>${d.done}</strong></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="progress-bar" style="width: 60px; height: 6px;">
                            <div class="progress-fill" style="width: ${d.efficiency}%"></div>
                        </div>
                        <span>${d.efficiency}%</span>
                    </div>
                </td>
            </tr>
        `).join('');
    }
}

function downloadCSV(entityType) {
    const data = entityType === 'tasks' ? appState.tasks : appState.projects;
    if (data.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(val => {
        let s = String(val).replace(/"/g, '""');
        return `"${s}"`;
    }).join(','));

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `syncteam_${entityType}_export.csv`);
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} exported successfully`, 'success');
}

// Rename function to correct English
window.downloadCSV = function (entityType) {
    // Basic wrapper to handle naming collision or internationalization if needed
    // But let's just use the direct function below
    downloadCSVAction(entityType);
};

function downloadCSVAction(entityType) {
    if (!checkPermission('export:data')) {
        showToast('You do not have permission to export data.', 'error');
        return;
    }
    const data = entityType === 'projects' ? appState.projects : appState.tasks;
    if (data.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(val => {
        // Handle values that might contain commas
        let s = String(val).replace(/"/g, '""');
        return `"${s}"`;
    }).join(','));

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `syncteam_${entityType}_export.csv`);
    link.click();
    showToast(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} exported successfully`, 'success');
}

// ==========================================================================
// File Management Functions
// ==========================================================================

function renderUploadArea(containerId, entityType, entityId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="upload-area" id="drop-zone-${entityType}-${entityId}" 
             onclick="document.getElementById('file-input-${entityType}-${entityId}').click()"
             ondragover="handleDragOver(event)" 
             ondragleave="handleDragLeave(event)" 
             ondrop="handleDrop(event, '${entityType}', ${entityId})">
            <span class="material-symbols-outlined">cloud_upload</span>
            <p><strong>Click to upload</strong> or drag and drop</p>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem;">PNG, JPG, PDF or DOC (Max 5MB)</p>
            <input type="file" id="file-input-${entityType}-${entityId}" style="display: none" 
                   multiple onchange="handleFileSelect(event, '${entityType}', ${entityId})">
        </div>
        <div id="attachments-list-${entityType}-${entityId}" class="attachment-list">
            <!-- Files will be rendered here -->
        </div>
    `;

    renderAttachmentList(entityType, entityId);
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
}

function handleDrop(e, entityType, entityId) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');

    const files = e.dataTransfer.files;
    processFiles(files, entityType, entityId);
}

function handleFileSelect(e, entityType, entityId) {
    const files = e.target.files;
    processFiles(files, entityType, entityId);
}

function processFiles(files, entityType, entityId) {
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const newFile = {
                id: Date.now() + Math.random(),
                name: file.name,
                type: file.type,
                size: (file.size / 1024).toFixed(1) + ' KB',
                url: e.target.result,
                uploadedAt: new Date().toISOString(),
                entityType,
                entityId
            };

            appState.files.push(newFile);
            renderAttachmentList(entityType, entityId);
            showToast(`File "${file.name}" uploaded`, 'success');
        };

        if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
        } else {
            const mockFile = {
                id: Date.now() + Math.random(),
                name: file.name,
                type: file.type,
                size: (file.size / 1024).toFixed(1) + ' KB',
                url: '#',
                uploadedAt: new Date().toISOString(),
                entityType,
                entityId
            };
            appState.files.push(mockFile);
            renderAttachmentList(entityType, entityId);
            showToast(`File "${file.name}" attached`, 'success');
        }
    });
}

function renderAttachmentList(entityType, entityId) {
    const container = document.getElementById(`attachments-list-${entityType}-${entityId}`);
    if (!container) return;

    const filteredFiles = appState.files.filter(f => f.entityType === entityType && f.entityId === entityId);

    if (filteredFiles.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; color: var(--text-secondary); font-size: 0.9rem; text-align: center; padding: 1rem;">No attachments yet</p>';
        return;
    }

    container.innerHTML = filteredFiles.map(file => {
        const isImage = file.type.startsWith('image/');
        const icon = isImage ? '' : getFileIcon(file.type);

        return `
            <div class="attachment-item">
                <div class="attachment-preview" onclick="${isImage ? `openPreview('${file.url}')` : ''}" style="${isImage ? 'cursor: pointer' : ''}">
                    ${isImage ? `<img src="${file.url}" alt="${sanitizeHTML(file.name)}">` : `<span class="material-symbols-outlined">${icon}</span>`}
                </div>
                <div class="attachment-info">
                    <div class="attachment-name" title="${sanitizeHTML(file.name)}">${sanitizeHTML(file.name)}</div>
                    <div style="color: var(--text-secondary); font-size: 0.7rem;">${file.size}</div>
                </div>
                <div class="attachment-actions">
                    <button class="btn-remove-file" onclick="removeFile(${file.id}, '${entityType}', ${entityId})">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function getFileIcon(type) {
    if (type.includes('pdf')) return 'picture_as_pdf';
    if (type.includes('word') || type.includes('officedocument')) return 'description';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'table_chart';
    if (type.includes('zip') || type.includes('compressed')) return 'folder_zip';
    return 'insert_drive_file';
}

function removeFile(fileId, entityType, entityId) {
    if (confirm('Are you sure you want to remove this file?')) {
        appState.files = appState.files.filter(f => f.id !== fileId);
        renderAttachmentList(entityType, entityId);
        showToast('File removed', 'info');
    }
}

function openPreview(url) {
    const overlay = document.getElementById('preview-overlay');
    const img = document.getElementById('preview-img');
    if (!overlay || !img) return;

    img.src = url;
    overlay.classList.add('active');
}

function closePreview() {
    const overlay = document.getElementById('preview-overlay');
    if (overlay) overlay.classList.remove('active');
}

// ==========================================================================
// Dashboard
// ==========================================================================

function renderDashboard(container) {
    // 1. Calculate Stats
    const totalProjects = appState.projects.length;
    const activeTasks = appState.tasks.filter(t => t.status !== 'Completed' && t.status !== 'Done').length;
    const teamMembers = appState.team.length;
    const clientCount = appState.clients.length;

    // 2. HTML Construction
    container.innerHTML = `
        <div class="flex-between mb-2">
            <div>
                <h1>Dashboard</h1>
                <p style="color: var(--text-secondary);">Welcome back, ${sanitizeHTML(appState.currentUser.name)}!</p>
            </div>
            <button class="btn btn-primary" onclick="navigateTo('projects'); setTimeout(() => openCreateProjectModal(), 100);">
                <span class="material-symbols-outlined">add</span>
                New Project
            </button>
        </div>

        <!-- Stat Cards -->
        <div class="grid-4 mb-2">
            <!-- Projects Card -->
            <div class="card flex-between">
                <div>
                    <h3 style="margin-bottom: 0.25rem;">${totalProjects}</h3>
                    <span style="color: var(--text-secondary); font-size: 0.9rem;">Total Projects</span>
                </div>
                <div style="background: rgba(0, 255, 0, 0.1); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--accent-green);">
                    <span class="material-symbols-outlined">folder</span>
                </div>
            </div>

            <!-- Tasks Card -->
            <div class="card flex-between">
                <div>
                    <h3 style="margin-bottom: 0.25rem;">${activeTasks}</h3>
                    <span style="color: var(--text-secondary); font-size: 0.9rem;">Active Tasks</span>
                </div>
                <div style="background: rgba(255, 149, 0, 0.1); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--accent-orange);">
                    <span class="material-symbols-outlined">check_circle</span>
                </div>
            </div>

            <!-- Team Card -->
            <div class="card flex-between">
                <div>
                    <h3 style="margin-bottom: 0.25rem;">${teamMembers}</h3>
                    <span style="color: var(--text-secondary); font-size: 0.9rem;">Team Members</span>
                </div>
                <div style="background: rgba(0, 136, 255, 0.1); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--accent-blue);">
                    <span class="material-symbols-outlined">group</span>
                </div>
            </div>

            <!-- Clients Card -->
            <div class="card flex-between">
                <div>
                    <h3 style="margin-bottom: 0.25rem;">${clientCount}</h3>
                    <span style="color: var(--text-secondary); font-size: 0.9rem;">Clients</span>
                </div>
                <div style="background: rgba(176, 176, 176, 0.1); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary);">
                    <span class="material-symbols-outlined">handshake</span>
                </div>
            </div>
        </div>

        <div class="grid-4" style="grid-template-columns: 1fr 2fr; gap: 1.5rem; margin-bottom: 2rem;">
            <!-- Project Status Chart -->
            <div class="card">
                <h2 style="font-size: 1.1rem; margin-bottom: 1.5rem;">Project Status</h2>
                <div style="height: 220px; position: relative;">
                    <canvas id="projectStatusChart"></canvas>
                </div>
            </div>

            <!-- Overdue Tasks -->
            <div class="card">
                <h2 style="font-size: 1.1rem; margin-bottom: 1.5rem; color: var(--status-error);">Overdue Tasks</h2>
                <div id="overdue-tasks-list">
                    ${renderOverdueTasks()}
                </div>
            </div>
        </div>

        <!-- Recent Projects -->
        <div class="card">
            <h2 style="font-size: 1.1rem; margin-bottom: 1.5rem;">Recent Projects</h2>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Project Name</th>
                            <th>Status</th>
                            <th>Progress</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${appState.projects.slice(0, 5).map(p => {
        const progress = getProjectProgress(p.id);
        return `
                                <tr>
                                    <td style="font-weight: 500; color: var(--text-primary);">
                                        <a href="javascript:void(0)" onclick="navigateTo('project-details', ${p.id})" style="color:var(--text-primary);">${sanitizeHTML(p.name)}</a>
                                    </td>
                                    <td><span class="badge ${getStatusColor(p.status)}">${p.status}</span></td>
                                    <td>
                                        <div class="progress-bar-container" style="margin-bottom: 4px;">
                                            <div class="progress-bar-fill" style="width: ${progress}%"></div>
                                        </div>
                                        <span style="font-size: 0.8rem; color: var(--text-secondary);">${progress}%</span>
                                    </td>
                                </tr>
                            `;
    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Initialize charts after a small delay for DOM insertion
    setTimeout(() => initDashboardCharts(), 50);
}

function renderOverdueTasks() {
    const today = new Date().toISOString().split('T')[0];
    const overdue = appState.tasks.filter(t => t.status !== 'Completed' && t.dueDate < today);

    if (overdue.length === 0) {
        return '<p style="color: var(--text-tertiary); text-align: center; padding: 2rem;">No overdue tasks. Good job!</p>';
    }

    return overdue.slice(0, 4).map(t => `
        <div class="flex-between" style="padding: 0.75rem; border-bottom: 1px solid var(--border-color);">
            <div>
                <span style="display: block; font-weight: 500;">${sanitizeHTML(t.title)}</span>
                <span style="font-size: 0.8rem; color: var(--status-error);">Due: ${t.dueDate}</span>
            </div>
            <button class="btn btn-ghost" style="padding: 4px;" onclick="openEditTaskModal(${t.id})">
                <span class="material-symbols-outlined" style="font-size: 18px;">chevron_right</span>
            </button>
        </div>
    `).join('');
}

function initDashboardCharts() {
    const ctx = document.getElementById('projectStatusChart');
    if (!ctx) return;

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
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#B0B0B0',
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            cutout: '70%'
        }
    });
}

function getProjectProgress(projectId) {
    const projectTasks = appState.tasks.filter(t => t.projectId === projectId);
    if (projectTasks.length === 0) return 0; // Or return p.progress if manual override allowed, but dynamic is better

    // Check if initial manual progress was higher? No, trust tasks.
    // If no tasks, maybe fallback to manual p.progress? 
    // Let's stick to task-based. If no tasks, 0%.

    const completedTasks = projectTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
    return Math.round((completedTasks / projectTasks.length) * 100);
}

// ==========================================================================
// Projects Feature
// ==========================================================================

function renderProjects(container) {
    container.innerHTML = `
        <div id="projects-breadcrumbs"></div>
        <div class="flex-between mb-2">
            <h1>Projects</h1>
            ${checkPermission('create:project') ? `
            <button class="btn btn-primary" onclick="openCreateProjectModal()" data-tooltip="Alt + P">
                <span class="material-symbols-outlined">add</span>
                New Project
            </button>
            ` : ''}
        </div>

        <div class="card mb-2">
            <div class="flex-between" style="gap: 1rem; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 200px;">
                    <input type="text" id="project-search" placeholder="Search projects..." class="form-control" onkeyup="filterProjects()">
                </div>
                <div>
                    <select id="project-filter-status" class="form-control" onchange="filterProjects()">
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Completed">Completed</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="table-container" id="projects-table-container">
                <!-- Table content populated by filterProjects -->
            </div>
            <div id="projects-pagination"></div>
        </div>
    `;

    // Initial Filter/Render
    renderBreadcrumbs(document.getElementById('projects-breadcrumbs'), [
        { label: 'Projects', page: 'projects' }
    ]);
    filterProjects();
}

function toggleSelectItem(entityType, id, isChecked) {
    const selectionArray = appState.selection[entityType];
    if (isChecked) {
        if (!selectionArray.includes(id)) {
            selectionArray.push(id);
        }
    } else {
        appState.selection[entityType] = selectionArray.filter(item => item !== id);
    }
    // Optionally update master checkbox or other UI elements
    // For now, just ensure the state is correct.
}

function filterProjects() {
    const query = document.getElementById('project-search')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('project-filter-status')?.value || 'All';
    const container = document.getElementById('projects-table-container');
    const paginationContainer = document.getElementById('projects-pagination');

    if (!container) return;

    let filtered = appState.projects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(query) || p.client.toLowerCase().includes(query);
        const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Apply sorting
    const pag = appState.pagination.projects;
    if (pag.sortBy) {
        filtered = sortData(filtered, pag.sortBy, pag.sortOrder);
    }

    // Paginate
    const paginated = paginateData(filtered, pag.currentPage, pag.perPage);

    if (filtered.length === 0) {
        container.innerHTML = '<p class="text-center p-2">No projects found.</p>';
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <table id="projects-table">
            <thead>
                <tr>
                    <th style="width: 40px;">
                        <input type="checkbox" id="master-checkbox-projects" class="table-checkbox" onclick="toggleSelectAll('projects', this.checked)">
                    </th>
                    <th class="sortable" onclick="sortTable('projects', 'name')">Project Name</th>
                    <th class="sortable" onclick="sortTable('projects', 'client')">Client</th>
                    <th class="sortable" onclick="sortTable('projects', 'endDate')">Due Date</th>
                    <th class="sortable" onclick="sortTable('projects', 'status')">Status</th>
                    <th class="sortable" onclick="sortTable('projects', 'progress')">Progress</th>
                    <th class="text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${paginated.map(p => {
        const progress = getProjectProgress(p.id);
        const isSelected = appState.selection.projects.includes(p.id);

        return `
                    <tr>
                        <td>
                            <input type="checkbox" class="table-checkbox" 
                                   ${isSelected ? 'checked' : ''} 
                                   onchange="toggleSelectItem('projects', ${p.id}, this.checked)">
                        </td>
                        <td style="font-weight: 500; color: var(--text-primary);">
                            <a href="javascript:void(0)" onclick="navigateTo('project-details', ${p.id})" style="color:var(--text-primary);">${sanitizeHTML(p.name)}</a>
                        </td>
                        <td>${sanitizeHTML(p.client)}</td>
                        <td>${p.endDate}</td>
                        <td><span class="badge ${getStatusColor(p.status)}">${p.status}</span></td>
                        <td style="min-width: 150px;">
                            <div class="flex-between" style="font-size: 0.8rem; margin-bottom: 4px;">
                                <span>${progress}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress}%"></div>
                            </div>
                        </td>
                        <td class="text-right">
                            ${checkPermission('edit:project') ? `
                            <button class="btn btn-ghost" style="padding: 4px;" onclick="openEditProjectModal(${p.id})">
                                <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
                            </button>
                            ` : ''}
                            ${checkPermission('delete:project') ? `
                            <button class="btn btn-ghost" style="padding: 4px; color: var(--status-error);" onclick="confirmDeleteProject(${p.id})">
                                <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                            </button>
                            ` : ''}
                        </td>
                    </tr>
                `}).join('')}
            </tbody>
        </table>
    `;

    // Update master checkbox state
    const masterCheckbox = document.getElementById('master-checkbox-projects');
    if (masterCheckbox) {
        masterCheckbox.checked = filtered.length > 0 && filtered.every(p => appState.selection.projects.includes(p.id));
    }

    // Update sort indicators
    if (pag.sortBy) {
        document.querySelectorAll('#projects-table th.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        const sortedHeader = Array.from(document.querySelectorAll('#projects-table th.sortable')).find(th => {
            const onclick = th.getAttribute('onclick');
            return onclick && onclick.includes(`'${pag.sortBy}'`);
        });
        if (sortedHeader) {
            sortedHeader.classList.add(pag.sortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    }

    // Render pagination
    if (paginationContainer) {
        paginationContainer.innerHTML = renderPaginationControls(filtered.length, pag.currentPage, pag.perPage, 'projects');
    }
}
// ==========================================================================
// Modals & Actions
// ==========================================================================

function openCreateProjectModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.innerHTML = `
        <div class="modal">
            <div class="flex-between mb-2">
                <h2>New Project</h2>
                <button class="btn btn-ghost" onclick="closeModal()" style="padding: 4px;"><span class="material-symbols-outlined">close</span></button>
            </div>
            <form onsubmit="handleSaveProject(event, 'create')">
                <div class="form-group">
                    <label class="form-label">Project Name *</label>
                    <input type="text" name="name" class="form-control" required placeholder="e.g. Website Redesign">
                </div>
                <div class="form-group">
                    <label class="form-label">Client *</label>
                    <select name="client" class="form-control" required>
                        <option value="">Select Client...</option>
                        ${appState.clients.map(c => `<option value="${c.name}">${sanitizeHTML(c.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-control" rows="3"></textarea>
                </div>
                <div class="grid-4" style="grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
                    <div>
                        <label class="form-label">Start Date *</label>
                        <input type="date" name="startDate" class="form-control" required>
                    </div>
                    <div>
                        <label class="form-label">End Date *</label>
                        <input type="date" name="endDate" class="form-control" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Budget ($)</label>
                    <input type="number" name="budget" class="form-control" placeholder="0">
                </div>
                
                <div class="flex-between" style="justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
                    <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Project</button>
                </div>
            </form>
        </div>
    `;
    modalOverlay.classList.add('open');
}

function openEditProjectModal(id) {
    const project = appState.projects.find(p => p.id === id);
    if (!project) return;

    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.innerHTML = `
        <div class="modal">
            <div class="flex-between mb-2">
                <h2>Edit Project</h2>
                <button class="btn btn-ghost" onclick="closeModal()" style="padding: 4px;"><span class="material-symbols-outlined">close</span></button>
            </div>
            <form onsubmit="handleSaveProject(event, 'edit', ${id})">
                <div class="form-group">
                    <label class="form-label">Project Name *</label>
                    <input type="text" name="name" class="form-control" value="${sanitizeHTML(project.name)}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Client *</label>
                    <select name="client" class="form-control" required>
                         ${appState.clients.map(c => `<option value="${c.name}" ${c.name === project.client ? 'selected' : ''}>${sanitizeHTML(c.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="grid-4" style="grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
                    <div>
                        <label class="form-label">Status</label>
                        <select name="status" class="form-control">
                            <option value="Active" ${project.status === 'Active' ? 'selected' : ''}>Active</option>
                            <option value="On Hold" ${project.status === 'On Hold' ? 'selected' : ''}>On Hold</option>
                            <option value="Completed" ${project.status === 'Completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </div>
                    <div>
                         <label class="form-label">Progress: <span id="progress-val">${project.progress}%</span></label>
                         <input type="range" name="progress" min="0" max="100" value="${project.progress}" style="width: 100%;" oninput="document.getElementById('progress-val').textContent = this.value + '%'">
                    </div>
                </div>
                
                 <div class="grid-4" style="grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
                    <div>
                        <label class="form-label">Start Date</label>
                        <input type="date" name="startDate" class="form-control" value="${project.startDate}">
                    </div>
                    <div>
                        <label class="form-label">End Date</label>
                        <input type="date" name="endDate" class="form-control" value="${project.endDate}">
                    </div>
                </div>

                <div class="attachments-section" style="margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                    <h3 style="font-size: 1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined">attach_file</span> Attachments
                    </h3>
                    <div id="project-upload-container-${id}"></div>
                </div>
                
                <div class="flex-between" style="justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
                    <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    `;
    modalOverlay.classList.add('open');

    // Initialize upload area for projects
    renderUploadArea(`project-upload-container-${id}`, 'projects', id);
}

async function handleSaveProject(event, mode, id = null) {
    event.preventDefault();

    const permission = mode === 'create' ? 'create:project' : 'edit:project';
    if (!checkPermission(permission)) {
        showToast(`You do not have permission to ${mode} projects.`, 'error');
        return;
    }

    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spinning">progress_activity</span> Saving...';

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    if (mode === 'create') {
        const { data: newProject, error } = await supabase
            .from('projects')
            .insert([{
                name: data.name,
                client_name: data.client, // Storing name for now as per schema logic
                description: data.description,
                start_date: data.startDate,
                end_date: data.endDate,
                budget: data.budget || 0,
                status: 'Active',
                progress: 0,
                created_by: appState.currentUser.id
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating project:', error);
            showToast('Error creating project: ' + error.message, 'error');
            btn.disabled = false;
            btn.innerHTML = 'Create Project';
            return;
        }

        // Add to local state
        // Flatten structure to match appState expectation
        const formatted = {
            ...newProject,
            client: newProject.client_name,
            startDate: newProject.start_date,
            endDate: newProject.end_date
        };
        appState.projects.unshift(formatted);
        showToast('Project created successfully', 'success');

    } else {
        const { error } = await supabase
            .from('projects')
            .update({
                name: data.name,
                client_name: data.client,
                status: data.status,
                progress: parseInt(data.progress),
                start_date: data.startDate,
                end_date: data.endDate
            })
            .eq('id', id);

        if (error) {
            console.error('Error updating project:', error);
            showToast('Error updating project: ' + error.message, 'error');
            btn.disabled = false;
            btn.innerHTML = 'Save Changes';
            return;
        }

        // Update local state
        const project = appState.projects.find(p => p.id === id);
        if (project) {
            project.name = data.name;
            project.client = data.client;
            project.status = data.status;
            project.progress = parseInt(data.progress);
            project.startDate = data.startDate;
            project.endDate = data.endDate;
        }
        showToast('Project updated successfully', 'success');
    }

    closeModal();
    // Refresh view if on projects page or dashboard
    if (appState.currentPage === 'projects') filterProjects();
    if (appState.currentPage === 'dashboard') navigateTo('dashboard'); // Re-render dashboard
}

async function confirmDeleteProject(id) {
    if (!checkPermission('delete:project')) {
        showToast('You do not have permission to delete projects.', 'error');
        return;
    }
    if (confirm('Are you sure you want to delete this project?')) {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) {
            showToast('Error deleting project: ' + error.message, 'error');
            return;
        }

        appState.projects = appState.projects.filter(p => p.id !== id);
        showToast('Project deleted', 'success');

        if (appState.currentPage === 'projects') filterProjects();
        if (appState.currentPage === 'dashboard') navigateTo('dashboard');
    }
}
function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
}



// ==========================================================================
// Authentication Views
// ==========================================================================

function renderLogin(container) {
    container.innerHTML = `
        <div style="height: 100%; display: flex; align-items: center; justify-content: center; background-color: var(--bg-primary);">
            <div class="card" style="width: 100%; max-width: 400px; padding: 2.5rem; border: 1px solid var(--border-color); box-shadow: var(--shadow-lg);">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <div style="width: 50px; height: 50px; background: var(--accent-green); color: #000; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.5rem; margin: 0 auto 1rem;">TS</div>
                    <h2>Welcome Back</h2>
                    <p style="color: var(--text-secondary);">Enter your credentials to access your account.</p>
                </div>
                
                <form onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" class="form-control" value="demo@syncteam.com" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <div style="position: relative;">
                            <input type="password" id="login-password" class="form-control" value="password" required>
                            <button type="button" class="btn btn-ghost" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); padding: 2px;" onclick="togglePasswordVisibility('login-password')">
                                <span class="material-symbols-outlined" style="font-size: 18px;">visibility</span>
                            </button>
                        </div>
                    </div>
                    <div class="flex-between mb-2">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="remember" class="form-checkbox">
                            <label for="remember" style="font-size: 0.9rem; cursor: pointer;">Remember me</label>
                        </div>
                        <a href="#" onclick="navigateTo('forgot-password'); return false;" style="font-size: 0.9rem;">Forgot password?</a>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Login</button>
                    
                    <div style="text-align: center; margin-top: 1.5rem; font-size: 0.9rem;">
                        <span style="color: var(--text-secondary);">Don't have an account?</span>
                        <a href="#" onclick="navigateTo('signup'); return false;">Sign up</a>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderSignup(container) {
    container.innerHTML = `
        <div style="height: 100%; display: flex; align-items: center; justify-content: center; background-color: var(--bg-primary);">
            <div class="card" style="width: 100%; max-width: 450px; padding: 2.5rem; border: 1px solid var(--border-color); box-shadow: var(--shadow-lg);">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <h2>Create Account</h2>
                    <p style="color: var(--text-secondary);">Join SyncTeam today.</p>
                </div>
                
                <form onsubmit="handleSignup(event)">
                    <div class="form-group">
                        <label class="form-label">Full Name</label>
                        <input type="text" name="fullname" class="form-control" placeholder="John Doe" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" name="email" class="form-control" placeholder="john@example.com" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Role</label>
                        <select name="role" class="form-control">
                            <option value="Member">Member</option>
                            <option value="Admin">Admin</option>
                            <option value="Client">Client</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" name="password" class="form-control" required minlength="6">
                    </div>
                    
                    <div class="form-group">
                         <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
                            <input type="checkbox" id="terms" class="form-checkbox" required style="margin-top: 4px;">
                            <label for="terms" style="font-size: 0.9rem; cursor: pointer; color: var(--text-secondary);">I agree to the <a href="#">Terms & Conditions</a> and <a href="#">Privacy Policy</a>.</label>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary" style="width: 100%;">Create Account</button>
                    
                    <div style="text-align: center; margin-top: 1.5rem; font-size: 0.9rem;">
                        <span style="color: var(--text-secondary);">Already have an account?</span>
                        <a href="#" onclick="navigateTo('login'); return false;">Login</a>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderForgotPassword(container) {
    container.innerHTML = `
        <div style="height: 100%; display: flex; align-items: center; justify-content: center; background-color: var(--bg-primary);">
            <div class="card" style="width: 100%; max-width: 400px; padding: 2.5rem; border: 1px solid var(--border-color); box-shadow: var(--shadow-lg);">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <h2>Reset Password</h2>
                    <p style="color: var(--text-secondary);">Enter your email to receive instructions.</p>
                </div>
                
                <form onsubmit="handlePasswordReset(event)">
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" class="form-control" placeholder="email@example.com" required>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Send Reset Link</button>
                    
                    <div style="text-align: center; margin-top: 1.5rem; font-size: 0.9rem;">
                        <a href="#" onclick="navigateTo('login'); return false;">Back to Login</a>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// ==========================================================================
// Auth Logic
// ==========================================================================

// Redundant stubs removed (Consolidated in Authentication Handlers section)

function handlePasswordReset(e) {
    e.preventDefault();
    setTimeout(() => {
        showToast('Reset link sent to your email.', 'info');
        setTimeout(() => navigateTo('login'), 2000);
    }, 500);
}

function togglePasswordVisibility(id) {
    const input = document.getElementById(id);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

function handleProfilePicUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'warning');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        appState.currentUser.avatar = e.target.result;

        // Update previews
        const profilePreview = document.getElementById('profile-avatar-preview');
        if (profilePreview) {
            profilePreview.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">`;
        }

        // Update global header avatar
        const headerAvatar = document.querySelector('.user-avatar');
        if (headerAvatar) {
            headerAvatar.innerHTML = `<img src="${e.target.result}" alt="User Avatar">`;
        }

        showToast('Profile picture updated locally', 'success');
    };
    reader.readAsDataURL(file);
}



// ==========================================================================
// Utility Functions
// ==========================================================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Icon based on type
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

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'active': return 'success';
        case 'completed': return 'success'; //Or maybe neutral/info? User said "green (active)" in projects list but gray (completed)
        case 'on hold': return 'warning';
        case 'deleted': return 'error';
        default: return 'neutral';
    }
}

// ==========================================================================
// Authentication Handlers
// ==========================================================================

async function handleLogin(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    const email = event.target.email.value;
    const password = document.getElementById('login-password').value;
    const rememberMe = event.target.remember?.checked;

    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spinning">progress_activity</span> Logging in...';

    // SUPABASE LOGIN
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        showToast(error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Login';
        return;
    }

    // Success
    appState.isLoggedIn = true;
    appState.currentUser = {
        email: data.user.email,
        id: data.user.id,
        // We will fetch profile info later
        name: data.user.user_metadata.full_name || email.split('@')[0],
        role: data.user.user_metadata.role || 'Member',
        avatar: null
    };

    if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
    } else {
        localStorage.removeItem('rememberMe');
    }

    showToast('Login successful!', 'success');
    navigateTo('dashboard');
    btn.disabled = false;
    btn.innerHTML = 'Login';

    // Fetch full profile info
    fetchUserProfile(data.user.id);
}

async function handleSignup(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    const name = form.querySelector('input[type="text"]').value;
    const role = form.querySelector('select').value;
    const password = form.querySelector('input[type="password"]').value;

    if (password.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spinning">progress_activity</span> Creating Account...';

    // SUPABASE SIGNUP
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: name,
                role: role
            }
        }
    });

    if (error) {
        showToast(error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Create Account';
        return;
    }

    showToast('Sign up successful! Please check your email for verification link.', 'success');

    // In a real email flow, we wait for verification.
    // For now, we can show a message to check email.
    form.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <span class="material-symbols-outlined" style="font-size: 48px; color: var(--accent-green); margin-bottom: 1rem;">mark_email_read</span>
            <h3>Check your email</h3>
            <p>We sent a confirmation link to <strong>${sanitizeHTML(email)}</strong>.</p>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 1rem;">Click the link to confirm your account and login.</p>
            <button class="btn btn-ghost mt-2" onclick="navigateTo('login')">Back to Login</button>
        </div>
    `;
}

// function renderSignupVerification ... REMOVED (Supabase handles this via link)
// function handleVerifySignup ... REMOVED

async function handleForgotPassword(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    const email = event.target.querySelector('input[type="email"]').value;

    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spinning">progress_activity</span> Sending...';

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '?reset=true',
    });

    if (error) {
        showToast(error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Send Reset Link';
        return;
    }

    showToast('Password reset link sent to your email!', 'success');

    setTimeout(() => {
        navigateTo('login');
        btn.disabled = false;
        btn.innerHTML = 'Send Reset Link';
    }, 2000);
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

// ==========================================================================
// Pagination & Sorting Helpers
// ==========================================================================

function paginateData(data, page, perPage) {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return data.slice(startIndex, endIndex);
}

function getTotalPages(totalItems, perPage) {
    return Math.ceil(totalItems / perPage);
}

function sortData(data, sortBy, sortOrder = 'asc') {
    if (!sortBy) return data;

    return [...data].sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];

        // Handle different data types
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }

        if (typeof aVal === 'number') {
            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // String comparison
        if (sortOrder === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
    });
}

function renderPaginationControls(totalItems, currentPage, perPage, entityType) {
    const totalPages = getTotalPages(totalItems, perPage);

    if (totalPages <= 1) return ''; // No pagination needed

    let html = '<div class="pagination-controls">';

    // Per page selector
    html += `
        <div class="pagination-per-page">
            <label>Show:</label>
            <select onchange="changePerPage('${entityType}', this.value)" class="form-control" style="width: auto; display: inline-block; padding: 0.5rem;">
                <option value="10" ${perPage === 10 ? 'selected' : ''}>10</option>
                <option value="25" ${perPage === 25 ? 'selected' : ''}>25</option>
                <option value="50" ${perPage === 50 ? 'selected' : ''}>50</option>
            </select>
        </div>
    `;

    // Page info
    const startItem = (currentPage - 1) * perPage + 1;
    const endItem = Math.min(currentPage * perPage, totalItems);
    html += `<div class="pagination-info">Showing ${startItem}-${endItem} of ${totalItems}</div>`;

    // Page buttons
    html += '<div class="pagination-buttons">';

    // Previous button
    html += `
        <button class="btn btn-ghost" onclick="changePage('${entityType}', ${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''}>
            <span class="material-symbols-outlined">chevron_left</span>
        </button>
    `;

    // Page numbers (show max 5 pages)
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button class="btn ${i === currentPage ? 'btn-primary' : 'btn-ghost'}" 
                    onclick="changePage('${entityType}', ${i})">
                ${i}
            </button>
        `;
    }

    // Next button
    html += `
        <button class="btn btn-ghost" onclick="changePage('${entityType}', ${currentPage + 1})" 
                ${currentPage === totalPages ? 'disabled' : ''}>
            <span class="material-symbols-outlined">chevron_right</span>
        </button>
    `;

    html += '</div></div>';

    return html;
}

function changePage(entityType, newPage) {
    appState.pagination[entityType].currentPage = newPage;
    // Trigger re-render based on entity type
    switch (entityType) {
        case 'tasks':
            filterTasks('all');
            break;
        case 'projects':
            filterProjects();
            break;
        case 'team':
            renderTeamTable();
            break;
        case 'clients':
            renderClientsTable();
            break;
    }
}

function changePerPage(entityType, newPerPage) {
    appState.pagination[entityType].perPage = parseInt(newPerPage);
    appState.pagination[entityType].currentPage = 1; // Reset to page 1
    changePage(entityType, 1);
}

function sortTable(entityType, column) {
    const pag = appState.pagination[entityType];

    // Toggle sort order if same column
    if (pag.sortBy === column) {
        pag.sortOrder = pag.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        pag.sortBy = column;
        pag.sortOrder = 'asc';
    }

    // Trigger re-render
    changePage(entityType, pag.currentPage);
}

function toggleSelectAll(entityType, isChecked) {
    const pag = appState.pagination[entityType];
    const data = getFilteredData(entityType); // We need a way to get the currently filtered data

    if (isChecked) {
        // Select all items currently in the filtered view (or just all?)
        // Let's do all currently filtered items
        appState.selection[entityType] = data.map(item => item.id);
    } else {
        appState.selection[entityType] = [];
    }

    // Refresh the table view and bulk bar
    refreshTableView(entityType);
    updateBulkActionsBar(entityType);
}

function toggleSelectItem(entityType, id, isChecked) {
    const selection = appState.selection[entityType];
    if (isChecked) {
        if (!selection.includes(id)) selection.push(id);
    } else {
        const index = selection.indexOf(id);
        if (index > -1) selection.splice(index, 1);
    }

    updateBulkActionsBar(entityType);

    // If all items are selected or unselected, update the master checkbox
    const masterCheckbox = document.getElementById(`master-checkbox-${entityType}`);
    if (masterCheckbox) {
        const data = getFilteredData(entityType);
        masterCheckbox.checked = data.length > 0 && data.every(item => selection.includes(item.id));
    }
}

// ==========================================================================
// Settings View & Logic
// ==========================================================================

function renderSettings(container) {
    container.innerHTML = `
        <div class="mb-2">
            <h1>Settings</h1>
            <p style="color: var(--text-secondary);">Manage your profile, team, and application preferences.</p>
        </div>

        <!-- Settings Navigation Tabs -->
        <div class="settings-tabs mb-2" style="display: flex; gap: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
            <button class="btn btn-ghost active" onclick="switchSettingsTab('profile')">Profile</button>
            <button class="btn btn-ghost" onclick="switchSettingsTab('notifications')">Notifications</button>
            <button class="btn btn-ghost" onclick="switchSettingsTab('security')">Security</button>
            <button class="btn btn-ghost" onclick="switchSettingsTab('preferences')">Preferences</button>
            <button class="btn btn-ghost" onclick="switchSettingsTab('company')">Company</button>
        </div>

        <div id="settings-tab-content">
            <!-- Profile Tab (Default) -->
            <div id="tab-profile" class="settings-tab active">
                <div class="grid-4" style="grid-template-columns: 1.5fr 1fr; gap: 2rem; align-items: start;">
                    <!-- User Info Card -->
                    <div class="card">
                        <h2 style="font-size: 1.25rem; margin-bottom: 1.5rem;">Profile Information</h2>
                        <div class="flex-center mb-2" style="flex-direction: column;">
                             <div id="profile-avatar-preview" style="width: 100px; height: 100px; border-radius: 50%; background: var(--bg-tertiary); margin-bottom: 1rem; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                                ${appState.currentUser.avatar ? `<img src="${appState.currentUser.avatar}" style="width: 100%; height: 100%; object-fit: cover;">` : `<span style="font-size: 2rem; font-weight: 700;">${getInitials(appState.currentUser.name)}</span>`}
                            </div>
                            <label class="btn btn-secondary" id="change-photo-btn">
                                Change Photo
                                <input type="file" accept="image/*" style="display: none;" onchange="handleProfilePicUpload(event)">
                            </label>
                        </div>

                        <form id="profile-form" onsubmit="handleUpdateProfile(event)">
                            <div class="form-group">
                                <label class="form-label">Full Name</label>
                                <input type="text" name="name" class="form-control" value="${sanitizeHTML(appState.currentUser.name)}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email Address</label>
                                <input type="email" name="email" class="form-control" value="${appState.currentUser.email}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Bio (Short Description)</label>
                                <textarea name="bio" class="form-control" rows="3">${appState.currentUser.bio || ''}</textarea>
                            </div>
                            <div style="margin-top: 2rem;">
                                <button type="submit" class="btn btn-primary">Update Profile</button>
                            </div>
                        </form>
                    </div>

                    <!-- Role Card -->
                    <div class="card">
                        <h2 style="font-size: 1.25rem; margin-bottom: 1.5rem;">Account Status</h2>
                        <div class="form-group">
                            <label class="form-label">Workspace Role</label>
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: var(--bg-tertiary); border-radius: 8px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span class="material-symbols-outlined" style="color: var(--accent-blue);">verified_user</span>
                                    <span style="font-weight: 600;">${appState.currentUser.role}</span>
                                </div>
                                <select class="form-control" style="width: auto; height: 32px; padding: 0 8px; font-size: 0.8rem;" onchange="updateUserRole(this.value)">
                                    ${Object.keys(appState.roles).map(role => `<option value="${role}" ${appState.currentUser.role === role ? 'selected' : ''}>${role}</option>`).join('')}
                                </select>
                            </div>
                            <span style="font-size: 0.8rem; color: var(--text-tertiary); display: block; margin-top: 8px;">Role simulation: Changes your access level across the app.</span>
                        </div>
                    <div style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
                        <h3 style="font-size: 1rem; color: var(--status-error);">Danger Zone</h3>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">Once you delete your account, all your data will be permanently removed.</p>
                        <button class="btn btn-danger" style="width: 100%;" onclick="handleDeleteAccount()">Delete Account</button>
                    </div>
                    </div>
                </div>
            </div>

            <!-- Notifications Tab -->
            <div id="tab-notifications" class="settings-tab" style="display: none;">
                <div class="card" style="max-width: 600px;">
                    <h2 style="font-size: 1.25rem; margin-bottom: 1.5rem;">Notification Preferences</h2>
                    <form onsubmit="handleUpdateNotifications(event)">
                        <div class="flex-between p-2 mb-1" style="background: var(--bg-tertiary); border-radius: 8px;">
                            <div>
                                <span style="font-weight: 600; display: block;">Email Alerts</span>
                                <span style="font-size: 0.85rem; color: var(--text-secondary);">Receive daily digests and priority updates via email.</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" name="email_alerts" ${appState.currentUser.notificationPrefs?.email ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                        <div class="flex-between p-2 mb-1" style="background: var(--bg-tertiary); border-radius: 8px;">
                            <div>
                                <span style="font-weight: 600; display: block;">Push Notifications</span>
                                <span style="font-size: 0.85rem; color: var(--text-secondary);">Show desktop alerts when you are mentioned or assigned a task.</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" name="push_notifs" ${appState.currentUser.notificationPrefs?.desktop ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                        <div class="flex-between p-2 mb-2" style="background: var(--bg-tertiary); border-radius: 8px;">
                            <div>
                                <span style="font-weight: 600; display: block;">Activity Feed Log</span>
                                <span style="font-size: 0.85rem; color: var(--text-secondary);">Record your actions in the shared Activity Feed.</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" name="log_activity" ${appState.currentUser.notificationPrefs?.activity ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                        <button type="submit" class="btn btn-primary">Save Preferences</button>
                    </form>
                </div>
            </div>

            <!-- Security Tab -->
            <div id="tab-security" class="settings-tab" style="display: none;">
                <div class="card" style="max-width: 600px;">
                    <h2 style="font-size: 1.25rem; margin-bottom: 1.5rem;">Password & Security</h2>
                    <form onsubmit="handleUpdateSecurity(event)">
                        <div class="form-group">
                            <label class="form-label">Current Password</label>
                            <input type="password" name="current_pwd" class="form-control" placeholder="••••••••">
                        </div>
                        <div class="form-group">
                            <label class="form-label">New Password</label>
                            <input type="password" name="new_pwd" class="form-control" placeholder="••••••••">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Confirm New Password</label>
                            <input type="password" name="confirm_pwd" class="form-control" placeholder="••••••••">
                        </div>
                        <div style="margin-top: 2rem;">
                            <button type="submit" class="btn btn-primary">Update Password</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Preferences Tab -->
            <div id="tab-preferences" class="settings-tab" style="display: none;">
                <div class="card" style="max-width: 600px;">
                    <h2 style="font-size: 1.25rem; margin-bottom: 1.5rem;">Localization & UI</h2>
                    <form onsubmit="handleUpdatePreferences(event)">
                        <div class="form-group">
                            <label class="form-label">Preferred Language</label>
                            <select name="language" class="form-control">
                                <option value="English" ${appState.currentUser.language === 'English' ? 'selected' : ''}>English (US)</option>
                                <option value="Spanish" ${appState.currentUser.language === 'Spanish' ? 'selected' : ''}>Spanish</option>
                                <option value="French" ${appState.currentUser.language === 'French' ? 'selected' : ''}>French</option>
                                <option value="German" ${appState.currentUser.language === 'German' ? 'selected' : ''}>German</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Timezone</label>
                            <select name="timezone" class="form-control">
                                <option value="UTC-8" ${appState.currentUser.timezone === 'UTC-8' ? 'selected' : ''}>PST (UTC-8)</option>
                                <option value="UTC-5" ${appState.currentUser.timezone === 'UTC-5' ? 'selected' : ''}>EST (UTC-5)</option>
                                <option value="UTC+0" ${appState.currentUser.timezone === 'UTC+0' ? 'selected' : ''}>GMT (UTC+0)</option>
                                <option value="UTC+1" ${appState.currentUser.timezone === 'UTC+1' ? 'selected' : ''}>CET (UTC+1)</option>
                            </select>
                        </div>
                        
                        <div class="flex-between p-2 mt-2" style="background: var(--bg-tertiary); border-radius: 8px;">
                            <div>
                                <span style="font-weight: 600; display: block;">Dark Mode Appearance</span>
                                <span style="font-size: 0.85rem; color: var(--text-secondary);">Toggle between light and dark themes.</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" onchange="toggleTheme()" ${appState.theme === 'dark' ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                        
                        <div style="margin-top: 2rem;">
                            <button type="submit" class="btn btn-primary">Save Localization Settings</button>
                        </div>
                    </form>
                </div>
            </div>

// End of renderSettings function
}

async function handleProfilePicUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        showToast('File size must be less than 2MB', 'error');
        return;
    }

    const btn = document.getElementById('change-photo-btn');
    if (btn) {
        btn.classList.add('btn-disabled');
        btn.innerText = 'Uploading...';
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${ appState.currentUser.id } -${ Date.now() }.${ fileExt } `;
    const filePath = `avatars / ${ fileName } `;

    try {
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // Update local state temporarily
        appState.currentUser.avatar = publicUrl;
        
        // Update DB
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', appState.currentUser.id);

        if (updateError) throw updateError;
        
        showToast('Avatar updated successfully', 'success');
        
        // Update UI
        const preview = document.getElementById('profile-avatar-preview');
        if (preview) {
             preview.innerHTML = `< img src = "${publicUrl}" style = "width: 100%; height: 100%; object-fit: cover;" > `;
        }
        document.querySelector('.header-avatar').innerHTML = `< img src = "${publicUrl}" style = "object-fit: cover; width: 100%; height: 100%;" > `;
        
    } catch (error) {
        console.error('Error uploading avatar:', error);
        showToast('Error uploading avatar: ' + error.message, 'error');
    } finally {
        if (btn) {
            btn.classList.remove('btn-disabled');
            btn.innerHTML = `Change Photo < input type = "file" accept = "image/*" style = "display: none;" onchange = "handleProfilePicUpload(event)" > `;
        }
    }
}

async function handleUpdateProfile(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    const { error } = await supabase
        .from('profiles')
        .update({
            full_name: data.name,
            bio: data.bio
        })
        .eq('id', appState.currentUser.id);

    if (error) {
        showToast('Error updating profile: ' + error.message, 'error');
        return;
    }

    appState.currentUser.name = data.name;
    // appState.currentUser.email = data.email; // Email updates require Auth API calls typically
    appState.currentUser.bio = data.bio;

    // Update UI displays
    const nameDisplay = document.getElementById('user-name-display');
    if (nameDisplay) nameDisplay.innerText = data.name;

    showToast('Profile updated successfully', 'success');
}


function updateUserRole(newRole) {
    appState.currentUser.role = newRole;
    saveStateToStorage();
    showToast(`Role switched to ${newRole}`, 'success');

    // Log the change
    logActivity('switched', 'role', newRole);

    // Refresh Sidebar to update view-specific UI immediately
    // Since navigateTo('settings') is already active, we just re-render settings to show the updated dropdown
    // and refresh main global views.
    renderSettings(document.getElementById('main-content-area'));

    // Update sidebar navigation indicators (some tabs might have restricted counts later)
    initSidebar();
}



function handleUpdateNotifications(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    appState.currentUser.notificationPrefs = {
        email: formData.has('email_alerts'),
        desktop: formData.has('push_notifs'),
        activity: formData.has('log_activity')
    };

    showToast('Notification preferences saved', 'success');
    saveStateToStorage();
}

function handleUpdateSecurity(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    if (data.new_pwd && data.new_pwd !== data.confirm_pwd) {
        showToast('New passwords do not match', 'error');
        return;
    }

    if (!data.current_pwd) {
        showToast('Please enter your current password', 'warning');
        return;
    }

    // Mock success
    showToast('Password updated successfully (Mock)', 'success');
    logActivity('updated', 'security settings', 'Password');
    event.target.reset();
}

function handleUpdatePreferences(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    appState.currentUser.language = data.language;
    appState.currentUser.timezone = data.timezone;

    showToast('Localization preferences saved', 'success');
    saveStateToStorage();
}

function switchSettingsTab(tabId) {
    // Update Tab Buttons
    document.querySelectorAll('.settings-tabs .btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase().includes(tabId)) btn.classList.add('active');
    });

    // Update Tab Content
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });

    const activeTab = document.getElementById(`tab-${tabId}`);
    if (activeTab) {
        activeTab.style.display = 'block';
        activeTab.classList.add('active');
    }
}

function handleExportData(format) {
    if (!checkPermission('export:data')) {
        showToast('You do not have permission to export data.', 'error');
        return;
    }
    showToast(`Preparing ${format.toUpperCase()} export...`, 'info');

    // Simulate data preparation
    setTimeout(() => {
        const data = {
            user: appState.currentUser,
            projects: appState.projects,
            tasks: appState.tasks,
            activities: appState.activities,
            exportDate: new Date().toISOString()
        };

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `syncteam-export-${new Date().getTime()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            // Very simple CSV for the whole dump (not ideal, but works for demonstration)
            const csvContent = "data:text/csv;charset=utf-8,"
                + "Entity,ID,Name/Title,Status,Timestamp\n"
                + appState.projects.map(p => `Project,${p.id},"${p.name}",${p.status},${p.startDate}`).join("\n") + "\n"
                + appState.tasks.map(t => `Task,${t.id},"${t.title}",${t.status},${t.dueDate}`).join("\n");

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `syncteam-export-${new Date().getTime()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        showToast('Export successful', 'success');
        logActivity('exported', 'workspace data', format.toUpperCase());
    }, 1500);
}

// ==========================================================================
// Project Details View
// ==========================================================================

function renderProjectDetails(container, projectId) {
    const project = appState.projects.find(p => p.id === parseInt(projectId));
    if (!project) {
        container.innerHTML = `<div class="p-2"><h1>Project Not Found</h1><button class="btn btn-primary" onclick="navigateTo('projects')">Back to Projects</button></div>`;
        return;
    }

    const projectTasks = appState.tasks.filter(t => t.projectId === project.id);
    const progress = getProjectProgress(project.id);

    // Phase 9: Milestones logic
    if (!project.milestones) {
        project.milestones = [
            { id: 1, title: 'Project Kickoff', dueDate: project.startDate, reached: true },
            { id: 2, title: 'Concept Approval', dueDate: '2023-11-01', reached: progress > 30 },
            { id: 3, title: 'Final Delivery', dueDate: project.deadline, reached: progress === 100 }
        ];
    }

    container.innerHTML = `
        <div id="project-details-breadcrumbs"></div>
        <div class="flex-between mb-2">
            <h1>${sanitizeHTML(project.name)}</h1>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-ghost" onclick="openEditProjectModal(${project.id})">
                    <span class="material-symbols-outlined">edit</span> Edit
                </button>
                <button class="btn btn-primary" onclick="openCreateTaskModal(${project.id})">
                    <span class="material-symbols-outlined">add</span> Add Task
                </button>
            </div>
        </div>

        <div class="grid-4" style="grid-template-columns: 1fr 2.5fr; gap: 1.5rem;">
            <!-- Sidebar: Details & Milestones -->
            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                <div class="card">
                    <h2 style="font-size: 1.1rem; margin-bottom: 1.5rem;">Details</h2>
                    <div class="form-group">
                        <label class="form-label">Client</label>
                        <div style="font-weight: 500;">${sanitizeHTML(project.client)}</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <span class="badge ${getStatusColor(project.status)}">${project.status}</span>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Timeline</label>
                        <div style="font-size: 0.9rem; color: var(--text-secondary);">${project.startDate} to ${project.deadline}</div>
                    </div>
                    
                    <div style="margin-top: 1rem;">
                        <label class="form-label">Overall Progress</label>
                        <div class="progress-bar-container" style="margin-bottom: 8px;">
                            <div class="progress-bar-fill" style="width: ${progress}%"></div>
                        </div>
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">${progress}% Complete</span>
                    </div>
                </div>

                <div class="card">
                    <h2 style="font-size: 1.1rem; margin-bottom: 1rem;">Milestones</h2>
                    ${project.milestones.map(m => `
                        <div class="milestone-card ${m.reached ? 'milestone-reached' : ''}">
                            <span class="material-symbols-outlined" style="color: ${m.reached ? 'var(--accent-green)' : 'var(--text-tertiary)'};">
                                ${m.reached ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                             <div style="flex: 1;">
                                <div style="font-size: 0.9rem; font-weight: 500; color: ${m.reached ? 'var(--text-primary)' : 'var(--text-secondary)'};">${sanitizeHTML(m.title)}</div>
                                <div style="font-size: 0.75rem; color: var(--text-tertiary);">${m.dueDate}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- MainContent -->
            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                <!-- Gantt Chart Mock -->
                <div class="card">
                    <h2 style="font-size: 1.1rem; margin-bottom: 1rem;">Project Timeline (Gantt)</h2>
                    <div class="gantt-chart">
                        <div class="gantt-timeline-labels">
                            <div style="height: 40px;"></div>
                            ${projectTasks.map(t => `<div class="gantt-task-label">${sanitizeHTML(t.title)}</div>`).join('')}
                        </div>
                        <div style="overflow-x: auto;">
                            <div class="gantt-timeline">
                                ${Array.from({ length: 14 }).map((_, i) => `<div class="gantt-day">Day ${i + 1}</div>`).join('')}
                            </div>
                            <div class="gantt-bars">
                                ${projectTasks.map((t, idx) => `
                                    <div class="gantt-bar-container">
                                        <div class="gantt-bar-fill" style="width: ${30 + (Math.random() * 40)}%; left: ${idx * 10}%">
                                            ${t.status}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h2 style="font-size: 1.1rem; margin-bottom: 1.5rem;">Project Tasks</h2>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Task Name</th>
                                    <th>Assignee</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th class="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${projectTasks.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding: 2rem;">No tasks for this project yet.</td></tr>' :
            projectTasks.map(t => `
                                         <tr>
                                            <td style="font-weight: 500; color: var(--text-primary);">${sanitizeHTML(t.title)}</td>
                                            <td>${sanitizeHTML(t.assignee)}</td>
                                            <td><span class="badge badge-${t.priority.toLowerCase() === 'high' ? 'error' : t.priority.toLowerCase() === 'medium' ? 'warning' : 'success'}">${t.priority}</span></td>
                                            <td><span class="badge ${t.status === 'Completed' ? 'badge-success' : 'badge-warning'}">${t.status}</span></td>
                                            <td class="text-right">
                                                <button class="btn btn-ghost" style="padding: 4px;" onclick="openEditTaskModal(${t.id})">
                                                    <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')
        }
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Comments -->
                <div class="card">
                    <div id="project-comments-${project.id}"></div>
                </div>
            </div>
        </div>
    `;

    // Render breadcrumbs
    renderBreadcrumbs(document.getElementById('project-details-breadcrumbs'), [
        { label: 'Projects', page: 'projects' },
        { label: project.name, page: 'project-details', param: project.id }
    ]);

    // Render comments
    renderComments('project', project.id);
}


// ==========================================================================
// Search Results View
// ==========================================================================

function renderSearchResults(container, query) {
    if (!query) return;
    const q = query.toLowerCase();

    const matchedProjects = appState.projects.filter(p => p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q));
    const matchedTasks = appState.tasks.filter(t => t.title.toLowerCase().includes(q));

    container.innerHTML = `
        <div class="mb-2">
            <h1>Search Results</h1>
            <p style="color: var(--text-secondary);">Showing results for "${sanitizeHTML(query)}"</p>
        </div>

        ${matchedProjects.length > 0 ? `
            <div class="card mb-2">
                <h2 style="font-size: 1.1rem; margin-bottom: 1rem;">Projects</h2>
                <div class="table-container">
                    <table>
                        ${matchedProjects.map(p => `
                            <tr style="cursor: pointer;" onclick="navigateTo('project-details', ${p.id})">
                                <td style="font-weight: 500; color: var(--text-primary);">${sanitizeHTML(p.name)}</td>
                                <td style="color: var(--text-secondary);">${sanitizeHTML(p.client)}</td>
                                <td class="text-right"><span class="badge ${getStatusColor(p.status)}">${p.status}</span></td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            </div>
        ` : ''}

        ${matchedTasks.length > 0 ? `
            <div class="card">
                <h2 style="font-size: 1.1rem; margin-bottom: 1rem;">Tasks</h2>
                <div class="table-container">
                    <table>
                        ${matchedTasks.map(t => `
                            <tr style="cursor: pointer;" onclick="openEditTaskModal(${t.id})">
                                <td style="font-weight: 500; color: var(--text-primary);">${sanitizeHTML(t.title)}</td>
                                <td><span class="badge ${t.status === 'Completed' ? 'badge-success' : 'badge-warning'}">${t.status}</span></td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            </div>
        ` : ''}

        ${matchedProjects.length === 0 && matchedTasks.length === 0 ? `
            <div class="text-center p-2">
                <span class="material-symbols-outlined" style="font-size: 48px; color: var(--text-tertiary); margin-bottom: 1rem;">search_off</span>
                <p>No results found for "${sanitizeHTML(query)}"</p>
            </div>
        ` : ''}
    `;
}

function toggleSelectItem(entityType, id, isChecked) {
    const selection = appState.selection[entityType];
    if (isChecked) {
        if (!selection.includes(id)) selection.push(id);
    } else {
        const index = selection.indexOf(id);
        if (index > -1) selection.splice(index, 1);
    }

    updateBulkActionsBar(entityType);

    // If all items are selected or unselected, update the master checkbox
    const masterCheckbox = document.getElementById(`master-checkbox-${entityType}`);
    if (masterCheckbox) {
        const data = getFilteredData(entityType);
        masterCheckbox.checked = data.length > 0 && data.every(item => selection.includes(item.id));
    }
}

function getFilteredData(entityType) {
    // This is a helper to get the data that would be rendered based on current filters
    // (but before pagination)
    switch (entityType) {
        case 'tasks':
            const status = document.querySelector('.filter-btn.active')?.dataset.status || 'all';
            return appState.tasks.filter(t => status === 'all' || t.status.toLowerCase() === status.toLowerCase());
        case 'projects':
            const q = document.getElementById('project-search')?.value.toLowerCase() || '';
            const s = document.getElementById('project-filter-status')?.value || 'All';
            return appState.projects.filter(p => {
                const matchesSearch = p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q);
                const matchesStatus = s === 'All' || p.status === s;
                return matchesSearch && matchesStatus;
            });
        case 'team':
            return [...appState.team];
        case 'clients':
            return [...appState.clients];
        default:
            return [];
    }
}

function refreshTableView(entityType) {
    switch (entityType) {
        case 'tasks':
            const activeStatus = document.querySelector('.filter-btn.active')?.dataset.status || 'all';
            filterTasks(activeStatus);
            break;
        case 'projects':
            filterProjects();
            break;
        case 'team':
            renderTeamTable();
            break;
        case 'clients':
            renderClientsTable();
            break;
    }
}

function updateBulkActionsBar(entityType) {
    const selectedCount = appState.selection[entityType].length;
    const bar = document.getElementById('bulk-actions-bar');
    if (!bar) return;

    if (selectedCount > 0) {
        bar.classList.add('active');
        bar.innerHTML = `
            <div class="bulk-selection-count">${selectedCount} items selected</div>
            <div class="bulk-actions-buttons">
                ${getBulkActions(entityType)}
                <button class="btn btn-ghost" onclick="clearSelection('${entityType}')">Cancel</button>
            </div>
        `;
    } else {
        bar.classList.remove('active');
    }
}

function getBulkActions(entityType) {
    switch (entityType) {
        case 'tasks':
            return `
                <button class="btn btn-ghost" onclick="handleBulkAction('tasks', 'complete')">
                    <span class="material-symbols-outlined">check_circle</span> Mark Completed
                </button>
                <button class="btn btn-ghost" style="color: var(--status-error);" onclick="handleBulkAction('tasks', 'delete')">
                    <span class="material-symbols-outlined">delete</span> Delete
                </button>
            `;
        case 'projects':
            return `
                <button class="btn btn-ghost" onclick="handleBulkAction('projects', 'status-active')">Set Active</button>
                <button class="btn btn-ghost" style="color: var(--status-error);" onclick="handleBulkAction('projects', 'delete')">Delete</button>
            `;
        case 'team':
        case 'clients':
            return `
                <button class="btn btn-ghost" style="color: var(--status-error);" onclick="handleBulkAction('${entityType}', 'delete')">Remove Selected</button>
            `;
        default:
            return '';
    }
}

function clearSelection(entityType) {
    appState.selection[entityType] = [];
    refreshTableView(entityType);
    updateBulkActionsBar(entityType);
}

function handleBulkAction(entityType, action) {
    const selectedIds = appState.selection[entityType];
    if (selectedIds.length === 0) return;

    if (confirm(`Are you sure you want to perform "${action}" on ${selectedIds.length} items ? `)) {
        switch (entityType) {
            case 'tasks':
                if (action === 'delete') {
                    appState.tasks = appState.tasks.filter(t => !selectedIds.includes(t.id));
                } else if (action === 'complete') {
                    appState.tasks.forEach(t => {
                        if (selectedIds.includes(t.id)) t.status = 'Completed';
                    });
                }
                break;
            case 'projects':
                if (action === 'delete') {
                    appState.projects = appState.projects.filter(p => !selectedIds.includes(p.id));
                } else if (action === 'status-active') {
                    appState.projects.forEach(p => {
                        if (selectedIds.includes(p.id)) p.status = 'Active';
                    });
                }
                break;
            case 'team':
                appState.team = appState.team.filter(m => !selectedIds.includes(m.id));
                break;
            case 'clients':
                appState.clients = appState.clients.filter(c => !selectedIds.includes(c.id));
                break;
        }

        showToast(`Bulk action "${action}" completed`, 'success');
        clearSelection(entityType);
    }
}

// Save state to localStorage (Filtered to remove sensitive data)
function saveStateToStorage() {
    localStorage.setItem('projects', JSON.stringify(appState.projects));
    localStorage.setItem('tasks', JSON.stringify(appState.tasks));
    localStorage.setItem('team', JSON.stringify(appState.team));
    localStorage.setItem('clients', JSON.stringify(appState.clients));

    // Remove sensitive fields from current user before saving
    const userToSave = { ...appState.currentUser };
    delete userToSave.password; // Double check

    localStorage.setItem('currentUser', JSON.stringify(userToSave));
    localStorage.setItem('comments', JSON.stringify(appState.comments));
    localStorage.setItem('activities', JSON.stringify(appState.activities));
    localStorage.setItem('notifications', JSON.stringify(appState.notifications));
}


// Load state from localStorage


async function fetchInitialData() {
    // We only fetch if logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
        // 1. Fetch Projects
        const { data: projects, error: projError } = await supabase.from('projects').select('*');
        if (projError) throw projError;
        appState.projects = projects || [];

        // 2. Fetch Tasks
        const { data: tasks, error: taskError } = await supabase.from('tasks').select('*');
        if (taskError) throw taskError;
        appState.tasks = tasks || [];

        // 3. Fetch Clients
        const { data: clients, error: clientError } = await supabase.from('clients').select('*');
        if (clientError) throw clientError;
        appState.clients = clients || [];

        // 4. Fetch Team (Profiles)
        const { data: team, error: teamError } = await supabase.from('profiles').select('*');
        if (teamError) throw teamError;
        // Map database columns to app property names if needed (e.g. full_name -> name)
        appState.team = team ? team.map(u => ({
            id: u.id,
            name: u.full_name || u.email,
            email: u.email,
            role: u.role,
            avatar: u.avatar_url,
            bio: u.bio
        })) : [];

        // 5. Fetch Subtasks (optional: can fetch lazy, but let's grab them all for now)
        const { data: subtasks, error: subError } = await supabase.from('subtasks').select('*');
        if (!subError && subtasks) {
            // Merge subtasks into tasks structure
            appState.tasks.forEach(t => {
                t.subtasks = subtasks.filter(s => s.task_id === t.id);
            });
        }

    } catch (err) {
        console.error('Error fetching initial data:', err);
        showToast('Error loading workspace data', 'error');
    }
}

// Call on init - replaced by checkSession calling this explicitly
// loadStateFromStorage();

// Global Activity Logger
function logActivity(action, entityType, entityName, entityId = null) {
    const activity = {
        id: Date.now(),
        userId: appState.currentUser.email, // Using email as a simple unique ID
        userName: appState.currentUser.name,
        action: action, // e.g., 'created', 'updated', 'deleted'
        entityType: entityType, // e.g., 'task', 'project'
        entityName: entityName,
        entityId: entityId,
        timestamp: new Date().toISOString()
    };

    appState.activities.unshift(activity);

    // Add to notifications as well
    const notification = {
        id: Date.now() + 1,
        type: 'activity',
        message: `${appState.currentUser.name} ${action} ${entityType}: ${entityName}`,
        read: false,
        timestamp: new Date().toISOString()
    };
    appState.notifications.unshift(notification);

    // Limit to last 50
    if (appState.activities.length > 50) appState.activities.pop();
    if (appState.notifications.length > 50) appState.notifications.pop();

    saveStateToStorage();
    updateNotificationBadge();
}

function updateNotificationBadge() {
    const unreadCount = appState.notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notification-badge');
    if (badge) {
        if (unreadCount > 0) {
            badge.innerText = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// ==========================================================================
// Comments System
// ==========================================================================

function renderComments(entityType, entityId) {
    const containerId = entityType === 'task' ? `task-comments-${entityId}` : `project-comments-${entityId}`;
    const container = document.getElementById(containerId);
    if (!container) return; // specific container

    // Ensure comments array exists
    if (!appState.comments) appState.comments = [];

    const comments = appState.comments.filter(c => c.entityType === entityType && c.entityId == entityId) // loose equality for string/int IDs
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    container.innerHTML = `
        <div class="comments-section">
            <h3 style="font-size: 1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;">
                <span class="material-symbols-outlined">chat</span> Discussion (${comments.length})
            </h3>
            
            <div class="comment-thread">
                ${comments.length === 0 ? '<p style="color: var(--text-tertiary); font-style: italic;">No comments yet. Start a discussion.</p>' :
            comments.map(c => `
                        <div class="comment-item">
                            <div class="comment-avatar">
                                ${c.userAvatar ? `<img src="${c.userAvatar}" alt="${sanitizeHTML(c.userName)}">` : getInitials(c.userName)}
                            </div>
                            <div class="comment-bubble">
                                <div class="comment-header">
                                    <span class="comment-author">${sanitizeHTML(c.userName)}</span>
                                    <span class="comment-time">${new Date(c.timestamp).toLocaleString()}</span>
                                </div>
                                <div class="comment-text">${sanitizeHTML(c.text)}</div>
                            </div>
                        </div>
                    `).join('')}
            </div>

            <form onsubmit="handleAddComment(event, '${entityType}', ${entityId})" id="comment-form-${entityType}-${entityId}" style="position: relative;">
                <div style="display: flex; gap: 10px;">
                    <div class="comment-avatar" style="width: 32px; height: 32px;">
                        ${appState.currentUser.avatar ? `<img src="${appState.currentUser.avatar}">` : getInitials(appState.currentUser.name)}
                    </div>
                    <div style="flex: 1;">
                        <textarea id="comment-textarea-${entityType}-${entityId}" name="comment" class="form-control" rows="2" placeholder="Write a comment... (use @ to mention team)" required></textarea>
                        <div id="mention-list-comment-textarea-${entityType}-${entityId}" class="mention-suggestions-list" style="display: none; position: absolute; z-index: 1001; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: var(--shadow-lg); width: 200px; max-height: 150px; overflow-y: auto;"></div>
                        <div style="text-align: right; margin-top: 8px;">
                            <button type="submit" class="btn btn-primary btn-sm">Post Comment</button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    `;

    // Initialize mentions
    setTimeout(() => {
        initMentions(`comment-textarea-${entityType}-${entityId}`, `mention-list-comment-textarea-${entityType}-${entityId}`);
    }, 0);
}

function handleAddComment(event, entityType, entityId) {
    event.preventDefault();
    const textarea = event.target.querySelector('textarea');
    const text = textarea.value.trim();
    if (!text) return;

    const newComment = {
        id: Date.now(),
        entityType,
        entityId: parseInt(entityId) || entityId, // Ensure type consistency if needed, but safe to store as is
        text,
        userId: appState.currentUser.email,
        userName: appState.currentUser.name,
        userAvatar: appState.currentUser.avatar,
        timestamp: new Date().toISOString()
    };

    if (!appState.comments) appState.comments = [];
    appState.comments.unshift(newComment);

    // Log activity
    let entityName = entityType; // fallback
    if (entityType === 'task') {
        const t = appState.tasks.find(x => x.id == entityId);
        if (t) entityName = t.title;
    } else if (entityType === 'project') {
        const p = appState.projects.find(x => x.id == entityId);
        if (p) entityName = p.name;
    }

    logActivity('commented on', entityType, entityName, entityId);
    saveStateToStorage();

    // Refresh comments view
    renderComments(entityType, entityId);
    event.target.reset(); // clear form
}

// ==========================================================================
// Notification Logic
// ==========================================================================

function toggleNotificationDropdown() {
    const dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;

    const isActive = dropdown.classList.contains('active');

    // Close all other dropdowns if any (not implemented yet but good practice)
    document.querySelectorAll('.dropdown-menu').forEach(d => d.classList.remove('active'));

    if (!isActive) {
        dropdown.classList.add('active');
        renderNotificationDropdown();
    } else {
        dropdown.classList.remove('active');
    }
}

function renderNotificationDropdown() {
    const list = document.getElementById('notification-list');
    if (!list) return;

    // Show last 5-10 notifications
    if (!appState.notifications) appState.notifications = [];
    const notifications = appState.notifications.slice(0, 10);

    if (notifications.length === 0) {
        list.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-tertiary);">No notifications</div>';
        return;
    }

    list.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.read ? '' : 'unread'}" onclick="markNotificationRead(${n.id})">
            <div style="font-size: 0.9rem; margin-bottom: 4px;">${n.message}</div>
            <div style="font-size: 0.75rem; color: var(--text-tertiary);">${new Date(n.timestamp).toLocaleTimeString()}</div>
        </div>
    `).join('');
}

function markAllNotificationsRead() {
    if (appState.notifications) {
        appState.notifications.forEach(n => n.read = true);
        saveStateToStorage();
        updateNotificationBadge();
        renderNotificationDropdown();
    }
}

function markNotificationRead(id) {
    const notif = appState.notifications.find(n => n.id === id);
    if (notif) {
        notif.read = true;
        saveStateToStorage();
        updateNotificationBadge();
        renderNotificationDropdown();
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notification-dropdown');
    const btn = document.getElementById('notification-btn');
    if (dropdown && dropdown.classList.contains('active') &&
        !dropdown.contains(e.target) &&
        !btn.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// ==========================================================================
// @Mentions Simulation
// ==========================================================================

function initMentions(textareaId, mentionListId) {
    const textarea = document.getElementById(textareaId);
    const list = document.getElementById(mentionListId);
    if (!textarea || !list) return;

    textarea.addEventListener('input', (e) => {
        const text = textarea.value;
        const cursorPosition = textarea.selectionStart;
        const textBeforeCursor = text.substring(0, cursorPosition);
        const lastAt = textBeforeCursor.lastIndexOf('@');

        if (lastAt !== -1 && lastAt >= textBeforeCursor.lastIndexOf(' ')) {
            const query = textBeforeCursor.substring(lastAt + 1).toLowerCase();
            const matches = appState.team.filter(m => m.name.toLowerCase().includes(query));

            if (matches.length > 0) {
                list.innerHTML = matches.map(m => `
                    <div class="mention-suggestion" onclick="insertMention('${textareaId}', '${m.name.replace(/'/g, "\\'")}', ${lastAt}, ${cursorPosition})">
                        <div class="mention-avatar">${getInitials(m.name)}</div>
                        <span>${sanitizeHTML(m.name)}</span>
                    </div>
                `).join('');
                list.style.display = 'block';

                // Position list above/below textarea
                const rect = textarea.getBoundingClientRect();
                list.style.left = `${rect.left}px`;
                list.style.top = `${rect.top - list.offsetHeight - 5}px`;
            } else {
                list.style.display = 'none';
            }
        } else {
            list.style.display = 'none';
        }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!textarea.contains(e.target) && !list.contains(e.target)) {
            list.style.display = 'none';
        }
    });
}

function insertMention(textareaId, name, start, end) {
    const textarea = document.getElementById(textareaId);
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end);
    textarea.value = before + '@' + name + ' ' + after;
    textarea.focus();
    document.getElementById(`mention-list-${textareaId}`).style.display = 'none';
}

// ==========================================================================
// Real-time Activity Simulation
// ==========================================================================

function startRealTimeSimulation() {
    const mockUsers = appState.team;
    const actions = ['updated', 'completed', 'commented on', 'uploaded a file to'];
    const entities = ['task', 'project'];

    setInterval(() => {
        if (Math.random() > 0.7) { // 30% chance every 45s
            const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
            const action = actions[Math.floor(Math.random() * actions.length)];
            const entityType = entities[Math.floor(Math.random() * entities.length)];

            let entityName = '';
            if (entityType === 'task') {
                const t = appState.tasks[Math.floor(Math.random() * appState.tasks.length)];
                entityName = t.title;
            } else {
                const p = appState.projects[Math.floor(Math.random() * appState.projects.length)];
                entityName = p.name;
            }

            // Create activity from another user
            const activity = {
                id: Date.now(),
                userId: user.email,
                userName: user.name,
                action: action,
                entityType: entityType,
                entityName: entityName,
                timestamp: new Date().toISOString()
            };

            appState.activities.unshift(activity);

            // Add notification
            const notification = {
                id: Date.now() + 1,
                type: 'activity',
                message: `<strong style="color: var(--text-primary);">${sanitizeHTML(user.name)}</strong> ${action} ${entityType}: ${sanitizeHTML(entityName)}`,
                read: false,
                timestamp: new Date().toISOString()
            };
            appState.notifications.unshift(notification);

            // Housekeeping
            if (appState.activities.length > 50) appState.activities.pop();
            if (appState.notifications.length > 50) appState.notifications.pop();

            updateNotificationBadge();
            if (appState.currentPage === 'activity') renderActivityFeed(document.getElementById('app-content'));

            // Show a mini toast for "real-time" feel
            showToast(`${user.name} ${action} ${entityType}`, 'info');
            saveStateToStorage();
        }
    }, 45000); // Check every 45s
}



}


function initHeaderInteractions() {
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && searchInput.value.trim()) {
                navigateTo('search-results', searchInput.value.trim());
            }
        });
    }
}
