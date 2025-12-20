-- Add level column to aptitude_questions
ALTER TABLE public.aptitude_questions ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;

-- Add level column to technical_questions
ALTER TABLE public.technical_questions ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;

-- Add level column to gd_topics
ALTER TABLE public.gd_topics ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_aptitude_questions_level ON public.aptitude_questions(level);
CREATE INDEX IF NOT EXISTS idx_technical_questions_level ON public.technical_questions(level);
CREATE INDEX IF NOT EXISTS idx_gd_topics_level ON public.gd_topics(level);