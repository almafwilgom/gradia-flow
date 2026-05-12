# Email Confirmation Setup for School Admin Registration

## Overview
School admins now must confirm their email address before gaining access to the dashboard. This ensures a verified email list and protects against invalid registrations.

## Flow

### 1. **Registration**
- User selects "School Admin" role during registration
- Enters full name, email, and school name
- Clicks "Register"
- System sends confirmation email via Brevo SMTP

### 2. **Email Confirmation**
- Beautiful HTML email with:
  - GradiaFlow branding and logo
  - School name and admin details
  - Clear action steps
  - Secure confirmation link (expires in 24 hours)
  - Security notice and backup link
  
### 3. **Verification Page**
- User clicks link in email: `{FRONTEND_URL}/auth/confirm-email?token={token}`
- Page shows:
  - Email verification status
  - Password setup form (must match and be 6+ chars)
  - Clear instructions and error messages
  - Loading state during verification

### 4. **Account Creation**
- Backend verifies confirmation token
- Creates school if needed (with demo subscription)
- Creates user in Supabase Auth
- Creates user profile with school_admin role
- Marks token as consumed
- User redirected to login

## Backend Endpoints

### `/api/public/auth/send-confirmation-email` (POST)
**Purpose:** Send confirmation email to school admin

**Request Body:**
```json
{
  "email": "admin@school.com",
  "full_name": "John Doe",
  "school_name": "Sunrise Academy"
}
```

**Response:**
```json
{
  "ok": true,
  "reused": false,
  "message": "Confirmation email sent successfully",
  "token_expires_in": "24 hours"
}
```

**Features:**
- Generates unique confirmation token (32-byte hex)
- Stores token in `email_confirmation_tokens` table with 24-hour expiry
- Rate limits resend to 5 minutes minimum
- Checks if email already registered
- Detailed error logging

### `/api/public/auth/verify-confirmation` (POST)
**Purpose:** Verify token and complete registration

**Request Body:**
```json
{
  "token": "hex_token_string",
  "password": "admin_password"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Email confirmed successfully. Your account is ready!",
  "user_id": "uuid",
  "email": "admin@school.com"
}
```

**Features:**
- Validates token and expiry
- Creates school with demo plan (24-hour trial)
- Creates Supabase Auth user with `email_confirm: true`
- Creates user profile with school_admin role
- Marks token as consumed for security

### `/api/public/auth/test-email` (POST) ⭐ NEW
**Purpose:** Test Brevo SMTP configuration

**Request Body:**
```json
{
  "email": "test@example.com"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Test email sent successfully!",
  "details": {
    "email": "test@example.com",
    "smtpHost": "smtp-relay.brevo.com",
    "smtpPort": 587,
    "messageId": "...",
    "timestamp": "2026-05-12T..."
  }
}
```

**Use Case:** Test if Brevo SMTP is properly configured before deploying

## Email Template Features

### HTML Email Design
- Modern gradient header with GradiaFlow branding
- School information highlighted in info box
- Step-by-step guide (What's Next section)
- Large, accessible CTA button
- Backup link for email clients that don't render buttons
- Security notice about link expiry
- Professional footer with support links

### Plain Text Version
- All content accessible without HTML rendering
- Clear section breaks with ASCII art
- Complete information for text-only email clients

## Database Table

### `email_confirmation_tokens`
```sql
CREATE TABLE email_confirmation_tokens (
  id BIGSERIAL PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  school_name TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_email_confirmation_tokens_token ON email_confirmation_tokens(token);
CREATE INDEX idx_email_confirmation_tokens_email ON email_confirmation_tokens(email);
CREATE INDEX idx_email_confirmation_tokens_expires_at ON email_confirmation_tokens(expires_at);
```

## Environment Variables

Required in `backend/.env`:

```bash
# SMTP Configuration (Brevo)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-email@gmail.com
SMTP_PASS=xkeysib-... (from Brevo API keys)

# Email Configuration
EMAIL_FROM_NAME=GradiaFlow
EMAIL_FROM_ADDRESS=noreply@gradiaflow.com

# Frontend URL for confirmation link
FRONTEND_URL=https://gradia-flow.pages.dev
```

## Configuration Details

### Brevo SMTP Setup
1. Go to https://brevo.com
2. Log in or create account
3. Navigate to SMTP & API
4. Copy SMTP credentials
5. Add to backend/.env
6. Test using `/api/public/auth/test-email`

### Timing
- Token TTL: 24 hours
- Resend cooldown: 5 minutes
- No automatic pruning (manual in endpoint)

### Error Handling
- ✅ Rate limiting (429 response)
- ✅ SMTP authentication errors
- ✅ Connection failures
- ✅ Already registered emails
- ✅ Expired tokens
- ✅ Invalid tokens

## Security Features

1. **Token Security**
   - Cryptographically random (32-byte hex)
   - Stored in database, not in email subject/body
   - Expires after 24 hours
   - One-time use (marked consumed)

2. **Email Verification**
   - Prevents spam registrations
   - Confirms email deliverability
   - Required before dashboard access

3. **Rate Limiting**
   - Prevents email flooding
   - 5-minute cooldown between resends
   - Per-email tracking

4. **Admin Account Protection**
   - Password set after email verification
   - Email must be confirmed before access
   - Supabase Auth handles password hashing

## Testing

### Manual Testing

1. **Test Email Delivery:**
   ```bash
   curl -X POST http://localhost:4000/api/public/auth/test-email \
     -H "Content-Type: application/json" \
     -d '{"email": "your-test-email@gmail.com"}'
   ```

2. **Register as School Admin:**
   - Go to http://localhost:5173/register
   - Select "School Admin" role
   - Enter details
   - Check email for confirmation link

3. **Verify Email:**
   - Click link in email
   - Set password
   - Complete setup
   - Login with email and password

### Automated Testing

Check backend logs:
```bash
# Watch logs for email delivery
grep -i "[EMAIL]" backend-logs.txt

# Check for errors
grep -i "[EMAIL ERROR]" backend-logs.txt
```

## Troubleshooting

### Email Not Sending
1. Check SMTP credentials in .env
2. Run test endpoint: `POST /api/public/auth/test-email`
3. Check backend logs for detailed error
4. Verify Brevo account is active and has credits

### Email in Spam
1. Add noreply@gradiaflow.com to safe senders
2. Check DKIM/SPF configuration in Brevo
3. Check email domain authentication

### Token Expired
1. User must register again
2. New token will be generated
3. New confirmation email sent

### Already Registered Error
1. User should use forgot password flow
2. Or contact support to reset account

## Future Enhancements

- [ ] Email template customization per school
- [ ] SMS fallback for verification
- [ ] Two-factor authentication option
- [ ] Resend button in registration page
- [ ] Email verification progress tracking
- [ ] Bulk invite for staff members
