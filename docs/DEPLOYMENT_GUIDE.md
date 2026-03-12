# Orqestr Deployment Guide

## Hosted Deployment (Vercel + Supabase)

This guide will walk you through deploying Orqestr to Vercel with a cloud Supabase instance.

### Prerequisites

- GitHub account
- Vercel account (free tier works)
- Supabase account (free tier works)

---

## Step 1: Create Supabase Project

1. **Go to [Supabase](https://supabase.com)**
   - Sign in or create an account

2. **Create a new project**
   - Click "New Project"
   - Choose your organization
   - Enter project details:
     - Name: `orqestr` (or your preferred name)
     - Database Password: Generate a strong password (save this!)
     - Region: Choose closest to your users
     - Pricing Plan: Free tier is fine for testing

3. **Wait for project creation** (takes ~2 minutes)

4. **Get your project credentials**
   - Go to Project Settings > API
   - Copy the following (you'll need these later):
     - **Project URL** (starts with https://xxxxx.supabase.co)
     - **anon/public key** (starts with eyJ...)
     - **service_role key** (starts with eyJ... - keep this secret!)

5. **Enable Email Auth**
   - Go to Authentication > Providers
   - Ensure "Email" is enabled
   - Configure email settings (for now, you can use the default)
   - Under "Email Auth" settings:
     - Enable "Enable email confirmations" = OFF (for easier testing)
     - Site URL: `https://your-app.vercel.app` (we'll update this after Vercel deployment)

---

## Step 2: Run Database Migrations

You have two options:

### Option A: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Link to your project**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   - Find your project ref in Supabase dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
   - You'll be prompted for your database password

3. **Push the migration**:
   ```bash
   cd /path/to/junction
   supabase db push
   ```

### Option B: Using SQL Editor (Manual)

1. **Go to SQL Editor** in Supabase dashboard
2. **Create a new query**
3. **Copy the contents** of `supabase/migrations/20260310000000_initial_schema.sql`
4. **Paste and run** the SQL

---

## Step 3: Push to GitHub

If you haven't already, push your code to GitHub:

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit - Orqestr MVP"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/junction.git
git push -u origin main
```

---

## Step 4: Deploy to Vercel

1. **Go to [Vercel](https://vercel.com)**
   - Sign in with GitHub

2. **Import your repository**
   - Click "Add New" > "Project"
   - Select your `junction` repository
   - Click "Import"

3. **Configure the project**:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: Leave as `./` (monorepo root)
   - **Build Command**: `cd apps/web && pnpm install && pnpm build`
   - **Output Directory**: `apps/web/.next`
   - **Install Command**: `pnpm install`

4. **Add Environment Variables**:
   Click "Environment Variables" and add:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

   **Important**:
   - Replace with YOUR actual Supabase credentials from Step 1
   - The `NEXT_PUBLIC_APP_URL` will be provided after first deployment - you can update it later

5. **Deploy**:
   - Click "Deploy"
   - Wait for deployment to complete (~2-3 minutes)
   - You'll get a URL like `https://orqestr-xxxxx.vercel.app`

6. **Update Environment Variables**:
   - Go to Project Settings > Environment Variables
   - Update `NEXT_PUBLIC_APP_URL` with your actual Vercel URL
   - Redeploy (Deployments > click "..." > Redeploy)

7. **Update Supabase Site URL**:
   - Go back to Supabase dashboard
   - Authentication > URL Configuration
   - Update "Site URL" to your Vercel URL: `https://your-app.vercel.app`
   - Add Redirect URLs: `https://your-app.vercel.app/**`

---

## Step 5: Test Your Deployment

1. **Visit your Vercel URL**
   - You should see the Orqestr landing page

2. **Test signup**:
   - Go to `/signup`
   - Create an account
   - You should be redirected to `/dashboard`

3. **Test login**:
   - Sign out
   - Go to `/login`
   - Sign in with your credentials

4. **Verify database**:
   - Go to Supabase dashboard > Table Editor
   - Check that your user was created in the `users` table

---

## Step 6: Set Up Automatic Deployments

Vercel automatically deploys when you push to your main branch:

```bash
# Make a change
git add .
git commit -m "Update feature"
git push

# Vercel will automatically deploy
```

You can also deploy from other branches for testing:
- Push to a feature branch
- Vercel creates a preview deployment
- Share the preview URL for testing

---

## Troubleshooting

### Build fails on Vercel

**Error: "Cannot find module '@junction/database'"**
- Make sure your build command includes the monorepo root
- Try: `pnpm install --frozen-lockfile && cd apps/web && pnpm build`

**Error: "NEXT_PUBLIC_SUPABASE_URL is not defined"**
- Check that environment variables are set in Vercel
- Redeploy after adding them

### Authentication issues

**Users can't sign up**
- Check Supabase Auth settings
- Ensure email confirmations are disabled (for testing)
- Verify Site URL is set correctly

**Redirect loop after login**
- Check middleware.ts is working
- Verify `NEXT_PUBLIC_APP_URL` matches your Vercel URL

### Database connection fails

**Error connecting to Supabase**
- Verify your Supabase credentials
- Check that the project is not paused (free tier pauses after 7 days of inactivity)
- Test connection from Supabase dashboard

---

## Custom Domain (Optional)

To use your own domain:

1. **In Vercel**:
   - Go to Project Settings > Domains
   - Add your domain
   - Follow DNS configuration instructions

2. **In Supabase**:
   - Update Site URL to your custom domain
   - Update Redirect URLs

---

## Monitoring

### Vercel Analytics
- Automatically enabled
- View in Vercel dashboard > Analytics

### Supabase Monitoring
- Database usage: Supabase dashboard > Reports
- Auth users: Authentication > Users
- API logs: Logs > API Logs

---

## Cost Estimates

### Free Tier Limits

**Vercel Free Tier:**
- 100 GB bandwidth/month
- Unlimited deployments
- Perfect for testing and small projects

**Supabase Free Tier:**
- 500 MB database
- 1 GB file storage
- 50,000 monthly active users
- 2 GB bandwidth
- Pauses after 7 days of inactivity

**When to upgrade:**
- Vercel: When you need more bandwidth or team features
- Supabase: When you need more database space or daily backups

---

## Next Steps

Once deployed:
1. Share the URL with your team
2. Start testing task creation and agent integration
3. Monitor usage in both dashboards
4. Implement Phase 2 features (human task management)

---

## Maintaining Parity: Self-Hosted vs. Hosted

**STANDING ORDER**: All changes must work in both self-hosted (Docker Compose) and hosted (Vercel + Supabase) environments.

### Before Making Changes:

1. **Environment Variables**:
   - Add new env vars to `.env.example`
   - Document in both deployment guides
   - Test with both local and cloud configs

2. **Database Changes**:
   - Always create migrations (don't modify existing ones)
   - Test migrations locally first
   - Push to Supabase via CLI or SQL Editor
   - Document any manual steps

3. **Dependencies**:
   - Test that new packages work in both environments
   - Some packages may have different behavior server-side vs. edge runtime

4. **Testing Checklist**:
   ```bash
   # Test locally (self-hosted)
   docker compose up
   # Visit http://localhost:3000

   # Test on Vercel (hosted)
   git push
   # Visit https://your-app.vercel.app
   ```

5. **Exceptions** (rare):
   - If a feature genuinely can't work in both environments, document why
   - Create feature flags to enable/disable based on environment
   - Always prefer universal solutions

### Common Gotchas:

| Issue | Self-Hosted | Hosted | Solution |
|-------|-------------|---------|----------|
| File uploads | Local disk | Supabase Storage | Use Supabase Storage for both |
| WebSockets | Full support | Limited on Edge | Use Supabase Realtime instead |
| Background jobs | Can use cron | Use Vercel Cron | Use Supabase Edge Functions |
| Secrets | .env file | Vercel env vars | Both use env vars |

---

## Support

If you run into issues:
1. Check the troubleshooting section above
2. Review Vercel deployment logs
3. Check Supabase logs
4. Open an issue on GitHub with deployment details
