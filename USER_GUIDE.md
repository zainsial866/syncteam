# SyncTeam User Guide 📘

Welcome to **SyncTeam**, your modern project management solution! This guide will help you get started, create an account, and master the features to boost your team's productivity.

## 🚀 Getting Started

### Accessing the App

You can access SyncTeam via your Vercel deployment URL (e.g., `https://syncteam-mjpy.vercel.app`).

### 1. Creating an Account (Sign Up)

**Yes, this is just like creating an account on any other secure website (like Facebook, Gmail, etc.).**

1. Click the **"Sign Up"** link on the login page.
2. **Full Name**: Enter your display name (e.g., "John Doe").
3. **Email**: Enter your valid email address.
4. **Password**: Create a strong password (minimum 6 characters).
5. **Role**: Choose your role (e.g., "Project Manager" or "Member").
    * *Project Manager*: Full access to create projects, delete items, and manage settings.
    * *Member*: Can create tasks and comments but cannot delete projects.
6. Click **"Create Account"**.

> **Note**: Since this is a demo application, you might be logged in immediately, or you may need to confirm your email depending on the Supabase configuration.

### 2. Logging In

Once you have an account:

1. Enter your **Email** and **Password**.
2. Click **"Login"**.
3. You will be redirected to the **Dashboard**.

---

## 🌟 Key Features & How to Use Them

### 📊 Dashboard

**Your Mission Control Center.**

* **Stats Cards**: See total projects, active tasks, and team size at a glance.
* **Project Status Chart**: Visual breakdown of your active vs. completed projects.
* **Overdue Tasks**: A warning list of tasks that missed their deadline.
* **Recent Projects**: Quick links to the projects you accessed recently.

### 📁 Projects

**Organize your work.**

* **Create Project**: Click the **"+ New Project"** button.
  * Enter a *Name*, *Client*, *Start Date*, and *End Date*.
  * Set a *Budget* and *Status* (Active, Planning, etc.).
* **Progress**: The progress bar automatically updates based on how many tasks in that project are marked as "Completed".
* **Edit/Delete**: Use the pencil icon to edit details or the trash icon (Project Managers only) to remove a project.

### ✅ Tasks

**Get things done.**

* **Create Task**: Click **"+ New Task"**.
  * Assign it to a *Project*.
  * Set a *Priority* (High, Medium, Low).
  * Set a *Due Date*.
* **Kanban/List**: View tasks by their status (To Do, In Progress, Completed). *Note: Currently in List View.*
* **Mark Complete**: Click the "Edit" button and change the status to "Completed" to see the progress bars move!

### 👥 Team

**Collaborate with others.**

* **Team Directory**: View a list of all users who have signed up for your SyncTeam workspace.
* **Roles**: See who is a Manager and who is a Member.

### ⚙️ Settings

**Customize your experience.**

* **Profile**: Update your Name and Bio.
* **Avatar**: Upload a profile picture to personalize your account.
* **Theme**: Toggle between Dark Mode 🌙 and Light Mode ☀️ (if implemented in sidebar).

---

## 🔒 Security & data

**Is my data safe?**

* **Yes.** SyncTeam uses **Supabase**, a professional database platform (an alternative to Firebase).
* Your passwords are **encrypted** and never stored in plain text.
* **Row Level Security (RLS)** ensures that unauthorized users cannot access private data.

---

## 💡 Pro Tips

* **Hard Refresh**: If you ever see a loading spinner that won't go away, try a "Hard Refresh" (Ctrl+Shift+R) to clear your browser cache.
* **Filtering**: Usage the search bars and dropdown filters in the Projects and Tasks views to find exactly what you're looking for.
