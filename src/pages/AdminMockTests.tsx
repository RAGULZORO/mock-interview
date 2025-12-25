import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash, Edit, PlusCircle, ArrowLeft } from 'lucide-react';

type AptitudeForm = {
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  category?: string;
  level?: number;
};

type TechnicalForm = {
  title: string;
  difficulty?: string;
  category?: string;
  description?: string;
  examples?: string[];
  solution?: string;
  approach?: string;
  level?: number;
};

type GdForm = {
  title: string;
  category?: string;
  description?: string;
  points_for?: string[];
  points_against?: string[];
  tips?: string[];
  conclusion?: string;
  level?: number;
};

const AdminMockTests: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Aptitude
  const [aptitudeForm, setAptitudeForm] = useState<AptitudeForm>({
    question: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    explanation: '',
    category: '',
    level: 1,
  });
  const [aptitudeList, setAptitudeList] = useState<any[]>([]);

  // Technical
  const [technicalForm, setTechnicalForm] = useState<TechnicalForm>({
    title: '',
    difficulty: 'Medium',
    category: '',
    description: '',
    examples: [],
    solution: '',
    approach: '',
    level: 1,
  });
  const [technicalList, setTechnicalList] = useState<any[]>([]);

  // GD
  const [gdForm, setGdForm] = useState<GdForm>({
    title: '',
    category: '',
    description: '',
    points_for: [],
    points_against: [],
    tips: [],
    conclusion: '',
    level: 1,
  });
  const [gdList, setGdList] = useState<any[]>([]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: aData }, { data: tData }, { data: gData }] = await Promise.all([
      supabase.from('aptitude_questions').select('*').order('created_at', { ascending: false }),
      supabase.from('technical_questions').select('*').order('created_at', { ascending: false }),
      supabase.from('gd_topics').select('*').order('created_at', { ascending: false }),
    ]);

    setAptitudeList(aData || []);
    setTechnicalList(tData || []);
    setGdList(gData || []);
    setLoading(false);
  };

  // ---------- Aptitude handlers ----------
  const handleAptitudeOptionChange = (index: number, value: string) => {
    setAptitudeForm(f => {
      const next = { ...f };
      next.options = [...next.options];
      next.options[index] = value;
      return next;
    });
  };

  const handleCreateAptitude = async () => {
    if (!user) return alert('Sign in as admin to add questions');
    setLoading(true);
    const payload = {
      question: aptitudeForm.question,
      options: aptitudeForm.options,
      correct_answer: aptitudeForm.correct_answer,
      explanation: aptitudeForm.explanation,
      category: aptitudeForm.category,
      level: aptitudeForm.level,
      created_by: user.id,
    };

    const { error } = await supabase.from('aptitude_questions').insert(payload);
    if (error) console.error(error);
    await fetchAll();
    setAptitudeForm({ question: '', options: ['', '', '', ''], correct_answer: 0, explanation: '', category: '', level: 1 });
    setLoading(false);
  };

  const handleDeleteAptitude = async (id: string) => {
    if (!confirm('Delete this aptitude question?')) return;
    await supabase.from('aptitude_questions').delete().eq('id', id);
    await fetchAll();
  };

  // ---------- Technical handlers ----------
  const handleCreateTechnical = async () => {
    if (!user) return alert('Sign in as admin to add questions');
    setLoading(true);
    const payload = {
      title: technicalForm.title,
      difficulty: technicalForm.difficulty,
      category: technicalForm.category,
      description: technicalForm.description,
      examples: technicalForm.examples,
      solution: technicalForm.solution,
      approach: technicalForm.approach,
      level: technicalForm.level,
      created_by: user.id,
    };

    const { error } = await supabase.from('technical_questions').insert(payload);
    if (error) console.error(error);
    await fetchAll();
    setTechnicalForm({ title: '', difficulty: 'Medium', category: '', description: '', examples: [], solution: '', approach: '', level: 1 });
    setLoading(false);
  };

  const handleDeleteTechnical = async (id: string) => {
    if (!confirm('Delete this technical question?')) return;
    await supabase.from('technical_questions').delete().eq('id', id);
    await fetchAll();
  };

  // ---------- GD handlers ----------
  const handleCreateGd = async () => {
    if (!user) return alert('Sign in as admin to add questions');
    setLoading(true);
    const payload = {
      title: gdForm.title,
      category: gdForm.category,
      description: gdForm.description,
      points_for: gdForm.points_for,
      points_against: gdForm.points_against,
      tips: gdForm.tips,
      conclusion: gdForm.conclusion,
      level: gdForm.level,
      created_by: user.id,
    };

    const { error } = await supabase.from('gd_topics').insert(payload);
    if (error) console.error(error);
    await fetchAll();
    setGdForm({ title: '', category: '', description: '', points_for: [], points_against: [], tips: [], conclusion: '', level: 1 });
    setLoading(false);
  };

  const handleDeleteGd = async (id: string) => {
    if (!confirm('Delete this GD topic?')) return;
    await supabase.from('gd_topics').delete().eq('id', id);
    await fetchAll();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <h1 className="text-lg font-bold text-foreground">Admin Panel — Mock Tests</h1>
          <div />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="bg-card rounded-2xl p-6 shadow-card border border-border">
            <h2 className="text-lg font-semibold mb-4">Add Aptitude Question</h2>
            <label className="text-sm">Question</label>
            <Textarea value={aptitudeForm.question} onChange={e => setAptitudeForm(f => ({ ...f, question: e.target.value }))} className="mb-3" />

            <div className="grid grid-cols-1 gap-2 mb-3">
              {aptitudeForm.options.map((opt, idx) => (
                <Input key={idx} value={opt} onChange={e => handleAptitudeOptionChange(idx, e.target.value)} className="mb-1" />
              ))}
            </div>

            <label className="text-sm">Correct Answer (0-3)</label>
            <Input type="number" min={0} max={3} value={aptitudeForm.correct_answer} onChange={e => setAptitudeForm(f => ({ ...f, correct_answer: Number(e.target.value) }))} className="mb-3" />

            <label className="text-sm">Explanation (optional)</label>
            <Textarea value={aptitudeForm.explanation} onChange={e => setAptitudeForm(f => ({ ...f, explanation: e.target.value }))} className="mb-3" />

            <div className="flex gap-2">
              <Button onClick={handleCreateAptitude} className="flex items-center gap-2"><PlusCircle /> Add</Button>
              <Button variant="ghost" onClick={() => setAptitudeForm({ question: '', options: ['', '', '', ''], correct_answer: 0, explanation: '', category: '', level: 1 })}>Clear</Button>
            </div>
          </section>

          <section className="bg-card rounded-2xl p-6 shadow-card border border-border">
            <h2 className="text-lg font-semibold mb-4">Add Technical Question</h2>
            <label className="text-sm">Title</label>
            <Input value={technicalForm.title} onChange={e => setTechnicalForm(f => ({ ...f, title: e.target.value }))} className="mb-3" />

            <label className="text-sm">Description</label>
            <Textarea value={technicalForm.description} onChange={e => setTechnicalForm(f => ({ ...f, description: e.target.value }))} className="mb-3" />

            <label className="text-sm">Solution (optional)</label>
            <Textarea value={technicalForm.solution} onChange={e => setTechnicalForm(f => ({ ...f, solution: e.target.value }))} className="mb-3" />

            <div className="flex gap-2">
              <Button onClick={handleCreateTechnical} className="flex items-center gap-2"><PlusCircle /> Add</Button>
              <Button variant="ghost" onClick={() => setTechnicalForm({ title: '', difficulty: 'Medium', category: '', description: '', examples: [], solution: '', approach: '', level: 1 })}>Clear</Button>
            </div>
          </section>

          <section className="bg-card rounded-2xl p-6 shadow-card border border-border">
            <h2 className="text-lg font-semibold mb-4">Add GD Topic</h2>
            <label className="text-sm">Title</label>
            <Input value={gdForm.title} onChange={e => setGdForm(f => ({ ...f, title: e.target.value }))} className="mb-3" />

            <label className="text-sm">Description</label>
            <Textarea value={gdForm.description} onChange={e => setGdForm(f => ({ ...f, description: e.target.value }))} className="mb-3" />

            <div className="flex gap-2">
              <Button onClick={handleCreateGd} className="flex items-center gap-2"><PlusCircle /> Add</Button>
              <Button variant="ghost" onClick={() => setGdForm({ title: '', category: '', description: '', points_for: [], points_against: [], tips: [], conclusion: '', level: 1 })}>Clear</Button>
            </div>
          </section>
        </div>

        {/* Lists */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card p-4 rounded-2xl border border-border shadow-card">
            <h3 className="font-semibold mb-3">Aptitude Questions</h3>
            {loading ? <div>Loading...</div> : aptitudeList.map(q => (
              <div key={q.id} className="flex items-start justify-between gap-2 p-3 mb-2 rounded-lg bg-background border border-border">
                <div>
                  <div className="text-sm font-medium">{q.question}</div>
                  <div className="text-xs text-muted-foreground">Category: {q.category || '—'} • Level: {q.level || 1}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { /* TODO: edit flow */ }} className="text-muted-foreground"><Edit /></button>
                  <button onClick={() => handleDeleteAptitude(q.id)} className="text-destructive"><Trash /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card p-4 rounded-2xl border border-border shadow-card">
            <h3 className="font-semibold mb-3">Technical Questions</h3>
            {loading ? <div>Loading...</div> : technicalList.map(q => (
              <div key={q.id} className="flex items-start justify-between gap-2 p-3 mb-2 rounded-lg bg-background border border-border">
                <div>
                  <div className="text-sm font-medium">{q.title}</div>
                  <div className="text-xs text-muted-foreground">Difficulty: {q.difficulty || '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { /* TODO: edit flow */ }} className="text-muted-foreground"><Edit /></button>
                  <button onClick={() => handleDeleteTechnical(q.id)} className="text-destructive"><Trash /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card p-4 rounded-2xl border border-border shadow-card">
            <h3 className="font-semibold mb-3">GD Topics</h3>
            {loading ? <div>Loading...</div> : gdList.map(q => (
              <div key={q.id} className="flex items-start justify-between gap-2 p-3 mb-2 rounded-lg bg-background border border-border">
                <div>
                  <div className="text-sm font-medium">{q.title}</div>
                  <div className="text-xs text-muted-foreground">Level: {q.level || 1}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { /* TODO: edit flow */ }} className="text-muted-foreground"><Edit /></button>
                  <button onClick={() => handleDeleteGd(q.id)} className="text-destructive"><Trash /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminMockTests;
