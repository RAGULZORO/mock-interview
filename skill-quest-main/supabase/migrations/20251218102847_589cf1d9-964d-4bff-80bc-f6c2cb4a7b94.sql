
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create aptitude_questions table
CREATE TABLE public.aptitude_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer INTEGER NOT NULL,
    explanation TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.aptitude_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view aptitude questions"
ON public.aptitude_questions FOR SELECT
USING (true);

CREATE POLICY "Admins can insert aptitude questions"
ON public.aptitude_questions FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update aptitude questions"
ON public.aptitude_questions FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete aptitude questions"
ON public.aptitude_questions FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create technical_questions table
CREATE TABLE public.technical_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'Medium',
    category TEXT NOT NULL DEFAULT 'General',
    description TEXT NOT NULL,
    examples JSONB NOT NULL,
    solution TEXT NOT NULL,
    approach TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.technical_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view technical questions"
ON public.technical_questions FOR SELECT
USING (true);

CREATE POLICY "Admins can insert technical questions"
ON public.technical_questions FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update technical questions"
ON public.technical_questions FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete technical questions"
ON public.technical_questions FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create gd_topics table
CREATE TABLE public.gd_topics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    description TEXT NOT NULL,
    points_for JSONB NOT NULL,
    points_against JSONB NOT NULL,
    tips JSONB NOT NULL,
    conclusion TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.gd_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gd topics"
ON public.gd_topics FOR SELECT
USING (true);

CREATE POLICY "Admins can insert gd topics"
ON public.gd_topics FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update gd topics"
ON public.gd_topics FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete gd topics"
ON public.gd_topics FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
