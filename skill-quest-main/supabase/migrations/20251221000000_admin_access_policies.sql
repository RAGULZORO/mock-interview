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

