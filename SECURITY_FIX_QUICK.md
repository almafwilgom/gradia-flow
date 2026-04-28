# 🚨 EXPOSED SECRET - QUICK ACTION GUIDE

## ⚠️ CRITICAL SECURITY ISSUE

Your Supabase Service Role JWT was exposed in GitHub on April 25, 2026.

**Risk Level: CRITICAL** 🔴

---

## 🚀 IMMEDIATE FIX (25 minutes total)

### 1️⃣ ROTATE THE KEY (5 minutes)

```
Go to: https://app.supabase.com
→ Select project
→ Settings → API
→ SERVICE ROLE KEY → Click menu → "Rotate key"
→ COPY THE NEW KEY AND SAVE IT
```

**The old key is now DEAD** ✅

---

### 2️⃣ UPDATE YOUR .env FILES (5 minutes)

**File: `backend/.env`**
```
SUPABASE_SERVICE_ROLE_KEY=[PASTE NEW KEY HERE]
```

**File: `frontend/.env`** (already has ANON key, this is OK)

---

### 3️⃣ CLEAN GIT HISTORY (10 minutes)

```bash
cd c:\Users\ADMIN\Desktop\sms

# Option 1: Simple (recommended for security)
git filter-branch --tree-filter 'find . -name ".env" -type f -delete' -- --all

# Then force push
git push origin --force-with-lease --all
```

---

### 4️⃣ PREVENT FUTURE LEAKS (5 minutes)

**Add to `.gitignore`:**
```
.env
.env.local
backend/.env
supabase/.env
*.key
secrets/
```

**Verify:**
```bash
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Add .env to gitignore"
git push
```

---

## ✅ VERIFICATION

After steps above:

```bash
# Confirm git history is clean
git log --all -- backend/.env

# Should show nothing or "commit deleted"
```

---

## 🔒 What To Do Next

1. **IMMEDIATE**: Rotate key (top priority)
2. **URGENT**: Clean git history (next)
3. **TODAY**: Update .env locally
4. **TODAY**: Add to .gitignore
5. **OPTIONAL**: Check Supabase audit logs for suspicious activity

---

## 📊 Impact

| Before | After |
|--------|-------|
| ❌ Old key exposed | ✅ Old key rotated (invalid) |
| ❌ Secret in git history | ✅ Cleaned from history |
| ❌ No .gitignore protection | ✅ Protected going forward |

---

## ⏱️ Timeline

- **Now**: Do steps 1-4 above (25 minutes)
- **After rotation**: Your system is secure
- **Git history**: Will be private again after force push

---

## 🆘 IF YOU HAVE QUESTIONS

See full documentation: `SECURITY_INCIDENT_JWT_EXPOSED.md`

---

**This is URGENT! Do not delay!** 🚨

Your entire database is protected ONLY after rotating the key!
