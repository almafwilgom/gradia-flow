# 🔧 INFINITE REDIRECT LOOP - TROUBLESHOOTING & FIX

## Problem Description

The page keeps refreshing indefinitely when you run `npm run dev`. This is usually caused by one of these issues:

1. **Missing environment variables** ❌
2. **Supabase connection failure** ❌
3. **Authentication loop** ❌
4. **useAuth hook issues** ❌

---

## ✅ SOLUTION 1: Set Environment Variables (99% Chance This Is The Issue)

### Step 1: Create `.env.local` File

Navigate to the `frontend` directory:
```
c:\Users\ADMIN\Desktop\sms\frontend
```

Create a new file: `.env.local` (note the dot at the start)

### Step 2: Add Supabase Credentials

Copy this template into `.env.local`:

```
VITE_SUPABASE_URL=https://your-project-here.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 3: Get Your Credentials

1. Go to https://supabase.com
2. Sign in to your account
3. Select your project
4. Click **Settings** (bottom left)
5. Click **API** in the left sidebar
6. Copy:
   - **Project URL** → paste as `VITE_SUPABASE_URL`
   - **Project API Keys → anon public** → paste as `VITE_SUPABASE_ANON_KEY`

### Step 4: Example (Your values will be different)

```
VITE_SUPABASE_URL=https://abcdefghij123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 5: Restart Dev Server

```bash
# Stop the current dev server (Ctrl+C)
# Then restart it:
npm run dev
```

---

## ✅ SOLUTION 2: Clear Browser Cache & Session

If environment variables are set but refresh still loops:

1. **Clear localStorage:**
   - Press F12 (DevTools)
   - Go to Application → LocalStorage
   - Delete all entries
   - Refresh page

2. **Clear browser cache:**
   - Press Ctrl+Shift+Delete
   - Select "All time"
   - Check "Cookies and other site data"
   - Check "Cached images and files"
   - Click "Clear data"

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

---

## ✅ SOLUTION 3: Check Supabase Connection

Test if Supabase is reachable:

### Create a test file: `frontend/src/test-supabase.js`

```javascript
import { supabase } from './lib/supabaseClient';

console.log('Testing Supabase connection...');
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Anon Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase connection failed:', error);
  } else {
    console.log('✅ Supabase connection successful');
    console.log('Session:', data.session);
  }
});
```

### Then in `frontend/src/main.jsx`, add at top:

```javascript
import './test-supabase.js';
```

### Check console output:
- Open DevTools (F12)
- Go to Console tab
- Look for the test messages

---

## ✅ SOLUTION 4: Add Debug Logging

Modify `frontend/src/components/RoleBasedRedirect.jsx`:

```javascript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function RoleBasedRedirect() {
  const { user, profile, loading } = useAuth();

  console.log('🔍 RoleBasedRedirect Debug:', {
    loading,
    hasUser: !!user,
    hasProfile: !!profile,
    role: profile?.role,
    userEmail: user?.email
  });

  if (loading) {
    return <div className="p-6 text-slate-600">Loading...</div>;
  }

  if (!user) {
    console.log('❌ No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Route based on role
  if (profile?.role === 'super_admin') {
    console.log('✅ Super Admin detected, redirecting to /super-admin/dashboard');
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  if (profile?.role === 'school_admin' || profile?.role === 'teacher') {
    console.log('✅ School Admin/Teacher detected, redirecting to /admin/dashboard');
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (profile?.role === 'parent' || profile?.role === 'student') {
    console.log('✅ Parent/Student detected, redirecting to /portal/home');
    return <Navigate to="/portal/home" replace />;
  }

  console.log('⚠️ No role detected, redirecting to login');
  return <Navigate to="/login" replace />;
}
```

### Check console output to understand where loop occurs

---

## ✅ SOLUTION 5: Check package.json

Ensure Vite is properly configured:

```json
{
  "name": "sms-frontend",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .js,.jsx"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.3",
    "@supabase/supabase-js": "^2.38.5",
    "swr": "^2.2.5",
    "dayjs": "^1.11.10",
    "@heroicons/react": "^2.1.5"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.1.4",
    "tailwindcss": "^3.4.3",
    "postcss": "^8.4.35",
    "autoprefixer": "^10.4.16"
  }
}
```

If something is missing, run:
```bash
npm install
```

---

## ✅ SOLUTION 6: Disable Service Workers (If Using)

If you have service workers enabled, they might be caching old redirects:

1. Open DevTools (F12)
2. Go to Application → Service Workers
3. Click "Unregister" for any workers
4. Go to Application → Storage → Clear site data
5. Refresh page

---

## 🎯 Complete Setup Checklist

- [ ] Created `.env.local` in `frontend/` directory
- [ ] Added `VITE_SUPABASE_URL` with your actual Supabase URL
- [ ] Added `VITE_SUPABASE_ANON_KEY` with your actual API key
- [ ] Restarted dev server after adding env vars
- [ ] Cleared browser cache
- [ ] Cleared localStorage
- [ ] Checked browser console for errors
- [ ] Verified Supabase project exists
- [ ] Ran `npm install` in frontend directory
- [ ] Node version is 18+ (`node --version`)

---

## 🧪 Testing After Fix

### Quick Test:

1. **Start dev server:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open browser:**
   ```
   http://localhost:5173
   ```

3. **Expected behavior:**
   - Page should load `/login` (if not authenticated)
   - OR redirect to appropriate dashboard (if authenticated)
   - NO infinite refreshing

4. **If still looping:**
   - Open DevTools Console (F12)
   - Look for error messages
   - Share the error messages

---

## 🐛 Debug Output Examples

### ✅ GOOD (No infinite loop):

```
🔍 RoleBasedRedirect Debug: {
  loading: false,
  hasUser: false,
  hasProfile: null,
  role: undefined,
  userEmail: null
}
❌ No user found, redirecting to login
```

Then page shows login form.

### ❌ BAD (Infinite loop likely):

```
🔍 RoleBasedRedirect Debug: {
  loading: true,
  hasUser: false,
  hasProfile: null,
  ...
}

// ... repeats thousands of times ...
```

**Solution:** Check if Supabase connection is working (Solution 3)

---

## 📞 If Still Not Working

1. Check browser console for specific error messages
2. Verify Supabase project exists at supabase.com
3. Verify environment variables are correct
4. Try deleting `node_modules` and `package-lock.json`:
   ```bash
   rm -r node_modules package-lock.json
   npm install
   npm run dev
   ```

---

## 📖 Reference

- Supabase Dashboard: https://supabase.com
- Vite Env Variables: https://vitejs.dev/guide/env-and-mode.html
- React Router: https://reactrouter.com
