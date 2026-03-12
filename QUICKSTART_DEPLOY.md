# Quick Deploy to Vercel + Supabase

Follow these steps to deploy Orqestr to the cloud in ~10 minutes.

## Part 1: Supabase Setup (3 minutes)

### 1.1 Create Project

1. Go to **[supabase.com](https://supabase.com)** and sign in
2. Click **"New Project"**
3. Fill in:
   - **Organization**: Choose or create one
   - **Name**: `orqestr`
   - **Database Password**: Click "Generate a password" and **SAVE IT**
   - **Region**: Choose closest to you
4. Click **"Create new project"**
5. Wait ~2 minutes for setup

### 1.2 Get Credentials

1. Go to **Settings** (gear icon in sidebar)
2. Click **API**
3. Copy these values (keep this tab open):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: The long key starting with `eyJ...`
   - **service_role**: The long key starting with `eyJ...` (keep secret!)

### 1.3 Configure Auth

1. Go to **Authentication** > **Providers**
2. Find **Email** and click to expand
3. Turn **OFF** "Confirm email" (easier for testing)
4. Leave this tab open - we'll come back after Vercel

---

## Part 2: Push to GitHub (2 minutes)

If you haven't already:

```bash
# From the junction directory
git add .
git commit -m "Ready for deployment"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/junction.git
git push -u origin main
```

---

## Part 3: Vercel Deploy (3 minutes)

### 3.1 Import Project

1. Go to **[vercel.com](https://vercel.com)** and sign in with GitHub
2. Click **"Add New"** > **"Project"**
3. Find and **Import** your `orqestr` repository
4. **Don't click Deploy yet!**

### 3.2 Configure Build Settings

1. **Framework Preset**: Should auto-detect as "Next.js"
2. **Root Directory**: Leave as `./`
3. Click **"Edit"** next to Build and Output Settings:
   - **Build Command**: `pnpm install && pnpm --filter web build`
   - **Output Directory**: `apps/web/.next`
   - **Install Command**: `pnpm install`

### 3.3 Add Environment Variables

Click **"Environment Variables"** and add these (use your Supabase values):

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service_role key from Supabase |
| `NEXT_PUBLIC_APP_URL` | `https://orqestr.vercel.app` (temporary - we'll update) |

**Important**: Make sure there are no trailing spaces or quotes!

### 3.4 Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes
3. You'll get a URL like `https://junction-abc123.vercel.app`
4. **Copy this URL!**

### 3.5 Update App URL

1. Go to your Vercel project
2. **Settings** > **Environment Variables**
3. Find `NEXT_PUBLIC_APP_URL`
4. Click **"Edit"** and update with your real URL
5. Go to **Deployments**
6. Click **"..."** next to the latest deployment
7. Click **"Redeploy"**

---

## Part 4: Connect Supabase to Vercel (1 minute)

1. Go back to **Supabase** dashboard
2. **Authentication** > **URL Configuration**
3. Update **Site URL** to your Vercel URL: `https://junction-abc123.vercel.app`
4. Under **Redirect URLs**, add:
   - `https://junction-abc123.vercel.app/**`
5. Click **"Save"**

---

## Part 5: Run Database Migration (2 minutes)

### Option A: Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Get your project reference (from Supabase URL: xxxxx.supabase.co)
# The "xxxxx" part is your project ref

# Link to your project
supabase link --project-ref xxxxx

# You'll be prompted for your database password (from step 1.1)

# Push the migration
supabase db push
```

### Option B: SQL Editor (Manual)

1. Go to **Supabase** dashboard
2. Click **SQL Editor** in sidebar
3. Click **"New query"**
4. Open `supabase/migrations/20260310000000_initial_schema.sql` on your computer
5. Copy ALL the contents
6. Paste into the SQL Editor
7. Click **"Run"**
8. Should see "Success" message

---

## Part 6: Test! (1 minute)

1. **Visit your Vercel URL**: `https://junction-abc123.vercel.app`
2. Click **"Sign up"**
3. Create an account with your email
4. You should land on the dashboard!

### Verify Database

1. Go to **Supabase** > **Table Editor**
2. Click **users** table
3. You should see your user!

---

## 🎉 You're Live!

Your Orqestr instance is now running in the cloud!

**Next Steps:**
- Bookmark your Vercel URL
- Share with your team
- Start testing task creation
- Implement Phase 2 features

---

## Troubleshooting

### Build Failed

**Check Vercel logs**:
1. Go to your deployment in Vercel
2. Click on the failed deployment
3. Check the build logs
4. Common issues:
   - Missing environment variables
   - Wrong build command
   - TypeScript errors

**Fix**:
1. Fix the issue
2. Go to **Deployments**
3. Click **"Redeploy"**

### Can't Sign Up

**Check Supabase Auth**:
1. Supabase dashboard > **Authentication** > **Providers**
2. Make sure Email is enabled
3. Make sure "Confirm email" is OFF
4. Check Site URL matches your Vercel URL

### Redirect Loop

**Fix Environment Variables**:
1. Vercel > **Settings** > **Environment Variables**
2. Make sure `NEXT_PUBLIC_APP_URL` matches your actual URL
3. Redeploy

### Database Connection Error

1. Check Supabase project is not paused
2. Verify environment variables are correct
3. Try copying credentials again from Supabase

---

## Updating Your Deployment

Every time you push to GitHub, Vercel automatically deploys:

```bash
git add .
git commit -m "Add new feature"
git push

# Vercel automatically builds and deploys
# Check status at vercel.com
```

---

## Need Help?

- Check the [Full Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)
- Review [Parity Guidelines](./docs/HOSTED_SELFHOSTED_PARITY.md)
- Open an issue on GitHub
