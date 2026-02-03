# SyncTeam - Project Management SaaS

A modern, feature-rich project management application built with vanilla JavaScript and Supabase.

## 🚀 Features

- ✅ **Authentication** - Secure login/signup with Supabase Auth
- ✅ **Real-time Collaboration** - Live updates across all users
- ✅ **Project Management** - Create, edit, and track projects
- ✅ **Task Management** - Kanban board, subtasks, timers
- ✅ **Client Management** - Organize and manage clients
- ✅ **Team Directory** - View and manage team members
- ✅ **File Uploads** - Avatar uploads via Supabase Storage
- ✅ **Role-Based Access Control** - Admin, Member, Viewer roles
- ✅ **Activity Tracking** - Comprehensive audit logs
- ✅ **Dark Mode** - Beautiful dark/light theme toggle

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **UI Icons**: Material Symbols
- **Charts**: Chart.js

## 📦 Deployment

### Quick Deploy to Vercel

1. **Fork this repo** or **Import to Vercel**
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import this repository
4. Click **Deploy**
5. Done! ✅

### Manual Setup

1. Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/syncteam.git
cd syncteam
```

1. Update `supabaseClient.js` with your Supabase credentials:

```javascript
const SUPABASE_URL = 'your-project-url';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

1. Run the SQL schema in Supabase:
   - Copy contents of `schema.sql`
   - Paste in Supabase SQL Editor
   - Run query

2. Enable RLS policies:
   - Copy contents of `enable_rls.sql`
   - Paste in Supabase SQL Editor
   - Run query

3. Create Storage bucket:
   - Go to Supabase Storage
   - Create bucket named `avatars`
   - Set to Public

4. Deploy or run locally:

```bash
# Option 1: Deploy to Vercel
vercel

# Option 2: Serve locally
npx serve .
```

## 📖 Documentation

- [Deployment Guide](DEPLOYMENT.md) - Detailed deployment instructions
- [Vercel Deployment](VERCEL_DEPLOY.md) - Vercel-specific guide
- [Database Schema](schema.sql) - Complete database structure  
- [RLS Policies](enable_rls.sql) - Row Level Security setup

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Input sanitization to prevent XSS
- Content Security Policy (CSP) headers
- Supabase Auth for secure authentication

## 🎨 Features in Detail

### Dashboard

- Real-time activity feed
- Project status charts
- Task statistics
- Overdue task alerts

### Projects

- Status tracking (Planning, Active, On Hold, Completed)
- Budget management
- Client assignment
- Bulk operations

### Tasks

- Kanban board view
- Priority levels
- Time tracking
- Subtask management
- File attachments (avatar example implemented)
- Comments and mentions

### Settings

- Profile customization
- Avatar upload
- Role simulation
- Notification preferences
- Theme toggle

## 📝 License

MIT License - feel free to use this project for learning or production!

## 🤝 Contributing

Contributions welcome! Feel free to open issues or submit PRs.

## 🌐 Live Demo

Coming soon...

---

Built with ❤️ using Supabase
