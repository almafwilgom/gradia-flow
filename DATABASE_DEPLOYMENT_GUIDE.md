# 🗄️ DATABASE DEPLOYMENT GUIDE

## Overview

The Gradia Flow database schema is stored in:
```
supabase/migrations/0001_init.sql
```

This migration file contains:
- **5 Custom Types** (user_role, school_status, pay_method, pay_status, attendance_status)
- **26 Tables** (schools, profiles, students, teachers, parents, classes, streams, subjects, results, payments, etc.)
- **15+ Views** for analytics and data aggregation
- **20+ RLS Policies** for multi-tenant security
- **10+ Triggers** for automation and data integrity

---

## ✅ Pre-Deployment Checklist

Before deploying, verify:

- [ ] Supabase project is created
- [ ] Supabase CLI is installed (`supabase --version`)
- [ ] You're logged in to Supabase CLI (`supabase projects list`)
- [ ] Project credentials are available (URL + Anon Key)
- [ ] Database is empty (first deployment) OR backup is taken (existing database)
- [ ] PostgreSQL extensions are enabled (uuid-ossp, pgcrypto)

---

## 🚀 Deployment Steps

### Option 1: Deploy via Supabase CLI (Recommended)

#### Step 1: Navigate to Project Root
```bash
cd c:\Users\ADMIN\Desktop\sms
```

#### Step 2: Verify Supabase CLI
```bash
supabase --version
```

Expected output:
```
supabase version X.XX.X
```

#### Step 3: Link to Your Supabase Project
```bash
supabase link
```

Follow the prompts:
- Select your organization
- Select your project
- Confirm linking

#### Step 4: Deploy Migration
```bash
supabase db push
```

Expected output:
```
Applying migration 0001_init.sql...
✓ Migration applied successfully
```

#### Step 5: Verify Deployment
```bash
supabase db show
```

This will display:
- Database name
- Version
- Region
- Migration status

---

### Option 2: Manual Deployment (Supabase Dashboard)

#### Step 1: Open Supabase Dashboard
- Visit https://supabase.com
- Sign in to your account
- Select your project

#### Step 2: Open SQL Editor
- Click "SQL Editor" in left sidebar
- Click "+ New Query"

#### Step 3: Copy Migration SQL
- Open `supabase/migrations/0001_init.sql` in text editor
- Copy entire contents

#### Step 4: Paste & Execute
- Paste SQL into query editor
- Click "Run" button
- Wait for completion (may take 30-60 seconds)

#### Step 5: Verify
- Check "Tables" in left sidebar
- Should see 26 tables listed
- Check "Row Level Security" for policies

---

### Option 3: Direct PostgreSQL Connection

#### Step 1: Get Connection String
- From Supabase dashboard:
  - Project Settings → Database → Connection pooling
  - Copy "URI" (PostgreSQL connection string)

#### Step 2: Connect with psql
```bash
psql "postgres://user:password@host:port/database"
```

#### Step 3: Read Migration File
```bash
\i supabase/migrations/0001_init.sql
```

#### Step 4: Verify
```sql
SELECT count(*) FROM information_schema.tables 
WHERE table_schema = 'public';
```

Should show: **26 tables**

---

## 📊 What Gets Deployed

### Custom Types (Enums)
```
✓ user_role → (super_admin, school_admin, teacher, parent, student)
✓ school_status → (pending, approved, disabled)
✓ pay_method → (manual, paystack)
✓ pay_status → (pending, approved, failed)
✓ attendance_status → (present, absent, late, excused)
```

### Core Tables
```
✓ schools          - School accounts and subscriptions
✓ profiles         - User profiles linked to auth.users
✓ students         - Student records
✓ teachers         - Teacher records
✓ parents          - Parent records
✓ classes          - Class information
✓ streams          - Class streams (A, B, C, etc.)
✓ subjects         - Subject/course information
```

### Academic Tables
```
✓ results          - Student exam results and grades
✓ attendance_students - Student attendance records
✓ attendance_staff     - Staff attendance records
✓ exams            - Exam information
✓ exam_questions   - Exam questions
✓ exam_submissions - Student exam submissions
✓ timetables       - Class timetables
✓ timetable_entries - Individual timetable slots
```

### Financial Tables
```
✓ payments         - Fee payments
✓ fee_structures   - Class fees
✓ expenses         - School expenses
✓ payroll          - Staff payroll
✓ sms_wallets      - SMS credit balance
✓ sms_logs         - SMS transaction logs
✓ subscriptions    - Subscription records
```

### Communication Tables
```
✓ messages         - Teacher-parent messaging
✓ announcements    - School announcements
✓ pages            - CMS pages
✓ gallery_items    - Photo gallery
✓ media_library    - Media files
```

### Views (Analytics)
```
✓ school_directory         - Approved schools only
✓ vw_school_overview       - School stats
✓ vw_dashboard_stats       - Platform-wide stats
```

### Functions (Logic)
```
✓ current_user_role()
✓ current_school_id()
✓ school_is_operational()
✓ current_school_is_operational()
✓ current_teacher_class_id()
✓ handle_new_user()         (trigger on auth.users)
✓ generate_school_code()
✓ generate_student_code()
✓ ensure_school_code()      (trigger on schools)
✓ ensure_student_code()     (trigger on students)
✓ sync_result_lock()        (trigger on payments)
```

### Row Level Security (RLS)
```
✓ 27 RLS policies enforcing:
  - Super admins see all data
  - School admins see only their school's data
  - Teachers see only their class's data
  - Parents see only their children's data
  - Students see only their own data
```

---

## ✅ Post-Deployment Verification

### Step 1: Check Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected: **26 tables** listed

### Step 2: Check Enums Exist
```sql
SELECT typname 
FROM pg_type 
WHERE typnamespace = 'public'::regnamespace::oid;
```

Expected: **5 custom types** (user_role, school_status, etc.)

### Step 3: Check RLS Policies
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

Expected: **27 policies** listed

### Step 4: Check Views Exist
```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public';
```

Expected: **3 views** (school_directory, vw_school_overview, vw_dashboard_stats)

### Step 5: Check Functions
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';
```

Expected: **11+ functions** listed

---

## 🔐 Security Verification

### Verify RLS is Enabled
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All tables should show: **rowsecurity = t** (true)

### Test RLS Policies
Create test users with different roles:

1. **Super Admin Test**
   ```sql
   -- Should see all schools
   SELECT * FROM public.schools;
   ```

2. **School Admin Test**
   ```sql
   -- Should see only their school
   SELECT * FROM public.schools 
   WHERE id = current_school_id();
   ```

3. **Student Test**
   ```sql
   -- Should see only own results
   SELECT * FROM public.results 
   WHERE student_id = current_user_id();
   ```

---

## 🐛 Troubleshooting

### Issue: Extension Not Found
```
ERROR: extension "uuid-ossp" does not exist
```

**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Issue: Type Already Exists
```
ERROR: type "user_role" already exists
```

**Solution:** Use `DROP TYPE IF EXISTS` (but careful, may cascade):
```bash
supabase db reset
```

Then redeploy.

### Issue: Table Already Exists
```
ERROR: relation "schools" already exists
```

**Solution:** Either:
1. Use `DROP TABLE IF EXISTS` and rerun
2. Or use `supabase db reset` to start fresh

### Issue: RLS Policy Conflict
```
ERROR: policy "super admin manage schools" already exists
```

**Solution:** Drop existing policies:
```bash
supabase db push --dry-run
# Review what would change
supabase db push  # Then apply
```

### Issue: Trigger Function Failed
```
ERROR: function "handle_new_user" does not exist
```

**Solution:** Ensure all functions are created before triggers:
```bash
supabase db push --dry-run
# Check order of operations
```

---

## 📈 Next Steps After Deployment

### 1. Create Test Data (Optional)
```sql
-- Insert test school
INSERT INTO public.schools (name, status)
VALUES ('Test School', 'approved');

-- Insert test admin
INSERT INTO auth.users (email, encrypted_password)
VALUES ('admin@test.com', 'hashedpassword');

-- Insert profile
INSERT INTO public.profiles 
  (id, school_id, role, full_name, email)
VALUES ('user-uuid', 'school-uuid', 'school_admin', 'Admin Name', 'admin@test.com');
```

### 2. Set Up Frontend Environment Variables
```bash
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Test Login Flow
- Create test user with `supabase_admin` role
- Login and verify redirection
- Test each portal (super admin, admin, student)

### 5. Verify Data Flow
- Create test school
- Create test students
- View in super admin dashboard
- Verify RLS is working

### 6. Monitor Logs
```bash
supabase functions list
supabase functions logs
```

---

## 🚀 Deployment Checklist

Before going live:

- [ ] Database migration deployed successfully
- [ ] All 26 tables created
- [ ] All 5 custom types created
- [ ] All 27 RLS policies applied
- [ ] All 11+ functions created
- [ ] All triggers working
- [ ] Test data inserted (optional)
- [ ] Frontend environment variables set
- [ ] Frontend npm install completed
- [ ] Local testing completed
- [ ] Test login works
- [ ] Data isolation verified (RLS working)
- [ ] Backup taken before production deployment
- [ ] Monitoring set up
- [ ] Error logging configured

---

## 📞 Support

If deployment fails:

1. Check error message carefully
2. Review the specific line in `0001_init.sql` that failed
3. Check if prerequisite objects exist (types, functions, tables)
4. Try `supabase db reset` and rerun
5. Review troubleshooting section above
6. Check Supabase logs for details

---

## ✅ Deployment Complete

Once migration is deployed:

✅ Database schema is ready
✅ RLS policies are enforced
✅ Triggers are active
✅ Views are available
✅ Functions are callable
✅ Ready for frontend connection

---

**Next:** Set up frontend environment variables and run `npm run dev` to test!
