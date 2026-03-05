import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Bell,
  LogOut,
  User,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AggressionLevel = 'Polite' | 'Firm' | 'Drill Sergeant';

interface Task {
  id: string;
  user_id: string;
  title: string;
  start_time: string;
  status: 'pending' | 'completed';
  aggression_level: AggressionLevel;
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newAggression, setNewAggression] = useState<AggressionLevel>('Firm');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchTasks(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchTasks(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchTasks = async (userId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true });

    if (error) console.error('Error fetching tasks:', error);
    else setTasks(data || []);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          user_id: session.user.id,
          title: newTitle,
          start_time: new Date(newTime).toISOString(),
          aggression_level: newAggression,
          status: 'pending'
        }
      ])
      .select();

    if (error) {
      alert(error.message);
    } else {
      setTasks([...tasks, ...data]);
      setIsModalOpen(false);
      setNewTitle('');
      setNewTime('');
    }
  };

  const handleCheckIn = async (taskId: string) => {
    const response = await fetch('/api/tasks/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId })
    });

    if (response.ok) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: 'completed' } : t));
    }
  };

  const handleLogin = async () => {
    // For demo purposes, we'll use a simple email/password or just prompt
    const email = prompt('Enter email:');
    const password = prompt('Enter password:');
    if (email && password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  const handleSignUp = async () => {
    const email = prompt('Enter email:');
    const password = prompt('Enter password:');
    if (email && password) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert('Check your email for confirmation!');
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-orange-500 font-mono">LOADING NUDGE...</div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="relative inline-block">
            <Bell className="w-20 h-20 text-orange-500 animate-pulse" />
            <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold">URGENT</div>
          </div>
          <h1 className="text-6xl font-black text-white tracking-tighter italic">NUDGE</h1>
          <p className="text-zinc-400 text-lg">The calendar that doesn't take "I'll do it later" for an answer.</p>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleLogin}
              className="bg-zinc-900 border border-zinc-800 text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-colors"
            >
              SIGN IN
            </button>
            <button 
              onClick={handleSignUp}
              className="bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-500 transition-colors shadow-[0_0_20px_rgba(234,88,12,0.4)]"
            >
              GET STARTED
            </button>
          </div>
          
          <div className="pt-12 border-t border-zinc-900 grid grid-cols-3 gap-4 text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
            <div>Polite Nudges</div>
            <div>Firm Reminders</div>
            <div>Drill Sergeant</div>
          </div>
        </motion.div>
      </div>
    );
  }

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-500 selection:text-black">
      {/* Sidebar / Header */}
      <nav className="border-b border-zinc-900 p-4 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-lg">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-black italic tracking-tighter">NUDGE</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-full border border-zinc-800">
            <User className="w-4 h-4 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-300">{session.user.email}</span>
          </div>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="p-2 hover:bg-zinc-900 rounded-full text-zinc-500 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {/* Calendar Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-4xl font-bold tracking-tight">{format(currentDate, 'MMMM yyyy')}</h2>
            <p className="text-zinc-500 font-medium">You have {tasks.filter(t => t.status === 'pending').length} active nags.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-zinc-900 rounded-xl p-1 border border-zinc-800">
              <button 
                onClick={() => setCurrentDate(addDays(currentDate, -7))}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 text-sm font-bold hover:bg-zinc-800 rounded-lg transition-colors"
              >
                TODAY
              </button>
              <button 
                onClick={() => setCurrentDate(addDays(currentDate, 7))}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              NEW TASK
            </button>
          </div>
        </div>

        {/* Weekly View */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {days.map((day) => {
            const dayTasks = tasks.filter(t => isSameDay(parseISO(t.start_time), day));
            const isToday = isSameDay(day, new Date());
            
            return (
              <div 
                key={day.toString()} 
                className={cn(
                  "min-h-[200px] rounded-2xl p-4 border transition-all",
                  isToday ? "bg-zinc-900/50 border-orange-500/50" : "bg-zinc-900/20 border-zinc-900 hover:border-zinc-800"
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-widest",
                    isToday ? "text-orange-500" : "text-zinc-500"
                  )}>
                    {format(day, 'EEE')}
                  </span>
                  <span className={cn(
                    "text-xl font-black",
                    isToday ? "text-white" : "text-zinc-700"
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>

                <div className="space-y-2">
                  {dayTasks.map((task) => (
                    <motion.div
                      layoutId={task.id}
                      key={task.id}
                      onClick={() => task.status === 'pending' && handleCheckIn(task.id)}
                      className={cn(
                        "group relative p-3 rounded-xl border cursor-pointer transition-all overflow-hidden",
                        task.status === 'completed' 
                          ? "bg-zinc-900/50 border-zinc-800 opacity-50" 
                          : task.aggression_level === 'Drill Sergeant'
                            ? "bg-orange-600/10 border-orange-600/30 hover:bg-orange-600/20"
                            : task.aggression_level === 'Firm'
                              ? "bg-blue-600/10 border-blue-600/30 hover:bg-blue-600/20"
                              : "bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={cn(
                            "text-sm font-bold truncate",
                            task.status === 'completed' ? "line-through text-zinc-500" : "text-white"
                          )}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-zinc-500">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(task.start_time), 'h:mm a')}
                          </div>
                        </div>
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : task.aggression_level === 'Drill Sergeant' ? (
                          <ShieldAlert className="w-4 h-4 text-orange-500 shrink-0 animate-pulse" />
                        ) : task.aggression_level === 'Firm' ? (
                          <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0" />
                        ) : (
                          <Bell className="w-4 h-4 text-zinc-500 shrink-0" />
                        )}
                      </div>
                      
                      {task.status === 'pending' && (
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-[10px] font-black tracking-tighter uppercase">Check In</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Add Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-3xl font-black italic tracking-tighter mb-6">NEW OBJECTIVE</h3>
              
              <form onSubmit={handleAddTask} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Objective Title</label>
                  <input 
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Finish the quarterly report"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Execution Time</label>
                  <input 
                    required
                    type="datetime-local"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Aggression Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Polite', 'Firm', 'Drill Sergeant'] as AggressionLevel[]).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setNewAggression(level)}
                        className={cn(
                          "py-3 rounded-xl text-xs font-bold border transition-all",
                          newAggression === level 
                            ? level === 'Drill Sergeant' 
                              ? "bg-orange-600 border-orange-500 text-white"
                              : level === 'Firm'
                                ? "bg-blue-600 border-blue-500 text-white"
                                : "bg-white border-white text-black"
                            : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                        )}
                      >
                        {level.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-zinc-500 hover:bg-zinc-900 transition-colors"
                  >
                    ABORT
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-orange-600 py-4 rounded-xl font-bold text-white hover:bg-orange-500 transition-colors shadow-[0_0_20px_rgba(234,88,12,0.3)]"
                  >
                    DEPLOY
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
