# How to Apply Admin Access Migration

## Migration SQL to Run

Copy and paste this SQL into your database SQL editor (Lovable or Supabase):

```sql
-- Add admin policies for user_progress table
-- Allow admins to view all user progress
CREATE POLICY "Admins can view all user progress"
ON public.user_progress
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add admin policies for profiles table
-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```

## Steps to Apply:

### If using Lovable Platform:
1. Open your project in Lovable
2. Navigate to **Database** or **Supabase** section
3. Open **SQL Editor**
4. Paste the SQL above
5. Click **Run** or **Execute**

### If you have direct Supabase access:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Click **New query**
5. Paste the SQL above
6. Click **Run**

## What This Does:

- Allows admin users to view ALL user progress data
- Allows admin users to view ALL user profiles
- Without this, admins can only see their own data due to Row Level Security (RLS)

## After Applying:

1. Refresh your app
2. Log in as admin
3. Go to Admin Panel → User Progress
4. Click "Load User Progress"
5. You should now see all users and their progress!


