import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Code, Users, Plus, Trash2, Save, AlertCircle, CheckCircle2, TrendingUp, BarChart3, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CSVImport } from '@/components/CSVImport';

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Track question counts for each level
  const [aptitudeQuestionCounts, setAptitudeQuestionCounts] = useState<Record<number, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0
  });

  const [technicalQuestionCounts, setTechnicalQuestionCounts] = useState<Record<number, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0
  });

  const [gdQuestionCounts, setGdQuestionCounts] = useState<Record<number, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0
  });

  // Aptitude form state
  const [aptitudeForm, setAptitudeForm] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    category: 'Quantitative',
    level: 1
  });

  // Technical form state
  const [technicalForm, setTechnicalForm] = useState({
    title: '',
    difficulty: 'Medium',
    category: 'Arrays',
    description: '',
    examples: [{ input: '', output: '', explanation: '' }],
    solution: '',
    approach: '',
    level: 1
  });

  // GD form state
  const [gdForm, setGdForm] = useState({
    title: '',
    category: 'Technology',
    description: '',
    pointsFor: [''],
    pointsAgainst: [''],
    tips: [''],
    conclusion: '',
    level: 1
  });

  const [saving, setSaving] = useState(false);

  // Questions list state for editing
  const [allAptitudeQuestions, setAllAptitudeQuestions] = useState<any[]>([]);
  const [allTechnicalQuestions, setAllTechnicalQuestions] = useState<any[]>([]);
  const [allGdQuestions, setAllGdQuestions] = useState<any[]>([]);
  
  // Edit mode state
  const [editingAptitudeId, setEditingAptitudeId] = useState<string | null>(null);
  const [editingTechnicalId, setEditingTechnicalId] = useState<string | null>(null);
  const [editingGdId, setEditingGdId] = useState<string | null>(null);
  
  // Edit forms
  const [editAptitudeForm, setEditAptitudeForm] = useState<any>(null);
  const [editTechnicalForm, setEditTechnicalForm] = useState<any>(null);
  const [editGdForm, setEditGdForm] = useState<any>(null);
  
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // User Progress state
  const [userProgressData, setUserProgressData] = useState<any[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [progressCategory, setProgressCategory] = useState<'all' | 'aptitude' | 'technical' | 'gd'>('all');

  // Fetch question counts on component load
  useEffect(() => {
    fetchAptitudeQuestionCounts();
    fetchTechnicalQuestionCounts();
    fetchGdQuestionCounts();
  }, []);

  // Fetch user progress when tab is opened
  const fetchUserProgress = async () => {
    setLoadingProgress(true);
    try {
      const { data: users, error: usersError } = await supabase
        .from('user_progress')
        .select('user_id')
        .then(async (result) => {
          if (result.error) return result;
          // Get unique user IDs
          const userIds = [...new Set((result.data || []).map((p: any) => p.user_id))];
          
          // Fetch user details from profiles table
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds);

          return { data: profiles, error: profilesError };
        });

      if (usersError || !users) {
        console.error('Error fetching users:', usersError);
        setLoadingProgress(false);
        return;
      }

      // Fetch progress for each user
      const userProgressList = await Promise.all(
        users.map(async (user: any) => {
          const { data: aptitudeProgress } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('question_type', 'aptitude');

          const { data: technicalProgress } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('question_type', 'technical');

          const { data: gdProgress } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('question_type', 'gd');

          const aptitudeCorrect = aptitudeProgress?.filter((p: any) => p.is_correct).length || 0;
          const technicalCorrect = technicalProgress?.filter((p: any) => p.is_correct).length || 0;
          const gdCorrect = gdProgress?.filter((p: any) => p.is_correct).length || 0;

          const aptitudeAccuracy = aptitudeProgress && aptitudeProgress.length > 0
            ? Math.round((aptitudeCorrect / aptitudeProgress.length) * 100)
            : 0;

          const technicalAccuracy = technicalProgress && technicalProgress.length > 0
            ? Math.round((technicalCorrect / technicalProgress.length) * 100)
            : 0;

          const gdAccuracy = gdProgress && gdProgress.length > 0
            ? Math.round((gdCorrect / gdProgress.length) * 100)
            : 0;

          return {
            id: user.id,
            email: user.email || 'Unknown',
            name: user.full_name || user.email || 'Unknown User',
            aptitude: {
              attempted: aptitudeProgress?.length || 0,
              correct: aptitudeCorrect,
              accuracy: aptitudeAccuracy
            },
            technical: {
              attempted: technicalProgress?.length || 0,
              correct: technicalCorrect,
              accuracy: technicalAccuracy
            },
            gd: {
              attempted: gdProgress?.length || 0,
              correct: gdCorrect,
              accuracy: gdAccuracy
            }
          };
        })
      );

      setUserProgressData(userProgressList);
    } catch (error) {
      console.error('Error fetching user progress:', error);
      toast({ title: 'Error', description: 'Failed to load user progress', variant: 'destructive' });
    }
    setLoadingProgress(false);
  };

  const fetchAptitudeQuestionCounts = async () => {
    try {
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
      
      for (let level = 1; level <= 4; level++) {
        const { count, error } = await supabase
          .from('aptitude_questions')
          .select('*', { count: 'exact', head: true })
          .eq('level', level);

        if (!error && count !== null) {
          counts[level] = count;
        }
      }
      
      setAptitudeQuestionCounts(counts);
    } catch (error) {
      console.error('Error fetching question counts:', error);
    }
  };

  const fetchTechnicalQuestionCounts = async () => {
    try {
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
      
      for (let level = 1; level <= 4; level++) {
        const { count, error } = await supabase
          .from('technical_questions')
          .select('*', { count: 'exact', head: true })
          .eq('level', level);

        if (!error && count !== null) {
          counts[level] = count;
        }
      }
      
      setTechnicalQuestionCounts(counts);
    } catch (error) {
      console.error('Error fetching technical question counts:', error);
    }
  };

  const fetchGdQuestionCounts = async () => {
    try {
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
      
      for (let level = 1; level <= 4; level++) {
        const { count, error } = await supabase
          .from('gd_topics')
          .select('*', { count: 'exact', head: true })
          .eq('level', level);

        if (!error && count !== null) {
          counts[level] = count;
        }
      }
      
      setGdQuestionCounts(counts);
    } catch (error) {
      console.error('Error fetching GD question counts:', error);
    }
  };

  // Fetch all questions for editing
  const fetchAllAptitudeQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const { data, error } = await supabase
        .from('aptitude_questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching aptitude questions:', error);
      } else {
        setAllAptitudeQuestions(data || []);
      }
    } catch (error) {
      console.error('Error fetching aptitude questions:', error);
    }
    setLoadingQuestions(false);
  };

  const fetchAllTechnicalQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const { data, error } = await supabase
        .from('technical_questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching technical questions:', error);
      } else {
        setAllTechnicalQuestions(data || []);
      }
    } catch (error) {
      console.error('Error fetching technical questions:', error);
    }
    setLoadingQuestions(false);
  };

  const fetchAllGdQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const { data, error } = await supabase
        .from('gd_topics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching GD topics:', error);
      } else {
        setAllGdQuestions(data || []);
      }
    } catch (error) {
      console.error('Error fetching GD topics:', error);
    }
    setLoadingQuestions(false);
  };

  const handleAptitudeSubmit = async () => {
    if (!aptitudeForm.question || aptitudeForm.options.some(o => !o) || !aptitudeForm.explanation) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    // Check if level already has 20 questions
    const currentCount = aptitudeQuestionCounts[aptitudeForm.level] || 0;
    if (currentCount >= 20) {
      toast({ 
        title: 'Limit Reached', 
        description: `Level ${aptitudeForm.level} already has 20 questions. You cannot add more.`, 
        variant: 'destructive' 
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('aptitude_questions').insert({
      question: aptitudeForm.question,
      options: aptitudeForm.options,
      correct_answer: aptitudeForm.correctAnswer,
      explanation: aptitudeForm.explanation,
      category: aptitudeForm.category,
      level: aptitudeForm.level,
      created_by: user?.id
    });

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Aptitude question added!' });
      setAptitudeForm({ question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '', category: 'Quantitative', level: 1 });
      
      // Refresh the question counts
      await fetchAptitudeQuestionCounts();
    }
  };

  const handleTechnicalSubmit = async () => {
    if (!technicalForm.title || !technicalForm.description || !technicalForm.solution || !technicalForm.approach) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    // Check if level already has 20 questions
    const currentCount = technicalQuestionCounts[technicalForm.level] || 0;
    if (currentCount >= 20) {
      toast({ title: 'Error', description: `Level ${technicalForm.level} already has 20 questions. Please select a different level.`, variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('technical_questions').insert({
      title: technicalForm.title,
      difficulty: technicalForm.difficulty,
      category: technicalForm.category,
      description: technicalForm.description,
      examples: technicalForm.examples.filter(e => e.input || e.output),
      solution: technicalForm.solution,
      approach: technicalForm.approach,
      level: technicalForm.level,
      created_by: user?.id
    });

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Technical question added!' });
      setTechnicalForm({ title: '', difficulty: 'Medium', category: 'Arrays', description: '', examples: [{ input: '', output: '', explanation: '' }], solution: '', approach: '', level: 1 });
      await fetchTechnicalQuestionCounts();
    }
  };

  const handleGDSubmit = async () => {
    if (!gdForm.title || !gdForm.description || !gdForm.conclusion) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    // Check if level already has 20 questions
    const currentCount = gdQuestionCounts[gdForm.level] || 0;
    if (currentCount >= 20) {
      toast({ title: 'Error', description: `Level ${gdForm.level} already has 20 questions. Please select a different level.`, variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('gd_topics').insert({
      title: gdForm.title,
      category: gdForm.category,
      description: gdForm.description,
      points_for: gdForm.pointsFor.filter(p => p),
      points_against: gdForm.pointsAgainst.filter(p => p),
      tips: gdForm.tips.filter(t => t),
      conclusion: gdForm.conclusion,
      level: gdForm.level,
      created_by: user?.id
    });

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'GD topic added!' });
      setGdForm({ title: '', category: 'Technology', description: '', pointsFor: [''], pointsAgainst: [''], tips: [''], conclusion: '', level: 1 });
      await fetchGdQuestionCounts();
    }
  };

  const addArrayItem = (field: 'pointsFor' | 'pointsAgainst' | 'tips') => {
    setGdForm(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const removeArrayItem = (field: 'pointsFor' | 'pointsAgainst' | 'tips', index: number) => {
    setGdForm(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const updateArrayItem = (field: 'pointsFor' | 'pointsAgainst' | 'tips', index: number, value: string) => {
    setGdForm(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  // Update handlers
  const handleUpdateAptitude = async () => {
    if (!editAptitudeForm.question || editAptitudeForm.options.some((o: string) => !o) || !editAptitudeForm.explanation) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('aptitude_questions')
      .update({
        question: editAptitudeForm.question,
        options: editAptitudeForm.options,
        correct_answer: editAptitudeForm.correct_answer,
        explanation: editAptitudeForm.explanation,
        category: editAptitudeForm.category,
        level: editAptitudeForm.level
      })
      .eq('id', editingAptitudeId);

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Aptitude question updated!' });
      setEditingAptitudeId(null);
      setEditAptitudeForm(null);
      await fetchAllAptitudeQuestions();
      await fetchAptitudeQuestionCounts();
    }
  };

  const handleUpdateTechnical = async () => {
    if (!editTechnicalForm.title || !editTechnicalForm.description || !editTechnicalForm.solution || !editTechnicalForm.approach) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('technical_questions')
      .update({
        title: editTechnicalForm.title,
        difficulty: editTechnicalForm.difficulty,
        category: editTechnicalForm.category,
        description: editTechnicalForm.description,
        examples: editTechnicalForm.examples.filter((e: any) => e.input || e.output),
        solution: editTechnicalForm.solution,
        approach: editTechnicalForm.approach,
        level: editTechnicalForm.level
      })
      .eq('id', editingTechnicalId);

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Technical question updated!' });
      setEditingTechnicalId(null);
      setEditTechnicalForm(null);
      await fetchAllTechnicalQuestions();
      await fetchTechnicalQuestionCounts();
    }
  };

  const handleUpdateGd = async () => {
    if (!editGdForm.title || !editGdForm.description || !editGdForm.conclusion) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('gd_topics')
      .update({
        title: editGdForm.title,
        category: editGdForm.category,
        description: editGdForm.description,
        points_for: editGdForm.points_for.filter((p: string) => p),
        points_against: editGdForm.points_against.filter((p: string) => p),
        tips: editGdForm.tips.filter((t: string) => t),
        conclusion: editGdForm.conclusion,
        level: editGdForm.level
      })
      .eq('id', editingGdId);

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'GD topic updated!' });
      setEditingGdId(null);
      setEditGdForm(null);
      await fetchAllGdQuestions();
      await fetchGdQuestionCounts();
    }
  };

  // Delete handlers
  const handleDeleteAptitude = async (id: string) => {
    if (confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      const { error } = await supabase
        .from('aptitude_questions')
        .delete()
        .eq('id', id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Question deleted!' });
        await fetchAllAptitudeQuestions();
        await fetchAptitudeQuestionCounts();
      }
    }
  };

  const handleDeleteTechnical = async (id: string) => {
    if (confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      const { error } = await supabase
        .from('technical_questions')
        .delete()
        .eq('id', id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Question deleted!' });
        await fetchAllTechnicalQuestions();
        await fetchTechnicalQuestionCounts();
      }
    }
  };

  const handleDeleteGd = async (id: string) => {
    if (confirm('Are you sure you want to delete this topic? This action cannot be undone.')) {
      const { error } = await supabase
        .from('gd_topics')
        .delete()
        .eq('id', id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Topic deleted!' });
        await fetchAllGdQuestions();
        await fetchGdQuestionCounts();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="aptitude" className="space-y-6">
          <TabsList className="flex w-full flex-wrap gap-2 bg-transparent border-b border-border p-0 h-auto justify-start overflow-x-auto">
            <TabsTrigger value="aptitude" className="flex items-center gap-2 whitespace-nowrap">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Aptitude</span>
            </TabsTrigger>
            <TabsTrigger value="technical" className="flex items-center gap-2 whitespace-nowrap">
              <Code className="h-4 w-4" />
              <span className="hidden sm:inline">Technical</span>
            </TabsTrigger>
            <TabsTrigger value="gd" className="flex items-center gap-2 whitespace-nowrap">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">GD Topics</span>
            </TabsTrigger>
            <TabsTrigger value="manage-apt" className="flex items-center gap-1 text-xs whitespace-nowrap">
              <Trash2 className="h-3 w-3" />
              <span>Manage Apt</span>
            </TabsTrigger>
            <TabsTrigger value="manage-tech" className="flex items-center gap-1 text-xs whitespace-nowrap">
              <Trash2 className="h-3 w-3" />
              <span>Manage Tech</span>
            </TabsTrigger>
            <TabsTrigger value="manage-gd" className="flex items-center gap-1 text-xs whitespace-nowrap">
              <Trash2 className="h-3 w-3" />
              <span>Manage GD</span>
            </TabsTrigger>
            <TabsTrigger value="import-apt" className="flex items-center gap-1 text-xs whitespace-nowrap">
              <Plus className="h-3 w-3" />
              <span>Import Apt</span>
            </TabsTrigger>
            <TabsTrigger value="import-tech" className="flex items-center gap-1 text-xs whitespace-nowrap">
              <Plus className="h-3 w-3" />
              <span>Import Tech</span>
            </TabsTrigger>
            <TabsTrigger value="import-gd" className="flex items-center gap-1 text-xs whitespace-nowrap">
              <Plus className="h-3 w-3" />
              <span>Import GD</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2 whitespace-nowrap">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">User Progress</span>
            </TabsTrigger>
          </TabsList>

          {/* Aptitude Tab */}
          <TabsContent value="aptitude">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Add Aptitude Question
                </CardTitle>
              </CardHeader>
              
              {/* Question Count Status */}
              <CardContent className="pb-0 pt-4 border-b border-border">
                <div className="space-y-3 mb-6">
                  <h3 className="text-sm font-semibold text-foreground">Questions Added per Level (Max 20)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((level) => {
                      const count = aptitudeQuestionCounts[level] || 0;
                      const isFull = count >= 20;
                      const levelName = level === 1 ? 'Beginner' : level === 2 ? 'Intermediate' : level === 3 ? 'Advanced' : 'Expert';
                      
                      return (
                        <div
                          key={level}
                          className={`p-4 rounded-lg border-2 flex items-center justify-between transition-all ${
                            isFull
                              ? 'border-success/50 bg-success/5'
                              : count >= 15
                              ? 'border-warning/50 bg-warning/5'
                              : 'border-border bg-card'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">Level {level}</p>
                            <p className="text-xs text-muted-foreground">{levelName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-lg font-bold ${isFull ? 'text-success' : count >= 15 ? 'text-warning' : 'text-primary'}`}>
                              {count}/20
                            </span>
                            {isFull && <CheckCircle2 className="w-4 h-4 text-success" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>

              {/* Limit warning if current level is full */}
              {(aptitudeQuestionCounts[aptitudeForm.level] || 0) >= 20 && (
                <CardContent className="pt-4 pb-0 border-b border-border">
                  <Alert className="border-destructive/50 bg-destructive/5">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive ml-2">
                      Level {aptitudeForm.level} already has 20 questions. Please select a different level to continue adding questions.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              )}

              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={aptitudeForm.category} onValueChange={(v) => setAptitudeForm(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Quantitative">Quantitative</SelectItem>
                        <SelectItem value="Logical Reasoning">Logical Reasoning</SelectItem>
                        <SelectItem value="Verbal Ability">Verbal Ability</SelectItem>
                        <SelectItem value="Data Interpretation">Data Interpretation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Level</Label>
                    <Select value={aptitudeForm.level.toString()} onValueChange={(v) => setAptitudeForm(prev => ({ ...prev, level: parseInt(v) }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Level 1 - Beginner</SelectItem>
                        <SelectItem value="2">Level 2 - Intermediate</SelectItem>
                        <SelectItem value="3">Level 3 - Advanced</SelectItem>
                        <SelectItem value="4">Final Level - Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Question</Label>
                  <Textarea
                    value={aptitudeForm.question}
                    onChange={(e) => setAptitudeForm(prev => ({ ...prev, question: e.target.value }))}
                    placeholder="Enter your question..."
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Options</Label>
                  {aptitudeForm.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...aptitudeForm.options];
                          newOptions[index] = e.target.value;
                          setAptitudeForm(prev => ({ ...prev, options: newOptions }));
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <Label>Correct Answer</Label>
                  <Select value={aptitudeForm.correctAnswer.toString()} onValueChange={(v) => setAptitudeForm(prev => ({ ...prev, correctAnswer: parseInt(v) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {aptitudeForm.options.map((_, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          Option {String.fromCharCode(65 + index)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Explanation</Label>
                  <Textarea
                    value={aptitudeForm.explanation}
                    onChange={(e) => setAptitudeForm(prev => ({ ...prev, explanation: e.target.value }))}
                    placeholder="Explain why this is the correct answer..."
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={handleAptitudeSubmit} 
                  disabled={saving || (aptitudeQuestionCounts[aptitudeForm.level] || 0) >= 20}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {(aptitudeQuestionCounts[aptitudeForm.level] || 0) >= 20 
                    ? 'Level Full - Cannot Add More' 
                    : saving 
                    ? 'Saving...' 
                    : 'Save Aptitude Question'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Technical Tab */}
          <TabsContent value="technical">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-accent" />
                  Add Technical Question
                </CardTitle>
              </CardHeader>
              
              {/* Question Count Status */}
              <CardContent className="pb-0 pt-4 border-b border-border">
                <div className="space-y-3 mb-6">
                  <h3 className="text-sm font-semibold text-foreground">Questions Added per Level (Max 20)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((level) => {
                      const count = technicalQuestionCounts[level] || 0;
                      const isFull = count >= 20;
                      const levelName = level === 1 ? 'Beginner' : level === 2 ? 'Intermediate' : level === 3 ? 'Advanced' : 'Expert';
                      
                      return (
                        <div
                          key={level}
                          className={`p-4 rounded-lg border-2 flex items-center justify-between transition-all ${
                            isFull
                              ? 'border-success/50 bg-success/5'
                              : count >= 15
                              ? 'border-warning/50 bg-warning/5'
                              : 'border-border bg-card'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">Level {level}</p>
                            <p className="text-xs text-muted-foreground">{levelName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-lg font-bold ${isFull ? 'text-success' : count >= 15 ? 'text-warning' : 'text-accent'}`}>
                              {count}/20
                            </span>
                            {isFull && <CheckCircle2 className="w-4 h-4 text-success" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>

              {/* Limit warning if current level is full */}
              {(technicalQuestionCounts[technicalForm.level] || 0) >= 20 && (
                <CardContent className="pt-4 pb-0 border-b border-border">
                  <Alert className="border-destructive/50 bg-destructive/5">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive ml-2">
                      Level {technicalForm.level} already has 20 questions. Please select a different level to continue adding questions.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              )}

              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={technicalForm.title}
                      onChange={(e) => setTechnicalForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Two Sum"
                    />
                  </div>
                  <div>
                    <Label>Difficulty</Label>
                    <Select value={technicalForm.difficulty} onValueChange={(v) => setTechnicalForm(prev => ({ ...prev, difficulty: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={technicalForm.category} onValueChange={(v) => setTechnicalForm(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Arrays">Arrays</SelectItem>
                        <SelectItem value="Strings">Strings</SelectItem>
                        <SelectItem value="Linked Lists">Linked Lists</SelectItem>
                        <SelectItem value="Trees">Trees</SelectItem>
                        <SelectItem value="Dynamic Programming">Dynamic Programming</SelectItem>
                        <SelectItem value="Graphs">Graphs</SelectItem>
                        <SelectItem value="Stack">Stack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Level</Label>
                    <Select value={technicalForm.level.toString()} onValueChange={(v) => setTechnicalForm(prev => ({ ...prev, level: parseInt(v) }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Level 1 - Beginner</SelectItem>
                        <SelectItem value="2">Level 2 - Intermediate</SelectItem>
                        <SelectItem value="3">Level 3 - Advanced</SelectItem>
                        <SelectItem value="4">Final Level - Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={technicalForm.description}
                    onChange={(e) => setTechnicalForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the problem..."
                    rows={4}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Examples</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTechnicalForm(prev => ({ ...prev, examples: [...prev.examples, { input: '', output: '', explanation: '' }] }))}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Example
                    </Button>
                  </div>
                  {technicalForm.examples.map((example, index) => (
                    <div key={index} className="p-4 border border-border rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Example {index + 1}</span>
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setTechnicalForm(prev => ({ ...prev, examples: prev.examples.filter((_, i) => i !== index) }))}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <Input
                        value={example.input}
                        onChange={(e) => {
                          const newExamples = [...technicalForm.examples];
                          newExamples[index].input = e.target.value;
                          setTechnicalForm(prev => ({ ...prev, examples: newExamples }));
                        }}
                        placeholder="Input"
                      />
                      <Input
                        value={example.output}
                        onChange={(e) => {
                          const newExamples = [...technicalForm.examples];
                          newExamples[index].output = e.target.value;
                          setTechnicalForm(prev => ({ ...prev, examples: newExamples }));
                        }}
                        placeholder="Output"
                      />
                      <Input
                        value={example.explanation}
                        onChange={(e) => {
                          const newExamples = [...technicalForm.examples];
                          newExamples[index].explanation = e.target.value;
                          setTechnicalForm(prev => ({ ...prev, examples: newExamples }));
                        }}
                        placeholder="Explanation (optional)"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <Label>Solution Code</Label>
                  <Textarea
                    value={technicalForm.solution}
                    onChange={(e) => setTechnicalForm(prev => ({ ...prev, solution: e.target.value }))}
                    placeholder="Paste your solution code here..."
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>

                <div>
                  <Label>Approach Explanation</Label>
                  <Textarea
                    value={technicalForm.approach}
                    onChange={(e) => setTechnicalForm(prev => ({ ...prev, approach: e.target.value }))}
                    placeholder="Explain the approach and time/space complexity..."
                    rows={4}
                  />
                </div>

                <Button onClick={handleTechnicalSubmit} disabled={saving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Technical Question'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GD Topics Tab */}
          <TabsContent value="gd">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-success" />
                  Add Group Discussion Topic
                </CardTitle>
              </CardHeader>
              
              {/* Question Count Status */}
              <CardContent className="pb-0 pt-4 border-b border-border">
                <div className="space-y-3 mb-6">
                  <h3 className="text-sm font-semibold text-foreground">Topics Added per Level (Max 20)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((level) => {
                      const count = gdQuestionCounts[level] || 0;
                      const isFull = count >= 20;
                      const levelName = level === 1 ? 'Beginner' : level === 2 ? 'Intermediate' : level === 3 ? 'Advanced' : 'Expert';
                      
                      return (
                        <div
                          key={level}
                          className={`p-4 rounded-lg border-2 flex items-center justify-between transition-all ${
                            isFull
                              ? 'border-success/50 bg-success/5'
                              : count >= 15
                              ? 'border-warning/50 bg-warning/5'
                              : 'border-border bg-card'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">Level {level}</p>
                            <p className="text-xs text-muted-foreground">{levelName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-lg font-bold ${isFull ? 'text-success' : count >= 15 ? 'text-warning' : 'text-success'}`}>
                              {count}/20
                            </span>
                            {isFull && <CheckCircle2 className="w-4 h-4 text-success" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>

              {/* Limit warning if current level is full */}
              {(gdQuestionCounts[gdForm.level] || 0) >= 20 && (
                <CardContent className="pt-4 pb-0 border-b border-border">
                  <Alert className="border-destructive/50 bg-destructive/5">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive ml-2">
                      Level {gdForm.level} already has 20 topics. Please select a different level to continue adding topics.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              )}

              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={gdForm.title}
                      onChange={(e) => setGdForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., AI in Healthcare"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={gdForm.category} onValueChange={(v) => setGdForm(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Technology">Technology</SelectItem>
                        <SelectItem value="Social">Social</SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Environment">Environment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Level</Label>
                    <Select value={gdForm.level.toString()} onValueChange={(v) => setGdForm(prev => ({ ...prev, level: parseInt(v) }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Level 1 - Beginner</SelectItem>
                        <SelectItem value="2">Level 2 - Intermediate</SelectItem>
                        <SelectItem value="3">Level 3 - Advanced</SelectItem>
                        <SelectItem value="4">Final Level - Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={gdForm.description}
                    onChange={(e) => setGdForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief overview of the topic..."
                    rows={3}
                  />
                </div>

                {/* Points For */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-success">Points For</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('pointsFor')}>
                      <Plus className="h-4 w-4 mr-1" /> Add Point
                    </Button>
                  </div>
                  {gdForm.pointsFor.map((point, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={point}
                        onChange={(e) => updateArrayItem('pointsFor', index, e.target.value)}
                        placeholder={`Point ${index + 1} in favor...`}
                      />
                      {index > 0 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem('pointsFor', index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Points Against */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-destructive">Points Against</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('pointsAgainst')}>
                      <Plus className="h-4 w-4 mr-1" /> Add Point
                    </Button>
                  </div>
                  {gdForm.pointsAgainst.map((point, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={point}
                        onChange={(e) => updateArrayItem('pointsAgainst', index, e.target.value)}
                        placeholder={`Point ${index + 1} against...`}
                      />
                      {index > 0 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem('pointsAgainst', index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Tips */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-primary">Tips</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('tips')}>
                      <Plus className="h-4 w-4 mr-1" /> Add Tip
                    </Button>
                  </div>
                  {gdForm.tips.map((tip, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={tip}
                        onChange={(e) => updateArrayItem('tips', index, e.target.value)}
                        placeholder={`Tip ${index + 1}...`}
                      />
                      {index > 0 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem('tips', index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <Label>Model Conclusion</Label>
                  <Textarea
                    value={gdForm.conclusion}
                    onChange={(e) => setGdForm(prev => ({ ...prev, conclusion: e.target.value }))}
                    placeholder="A balanced conclusion for this topic..."
                    rows={4}
                  />
                </div>

                <Button onClick={handleGDSubmit} disabled={saving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save GD Topic'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Aptitude Questions Tab */}
          <TabsContent value="manage-apt">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Edit/Delete Aptitude Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={fetchAllAptitudeQuestions} variant="outline" className="mb-4">
                  {loadingQuestions ? 'Loading...' : 'Load All Questions'}
                </Button>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allAptitudeQuestions.map((q: any) => (
                    <div key={q.id} className="p-4 border border-border rounded-lg bg-card">
                      {editingAptitudeId === q.id ? (
                        <div className="space-y-3">
                          <div>
                            <Label>Question</Label>
                            <Textarea
                              value={editAptitudeForm?.question}
                              onChange={(e) => setEditAptitudeForm(prev => ({ ...prev, question: e.target.value }))}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label>Category</Label>
                              <Select value={editAptitudeForm?.category} onValueChange={(v) => setEditAptitudeForm(prev => ({ ...prev, category: v }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Quantitative">Quantitative</SelectItem>
                                  <SelectItem value="Logical Reasoning">Logical Reasoning</SelectItem>
                                  <SelectItem value="Verbal Ability">Verbal Ability</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Level</Label>
                              <Select value={editAptitudeForm?.level?.toString()} onValueChange={(v) => setEditAptitudeForm(prev => ({ ...prev, level: parseInt(v) }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Level 1</SelectItem>
                                  <SelectItem value="2">Level 2</SelectItem>
                                  <SelectItem value="3">Level 3</SelectItem>
                                  <SelectItem value="4">Level 4</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {editAptitudeForm?.options?.map((opt: string, idx: number) => (
                            <div key={idx}>
                              <Label>Option {idx + 1}</Label>
                              <Input value={opt} onChange={(e) => setEditAptitudeForm(prev => ({
                                ...prev,
                                options: prev.options.map((o: string, i: number) => i === idx ? e.target.value : o)
                              }))} />
                            </div>
                          ))}
                          <div>
                            <Label>Correct Answer (0-3)</Label>
                            <Input type="number" min="0" max="3" value={editAptitudeForm?.correct_answer} onChange={(e) => setEditAptitudeForm(prev => ({ ...prev, correct_answer: parseInt(e.target.value) }))} />
                          </div>
                          <div>
                            <Label>Explanation</Label>
                            <Textarea value={editAptitudeForm?.explanation} onChange={(e) => setEditAptitudeForm(prev => ({ ...prev, explanation: e.target.value }))} />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleUpdateAptitude} disabled={saving} className="flex-1">Save Changes</Button>
                            <Button onClick={() => {setEditingAptitudeId(null); setEditAptitudeForm(null);}} variant="outline" className="flex-1">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{q.question?.substring(0, 60)}...</p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{q.category}</span>
                                <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded">Level {q.level}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => {
                                setEditingAptitudeId(q.id);
                                setEditAptitudeForm({ ...q });
                              }}>Edit</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteAptitude(q.id)}>Delete</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Technical Questions Tab */}
          <TabsContent value="manage-tech">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-accent" />
                  Edit/Delete Technical Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={fetchAllTechnicalQuestions} variant="outline" className="mb-4">
                  {loadingQuestions ? 'Loading...' : 'Load All Questions'}
                </Button>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allTechnicalQuestions.map((q: any) => (
                    <div key={q.id} className="p-4 border border-border rounded-lg bg-card">
                      {editingTechnicalId === q.id ? (
                        <div className="space-y-3">
                          <div>
                            <Label>Title</Label>
                            <Input value={editTechnicalForm?.title} onChange={(e) => setEditTechnicalForm(prev => ({ ...prev, title: e.target.value }))} />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <Label>Category</Label>
                              <Select value={editTechnicalForm?.category} onValueChange={(v) => setEditTechnicalForm(prev => ({ ...prev, category: v }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Arrays">Arrays</SelectItem>
                                  <SelectItem value="Strings">Strings</SelectItem>
                                  <SelectItem value="Linked Lists">Linked Lists</SelectItem>
                                  <SelectItem value="Dynamic Programming">Dynamic Programming</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Difficulty</Label>
                              <Select value={editTechnicalForm?.difficulty} onValueChange={(v) => setEditTechnicalForm(prev => ({ ...prev, difficulty: v }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Easy">Easy</SelectItem>
                                  <SelectItem value="Medium">Medium</SelectItem>
                                  <SelectItem value="Hard">Hard</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Level</Label>
                              <Select value={editTechnicalForm?.level?.toString()} onValueChange={(v) => setEditTechnicalForm(prev => ({ ...prev, level: parseInt(v) }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Level 1</SelectItem>
                                  <SelectItem value="2">Level 2</SelectItem>
                                  <SelectItem value="3">Level 3</SelectItem>
                                  <SelectItem value="4">Level 4</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Textarea value={editTechnicalForm?.description} onChange={(e) => setEditTechnicalForm(prev => ({ ...prev, description: e.target.value }))} rows={3} />
                          </div>
                          <div>
                            <Label>Solution</Label>
                            <Textarea value={editTechnicalForm?.solution} onChange={(e) => setEditTechnicalForm(prev => ({ ...prev, solution: e.target.value }))} rows={3} />
                          </div>
                          <div>
                            <Label>Approach</Label>
                            <Textarea value={editTechnicalForm?.approach} onChange={(e) => setEditTechnicalForm(prev => ({ ...prev, approach: e.target.value }))} rows={3} />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleUpdateTechnical} disabled={saving} className="flex-1">Save Changes</Button>
                            <Button onClick={() => {setEditingTechnicalId(null); setEditTechnicalForm(null);}} variant="outline" className="flex-1">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{q.title}</p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">{q.category}</span>
                                <span className={`text-xs px-2 py-1 rounded ${q.difficulty === 'Easy' ? 'bg-success/10 text-success' : q.difficulty === 'Medium' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{q.difficulty}</span>
                                <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded">Level {q.level}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => {
                                setEditingTechnicalId(q.id);
                                setEditTechnicalForm({ ...q });
                              }}>Edit</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteTechnical(q.id)}>Delete</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage GD Topics Tab */}
          <TabsContent value="manage-gd">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-success" />
                  Edit/Delete GD Topics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={fetchAllGdQuestions} variant="outline" className="mb-4">
                  {loadingQuestions ? 'Loading...' : 'Load All Topics'}
                </Button>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allGdQuestions.map((q: any) => (
                    <div key={q.id} className="p-4 border border-border rounded-lg bg-card">
                      {editingGdId === q.id ? (
                        <div className="space-y-3">
                          <div>
                            <Label>Title</Label>
                            <Input value={editGdForm?.title} onChange={(e) => setEditGdForm(prev => ({ ...prev, title: e.target.value }))} />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label>Category</Label>
                              <Select value={editGdForm?.category} onValueChange={(v) => setEditGdForm(prev => ({ ...prev, category: v }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Technology">Technology</SelectItem>
                                  <SelectItem value="Social">Social</SelectItem>
                                  <SelectItem value="Business">Business</SelectItem>
                                  <SelectItem value="Finance">Finance</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Level</Label>
                              <Select value={editGdForm?.level?.toString()} onValueChange={(v) => setEditGdForm(prev => ({ ...prev, level: parseInt(v) }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Level 1</SelectItem>
                                  <SelectItem value="2">Level 2</SelectItem>
                                  <SelectItem value="3">Level 3</SelectItem>
                                  <SelectItem value="4">Level 4</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Textarea value={editGdForm?.description} onChange={(e) => setEditGdForm(prev => ({ ...prev, description: e.target.value }))} rows={2} />
                          </div>
                          <div>
                            <Label>Conclusion</Label>
                            <Textarea value={editGdForm?.conclusion} onChange={(e) => setEditGdForm(prev => ({ ...prev, conclusion: e.target.value }))} rows={2} />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleUpdateGd} disabled={saving} className="flex-1">Save Changes</Button>
                            <Button onClick={() => {setEditingGdId(null); setEditGdForm(null);}} variant="outline" className="flex-1">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{q.title}</p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-xs bg-success/10 text-success px-2 py-1 rounded">{q.category}</span>
                                <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded">Level {q.level}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => {
                                setEditingGdId(q.id);
                                setEditGdForm({ ...q });
                              }}>Edit</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteGd(q.id)}>Delete</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CSV Import - Aptitude Tab */}
          <TabsContent value="import-apt">
            <CSVImport 
              type="aptitude"
              onCountsUpdated={fetchAptitudeQuestionCounts}
            />
          </TabsContent>

          {/* CSV Import - Technical Tab */}
          <TabsContent value="import-tech">
            <CSVImport 
              type="technical"
              onCountsUpdated={fetchTechnicalQuestionCounts}
            />
          </TabsContent>

          {/* CSV Import - GD Tab */}
          <TabsContent value="import-gd">
            <CSVImport 
              type="gd"
              onCountsUpdated={fetchGdQuestionCounts}
            />
          </TabsContent>

          {/* User Progress Tab */}
          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  User Progress Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label>Search by Name or Email</Label>
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Filter by Category</Label>
                    <Select value={progressCategory} onValueChange={(v: any) => setProgressCategory(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="aptitude">Aptitude Only</SelectItem>
                        <SelectItem value="technical">Technical Only</SelectItem>
                        <SelectItem value="gd">GD Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Load Button */}
                <Button 
                  onClick={fetchUserProgress} 
                  disabled={loadingProgress}
                  className="w-full"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {loadingProgress ? 'Loading...' : 'Load User Progress'}
                </Button>

                {/* User Progress Table */}
                {userProgressData.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold text-foreground">User</th>
                          {(progressCategory === 'all' || progressCategory === 'aptitude') && (
                            <>
                              <th className="text-center py-3 px-4 font-semibold text-foreground">Aptitude</th>
                            </>
                          )}
                          {(progressCategory === 'all' || progressCategory === 'technical') && (
                            <>
                              <th className="text-center py-3 px-4 font-semibold text-foreground">Technical</th>
                            </>
                          )}
                          {(progressCategory === 'all' || progressCategory === 'gd') && (
                            <>
                              <th className="text-center py-3 px-4 font-semibold text-foreground">Group Discussion</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {userProgressData
                          .filter(user => 
                            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            user.name.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((user) => (
                            <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="py-4 px-4">
                                <div>
                                  <p className="font-medium text-foreground">{user.name}</p>
                                  <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                              </td>
                              {(progressCategory === 'all' || progressCategory === 'aptitude') && (
                                <td className="py-4 px-4 text-center">
                                  <div className="inline-block bg-primary/10 rounded-lg p-3">
                                    <p className="text-lg font-bold text-primary">{user.aptitude.attempted}</p>
                                    <p className="text-xs text-muted-foreground">Attempted</p>
                                    <p className="text-sm font-semibold text-success mt-1">{user.aptitude.correct} correct</p>
                                    <div className="mt-2 w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary transition-all"
                                        style={{ width: `${user.aptitude.accuracy}%` }}
                                      />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{user.aptitude.accuracy}% accuracy</p>
                                  </div>
                                </td>
                              )}
                              {(progressCategory === 'all' || progressCategory === 'technical') && (
                                <td className="py-4 px-4 text-center">
                                  <div className="inline-block bg-accent/10 rounded-lg p-3">
                                    <p className="text-lg font-bold text-accent">{user.technical.attempted}</p>
                                    <p className="text-xs text-muted-foreground">Attempted</p>
                                    <p className="text-sm font-semibold text-success mt-1">{user.technical.correct} correct</p>
                                    <div className="mt-2 w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-accent transition-all"
                                        style={{ width: `${user.technical.accuracy}%` }}
                                      />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{user.technical.accuracy}% accuracy</p>
                                  </div>
                                </td>
                              )}
                              {(progressCategory === 'all' || progressCategory === 'gd') && (
                                <td className="py-4 px-4 text-center">
                                  <div className="inline-block bg-secondary/10 rounded-lg p-3">
                                    <p className="text-lg font-bold text-secondary">{user.gd.attempted}</p>
                                    <p className="text-xs text-muted-foreground">Attempted</p>
                                    <p className="text-sm font-semibold text-success mt-1">{user.gd.correct} correct</p>
                                    <div className="mt-2 w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-secondary transition-all"
                                        style={{ width: `${user.gd.accuracy}%` }}
                                      />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{user.gd.accuracy}% accuracy</p>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Empty State */}
                {userProgressData.length === 0 && !loadingProgress && (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">Click "Load User Progress" to view all user data</p>
                  </div>
                )}

                {/* Loading State */}
                {loadingProgress && (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading user progress...</p>
                  </div>
                )}

                {/* No Results */}
                {userProgressData.length > 0 && 
                 userProgressData.filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()) || u.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No users found matching your search</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
