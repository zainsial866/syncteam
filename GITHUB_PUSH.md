# 🚀 Push to GitHub - Step by Step

## ✅ Git is Ready

Your code is committed and ready to push. Follow these steps:

## Step 1: Create GitHub Repository

1. **Go to**: <https://github.com/new>
2. **Log in** to your GitHub account
3. **Repository name**: `syncteam`
4. **Description**: `SyncTeam - Modern Project Management SaaS with Supabase`
5. **Visibility**: Public
6. **DO NOT** check these boxes:
   - ❌ Add a README file (we already have one)
   - ❌ Add .gitignore (we already have one)
7. Click **"Create repository"**

## Step 2: Copy the Commands

After creating the repo, GitHub will show you commands. Copy the **second set** that says:

**"…or push an existing repository from the command line"**

It will look like this (with YOUR username):

```bash
git remote add origin https://github.com/YOUR_USERNAME/syncteam.git
git branch -M main
git push -u origin main
```

## Step 3: Run in PowerShell

Open PowerShell in `d:\work\app` and paste those commands:

```powershell
cd d:\work\app

# Replace YOUR_USERNAME with your actual GitHub username
git remote add origin https://github.com/YOUR_USERNAME/syncteam.git
git branch -M main
git push -u origin main
```

When prompted, enter your GitHub password or personal access token.

## Step 4: Deploy to Vercel

Once pushed to GitHub:

1. Go to <https://vercel.com/new>
2. Click **"Import Git Repository"**
3. Select your `syncteam` repository
4. Click **"Deploy"**
5. Done! 🎉

---

## Alternative: Use These Commands

If you want me to help, copy the remote URL from GitHub and tell me!

Your code has:

- ✅ Git initialized
- ✅ All files committed
- ✅ README.md created
- ✅ .gitignore configured

Just need to connect to GitHub and push!
