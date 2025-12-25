import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { seededShuffle, createQuestionSeed } from '@/lib/shuffle';
import { Clock, CheckCircle2, Loader2, ArrowLeft, ChevronRight } from 'lucide-react';

type TestType = 'aptitude' | 'technical' | 'gd';

interface AptitudeQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  category?: string;
  level?: number;
}

interface TechnicalQuestion {
  id: string;
  title: string;
  description: string;
}

interface GdTopic {
  id: string;
  title: string;
  description?: string;
}

const defaultDurations: Record<TestType, number> = {
  aptitude: 20 * 60, // 20 minutes
  technical: 30 * 60, // 30 minutes
  gd: 10 * 60, // 10 minutes
};

const MockTest: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [testType, setTestType] = useState<TestType | null>(null);
  const [loading, setLoading] = useState(false);

  // Questions
  const [aptitudeQuestions, setAptitudeQuestions] = useState<AptitudeQuestion[]>([]);
  const [technicalQuestions, setTechnicalQuestions] = useState<TechnicalQuestion[]>([]);
  const [gdTopics, setGdTopics] = useState<GdTopic[]>([]);

  // Test flow
  const [questionsOrder, setQuestionsOrder] = useState<string[]>([]); // ids in order
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState('');

  // Timer
  const [duration, setDuration] = useState<number>(defaultDurations.aptitude);
  const [secondsLeft, setSecondsLeft] = useState<number>(defaultDurations.aptitude);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<number | null>(null);
  const questionStartRef = useRef<number | null>(null);

  const [finished, setFinished] = useState(false);
  const [resultsSummary, setResultsSummary] = useState<any>(null);
  // Local answers recorded during this test run to compute immediate results
  const [localAnswers, setLocalAnswers] = useState<Array<{
    question_id: string;
    question_type: TestType;
    answer: any;
    is_correct?: boolean;
    time_spent_seconds?: number;
  }>>([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (running) {
      questionStartRef.current = Date.now();
      timerRef.current = window.setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            window.clearInterval(timerRef.current!);
            handleAutoSubmit();
            return 0;
          }
          return s - 1;
        });
      }, 1000) as unknown as number;
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
  }, [running]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startTest = async () => {
    if (!testType) return;
    setLoading(true);
    setFinished(false);
    setResultsSummary(null);
    setCurrentIndex(0);
    setSelectedAnswerIndex(null);
    setTextAnswer('');

    // set duration & seconds left
    setDuration(defaultDurations[testType]);
    setSecondsLeft(defaultDurations[testType]);

    // fetch questions depending on type
    try {
      if (testType === 'aptitude') {
        const { data } = await supabase.from('aptitude_questions').select('*');
        const qs: AptitudeQuestion[] = (data || []).map((q: any) => ({
          id: q.id,
          question: q.question,
          options: q.options || [],
          correct: q.correct_answer,
          category: q.category,
          level: q.level || 1,
        }));

        // deterministic shuffle using user id
        const shuffled = user
          ? seededShuffle(qs, createQuestionSeed(user.id, 'mock', 1))
          : qs;
        setAptitudeQuestions(shuffled);
        setQuestionsOrder(shuffled.map(q => q.id));
      }

      if (testType === 'technical') {
        const { data } = await supabase.from('technical_questions').select('*');
        const qs: TechnicalQuestion[] = (data || []).map((q: any) => ({
          id: q.id,
          title: q.title,
          description: q.description,
        }));
        const shuffled = user
          ? seededShuffle(qs, createQuestionSeed(user.id, 'mock', 2))
          : qs;
        setTechnicalQuestions(shuffled);
        setQuestionsOrder(shuffled.map(q => q.id));
      }

      if (testType === 'gd') {
        const { data } = await supabase.from('gd_topics').select('*');
        const qs: GdTopic[] = (data || []).map((q: any) => ({
          id: q.id,
          title: q.title,
          description: q.description,
        }));
        const shuffled = user
          ? seededShuffle(qs, createQuestionSeed(user.id, 'mock', 3))
          : qs;
        setGdTopics(shuffled);
        setQuestionsOrder(shuffled.map(q => q.id));
      }
    } catch (err) {
      console.error('Failed fetching questions', err);
    }

    setLoading(false);
    setRunning(true);
  };

  const currentAptitude = aptitudeQuestions[currentIndex];
  const currentTechnical = technicalQuestions[currentIndex];
  const currentGd = gdTopics[currentIndex];

  const saveAnswerProgress = async (payload: {
    question_id: string;
    question_type: TestType;
    answer: any;
    is_correct?: boolean;
    time_spent_seconds?: number;
  }) => {
    if (!user) return;
    try {
      await supabase.from('user_progress').insert({
        user_id: user.id,
        question_id: payload.question_id,
        question_type: payload.question_type,
        answer: typeof payload.answer === 'string' ? payload.answer : JSON.stringify(payload.answer),
        is_correct: payload.is_correct ?? null,
        time_spent_seconds: payload.time_spent_seconds ?? null,
      });
    } catch (err) {
      console.error('Error saving progress', err);
    }
  };

  const handleSelectOption = async (index: number) => {
    if (!currentAptitude) return;
    if (selectedAnswerIndex !== null) return;
    const timeSpent = questionStartRef.current ? Math.round((Date.now() - questionStartRef.current) / 1000) : 0;
    const isCorrect = index === currentAptitude.correct;
    setSelectedAnswerIndex(index);

    // record locally for immediate results
    setLocalAnswers(prev => [...prev, {
      question_id: currentAptitude.id,
      question_type: 'aptitude',
      answer: index,
      is_correct: isCorrect,
      time_spent_seconds: timeSpent,
    }]);

    // persist to DB if user is signed in
    await saveAnswerProgress({
      question_id: currentAptitude.id,
      question_type: 'aptitude',
      answer: index,
      is_correct: isCorrect,
      time_spent_seconds: timeSpent,
    });
  };

  const handleSubmitTextAnswer = async () => {
    let qid = '';
    let qtype: TestType = 'technical';
    if (testType === 'technical' && currentTechnical) {
      qid = currentTechnical.id;
      qtype = 'technical';
    }
    if (testType === 'gd' && currentGd) {
      qid = currentGd.id;
      qtype = 'gd';
    }
    const timeSpent = questionStartRef.current ? Math.round((Date.now() - questionStartRef.current) / 1000) : 0;
    if (!qid) return;
    const record = {
      question_id: qid,
      question_type: qtype,
      answer: textAnswer,
      time_spent_seconds: timeSpent,
    };

    // save locally so results can be computed client-side
    setLocalAnswers(prev => [...prev, record]);

    // persist if user signed in
    if (user) await saveAnswerProgress(record);

    // move next
    setTextAnswer('');
    handleNextQuestion();
  };

  const handleNextQuestion = () => {
    setSelectedAnswerIndex(null);
    setCurrentIndex(i => i + 1);
    questionStartRef.current = Date.now();
  };

  const handleAutoSubmit = async () => {
    setRunning(false);
    setFinished(true);

    // Compute results from localAnswers for an immediate, accurate summary
    if (testType === 'aptitude') {
      const total = aptitudeQuestions.length;
      const correct = localAnswers.filter(a => a.question_type === 'aptitude' && a.is_correct).length;
      setResultsSummary({ total, correct, byQuestion: localAnswers.filter(a => a.question_type === 'aptitude') });
    } else if (testType === 'technical') {
      const total = technicalQuestions.length;
      setResultsSummary({ total, answered: localAnswers.filter(a => a.question_type === 'technical').length, byQuestion: localAnswers.filter(a => a.question_type === 'technical') });
    } else {
      const total = gdTopics.length;
      setResultsSummary({ total, answered: localAnswers.filter(a => a.question_type === 'gd').length, byQuestion: localAnswers.filter(a => a.question_type === 'gd') });
    }
  };

  const handleFinishEarly = async () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    await handleAutoSubmit();
  };

  if (!testType) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 glass border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <h1 className="text-lg font-bold text-foreground">Mock Tests</h1>
            <div />
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Choose a Mock Test</h2>
            <p className="text-muted-foreground mb-6">Pick a topic and start timed practice. Questions are managed by your admin.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button onClick={() => setTestType('aptitude')} className="bg-card p-6 rounded-2xl shadow-card border border-border hover:border-primary/50 transition-all">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-3">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Aptitude</h3>
                <p className="text-sm text-muted-foreground mt-1">Multiple choice questions • {Math.round(defaultDurations.aptitude/60)} minutes</p>
              </button>

              <button onClick={() => setTestType('technical')} className="bg-card p-6 rounded-2xl shadow-card border border-border hover:border-primary/50 transition-all">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-3">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Technical</h3>
                <p className="text-sm text-muted-foreground mt-1">Coding problems • {Math.round(defaultDurations.technical/60)} minutes</p>
              </button>

              <button onClick={() => setTestType('gd')} className="bg-card p-6 rounded-2xl shadow-card border border-border hover:border-primary/50 transition-all">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-3">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Group Discussion</h3>
                <p className="text-sm text-muted-foreground mt-1">Topics & short answers • {Math.round(defaultDurations.gd/60)} minutes</p>
              </button>
            </div>

            <div className="mt-8">
              <p className="text-sm text-muted-foreground">Note: Answers will be saved to your activity if you are signed in.</p>
            </div>

          </div>
        </main>
      </div>
    );
  }

  // In-test UI
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // compute total questions
  const totalQuestions = testType === 'aptitude' ? aptitudeQuestions.length : testType === 'technical' ? technicalQuestions.length : gdTopics.length;

  if (finished) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 glass border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={() => { setTestType(null); setFinished(false); }} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <h1 className="text-lg font-bold text-foreground">Results</h1>
            <div />
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto text-center bg-card p-8 rounded-2xl shadow-card border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Test Complete</h2>
            {resultsSummary ? (
              <div className="text-left">
                {resultsSummary.correct !== undefined ? (
                  <div>
                    <p className="text-muted-foreground">Score</p>
                    <p className="text-3xl font-bold text-foreground">{resultsSummary.correct} / {resultsSummary.total}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-muted-foreground">Saved</p>
                    <p className="text-lg text-foreground">{resultsSummary.answered || 'Results saved to your activity'}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Results processed. Check activity for details.</p>
            )}

            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => { setTestType(null); setFinished(false); }} variant="outline">Back</Button>
              <Button onClick={() => { setFinished(false); setTestType(null); }}>Done</Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render current question
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => { setTestType(null); }} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-foreground">{testType === 'aptitude' ? 'Aptitude' : testType === 'technical' ? 'Technical' : 'Group Discussion'}</h1>
            <div className="px-3 py-1 rounded-full text-sm text-muted-foreground" style={{ backgroundColor: 'rgba(24,195,248,0.06)' }}>
              {formatTime(secondsLeft)}
            </div>
          </div>
          <div />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Question {currentIndex + 1} of {totalQuestions}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setRunning(r => !r)} className="text-sm text-muted-foreground hover:text-foreground">
                {running ? 'Pause' : 'Resume'}
              </button>
              <Button variant="outline" onClick={handleFinishEarly}>Finish</Button>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="bg-card rounded-3xl shadow-card border border-border p-6 md:p-8">
            {/* Aptitude MCQ */}
            {testType === 'aptitude' && currentAptitude && (
              <>
                <h2 className="text-xl font-semibold text-foreground mb-4">{currentAptitude.question}</h2>
                <div className="space-y-3">
                  {currentAptitude.options.map((opt, idx) => (
                    <button key={idx} onClick={() => handleSelectOption(idx)} disabled={selectedAnswerIndex !== null} className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedAnswerIndex === null ? 'bg-muted/30 border-border hover:bg-muted/50' : selectedAnswerIndex === idx ? 'bg-primary/10 border-primary text-primary' : 'opacity-60 bg-muted/30 border-border'}`}>
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-sm font-medium">{String.fromCharCode(65 + idx)}</span>
                        <span className="flex-1">{opt}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <Button onClick={handleNextQuestion} disabled={currentIndex >= aptitudeQuestions.length - 1}>Next</Button>
                </div>
              </>
            )}

            {/* Technical question - text response */}
            {testType === 'technical' && currentTechnical && (
              <>
                <h2 className="text-xl font-semibold text-foreground mb-3">{currentTechnical.title}</h2>
                <p className="text-sm text-muted-foreground mb-4">{currentTechnical.description}</p>
                <textarea value={textAnswer} onChange={e => setTextAnswer(e.target.value)} className="w-full p-4 rounded-xl border border-border bg-background text-foreground" rows={8} />

                <div className="mt-4 flex justify-between">
                  <div className="text-sm text-muted-foreground">Answer will be saved to your activity.</div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setTextAnswer(''); }}>Clear</Button>
                    <Button onClick={handleSubmitTextAnswer}>Save & Next</Button>
                  </div>
                </div>
              </>
            )}

            {/* GD topic */}
            {testType === 'gd' && currentGd && (
              <>
                <h2 className="text-xl font-semibold text-foreground mb-3">{currentGd.title}</h2>
                {currentGd.description && <p className="text-sm text-muted-foreground mb-4">{currentGd.description}</p>}
                <textarea value={textAnswer} onChange={e => setTextAnswer(e.target.value)} className="w-full p-4 rounded-xl border border-border bg-background text-foreground" rows={6} />

                <div className="mt-4 flex justify-between">
                  <div className="text-sm text-muted-foreground">Write your key points or short answer.</div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setTextAnswer(''); }}>Clear</Button>
                    <Button onClick={handleSubmitTextAnswer}>Save & Next</Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MockTest;
