# SyncTeam Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Vercel (Recommended - Easiest)

1. **Prepare Your Files**
   - Make sure all files are in `d:\work\app`
   - Ensure `supabaseClient.js` has your Supabase URL and Anon Key

2. **Deploy to Vercel**

   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Navigate to your project
   cd d:\work\app
   
   # Deploy
   vercel
   ```

3. **Follow Prompts**
   - Login to Vercel (it will open browser)
   - Select "Continue with GitHub/GitLab/Bitbucket" or use email
   - Choose project name
   - Deploy!

4. **Done!**
   - Vercel will give you a live URL like: `https://your-app.vercel.app`
   - Every time you run `vercel`, it deploys updates instantly

---

### Option 2: Netlify (Also Very Easy)

**Method A: Drag & Drop (No CLI needed)**

1. **Zip Your Files**
   - Zip the entire `d:\work\app` folder

2. **Go to Netlify**
   - Visit <https://app.netlify.com/drop>
   - Drag and drop your ZIP file
   - Done! Get instant URL

**Method B: Netlify CLI**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Navigate to project
cd d:\work\app

# Deploy
netlify deploy --prod
```

---

### Option 3: GitHub Pages (Free, Static Hosting)

1. **Create GitHub Repo**

   ```bash
   cd d:\work\app
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create syncteam --public --source=. --remote=origin --push
   ```

2. **Enable GitHub Pages**
   - Go to repo Settings → Pages
   - Source: Deploy from branch `main`
   - Folder: `/ (root)`
   - Save

3. **Access Your App**
   - URL: `https://YOUR_USERNAME.github.io/syncteam/`

---

### Option 4: Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize
cd d:\work\app
firebase init hosting

# Select options:
# - Public directory: . (current directory)
# - Configure as SPA: Yes
# - Don't overwrite files

# Deploy
firebase deploy
```

---

## ⚙️ Before Deploying - Configuration

### 1. Update Supabase Client

Make sure `supabaseClient.js` has the correct credentials:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 2. Configure CORS (if needed)

In Supabase Dashboard:

- Go to **Authentication** → **URL Configuration**
- Add your deployment URL to **Redirect URLs**

Example:

- `https://your-app.vercel.app/*`
- `https://your-app.netlify.app/*`

### 3. Update CSP (Optional)

In `index.html`, update the Content Security Policy if you're using analytics:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; 
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
               img-src 'self' data: https://*.supabase.co;">
```

---

## 🔒 Security Checklist

- [x] RLS enabled on all Supabase tables
- [x] Anon key used (not service role key)
- [x] Input sanitization implemented
- [x] CSP headers configured
- [ ] Custom domain with HTTPS (optional)
- [ ] Rate limiting configured in Supabase (optional)

---

## 📊 Post-Deployment Testing

1. **Test Authentication**
   - Sign up new user
   - Login
   - Logout
   - Session persistence (refresh page)

2. **Test CRUD Operations**
   - Create/edit/delete Projects
   - Create/edit/delete Tasks
   - Create/edit/delete Clients

3. **Test Real-time**
   - Open app in 2 tabs
   - Make changes in one tab
   - Verify updates in other tab

4. **Test File Upload**
   - Upload avatar in Settings
   - Verify it appears
   - Refresh and confirm persistence

---

## 🐛 Troubleshooting

**Issue: "Supabase is not defined"**

- Check that `<script src="supabaseClient.js">` is before `<script src="app.js">` in `index.html`

**Issue: "Authentication not working"**

- Verify Supabase URL and Anon Key are correct
- Check redirect URLs in Supabase Dashboard

**Issue: "CORS error"**

- Add your deployed URL to Supabase allowed URLs

**Issue: "Cannot read data"**

- Check RLS policies are enabled
- Run `enable_rls.sql` in Supabase SQL Editor

---

## 🎉 You're Live

Your SyncTeam app is now deployed and ready to use. Share the URL with your team!

**Next Steps:**

- Add custom domain
- Set up email templates in Supabase
- Configure production analytics
- Add more team members
