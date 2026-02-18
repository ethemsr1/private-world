"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CheckCircle2, Circle, Sparkles, Trash2, Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Verileri Çekme Fonksiyonu
  const fetchPlans = async () => {
    const { data } = await supabase
      .from('plans')
      .select(`
        *,
        profiles:created_by (full_name, avatar_url)
      `)
      .order('created_at', { ascending: false }); // En yeniler üstte

    if (data) setPlans(data);
    setLoading(false);
  };

  useEffect(() => {
    // 1. Giriş yapan kullanıcıyı bul
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUser(session.user);
    };
    getUser();

    // 2. İlk yüklemede planları getir
    fetchPlans();

    // 3. GERÇEK ZAMANLI DİNLEME (Sihir burada!)
    // Veritabanında biri bir şey ekler/siler/değiştirirse anında listeyi yenile
    const channel = supabase.channel('realtime:plans')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => {
        fetchPlans();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Yeni Plan Ekleme
  const addPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentUser) return;
    setAdding(true);

    await supabase.from('plans').insert([{ 
      title: input, 
      created_by: currentUser.id 
    }]);

    setInput("");
    setAdding(false);
  };

  // Planı Tamamla / Geri Al
  const togglePlan = async (id: string, currentStatus: boolean) => {
    // UI'ı anında hızlıca güncelle (Kullanıcı beklemesin)
    setPlans(plans.map(p => p.id === id ? { ...p, is_completed: !currentStatus } : p));
    
    // Veritabanını güncelle
    await supabase.from('plans').update({ is_completed: !currentStatus }).eq('id', id);
  };

  // Planı Sil
  const deletePlan = async (id: string) => {
    setPlans(plans.filter(p => p.id !== id));
    await supabase.from('plans').delete().eq('id', id);
  };

  return (
    <div className="p-6 pb-32">
      <header className="mb-8 mt-12">
        <h1 className="text-3xl font-extrabold text-slate-800">Planlarımız</h1>
        <p className="text-slate-500 text-sm mt-1 flex items-center gap-1">
          <Sparkles size={14} className="text-orange-400" /> Birlikte yapacak çok şey var.
        </p>
      </header>

      {/* PLAN EKLEME FORMU */}
      <form onSubmit={addPlan} className="flex gap-2 mb-8">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Yeni bir plan ekle..." 
          className="flex-1 bg-white border border-slate-100 px-5 py-4 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-200 font-medium"
        />
        <button type="submit" disabled={adding || !input} className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center min-w-[3.5rem]">
          {adding ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
        </button>
      </form>

      {/* PLANLAR LİSTESİ */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-400" size={32} /></div>
      ) : plans.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200">
          <p className="text-slate-400 font-medium">Henüz bir plan eklenmemiş.<br/>İlk planı sen yap! ✈️</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {plans.map((plan) => (
              <motion.div 
                key={plan.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`p-4 rounded-3xl border flex items-center justify-between transition-all ${plan.is_completed ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-white shadow-sm'}`}
              >
                
                {/* SOL: Tik işareti ve Metin */}
                <div 
                  className="flex items-center gap-4 flex-1 cursor-pointer"
                  onClick={() => togglePlan(plan.id, plan.is_completed)}
                >
                  <motion.div whileTap={{ scale: 0.8 }}>
                    {plan.is_completed ? <CheckCircle2 className="text-green-500" size={26} /> : <Circle className="text-slate-300" size={26} />}
                  </motion.div>
                  <span className={`text-[15px] font-bold ${plan.is_completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {plan.title}
                  </span>
                </div>

                {/* SAĞ: Ekleyen Kişinin İkonu ve Sil Tuşu */}
                <div className="flex items-center gap-3 ml-2">
                  {/* Ekleyen kişinin minik avatarı */}
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden text-sm shadow-sm" title={plan.profiles?.full_name}>
                    {plan.profiles?.avatar_url?.startsWith('http') ? (
                      <img src={plan.profiles.avatar_url} alt="Ekleyen" className="w-full h-full object-cover" />
                    ) : (
                      plan.profiles?.avatar_url || "👤"
                    )}
                  </div>

                  {/* Sil Butonu */}
                  <button 
                    onClick={() => deletePlan(plan.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}