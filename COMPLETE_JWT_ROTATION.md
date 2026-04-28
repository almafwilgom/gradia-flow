# Complete JWT Rotation & Legacy Key Disable Guide

## Current Situation

You're on the Supabase **API Keys** settings page which shows:

### 🔴 Legacy API Keys (Your Current Setup)
- **anon** key - Safe, used in frontend ✅
- **service_role** key - **COMPROMISED**, needs rotation 🔴

### 🟢 New API Keys (Recommended)
- **Publishable key** - For frontend (safer than anon) 
- **Secret key** - For backend (needs rotation after leak)

---

## ⚠️ Action Required

Since your **service_role key was exposed**, you need to:

1. ✅ Generate a new JWT secret (master key)
2. ✅ Generate new service_role key (derived from JWT)
3. ✅ Update your backend .env file
4. ✅ Disable the old legacy keys

---

## Step 1: Generate New JWT Secret (CRITICAL)

**Location:** Supabase Dashboard → Settings → API → JWT Secret

### Find JWT Configuration
1. Go to https://app.supabase.com
2. Select your project
3. Go to **Settings** (bottom left)
4. Click **API**
5. Scroll down to **JWT Secret** section

### Generate New Secret
You should see a section like:
```
JWT Secret
[Current secret hidden]
[Regenerate button]
```

**Click the "Regenerate" button**

This will:
- ✅ Invalidate the OLD secret (and all keys derived from it)
- ✅ Create a NEW secret
- ✅ All old service_role keys become INVALID

---

## Step 2: Get Your New Service Role Key

After regenerating the JWT secret, Supabase automatically creates new API keys:

1. Stay in **Settings → API**
2. Look for **SERVICE ROLE KEY** section
3. Click the **eye icon** to reveal it
4. **COPY the new key** (it will be different from the old one)

**Save this key securely - it's the new secret!**

---

## Step 3: Update Your Backend .env File

**File:** `backend/.env`

```env
PORT=4000
SUPABASE_URL=https://didveimpmnxdlfbivhru.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[PASTE YOUR NEW KEY HERE - FROM STEP 2]
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-...
```

**DO NOT COMMIT THIS FILE**

---

## Step 4: Disable Legacy API Keys (Optional but Recommended)

**Location:** Supabase Dashboard → Settings → API → Bottom section

You'll see a button: **"Disable legacy API keys"**

### Before Disabling - Checklist

Make sure you're NOT using legacy keys:

- [ ] Backend is updated with NEW service_role key
- [ ] Frontend uses ANON key (hasn't changed)
- [ ] No edge functions use legacy keys
- [ ] No CI/CD pipelines use legacy keys
- [ ] No mobile apps use legacy keys

### After Confirming

**Click: "Disable legacy API keys"**

This means:
- ✅ Old service_role key is permanently disabled
- ✅ Even if someone has it, it won't work
- ✅ New keys are now your only option

---

## Summary: What's Changing

| Component | Before | After |
|-----------|--------|-------|
| **JWT Secret** | Old (compromised) | 🆕 New |
| **Service Role Key** | Old (leaked) | 🆕 New |
| **Anon Key** | Same (OK to expose) | Same |
| **Legacy Keys** | Enabled | Disabled |

### Your Security Posture
- ✅ Before: Exposed (old key floating on GitHub)
- ✅ After: Secure (new key, old key disabled)

---

## Verification Steps

After completing everything:

### 1. Verify Backend Starts
```bash
cd backend
npm start
# Should connect to Supabase with new key
```

### 2. Verify Edge Functions Work
```bash
cd supabase
supabase functions deploy ai-chat --no-verify-jwt
# Should use new secret
```

### 3. Verify Frontend Works
```bash
cd frontend
npm run dev
# Should still work (anon key unchanged)
```

### 4. Check Supabase Dashboard
- Go to **Settings → API**
- Verify legacy keys are disabled
- Confirm new keys are in place

---

## Timeline of Changes

| What | When | Status |
|-----|------|--------|
| Old key leaked | Apr 25, 2026 | 🔴 Exposed |
| Detected by GitGuardian | Apr 28, 2026 | 🟡 Detected |
| JWT secret regenerated | NOW | 🟢 Action |
| Legacy keys disabled | NOW | 🟢 Action |
| All services updated | NOW | 🟢 Action |
| System secure | NOW | ✅ SECURE |

---

## After This Is Complete

Your system will be:

✅ **Secure** - Old key is dead, even if someone has it
✅ **Current** - Using new keys throughout
✅ **Compliant** - Following Supabase best practices
✅ **Auditable** - Legacy keys disabled

---

## Important Reminders

### DO NOT
- ❌ Commit the new key to git
- ❌ Share the key via email/Slack
- ❌ Use the old key anywhere
- ❌ Re-enable legacy keys

### DO
- ✅ Keep .env in .gitignore
- ✅ Use environment variables
- ✅ Store key securely (1Password, LastPass, etc.)
- ✅ Document the key rotation date

---

## Still Have Issues?

If services still fail after updating the key:

1. **Backend won't start?**
   - Copy the new service_role key again (might have typo)
   - Restart backend: `npm start`

2. **Frontend not working?**
   - Frontend uses ANON key (unchanged)
   - No frontend changes needed

3. **Edge functions not working?**
   - They auto-use the new JWT secret
   - Redeploy: `supabase functions deploy [function-name]`

---

## Success Indicators

After completing all steps:

✅ Backend connects to Supabase
✅ Frontend displays data
✅ Edge functions execute
✅ New key is in place
✅ Old key is disabled
✅ Git history is clean

**You're now SECURE!** 🔒
