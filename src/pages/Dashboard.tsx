import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Calculator, 
  Code, 
  MessageSquare, 
  LogOut, 
  Trophy,
  Target,
  Clock,
  ChevronRight,
  Sparkles,
  User,
  Settings
} from 'lucide-react';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    questionsSolved: 0,
    accuracyRate: 0,
    timeSpent: 0
  });

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_progress')
      .select('is_correct, time_spent_seconds')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching stats:', error);
      return;
    }

    if (data && data.length > 0) {
      const totalQuestions = data.length;
      const correctAnswers = data.filter(p => p.is_correct).length;
      const totalTime = data.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);
      
      setStats({
        questionsSolved: totalQuestions,
        accuracyRate: Math.round((correctAnswers / totalQuestions) * 100),
        timeSpent: Math.round(totalTime / 3600) // Convert to hours
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const categories = [
    {
      id: 'aptitude',
      title: 'Aptitude MCQs',
      description: 'Practice quantitative, logical reasoning, and verbal ability questions',
      icon: Calculator,
      color: 'from-primary to-accent',
      stats: '500+ Questions',
      path: '/aptitude',
    },
    {
      id: 'technical',
      title: 'Technical Round',
      description: 'Coding challenges, DSA problems, and system design questions',
      icon: Code,
      color: 'from-secondary to-primary',
      stats: '200+ Problems',
      path: '/technical',
    },
    {
      id: 'gd',
      title: 'Group Discussion',
      description: 'Current topics, model answers, and discussion strategies',
      icon: MessageSquare,
      color: 'from-accent to-secondary',
      stats: '100+ Topics',
      path: '/group-discussion',
    },
    {
      id: 'mock-test',
      title: 'Mock Tests',
      description: 'Timed mock tests with saved progress and results',
      icon: Clock,
      color: 'from-primary to-secondary',
      stats: 'Timed Sessions',
      path: '/mock-test',
    },
  ];

  const quickStats = [
    { icon: Trophy, label: 'Questions Solved', value: stats.questionsSolved.toString() },
    { icon: Target, label: 'Accuracy Rate', value: stats.questionsSolved > 0 ? `${stats.accuracyRate}%` : '--%' },
    { icon: Clock, label: 'Time Spent', value: `${stats.timeSpent}h` },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--secondary)' }}>
              <Brain className="w-6 h-6" style={{ color: 'var(--primary)' }} />
            </div>
            <span className="text-xl font-bold text-foreground">PrepMaster</span>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => navigate('/admin')}
                className="hidden sm:flex items-center gap-2 text-primary hover:text-primary"
              >
                <Settings className="w-4 h-4" />
                Admin
              </Button>
            )}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-primary">
              <User className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                {user?.email?.split('@')[0]}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSignOut}
              className="text-primary hover:text-primary"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 md:py-20 overflow-hidden">
  <div className="absolute inset-0" style={{ backgroundColor: 'rgba(37,99,235,0.03)' }}></div>
  <div className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(37,99,235,0.06)' }}></div>
  <div className="absolute bottom-0 right-10 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(75,85,99,0.04)' }}></div>
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in" style={{ backgroundColor: 'rgba(37,99,235,0.06)', color: 'var(--primary)' }}>
              <Sparkles className="w-4 h-4" />
              Welcome back, {user?.email?.split('@')[0]}!
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 animate-slide-up">
              Ready to ace your
              <span className="block mt-1" style={{ color: 'var(--primary)' }}>next interview?</span>
            </h1>

            <p className="text-lg" style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>
              Practice aptitude tests, coding challenges, and group discussions 
              to prepare for your dream job.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mt-8">
            {quickStats.map((stat, idx) => (
              <div 
                key={idx}
                className="bg-card rounded-2xl p-4 text-center shadow-card border border-border animate-scale-in"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <stat.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Choose Your Practice Area
            </h2>
            <p className="text-muted-foreground">
              Select a category to start practicing
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {categories.map((category, idx) => (
              <button
                key={category.id}
                onClick={() => navigate(category.path)}
                className="group relative bg-card rounded-3xl p-6 text-left shadow-card border border-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                  style={{
                    backgroundColor:
                      category.id === 'aptitude'
                        ? 'rgba(37,99,235,0.06)'
                        : category.id === 'technical'
                        ? 'rgba(75,85,99,0.06)'
                        : 'rgba(37,99,235,0.04)',
                  }}
                >
                  <category.icon className="w-7 h-7" style={{ color: 'var(--primary)' }} />
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {category.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {category.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(37,99,235,0.06)', color: 'var(--primary)' }}>
                    {category.stats}
                  </span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 PrepMaster. Practice smarter, succeed faster.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;