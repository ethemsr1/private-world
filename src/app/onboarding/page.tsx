"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function Onboarding() {
  const [fullName, setFullName] = useState("");
  const [avatar, setAvatar] = useState("👨‍💻");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Şimdilik hızlıca seçilebilecek avatarlar (İleride gerçek fotoğraf yükleme de eklenebilir)
  const avatars = ["👨‍💻", "👸", "🚗", "☕", "📸", "🎨", "🎸", "🎮", "🧸", "✨"];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setLoading(true);

    try {
      // 1. Önce kimin giriş yaptığına bak
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Lütfen önce giriş yapın.");

      // 2. Kullanıcının Supabase'deki profilini güncelle
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName, 
          avatar_url: avatar 
        })
        .eq('id', session.user.id);

      if (error) throw error;

      // 3. Başarılıysa Dashboard'a gönder!
      router.push("/dashboard");
    } catch (error: any) {
      alert("Bir hata oluştu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#faf8f9] px-6 relative">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-sm z-10">
        
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-3xl bg-pink-50 text-pink-500 mb-4 shadow-sm">
            <Sparkles size={28} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Profilini Oluştur</h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Seni haritada ve anılarda nasıl göreceğiz?</p>
        </div>

        <form onSubmit={handleSave} className="bg-white p-8 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-slate-50 flex flex-col gap-6">
          
          {/* İsim Alanı */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Adın veya Lakabın</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Örn: Ethem"
                className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all font-bold"
              />
            </div>
          </div>

          {/* Avatar Seçimi */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2 mb-3 block">Seni Yansıtan İkon</label>
            <div className="grid grid-cols-5 gap-3">
              {avatars.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`text-2xl h-12 flex items-center justify-center rounded-2xl transition-all ${avatar === a ? 'bg-pink-100 border-2 border-pink-400 scale-110 shadow-sm' : 'bg-slate-50 border border-transparent hover:bg-slate-100 grayscale hover:grayscale-0'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Kaydet Butonu */}
          <button 
            type="submit" disabled={loading || !fullName}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex justify-center items-center gap-2 mt-4 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Dünyaya Katıl"} 
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>
      </motion.div>
    </div>
  );
}