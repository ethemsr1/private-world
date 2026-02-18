"use client";

import { motion } from "framer-motion";
import { Heart, Lock, UserPlus, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase"; // Supabase yolunun doğru olduğundan emin ol (Örn: "@/lib/supabase")

export default function WelcomeScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true); // Otomatik giriş kontrolcüsü
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  // SAYFA AÇILDIĞINDA OTOMATİK GİRİŞ KONTROLÜ
  useEffect(() => {
    const checkUser = async () => {
      // Supabase'e sor: Aktif bir oturum var mı?
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/dashboard"); // Varsa direkt içeri al
      } else {
        setCheckingSession(false); // Yoksa giriş ekranını göster
      }
    };

    checkUser();

    // Arka planda oturum değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.push("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Başarılı girişte useEffect otomatik olarak Dashboard'a yönlendirecek
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        router.push("/onboarding"); // <--- ARTIK KAYIT OLAN BURAYA GİDECEK
      }
    } catch (error: any) {
      setErrorMsg(error.message || "Bir hata oluştu. Bilgileri kontrol et.");
      setLoading(false);
    }
  };

  // Kontrol aşamasındayken ekranda kısa bir yükleniyor animasyonu göster (Titremeyi önler)
  if (checkingSession) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#faf8f9]">
        <Loader2 className="animate-spin text-pink-500" size={40} />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#faf8f9] px-6 relative overflow-hidden">
      {/* Arka Plan Dekorasyonu */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-pink-100/50 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100/50 blur-[100px]" />
      </div>

      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="z-10 w-full max-w-sm">
        <div className="bg-white/70 backdrop-blur-2xl border border-white p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] text-center">
          
          <div className="inline-flex p-4 rounded-3xl bg-pink-50 text-pink-500 mb-4 border border-pink-100">
            {isLogin ? <Lock size={28} /> : <UserPlus size={28} />}
          </div>
          
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Masterpiece v3</h1>
          <p className="text-slate-400 text-sm font-medium mb-8">
            {isLogin ? "Kendi dünyamıza giriş yap." : "Dünyamıza ilk adımını at."}
          </p>

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <input 
              type="email" 
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta adresin" 
              required
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all font-medium"
            />
            <input 
              type="password" 
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifren (En az 6 hane)" 
              required minLength={6}
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all font-medium"
            />
            
            {errorMsg && <p className="text-red-500 text-xs font-bold mt-1">{errorMsg}</p>}

            <button 
              type="submit" disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex justify-center items-center gap-2 mt-2 disabled:opacity-70"
            >
              {loading ? "Bekleniyor..." : (isLogin ? "Giriş Yap" : "Kayıt Ol")} 
              {!loading && <Heart size={18} className={isLogin ? "fill-white" : ""} />}
            </button>
          </form>

          <button 
            type="button"
            onClick={() => { setIsLogin(!isLogin); setErrorMsg(""); }}
            className="mt-6 text-sm font-bold text-slate-500 hover:text-pink-500 transition-colors"
          >
            {isLogin ? "Hesabın yok mu? Kayıt Ol" : "Zaten hesabın var mı? Giriş Yap"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}