# 🔐 Quick: Migrate to NEW API Keys

## What You're Seeing

Supabase is showing you TWO API key systems:

```
OLD (LEGACY) - DEPRECATED ❌
├─ anon: eyJhbGciOiJIUzI1NiIs...
└─ service_role: eyJhbGciOiJIUzI1NiIs... ← YOUR EXPOSED KEY 🔴

NEW (RECOMMENDED) ✅
├─ Publishable: sb_publishable_U3LQfm-oqY9SmwCkcKMZAg_UvsG1p_7
└─ Secret: sb_secret_8vaVB••••••••••••••• ← USE THIS FOR BACKEND
```

---

## 3-Minute Fix

### 1. Copy New Secret Key (1 min)

On Supabase API Keys page:
- Find: **"Secret keys"** section
- Click: **"gradiaflow"** row  
- Click: **eye icon** to reveal
- Copy: **Full key** (starts with `sb_secret_`)

### 2. Update backend/.env (1 min)

File: `backend/.env`

```diff
- SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
+ SUPABASE_SECRET_KEY=sb_secret_[PASTE_KEY_HERE]
```

Keep everything else the same.

### 3. Test (1 min)

```bash
cd backend
npm start
# Should connect: ✅ Supabase Connected
```

---

## Why This Matters

| Old Key | New Key |
|---------|---------|
| eyJhbGciOiJIUzI1NiIs... | sb_secret_8vaVB... |
| ❌ JWT (exposed format) | ✅ Token (safe format) |
| ❌ Hard to rotate | ✅ Easy to rotate |
| ❌ LEAKED on GitHub | ✅ Fresh & new |
| ❌ Deprecated | ✅ Recommended |

---

## Done! ✅

Your backend now uses:
- 🆕 New secure format
- 🆕 Current non-exposed key
- 🆕 Supabase-recommended system

**Security upgraded!** 🔒
