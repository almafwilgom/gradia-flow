# SMTP Authentication Error - Fix Guide

## Problem
```
Error: Invalid login: 535 5.7.8 Authentication failed
```

This means your Brevo SMTP credentials in `.env` are **incorrect or expired**.

---

## ✅ Solution 1: Fix Brevo Credentials (RECOMMENDED)

### Step 1: Get Correct Brevo API Key

1. Go to https://app.brevo.com/settings/keys-api
2. Log in with your Brevo account
3. Under **SMTP credentials**, copy the **SMTP password** (not API key!)
4. This looks like: `xkeysib-xxxxx...`

### Step 2: Update `.env`

Replace in `backend/.env`:
```bash
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com  # Your sender email
SMTP_PASS=xkeysib-xxxxxxxxxxxxx  # Copy from Brevo settings
```

### Step 3: Restart Backend
```bash
cd backend
npm start
```

### Step 4: Test Email
```bash
curl -X POST http://localhost:4000/api/public/auth/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@gmail.com"}'
```

Expected response:
```json
{
  "ok": true,
  "message": "Test email sent successfully!",
  "details": {...}
}
```

---

## 🔄 Solution 2: Use Gmail SMTP (ALTERNATIVE)

If Brevo is having issues, switch to Gmail (easier setup):

### Step 1: Create Gmail App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer"
3. Copy the 16-character password (without spaces)

### Step 2: Update `.env`

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # 16-char password (keep spaces)
EMAIL_FROM_NAME=GradiaFlow
EMAIL_FROM_ADDRESS=your-email@gmail.com
```

### Step 3: Restart and Test
```bash
cd backend
npm start
```

---

## 🧪 Debug SMTP Connection

Add this temporary code to test connection:

```javascript
// In backend/src/index.js after line 1600

app.get('/api/debug/smtp-status', async (req, res) => {
  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  try {
    const verified = await transporter.verify();
    return res.json({
      ok: true,
      verified: verified,
      config: {
        host: SMTP_HOST,
        port: SMTP_PORT,
        user: SMTP_USER
      }
    });
  } catch (err) {
    return res.json({
      ok: false,
      error: err.message,
      code: err.code,
      config: {
        host: SMTP_HOST,
        port: SMTP_PORT,
        user: SMTP_USER
      }
    });
  }
});
```

Then test:
```bash
curl http://localhost:4000/api/debug/smtp-status
```

---

## Common Issues & Fixes

### ❌ "Invalid login" Error
- **Cause**: Wrong SMTP password
- **Fix**: 
  - Verify you copied the SMTP **password** (not API key) from Brevo
  - Make sure there are no extra spaces
  - Check if the password has expired

### ❌ "Could not connect" Error
- **Cause**: SMTP server unreachable or wrong port
- **Fix**:
  - Use `SMTP_PORT=587` for TLS (Brevo/Gmail)
  - Use `SMTP_PORT=465` for SSL (less common)
  - Check firewall/network settings

### ❌ "Authentication failed" Error
- **Cause**: Credentials don't match the SMTP user
- **Fix**: Make sure `SMTP_USER` email matches the one you created the password with

---

## Verify Your Setup

After fixing `.env`:

1. **Restart backend**: `npm start`
2. **Test email**: `curl -X POST http://localhost:4000/api/public/auth/test-email`
3. **Check inbox**: Should arrive in 1-2 minutes
4. **Try registration**: Full registration flow

---

## Need Help?

If emails still not sending after these steps:
1. Check backend logs for detailed error
2. Verify email address in SMTP_USER is correct
3. Confirm no firewall blocking port 587
4. Try alternative (Gmail instead of Brevo or vice versa)
