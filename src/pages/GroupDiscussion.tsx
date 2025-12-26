import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLevelProgress } from '@/hooks/useLevelProgress';
import { 
  ArrowLeft, 
  MessageSquare, 
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Briefcase,
  Cpu,
  Users,
  Loader2,
  Check,
  Lock,
  Star,
  Award,
  Trophy,
  Crown
} from 'lucide-react';

interface GDTopic {
  id: string;
  title: string;
  category: string;
  description: string;
  pointsFor: string[];
  pointsAgainst: string[];
  tips: string[];
  conclusion: string;
  level: number;
}

const categories = [
  { id: 'Technology', name: 'Technology', icon: Cpu },
  { id: 'Business', name: 'Business', icon: Briefcase },
  { id: 'Social', name: 'Social', icon: Users },
  { id: 'Finance', name: 'Finance', icon: TrendingUp },
];

const levelConfig = [
  { name: 'Level 1', icon: Star, subtitle: 'Beginner' },
  { name: 'Level 2', icon: Award, subtitle: 'Intermediate' },
  { name: 'Level 3', icon: Trophy, subtitle: 'Advanced' },
  { name: 'Final Level', icon: Crown, subtitle: 'Expert' },
];

const GroupDiscussion = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [topics, setTopics] = useState<GDTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [trackedTopics, setTrackedTopics] = useState<Set<string>>(new Set());
  const expandStartTime = useRef<number | null>(null);

  const categoryTopics = selectedCategory 
    ? topics.filter(t => t.category === selectedCategory)
    : [];
  
  const { progress, loading: progressLoading } = useLevelProgress(
    user?.id,
    'gd',
    selectedCategory,
    categoryTopics
  );

  useEffect(() => {
    fetchTopics();
    if (user) {
      fetchTrackedTopics();
    }
  }, [user]);

  const fetchTopics = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gd_topics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching topics:', error);
    } else if (data) {
      setTopics(data.map(t => ({
        id: t.id,
        title: t.title,
        category: t.category,
        description: t.description,
        pointsFor: t.points_for as string[],
        pointsAgainst: t.points_against as string[],
        tips: t.tips as string[],
        conclusion: t.conclusion,
        level: (t as any).level || 1
      })));
    }
    setLoading(false);
  };

  const fetchTrackedTopics = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_progress')
      .select('question_id')
      .eq('user_id', user.id)
      .eq('question_type', 'gd');
    
    if (data) {
      setTrackedTopics(new Set(data.map(p => p.question_id)));
    }
  };

  const trackProgress = async (topicId: string, timeSpent: number) => {
    if (!user || trackedTopics.has(topicId)) return;
    
    await supabase.from('user_progress').insert({
      user_id: user.id,
      question_id: topicId,
      question_type: 'gd',
      is_correct: true,
      time_spent_seconds: timeSpent
    });
    
    setTrackedTopics(prev => new Set(prev).add(topicId));
  };

  const handleExpand = (topicId: string) => {
    if (expandedId === topicId) {
      if (expandStartTime.current && user) {
        const timeSpent = Math.floor((Date.now() - expandStartTime.current) / 1000);
        trackProgress(topicId, timeSpent);
      }
      expandStartTime.current = null;
      setExpandedId(null);
    } else {
      expandStartTime.current = Date.now();
      setExpandedId(topicId);
    }
  };

  const filteredTopics = selectedCategory && selectedLevel
    ? topics.filter(t => t.category === selectedCategory && t.level === selectedLevel)
    : [];

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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">Group Discussion</span>
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
                Master Group Discussion Topics
              </h1>
              <p className="text-muted-foreground">
                Choose a category to explore discussion topics with balanced arguments and model answers.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="group bg-card rounded-2xl shadow-card border border-border p-6 text-center hover:border-accent/50 hover:shadow-lg transition-all"
                >
                  <div className="w-14 h-14 mx-auto rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                    <cat.icon className="w-7 h-7 text-accent" />
                  </div>
                  <h3 className="font-semibold text-foreground">{cat.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {topics.filter(t => t.category === cat.id).length} topics
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
              className="text-sm text-accent hover:underline mb-6"
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
                const levelTopics = categoryTopics.filter(t => t.level === level);

                return (
                  <button
                    key={level}
                    onClick={() => levelData.isUnlocked && setSelectedLevel(level)}
                    disabled={!levelData.isUnlocked}
                    className={`group bg-card rounded-2xl shadow-card border border-border p-6 text-center transition-all relative overflow-hidden ${
                      levelData.isUnlocked 
                        ? 'hover:border-accent/50 hover:shadow-lg cursor-pointer' 
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
                    
                    <div className={`w-14 h-14 mx-auto rounded-xl bg-accent/10 flex items-center justify-center mb-4 ${
                      levelData.isUnlocked ? 'group-hover:bg-accent/20' : ''
                    } transition-colors`}>
                      <Icon className="w-7 h-7 text-accent" />
                    </div>
                    
                    <h3 className="font-semibold text-foreground">{config.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{config.subtitle}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {levelTopics.length} topics
                    </p>
                    
                    {levelData.isUnlocked && levelData.answeredQuestions > 0 && (
                      <div className="mt-3">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-accent transition-all"
                            style={{ width: `${Math.round((levelData.answeredQuestions / levelData.totalQuestions) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {levelData.answeredQuestions}/{levelData.totalQuestions} • {levelData.accuracy}%
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="text-center py-12">
            <button
              onClick={() => setSelectedLevel(null)}
              className="text-accent hover:underline mb-4"
            >
              ← Back to Levels
            </button>
            <p className="text-muted-foreground">No topics available in this level yet.</p>
          </div>
        ) : (
          /* Topics List */
          <div className="max-w-4xl mx-auto space-y-4">
            <button
              onClick={() => setSelectedLevel(null)}
              className="text-sm text-accent hover:underline mb-4"
            >
              ← Back to Levels
            </button>
            {filteredTopics.map((topic, idx) => (
              <div 
                key={topic.id}
                className="bg-card rounded-2xl shadow-card border border-border overflow-hidden animate-slide-up"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {/* Topic Header */}
                <button
                  onClick={() => handleExpand(topic.id)}
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                        {topic.category}
                      </span>
                      {trackedTopics.has(topic.id) && (
                        <Check className="w-4 h-4 text-success" />
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground text-lg">{topic.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ml-4 flex-shrink-0 ${expandedId === topic.id ? 'rotate-180' : ''}`} />
                </button>

                {/* Expanded Content */}
                {expandedId === topic.id && (
                  <div className="px-5 pb-5 border-t border-border animate-fade-in">
                    {/* Points For */}
                    <div className="py-4">
                      <div className="flex items-center gap-2 mb-3">
                        <ThumbsUp className="w-5 h-5 text-success" />
                        <h4 className="font-medium text-foreground">Points in Favor</h4>
                      </div>
                      <ul className="space-y-2">
                        {topic.pointsFor.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Points Against */}
                    <div className="py-4 border-t border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <ThumbsDown className="w-5 h-5 text-destructive" />
                        <h4 className="font-medium text-foreground">Points Against</h4>
                      </div>
                      <ul className="space-y-2">
                        {topic.pointsAgainst.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Tips */}
                    <div className="py-4 border-t border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-5 h-5 text-warning" />
                        <h4 className="font-medium text-foreground">Discussion Tips</h4>
                      </div>
                      <ul className="space-y-2">
                        {topic.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="w-5 h-5 rounded-full bg-warning/20 text-warning flex items-center justify-center text-xs flex-shrink-0">
                              {i + 1}
                            </span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Conclusion */}
                    <div className="py-4 border-t border-border">
                      <div className="bg-primary/5 rounded-xl p-4">
                        <h4 className="font-medium text-foreground mb-2">Model Conclusion</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {topic.conclusion}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tips Section */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-gradient-to-br from-accent to-secondary rounded-2xl p-6 md:p-8">
            <h3 className="text-xl font-bold text-primary-foreground mb-4">
              General GD Tips
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "Start with a clear introduction of the topic",
                "Listen actively and acknowledge others' points",
                "Use facts and examples to support your arguments",
                "Maintain a calm and respectful tone",
                "Summarize key points when concluding",
                "Avoid interrupting others while they speak"
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-primary-foreground/90">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GroupDiscussion;
