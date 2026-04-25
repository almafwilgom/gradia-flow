# 🔧 Row-Level Security (RLS) Fix for Parents Table

## Problem

When trying to add a new student with parent/guardian information, you got this error:

```
new row violates row-level security policy for table "parents"
```

### Root Cause

The RLS policy on the `parents` table was too restrictive. It only allowed `school_admin` and `parent` roles to insert/update parent records, but **excluded teachers**.

Original policy:
```sql
with check (
  (school_id = (select school_id from public.profiles where id = auth.uid()) 
   and current_user_role() in ('school_admin', 'parent'))
  or current_user_role() = 'super_admin'
)
```

Notice: `'teacher'` is NOT in the list!

---

## Why This Is a Problem

The `Students.jsx` component allows both school admins AND teachers to add students. When adding a student, the system tries to:

1. Create/update a parent record with the guardian information
2. Link the parent to the student

But if a **teacher** tries to add a student, step 1 fails because the RLS policy prevents teachers from creating parents.

---

## Solution

Created new migration: `0006_fix_parents_rls_for_staff.sql`

This adds `'teacher'` to the allowed roles:

```sql
with check (
  (school_id = (select school_id from public.profiles where id = auth.uid()) 
   and current_user_role() in ('school_admin', 'teacher', 'parent'))  -- ✅ Added 'teacher'
  or current_user_role() = 'super_admin'
)
```

### What This Allows

- ✅ **School Admins** - Can create/edit parents
- ✅ **Teachers** - Can create/edit parents for their school
- ✅ **Parents** - Can create/edit their own information
- ✅ **Super Admins** - Can do everything

### What This Prevents

- ❌ Teachers from accessing parents in OTHER schools
- ❌ Any unauthenticated access
- ❌ Cross-school parent manipulation

---

## How to Fix

### Step 1: Deploy the migration

```bash
cd c:\Users\ADMIN\Desktop\sms
supabase db push
```

This will run `0006_fix_parents_rls_for_staff.sql` and update the RLS policy.

### Step 2: Try again

Go back to the Students page and try adding a student:
1. Select a class
2. Fill in student information
3. Fill in guardian information
4. Click "Add Student"

This time it should work! ✅

---

## Technical Details

### Why School ID Matters

The RLS policy checks:
```sql
school_id = (select school_id from public.profiles where id = auth.uid())
```

This ensures:
- Teachers can only create parents in their own school
- Admins can only create parents in their school
- No cross-school data leakage

### The Tradeoff

By adding teachers to the allowed roles, we're saying:
- Teachers need to manage parent records for their students
- This is necessary for the add-student workflow
- But the school_id check still prevents abuse

This is the **right balance** between functionality and security.

---

## Verification

After deploying the fix, you can verify the policy with this SQL:

```sql
select tablename, policyname from pg_policies where tablename = 'parents';
```

You should see:
```
tablename | policyname
-----------+-------------------
parents   | parents by school
```

To see the full policy details:
```sql
select * from pg_policies where tablename = 'parents' and policyname = 'parents by school';
```

---

## Impact

### Before Fix
- ❌ Teachers could NOT add students
- ❌ Teachers got RLS policy violation
- ✅ Only school admins could add students

### After Fix
- ✅ Teachers CAN add students
- ✅ School admins CAN add students
- ✅ Both fully functional
- ✅ No security regression (school_id check still enforced)

---

## Related Components

- **File**: `frontend/src/pages/Students.jsx` (line 170-179)
  - This is where the parent insert happens
  - Now it will work for both admins and teachers

- **Migration**: `supabase/migrations/0001_init.sql` (line 976-986)
  - Original RLS policy
  - Now superseded by the fix

- **Supabase Documentation**: [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

---

## Testing Checklist

After deploying the fix:

- [ ] Login as **school admin**
- [ ] Go to Students page
- [ ] Add a new student with parent info
- [ ] Should succeed ✅

- [ ] Login as **teacher**
- [ ] Go to Students page  
- [ ] Add a new student with parent info
- [ ] Should succeed ✅

- [ ] Verify you can't access parents from OTHER schools
- [ ] Verify data isolation works correctly

---

## Summary

**Before**: Teachers couldn't add students because they couldn't create parent records
**After**: Teachers can add students and manage parent records in their school
**Security**: Still enforced via school_id check - no cross-school access possible

The fix is **minimal, targeted, and maintains security**. 🔐
