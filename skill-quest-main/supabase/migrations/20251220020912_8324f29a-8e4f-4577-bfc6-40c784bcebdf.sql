-- Create table for storing user code solutions
CREATE TABLE public.user_code_solutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_id UUID NOT NULL,
  code TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'javascript',
  is_validated BOOLEAN NOT NULL DEFAULT false,
  validation_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_code_solutions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own code solutions"
ON public.user_code_solutions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own code solutions"
ON public.user_code_solutions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own code solutions"
ON public.user_code_solutions
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_code_solutions_updated_at
BEFORE UPDATE ON public.user_code_solutions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_user_code_solutions_user_question ON public.user_code_solutions(user_id, question_id);