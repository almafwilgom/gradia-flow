# ⚠️ INFINITE REFRESH LOOP - QUICK FIX (2 MINUTES)

## The Problem
Your page keeps refreshing indefinitely. This is because **environment variables are missing**.

## The Solution

### Step 1: Create `.env.local` File

Open terminal in `frontend` directory:
```bash
cd c:\Users\ADMIN\Desktop\sms\frontend
```

Create a new file called `.env.local` (note the dot at the beginning):
```
.env.local
```

### Step 2: Add Your Supabase Credentials

Copy and paste this into `.env.local`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Step 3: Get Your Credentials

1. Go to https://supabase.com
2. Sign in and select your project
3. Click **Settings** (bottom left)
4. Click **API** tab
5. Copy **Project URL** and paste after `VITE_SUPABASE_URL=`
6. Copy **anon public key** and paste after `VITE_SUPABASE_ANON_KEY=`

**Example:**
```
VITE_SUPABASE_URL=https://abcxyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### Step 4: Restart Dev Server

```bash
# Stop any running dev server (press Ctrl+C)
# Then:
npm run dev
```

### Step 5: Clear Browser Cache

1. Press **F12** to open DevTools
2. Right-click the refresh button
3. Select "Empty cache and hard refresh"

---

## ✅ If It Still Doesn't Work

1. **Delete node_modules:**
   ```bash
   rm -r node_modules package-lock.json
   npm install
   npm run dev
   ```

2. **Check console for errors:**
   - Press F12
   - Go to "Console" tab
   - Look for error messages
   - Copy them and share if stuck

3. **Verify Supabase:**
   - Check your credentials are correct
   - Make sure you have an active Supabase project
   - Verify credentials have no extra spaces

---

## 📁 File Locations

- **Create this file:** `c:\Users\ADMIN\Desktop\sms\frontend\.env.local`
- **Not this file:** Don't edit the `.env.example` - create a new `.env.local`

---

## 🚀 Expected Result

After fixing, when you run `npm run dev`:

- ✅ Page loads at `http://localhost:5173`
- ✅ Redirects to login page (if not authenticated)
- ✅ NO infinite refreshing
- ✅ No errors in console

---

## 🆘 Still Stuck?

Post the **error message from the console** (F12 → Console tab) and you'll get help quickly!
