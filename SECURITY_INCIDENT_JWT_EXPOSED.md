# 🚨 CRITICAL: Supabase Service Role JWT Security Leak - IMMEDIATE ACTION REQUIRED

## What Happened

GitGuardian detected that your **Supabase Service Role JWT** (a highly sensitive secret) was committed to your GitHub repository `almafwilgom/gradia-flow` on April 25th, 2026.

**Status: SECURITY BREACH** 🔴

---

## ⚠️ What This Means

**ANYONE WITH THIS TOKEN CAN:**
- ✗ Access ALL your database data
- ✗ Bypass row-level security (RLS) policies
- ✗ Modify or delete student records, grades, payment info, etc.
- ✗ Create/modify/delete user accounts
- ✗ Access parent and teacher information
- ✗ Compromise the entire system

**SEVERITY: CRITICAL** 🔴

---

## 🚀 IMMEDIATE ACTIONS (Do These NOW)

### STEP 1: Rotate Your Service Role Key (URGENT - 5 minutes)

**Go to Supabase Dashboard:**
1. Open https://app.supabase.com
2. Select your project: `didveimpmnxdlfbivhru`
3. Go to **Settings → API**
4. Under "SERVICE ROLE KEY", click the three dots menu
5. Click **"Rotate key"** (or "Generate new key")
6. Confirm the rotation
7. **Copy the NEW service role key** (save it safely)

The old key is NOW INVALIDATED ✅

---

### STEP 2: Clean Git History (Remove From Public Access)

**These commands remove the secret from git history permanently:**

```bash
cd c:\Users\ADMIN\Desktop\sms

# Option A: Using git-filter-branch (complete history rewrite)
git filter-branch --tree-filter 'find . -name ".env" -o -name "*.env" | xargs rm -f' -- --all

# OR Option B: Using BFG (faster, recommended)
# First install: https://rtyley.github.io/bfg-repo-cleaner/
bfg --delete-files backend/.env
bfg --delete-files supabase/.env
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push to remove history
git push origin --force-with-lease --all
```

---

### STEP 3: Update Your Local Environment Files

**Update backend/.env with NEW service role key:**

```bash
# File: backend/.env

PORT=4000
SUPABASE_URL=https://didveimpmnxdlfbivhru.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[PASTE YOUR NEW KEY HERE]
SUPABASE_ANON_KEY=your_supabase_anon_key_here
OPENAI_API_KEY=sk-proj-...
```

**Never commit this file again!**

---

### STEP 4: Add to .gitignore (CRITICAL)

**Make sure these files are NEVER committed again:**

```bash
# Create/update: .gitignore

# Environment files (CRITICAL - NEVER COMMIT)
.env
.env.local
.env.*.local
backend/.env
supabase/.env
supabase/.env.local
frontend/.env.local

# API Keys and secrets
*.key
*.pem
secrets/
```

**Verify it's in .gitignore:**
```bash
cat .gitignore | grep ".env"
```

---

### STEP 5: Verify the Fix

```bash
# Check git history doesn't contain secrets
git log --all --full-history -p -- backend/.env | head -20

# Should show: "commit deleted"
```

---

## ✅ Verification Checklist

After completing the above:

- [ ] **Rotated Service Role Key** in Supabase dashboard
- [ ] **Updated backend/.env** with new key
- [ ] **Ran git filter** to remove secrets from history
- [ ] **Forced git push** to update remote
- [ ] **Added .env to .gitignore**
- [ ] **Verified git history** is clean

---

## 🔍 What Was Exposed?

**If this key was used maliciously, someone could have:**
- ✗ Read all student data (names, enrollment, grades)
- ✗ Read all parent information (emails, phone, addresses)
- ✗ Read all financial records (invoices, payments)
- ✗ Read all teacher information
- ✗ Modified any records
- ✗ Created fake admin accounts

**HIGHEST PRIORITY: Rotate immediately!** 🔴

---

## 🛡️ How to Prevent This In The Future

### 1. Never Commit .env Files
```bash
# Instead of committing .env, only commit .env.example
# with placeholder values

# .env.example:
SUPABASE_SERVICE_ROLE_KEY=your-key-here-never-commit-real-value
OPENAI_API_KEY=sk-...
```

### 2. Use Environment Variables
```bash
# Use system environment variables instead
export SUPABASE_SERVICE_ROLE_KEY="actual-key"
# Backend reads from process.env.SUPABASE_SERVICE_ROLE_KEY
```

### 3. Use Secrets Management
```bash
# For production deployments, use:
- GitHub Secrets (for CI/CD)
- Supabase Project Environment (for edge functions)
- Vercel/Railway/Render Secrets (for deployments)
- 1Password/LastPass (for local development)
```

### 4. Git Pre-commit Hook
```bash
# Create file: .git/hooks/pre-commit

#!/bin/bash
if git diff --cached | grep -E "SUPABASE_SERVICE_ROLE_KEY|sk-proj-|private_key"; then
  echo "ERROR: Attempting to commit sensitive data!"
  exit 1
fi
```

---

## 📋 Timeline

| Date | Event | Status |
|------|-------|--------|
| Apr 25, 2026 | Secret committed to GitHub | ⚠️ EXPOSED |
| Apr 28, 2026 | GitGuardian detection | 🔴 DETECTED |
| TODAY | Rotate key (DO THIS NOW!) | ⏳ PENDING |
| TODAY | Clean git history | ⏳ PENDING |
| TODAY | Update .env files | ⏳ PENDING |
| TODAY | Add to .gitignore | ⏳ PENDING |

---

## 📞 Additional Security Steps (Optional but Recommended)

### 1. Review Who Accessed The Repo
```bash
# Check git log to see all commits
git log --oneline

# Look for suspicious commits from unknown users
git log --format="%h %an %s"
```

### 2. Check Supabase Audit Logs
1. Go to Supabase Dashboard
2. Go to **Auth → Audit Logs**
3. Look for suspicious activity during Apr 25 - now
4. Check for:
   - Unexpected user signups
   - Data modifications
   - Role changes
   - API access logs

### 3. Monitor Your Supabase Project
```bash
# Check for suspicious profiles
SELECT id, email, role, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10;

# Check for suspicious data modifications
SELECT * FROM students ORDER BY updated_at DESC LIMIT 10;
```

### 4. Notify Your Team
If you have a team:
- Tell them the key was exposed
- Share the new key securely (NOT via email/Slack!)
- Tell them to update their local .env files
- Use 1Password or similar for secure sharing

---

## 🚨 IMMEDIATE ACTION REQUIRED

### This is a CRITICAL security issue. Do NOT ignore.

**Action Items (TODAY):**
1. ✅ Rotate Service Role Key (5 min)
2. ✅ Clean git history (10 min)
3. ✅ Update .env files (5 min)
4. ✅ Add to .gitignore (2 min)
5. ✅ Force git push (2 min)

**Total Time: 25 minutes to secure your system**

---

## 📖 Reference

- **Supabase Docs**: https://supabase.com/docs/guides/api/api-keys
- **GitHub Secrets**: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- **OWASP Secrets Management**: https://owasp.org/www-community/Sensitive_Data_Exposure

---

## Summary

| Issue | Severity | Action | Time |
|-------|----------|--------|------|
| Exposed JWT | 🔴 CRITICAL | Rotate key | 5 min |
| Git history | 🔴 CRITICAL | Clean history | 10 min |
| .env files | 🔴 CRITICAL | Update & ignore | 7 min |
| Monitoring | 🟡 HIGH | Check logs | 10 min |

**DO THIS NOW! Your entire school database is at risk!** 🚨
