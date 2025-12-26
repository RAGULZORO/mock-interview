import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLevelProgress } from '@/hooks/useLevelProgress';
import CodeEditor from '@/components/CodeEditor';
import { useToast } from '@/hooks/use-toast';
import { seededShuffle, createQuestionSeed } from '@/lib/shuffle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Code, 
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Terminal,
  Database,
  Globe,
  Cpu,
  Loader2,
  Lock,
  Star,
  Award,
  Trophy,
  Crown,
  Eye,
  EyeOff,
  Play,
  Save,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface ValidationResult {
  isCorrect: boolean;
  testResults: Array<{
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
  }>;
  feedback: string;
  score: number;
}

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'typescript', label: 'TypeScript' },
];

interface Example {
  input: string;
  output: string;
  explanation?: string;
}

interface CodingQuestion {
  id: string;
  title: string;
  difficulty: string;
  category: string;
  description: string;
  examples: Example[];
  solution: string;
  approach: string;
  level: number;
}

const categories = [
  { id: 'Arrays', name: 'Arrays', icon: Database },
  { id: 'Linked Lists', name: 'Linked List', icon: Globe },
  { id: 'Stack', name: 'Stack', icon: Terminal },
  { id: 'Dynamic Programming', name: 'DP', icon: Cpu },
];

const levelConfig = [
  { name: 'Level 1', icon: Star, subtitle: 'Beginner' },
  { name: 'Level 2', icon: Award, subtitle: 'Intermediate' },
  { name: 'Level 3', icon: Trophy, subtitle: 'Advanced' },
  { name: 'Final Level', icon: Crown, subtitle: 'Expert' },
];

const Technical = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [trackedQuestions, setTrackedQuestions] = useState<Set<string>>(new Set());
  const [userCode, setUserCode] = useState<Record<string, string>>({});
  const [userLanguage, setUserLanguage] = useState<Record<string, string>>({});
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({});
  const [validating, setValidating] = useState<Record<string, boolean>>({});
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const expandStartTime = useRef<number | null>(null);

  const categoryQuestions = selectedCategory 
    ? questions.filter(q => q.category === selectedCategory)
    : [];
  
  // Apply deterministic shuffle based on user ID, category, and level
  // This ensures each user gets different questions but in a consistent order
  const levelQuestions = selectedCategory && selectedLevel
    ? categoryQuestions.filter(q => q.level === selectedLevel)
    : [];

  const shuffledCategoryQuestions = selectedCategory && selectedLevel && levelQuestions.length > 0
    ? seededShuffle(
        levelQuestions,
        createQuestionSeed(user?.id, selectedCategory, selectedLevel)
      )
    : levelQuestions;
  
  const { progress, loading: progressLoading } = useLevelProgress(
    user?.id,
    'technical',
    selectedCategory,
    categoryQuestions
  );

  useEffect(() => {
    fetchQuestions();
    if (user) {
      fetchTrackedQuestions();
      fetchSavedCode();
    }
  }, [user]);

  const fetchSavedCode = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_code_solutions')
      .select('*')
      .eq('user_id', user.id);
    
    if (data) {
      const codeMap: Record<string, string> = {};
      const langMap: Record<string, string> = {};
      const resultsMap: Record<string, ValidationResult> = {};
      
      data.forEach(solution => {
        codeMap[solution.question_id] = solution.code;
        langMap[solution.question_id] = solution.language;
        if (solution.validation_result) {
          resultsMap[solution.question_id] = solution.validation_result as unknown as ValidationResult;
        }
      });
      
      setUserCode(codeMap);
      setUserLanguage(langMap);
      setValidationResults(resultsMap);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('technical_questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching questions:', error);
    } else if (data) {
      setQuestions(data.map(q => ({
        id: q.id,
        title: q.title,
        difficulty: q.difficulty,
        category: q.category,
        description: q.description,
        examples: q.examples as unknown as Example[],
        solution: q.solution,
        approach: q.approach,
        level: (q as any).level || 1
      })));
    }
    setLoading(false);
  };

  const fetchTrackedQuestions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_progress')
      .select('question_id')
      .eq('user_id', user.id)
      .eq('question_type', 'technical');
    
    if (data) {
      setTrackedQuestions(new Set(data.map(p => p.question_id)));
    }
  };

  const trackProgress = async (questionId: string, timeSpent: number) => {
    if (!user || trackedQuestions.has(questionId)) return;
    
    await supabase.from('user_progress').insert({
      user_id: user.id,
      question_id: questionId,
      question_type: 'technical',
      is_correct: true,
      time_spent_seconds: timeSpent
    });
    
    setTrackedQuestions(prev => new Set(prev).add(questionId));
  };

  const validateCode = async (question: CodingQuestion) => {
    if (!user) {
      toast({ title: "Please log in", description: "You need to be logged in to validate code.", variant: "destructive" });
      return;
    }

    const code = userCode[question.id] || '';
    if (!code.trim() || code === '// Write your solution here\n\n') {
      toast({ title: "No code", description: "Please write some code first.", variant: "destructive" });
      return;
    }

    setValidating(prev => ({ ...prev, [question.id]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('validate-code', {
        body: {
          code,
          language: userLanguage[question.id] || 'javascript',
          question: question.description,
          examples: question.examples
        }
      });

      if (error) throw error;

      setValidationResults(prev => ({ ...prev, [question.id]: data }));
      
      if (data.isCorrect) {
        toast({ title: "Correct!", description: `Score: ${data.score}/100` });
      } else {
        toast({ title: "Not quite right", description: data.feedback?.substring(0, 100), variant: "destructive" });
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast({ title: "Validation failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setValidating(prev => ({ ...prev, [question.id]: false }));
    }
  };

  const saveCode = async (questionId: string) => {
    if (!user) {
      toast({ title: "Please log in", description: "You need to be logged in to save code.", variant: "destructive" });
      return;
    }

    const code = userCode[questionId] || '';
    const language = userLanguage[questionId] || 'javascript';
    const result = validationResults[questionId];

    setSaving(prev => ({ ...prev, [questionId]: true }));

    try {
      const { error } = await supabase
        .from('user_code_solutions')
        .upsert({
          user_id: user.id,
          question_id: questionId,
          code,
          language,
          is_validated: !!result?.isCorrect,
          validation_result: result as any || null
        } as any, { onConflict: 'user_id,question_id' });

      if (error) throw error;
      toast({ title: "Saved!", description: "Your code has been saved." });
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleExpand = (questionId: string) => {
    if (expandedId === questionId) {
      if (expandStartTime.current && user) {
        const timeSpent = Math.floor((Date.now() - expandStartTime.current) / 1000);
        trackProgress(questionId, timeSpent);
      }
      expandStartTime.current = null;
      setExpandedId(null);
    } else {
      expandStartTime.current = Date.now();
      setExpandedId(questionId);
    }
  };

  const filteredQuestions = selectedCategory && selectedLevel
    ? questions.filter(q => q.category === selectedCategory && q.level === selectedLevel)
    : [];

  // Apply deterministic shuffle to ensure each user gets different question order
  const displayQuestions = selectedCategory && selectedLevel && filteredQuestions.length > 0
    ? seededShuffle(
        filteredQuestions,
        createQuestionSeed(user?.id, selectedCategory, selectedLevel)
      )
    : filteredQuestions;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-success/10 text-success';
      case 'Medium': return 'bg-warning/10 text-warning';
      case 'Hard': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-secondary flex items-center justify-center">
              <Code className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">Technical Round</span>
          </div>

          <div className="w-20" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!selectedCategory ? (
          /* Category Cards */
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Select a Category
              </h1>
              <p className="text-muted-foreground">
                Choose a category to start practicing coding problems.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="group bg-card rounded-2xl shadow-card border border-border p-6 text-center hover:border-secondary/50 hover:shadow-lg transition-all"
                >
                  <div className="w-14 h-14 mx-auto rounded-xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                    <cat.icon className="w-7 h-7 text-secondary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{cat.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {questions.filter(q => q.category === cat.id).length} problems
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : !selectedLevel ? (
          /* Level Cards */
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-sm text-secondary hover:underline mb-6"
            >
              ← Back to Categories
            </button>
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Select a Level
              </h1>
              <p className="text-muted-foreground">
                Complete each level with 80%+ to unlock the next.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {levelConfig.map((config, index) => {
                const level = index + 1;
                const levelData = progress[level] || { totalQuestions: 0, answeredQuestions: 0, accuracy: 0, isUnlocked: level === 1 };
                const Icon = config.icon;
                const levelQuestions = categoryQuestions.filter(q => q.level === level);

                return (
                  <button
                    key={level}
                    onClick={() => levelData.isUnlocked && setSelectedLevel(level)}
                    disabled={!levelData.isUnlocked}
                    className={`group bg-card rounded-2xl shadow-card border border-border p-6 text-center transition-all relative overflow-hidden ${
                      levelData.isUnlocked 
                        ? 'hover:border-secondary/50 hover:shadow-lg cursor-pointer' 
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {!levelData.isUnlocked && (
                      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-2">
                          <Lock className="w-8 h-8 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Need 80% in Level {level - 1}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className={`w-14 h-14 mx-auto rounded-xl bg-secondary/10 flex items-center justify-center mb-4 ${
                      levelData.isUnlocked ? 'group-hover:bg-secondary/20' : ''
                    } transition-colors`}>
                      <Icon className="w-7 h-7 text-secondary" />
                    </div>
                    
                    <h3 className="font-semibold text-foreground">{config.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{config.subtitle}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {levelQuestions.length} problems
                    </p>
                    
                    {levelData.isUnlocked && levelData.answeredQuestions > 0 && (
                      <div className="mt-3">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-secondary transition-all"
                            style={{ width: `${Math.round((levelData.answeredQuestions / levelData.totalQuestions) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {levelData.answeredQuestions}/{levelData.totalQuestions} • {levelData.accuracy}% accuracy
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : displayQuestions.length === 0 ? (
          <div className="text-center py-12">
            <button
              onClick={() => setSelectedLevel(null)}
              className="text-secondary hover:underline mb-4"
            >
              ← Back to Levels
            </button>
            <p className="text-muted-foreground">No questions available in this level yet.</p>
          </div>
        ) : (
          /* Questions List */
          <div className="max-w-4xl mx-auto space-y-4">
            <button
              onClick={() => setSelectedLevel(null)}
              className="text-sm text-secondary hover:underline mb-4"
            >
              ← Back to Levels
            </button>
            {displayQuestions.map((question, idx) => (
              <div 
                key={question.id}
                className="bg-card rounded-2xl shadow-card border border-border overflow-hidden animate-slide-up"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {/* Question Header */}
                <button
                  onClick={() => handleExpand(question.id)}
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground font-mono">
                      #{idx + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {question.title}
                        {trackedQuestions.has(question.id) && (
                          <Check className="inline w-4 h-4 ml-2 text-success" />
                        )}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {question.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedId === question.id ? 'rotate-180' : ''}`} />
                </button>

                {/* Expanded Content */}
                {expandedId === question.id && (
                  <div className="px-5 pb-5 border-t border-border animate-fade-in">
                    {/* Description */}
                    <div className="py-4">
                      <h4 className="font-medium text-foreground mb-2">Problem</h4>
                      <p className="text-muted-foreground">{question.description}</p>
                    </div>

                    {/* Examples */}
                    <div className="py-4 border-t border-border">
                      <h4 className="font-medium text-foreground mb-3">Examples</h4>
                      <div className="space-y-3">
                        {question.examples.map((ex, i) => (
                          <div key={i} className="bg-muted/50 rounded-lg p-3">
                            <p className="text-sm font-mono">
                              <span className="text-muted-foreground">Input: </span>
                              <span className="text-foreground">{ex.input}</span>
                            </p>
                            <p className="text-sm font-mono mt-1">
                              <span className="text-muted-foreground">Output: </span>
                              <span className="text-secondary">{ex.output}</span>
                            </p>
                            {ex.explanation && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {ex.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Code Editor */}
                    <div className="py-4 border-t border-border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-foreground">Your Solution</h4>
                        <div className="flex items-center gap-2">
                          <Select
                            value={userLanguage[question.id] || 'javascript'}
                            onValueChange={(val) => setUserLanguage(prev => ({ ...prev, [question.id]: val }))}
                          >
                            <SelectTrigger className="w-[140px] h-8">
                              <SelectValue placeholder="Language" />
                            </SelectTrigger>
                            <SelectContent>
                              {LANGUAGES.map(lang => (
                                <SelectItem key={lang.value} value={lang.value}>
                                  {lang.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => saveCode(question.id)}
                            disabled={saving[question.id]}
                          >
                            {saving[question.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-1" />
                                Save
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => validateCode(question)}
                            disabled={validating[question.id]}
                            className="bg-secondary hover:bg-secondary/90"
                          >
                            {validating[question.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-1" />
                                Run Code
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      <CodeEditor
                        value={userCode[question.id] || '// Write your solution here\n\n'}
                        onChange={(value) => setUserCode(prev => ({ ...prev, [question.id]: value }))}
                        language={userLanguage[question.id] || 'javascript'}
                        height="250px"
                      />
                      
                      {/* Validation Results */}
                      {validationResults[question.id] && (
                        <div className={`mt-4 p-4 rounded-lg ${validationResults[question.id].isCorrect ? 'bg-success/10 border border-success/30' : 'bg-destructive/10 border border-destructive/30'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            {validationResults[question.id].isCorrect ? (
                              <CheckCircle className="w-5 h-5 text-success" />
                            ) : (
                              <XCircle className="w-5 h-5 text-destructive" />
                            )}
                            <span className={`font-semibold ${validationResults[question.id].isCorrect ? 'text-success' : 'text-destructive'}`}>
                              {validationResults[question.id].isCorrect ? 'All Tests Passed!' : 'Some Tests Failed'}
                            </span>
                            <span className="ml-auto text-sm text-muted-foreground">
                              Score: {validationResults[question.id].score}/100
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {validationResults[question.id].feedback}
                          </p>
                          {validationResults[question.id].testResults?.length > 0 && (
                            <div className="space-y-2">
                              {validationResults[question.id].testResults.map((test, i) => (
                                <div key={i} className={`text-xs p-2 rounded ${test.passed ? 'bg-success/20' : 'bg-destructive/20'}`}>
                                  <div className="flex items-center gap-1">
                                    {test.passed ? <Check className="w-3 h-3 text-success" /> : <XCircle className="w-3 h-3 text-destructive" />}
                                    <span className="font-mono">Test {i + 1}</span>
                                  </div>
                                  <p className="font-mono mt-1">Input: {test.input}</p>
                                  <p className="font-mono">Expected: {test.expectedOutput}</p>
                                  {!test.passed && <p className="font-mono text-destructive">Got: {test.actualOutput}</p>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Approach */}
                    <div className="py-4 border-t border-border">
                      <h4 className="font-medium text-foreground mb-2">Approach</h4>
                      <p className="text-muted-foreground text-sm">{question.approach}</p>
                    </div>

                    {/* Solution - Only shown after running code */}
                    <div className="py-4 border-t border-border">
                      {validationResults[question.id] ? (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-foreground">Solution</h4>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAnswer(prev => ({ ...prev, [question.id]: !prev[question.id] }))}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {showAnswer[question.id] ? (
                                  <>
                                    <EyeOff className="w-4 h-4 mr-1" />
                                    Hide Answer
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-4 h-4 mr-1" />
                                    Show Answer
                                  </>
                                )}
                              </Button>
                              {showAnswer[question.id] && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopy(question.solution, question.id)}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  {copiedId === question.id ? (
                                    <>
                                      <Check className="w-4 h-4 mr-1" />
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-4 h-4 mr-1" />
                                      Copy
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {showAnswer[question.id] ? (
                            <pre className="bg-foreground/5 rounded-lg p-4 overflow-x-auto">
                              <code className="text-sm font-mono text-foreground">
                                {question.solution}
                              </code>
                            </pre>
                          ) : (
                            <div className="bg-muted/30 rounded-lg p-6 text-center">
                              <Eye className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                              <p className="text-muted-foreground text-sm">
                                Click "Show Answer" to reveal the solution.
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="bg-muted/30 rounded-lg p-8 text-center">
                          <Lock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                          <h4 className="font-medium text-foreground mb-2">Solution Locked</h4>
                          <p className="text-muted-foreground text-sm">
                            Run your code first to unlock the solution. This ensures you try solving the problem before seeing the answer.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-gradient-secondary rounded-2xl p-6 text-center">
            <h3 className="text-xl font-bold text-primary-foreground mb-2">
              Practice Makes Perfect
            </h3>
            <p className="text-primary-foreground/80 mb-4">
              Try solving these problems on your own before checking the solutions!
            </p>
            <Button 
              onClick={() => navigate('/group-discussion')}
              className="bg-primary-foreground text-secondary hover:bg-primary-foreground/90"
            >
              Try Group Discussion
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Technical;
