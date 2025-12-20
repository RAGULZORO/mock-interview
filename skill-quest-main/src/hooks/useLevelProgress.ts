import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LevelProgress {
  level: number;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  accuracy: number;
  isUnlocked: boolean;
}

export const useLevelProgress = (
  userId: string | undefined,
  questionType: string,
  category: string | null,
  questions: { id: string; level?: number }[]
) => {
  const [progress, setProgress] = useState<Record<number, LevelProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateProgress = async () => {
      if (!category || category === 'all') {
        setLoading(false);
        return;
      }

      // Get user progress for this question type
      let userProgress: { question_id: string; is_correct: boolean }[] = [];
      
      if (userId) {
        const { data } = await supabase
          .from('user_progress')
          .select('question_id, is_correct')
          .eq('user_id', userId)
          .eq('question_type', questionType);
        
        if (data) {
          userProgress = data;
        }
      }

      const progressMap = new Map(userProgress.map(p => [p.question_id, p.is_correct]));
      
      // Calculate progress for each level
      const levelProgress: Record<number, LevelProgress> = {};
      
      for (let level = 1; level <= 4; level++) {
        const levelQuestions = questions.filter(q => (q.level || 1) === level);
        const answeredInLevel = levelQuestions.filter(q => progressMap.has(q.id));
        const correctInLevel = levelQuestions.filter(q => progressMap.get(q.id) === true);
        
        const accuracy = answeredInLevel.length > 0 
          ? Math.round((correctInLevel.length / answeredInLevel.length) * 100)
          : 0;

        // Level 1 is always unlocked
        // Other levels require 80%+ accuracy on previous level
        let isUnlocked = level === 1;
        
        if (level > 1 && levelProgress[level - 1]) {
          const prevLevel = levelProgress[level - 1];
          isUnlocked = prevLevel.answeredQuestions > 0 && prevLevel.accuracy >= 80;
        }

        levelProgress[level] = {
          level,
          totalQuestions: levelQuestions.length,
          answeredQuestions: answeredInLevel.length,
          correctAnswers: correctInLevel.length,
          accuracy,
          isUnlocked
        };
      }

      setProgress(levelProgress);
      setLoading(false);
    };

    calculateProgress();
  }, [userId, questionType, category, questions]);

  return { progress, loading };
};
