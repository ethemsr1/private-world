"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, Save, User, Loader2, Camera, Image as ImageIcon, HeartHandshake } from "lucide-react";
import { supabase } from "../../../lib/supabase";

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [avatar, setAvatar] = useState("👨‍💻");
  const [email, setEmail] = useState("");
  const [partnerEmail, setPartnerEmail] = useState(""); // YENİ: Eşleşme için
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const avatars = ["👨‍💻", "👸", "🚗", "☕", "📸", "🎨", "🎸", "🎮", "🧸", "✨"];

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setEmail(session.user.email || "");
        const { data } = await supabase.from('profiles').select('full_name, avatar_url, partner_email').eq('id', session.user.id).single();
        if (data) {
          setFullName(data.full_name || "");
          setAvatar(data.avatar_url || "👨‍💻");
          setPartnerEmail(data.partner_email || ""); // Partner e-postasını çek
        }
      }
    };
    fetchProfile();
  }, []);

  const saveAvatarToDB = async (newAvatar: string) => {
    setAvatar(newAvatar); 
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('profiles').update({ avatar_url: newAvatar }).eq('id', session.user.id);
      router.refresh(); 
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileName = `${Date.now()}.${file.name.split('.').pop()}`; 
      
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await saveAvatarToDB(data.publicUrl);
    } catch (error: any) {
      alert("Fotoğraf yüklenirken hata: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // YENİ: Partner emailini de kaydet
      await supabase.from('profiles').update({ 
        full_name: fullName, 
        avatar_url: avatar,
        partner_email: partnerEmail 
      }).eq('id', session.user.id);
    }
    setLoading(false);
    alert("Profil ve Eşleşme Ayarları Kaydedildi! 💕");
    router.refresh(); 
    router.push("/dashboard"); 
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="p-6 max-w-md mx-auto w-full pb-32">
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6 mt-4 text-center">
        <div className="flex flex-col items-center justify-center mb-4 mt-2">
          <div className="relative w-28 h-28 rounded-full bg-slate-50 border-4 border-white shadow-lg flex items-center justify-center overflow-hidden group">
            {uploading ? <Loader2 className="animate-spin text-pink-500" size={30} /> : avatar.startsWith('http') ? <img src={avatar} alt="Profil" className="w-full h-full object-cover" /> : <span className="text-5xl">{avatar}</span>}
            <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white mb-1" />
              <span className="text-white text-[10px] font-bold">DEĞİŞTİR</span>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
            </label>
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">{fullName || "Profilim"}</h1>
      </motion.div>

      <form onSubmit={handleUpdate} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-6 mb-6">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Görünen Adın</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all font-bold" />
          </div>
        </div>

        {/* YENİ: PARTNER EŞLEŞME ALANI */}
        <div className="p-4 bg-pink-50 rounded-2xl border border-pink-100">
          <label className="text-[10px] font-bold text-pink-500 uppercase tracking-widest ml-2 mb-2 flex items-center gap-1">
            <HeartHandshake size={14} /> Ruh Eşin (E-posta)
          </label>
          <input 
            type="email" value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} 
            placeholder="Sevgilinin kayıtlı e-postası..." 
            className="w-full px-4 py-3 rounded-xl bg-white border border-pink-200 text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all font-medium text-sm" 
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2 mb-3 flex items-center gap-1"><ImageIcon size={12} /> Hızlı İkon Seç</label>
          <div className="grid grid-cols-5 gap-3">
            {avatars.map((a) => (
              <button key={a} type="button" onClick={() => saveAvatarToDB(a)} className={`text-2xl h-12 flex items-center justify-center rounded-2xl transition-all ${avatar === a ? 'bg-pink-100 border-2 border-pink-400 scale-110 shadow-sm' : 'bg-slate-50 border border-transparent hover:bg-slate-100 grayscale hover:grayscale-0'}`}>{a}</button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={20} /> : "Kaydet ve Geri Dön"} 
          {!loading && <Save size={18} />}
        </button>
      </form>

      <button onClick={handleLogout} className="w-full bg-red-50 text-red-600 font-bold py-4 rounded-2xl border border-red-100 hover:bg-red-100 transition-all active:scale-95 flex justify-center items-center gap-2">
        Çıkış Yap <LogOut size={18} />
      </button>
    </div>
  );
}