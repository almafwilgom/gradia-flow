# ✅ JWT Rotation Checklist

## 🎯 Objective
After your Service Role JWT leak, rotate to a new secret and disable legacy keys.

**Time: 15 minutes**

---

## ☐ Step 1: Regenerate JWT Secret (5 min)

```
Location: Supabase Dashboard → Settings → API
Action: Click "Regenerate" next to JWT Secret
Result: New secret generated, old one invalidated
```

**Status: [ ] DONE**

---

## ☐ Step 2: Copy New Service Role Key (2 min)

```
Location: Same page → SERVICE ROLE KEY section
Action: Click eye icon → Copy the key
Result: New key copied to clipboard
Save: Store safely before moving on
```

**Status: [ ] DONE**

**Key (first 50 chars):** 
```
[paste here to verify you have it]
```

---

## ☐ Step 3: Update Backend .env (3 min)

```
File: backend/.env
Find: SUPABASE_SERVICE_ROLE_KEY=old_key_here
Replace: SUPABASE_SERVICE_ROLE_KEY=new_key_from_step_2
Save: Ctrl+S
DO NOT COMMIT!
```

**Status: [ ] DONE**

---

## ☐ Step 4: Disable Legacy Keys (3 min)

```
Location: Supabase Dashboard → Settings → API
Scroll down: Find "Disable legacy API keys" button
Verify: 
  ☐ Backend .env updated
  ☐ No other services use old keys
Action: Click "Disable legacy API keys"
Result: Old keys permanently disabled
```

**Status: [ ] DONE**

---

## ☐ Step 5: Test Everything (2 min)

```bash
# Terminal 1: Backend
cd backend
npm start
# Should connect without errors

# Terminal 2: Frontend (new terminal)
cd frontend
npm run dev
# Should start normally

# Browser: http://localhost:5173
# Should load and display data
```

**Status: [ ] DONE**

---

## 🎉 Verification

After all steps:

- [ ] JWT secret regenerated ✅
- [ ] New service_role key obtained ✅
- [ ] Backend .env updated ✅
- [ ] Legacy keys disabled ✅
- [ ] All services tested ✅

---

## 🔒 Security Status

**Before:** 🔴 Old key exposed on GitHub (leaked)
**After:** 🟢 New key in place, old key disabled

**Your system is now SECURE!**

---

## 📝 Notes

Date completed: ____________
Old key: [Remember NOT to use this anymore]
New key safely stored: [ ] YES

---

## ⚠️ If Something Goes Wrong

### Backend won't start?
```bash
# Check .env file has correct key
cat backend/.env | grep SUPABASE_SERVICE_ROLE_KEY
# Make sure there are no typos
```

### Frontend not working?
- Frontend uses ANON key (hasn't changed)
- If frontend is broken, check anon key in .env

### Edge functions broken?
- Regenerate new secret already fixes them
- If needed: `supabase functions deploy [name]`

---

**YOU'RE DONE! Your system is now secure!** 🔒✅
