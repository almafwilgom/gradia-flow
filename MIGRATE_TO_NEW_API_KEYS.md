# 🔐 Update Backend to Use NEW Secret API Keys (Not Legacy)

## Current Problem

Your `backend/.env` is using **OLD LEGACY KEYS**:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6I... (EXPOSED & LEAKED)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6I...
```

**This format is LEGACY and EXPOSED on GitHub** 🔴

---

## What Supabase is Showing You

On the API Keys page, you now see **THREE sections**:

### 1. **Publishable Keys** (NEW - Safe for Frontend)
```
Name: default
Key: sb_publishable_U3LQfm-oqY9SmwCkcKMZAg_UvsG1p_7

Name: gradiaflow  
Key: sb_publishable_ks1eki159X5na_W7pJPSdw_vOkTx1sN
```

### 2. **Secret Keys** (NEW - For Backend Servers)
```
Name: default
Key: sb_secret_dtDS2••••••••••••••••
      (Click to reveal full key)

Name: gradiaflow
Key: sb_secret_8vaVB••••••••••••••••
      (Click to reveal full key)
```

### 3. **Legacy Keys** (OLD - DEPRECATED)
```
anon: eyJhbGciOiJIUzI1NiIs...
service_role: eyJhbGciOiJIUzI1NiIs... (THIS IS YOUR EXPOSED KEY)
```

---

## 🚀 How to Fix

### Step 1: Use the "gradiaflow" Secret Key

On the Supabase API Keys page:

1. Find **"Secret keys"** section
2. Look for **"gradiaflow"** entry
3. Click to **reveal the full key** (masked as `sb_secret_8vaVB••••••••••••••••`)
4. **COPY the full secret key**

### Step 2: Update Your backend/.env

**Replace line 3:**

```diff
- SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6I...
+ SUPABASE_SECRET_KEY=sb_secret_8vaVB[PASTE FULL KEY HERE]
```

Your new `backend/.env` should look like:

```env
PORT=4000
SUPABASE_URL=https://didveimpmnxdlfbivhru.supabase.co
SUPABASE_SECRET_KEY=sb_secret_8vaVB[YOUR_FULL_KEY]
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6I...
OPENAI_API_KEY=sk-proj-...
PAYSTACK_SECRET=paystack-secret
```

### Step 3: Update Backend Code (If Using Service Role Key)

Search your backend files for `SUPABASE_SERVICE_ROLE_KEY`:

```bash
# Find where it's used:
grep -r "SUPABASE_SERVICE_ROLE_KEY" backend/
```

If found, update references:

```javascript
// OLD:
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// NEW:
const secretKey = process.env.SUPABASE_SECRET_KEY;
```

---

## Understanding the New API Key System

### OLD Legacy Keys
```
anon:         eyJhbGciOiJIUzI1NiIs... (JWT format)
service_role: eyJhbGciOiJIUzI1NiIs... (JWT format)
```
- ❌ JWT format (hard to rotate)
- ❌ Not namespace-isolated
- ❌ Your service_role is exposed
- ❌ LEGACY - Supabase recommends migrating away

### NEW API Keys
```
publishable: sb_publishable_U3LQfm-oqY9SmwCkcKMZAg_UvsG1p_7 (Safer format)
secret:      sb_secret_dtDS2••••••••••••••••               (Safer format)
```
- ✅ Non-JWT format (easier to rotate)
- ✅ Clear separation (publishable vs secret)
- ✅ Safer format
- ✅ RECOMMENDED by Supabase

---

## Key Differences

| Aspect | Legacy | NEW |
|--------|--------|-----|
| Format | JWT (eyJ...) | Token (sb_*) |
| Frontend Safe? | anon only | publishable recommended |
| Backend Use | service_role | secret |
| Rotation | Hard | Easy |
| Supabase Status | Deprecated | Recommended |

---

## Detailed Steps (Screenshots Reference)

### Finding Secret Key on Supabase

1. **Login to Supabase**: https://app.supabase.com
2. **Select Project**: GradiaFlow
3. **Go to Settings → API Keys**
4. **Look at "Secret keys" section**
5. **Find "gradiaflow" row**
6. **Click the key value** (shows as `sb_secret_8vaVB••••••••••••••••`)
7. **Click "Show" or eye icon** to reveal
8. **COPY the entire revealed key**

### Updating .env File

1. **Open**: `backend/.env`
2. **Find line 3**: `SUPABASE_SERVICE_ROLE_KEY=...`
3. **Replace with**: `SUPABASE_SECRET_KEY=sb_secret_[FULL_KEY_FROM_STEP_8]`
4. **Save file** (Ctrl+S)
5. **DO NOT COMMIT** this file

---

## Testing After Update

```bash
# Stop current backend if running
Ctrl+C

# Start backend with new key
cd backend
npm start

# You should see:
# ✅ Connected to Supabase
# ✅ Server running on port 4000
```

If you get connection errors:
- Double-check the key was copied fully
- Verify no extra spaces in .env
- Verify the URL is correct

---

## Security Improvement

### Before (OLD)
```
backend/.env:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs... ❌ EXPOSED & LEAKED
```
- ❌ Exposed on GitHub
- ❌ JWT format (hard to revoke)
- ❌ Vulnerable format

### After (NEW)
```
backend/.env:
SUPABASE_SECRET_KEY=sb_secret_8vaVB... ✅ CURRENT & SECURE
```
- ✅ New secure format
- ✅ Old format completely retired
- ✅ Easy to rotate if needed

---

## Next Steps

1. ✅ Copy the NEW secret key from Supabase
2. ✅ Update `backend/.env` with new key
3. ✅ Test backend connection
4. ✅ Verify everything works
5. ✅ Update code if needed (search for SUPABASE_SERVICE_ROLE_KEY)

---

## Summary

| Action | Status |
|--------|--------|
| Find gradiaflow secret key | ⏳ DO THIS NEXT |
| Reveal full key | ⏳ DO THIS NEXT |
| Copy to backend/.env | ⏳ DO THIS NEXT |
| Test backend | ⏳ DO THIS NEXT |
| Verify connection | ⏳ DO THIS NEXT |

**Your system will be SECURE once you use the new secret keys!** 🔒
