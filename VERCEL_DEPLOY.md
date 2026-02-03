# Vercel Deployment - Web Interface Guide

## 🚀 Deploy Without CLI (No Installation Needed)

### Step 1: Create Vercel Account

1. Go to <https://vercel.com/signup>
2. Sign up with GitHub, GitLab, Bitbucket, or Email
3. Complete registration

### Step 2: Deploy Your App

**Option A: Import from GitHub (Recommended)**

1. Push your code to GitHub first
2. In Vercel Dashboard, click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your `syncteam` repository
5. Click **"Deploy"**
6. Done! ✅

**Option B: Drag & Drop**

1. Zip your `d:\work\app` folder:
   - Right-click folder → Send to → Compressed (zipped) folder
2. Go to Vercel Dashboard: <https://vercel.com/new>
3. **Drag and drop** the ZIP file
4. Wait for upload
5. Click **"Deploy"**
6. Done! ✅

### Step 3: Configure (if needed)

- **Framework Preset**: None (Static HTML)
- **Root Directory**: `./` (leave default)
- **Build Command**: (leave empty)
- **Output Directory**: (leave empty)

### Step 4: Get Your URL

After deployment, you'll get a URL like:

- `https://syncteam-xxxxx.vercel.app`

### Step 5: Add Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your domain
3. Follow DNS configuration steps

---

## 📋 GitHub Deployment (If you choose Option A)

```bash
# Initialize git (if not already)
cd d:\work\app
git init
git add .
git commit -m "Initial commit - SyncTeam SaaS"

# Create GitHub repo (requires GitHub CLI)
gh repo create syncteam --public --source=. --push

# Or manually:
# 1. Go to github.com/new
# 2. Create new repo called "syncteam"
# 3. Follow the push instructions shown
```

---

## ⚠️ Important: Environment Variables

After deployment, add your Supabase credentials as **Environment Variables** in Vercel:

1. Go to Project Settings → Environment Variables
2. Add these (optional, for security):
   - `VITE_SUPABASE_URL` = Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key

**Note:** For this simple app, the keys are already in `supabaseClient.js`, so this step is optional.

---

## ✅ Verification

After deployment:

1. Visit your Vercel URL
2. Test login/signup
3. Create a project, task, client
4. Verify data persists in Supabase

**That's it! Your app is live! 🎉**
