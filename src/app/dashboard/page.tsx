"use client";

import { motion } from "framer-motion";
import { Heart, Coffee, MapPin, Sparkles, Calendar, Zap, ChevronRight, UserPlus, Lock, Clock , Camera, Loader} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

// 1. ŞİFRE ÇEVİRİCİ FONKSİYON (VAPID anahtarını tarayıcı diline çevirir)
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function EnhancedDashboard() {
  const [isSent, setIsSent] = useState(false);
  const [daysTogether, setDaysTogether] = useState(0);
  const [profile, setProfile] = useState({ fullName: "Yükleniyor...", avatar: "⏳" });
  const [partner, setPartner] = useState<{fullName: string, avatar: string} | null>(null);

  // YENİ: Gerçek Zamanlı ve Saat Dilimi Korumalı Gün Sayacı
  useEffect(() => {
    const calculateDays = () => {
      const startDate = new Date(2025, 7, 19); 
      startDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - startDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      setDaysTogether(Math.max(0, diffDays));
    };

    calculateDays();

    const timer = setInterval(calculateDays, 60000);
    return () => clearInterval(timer);
  }, []);

  // Profil Çekme
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: myData } = await supabase.from('profiles').select('full_name, avatar_url, partner_email').eq('id', session.user.id).single();
        
        if (myData) {
          setProfile({ fullName: myData.full_name || "İsimsiz", avatar: myData.avatar_url || "👤" });

          if (myData.partner_email) {
            const { data: partnerData } = await supabase.from('profiles').select('full_name, avatar_url').eq('email', myData.partner_email).single();
            if (partnerData) {
              setPartner({
                fullName: partnerData.full_name || "Sevgilin",
                avatar: partnerData.avatar_url || "👸"
              });
            }
          }
        }
      }
    };
    fetchProfiles();
  }, []);

  // SİNYAL GÖNDERME VE BİLDİRİM İZNİ (Entegre Edilen Kısım)
  const handlePoke = async () => {
    try {
      // ADIM A: BİLDİRİM POSTACISINI ÇAĞIR VE İZİN İSTE
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const register = await navigator.serviceWorker.register('/sw.js');
        let subscription = await register.pushManager.getSubscription();

        // Eğer henüz abone değilse (Supabase NULL ise), tam şu an izin iste!
        if (!subscription) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const convertedVapidKey = urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!);
            subscription = await register.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedVapidKey
            });

            // Alınan cihaz adresini KENDİ profilimize kaydediyoruz
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              await supabase.from('profiles').update({
                push_subscription: JSON.parse(JSON.stringify(subscription))
              }).eq('id', session.user.id);
            }
          } else {
            return alert("Bildirim izni vermediğin için sistem çalışamıyor.");
          }
        }
      } else {
        return alert("Tarayıcın bildirimleri desteklemiyor.");
      }

      // ADIM B: KARŞI TARAFA SİNYALİ FIRLAT
      const { data: { session } } = await supabase.auth.getSession();
      const { data: me } = await supabase.from('profiles').select('partner_email, full_name').eq('id', session?.user.id).single();
      
      if (!me?.partner_email) return alert("Önce profilden sevgilini ekle!");

      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEmail: me.partner_email,
          title: "Sinyal Geldi! 💖",
          body: `${me.full_name} şu an seni düşünüyor...`,
          url: "/dashboard"
        })
      });
      
      if (response.ok) {
        // İşlem başarılıysa buton animasyonunu çalıştır
        setIsSent(true);
        setTimeout(() => setIsSent(false), 2000);
      } else {
        alert("Sinyal giderken bir hata oluştu.");
      }

    } catch (error) {
      console.error(error);
      alert("Sistemsel bir hata oluştu.");
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto w-full">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden mb-8 mt-4">
        <Sparkles className="absolute top-4 right-4 text-pink-400 opacity-50" size={24} />
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Sayaç</p>
        <div className="flex items-baseline gap-2">
          {/* Sayı değiştiğinde hafif bir zıplama efekti yapar */}
          <motion.span 
            key={daysTogether}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl font-black tracking-tighter"
          >
            {daysTogether}
          </motion.span>
          <span className="text-xl font-bold text-pink-400">Gün</span>
        </div>
        <div className="mt-6 flex gap-2">
          <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: "75%" }} className="h-full bg-gradient-to-r from-pink-500 to-purple-500" />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        
        <Link href="/dashboard/profile" className="block">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center h-full cursor-pointer relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-3xl mb-3 border-4 border-white shadow-md overflow-hidden relative z-10">
              {profile.avatar.startsWith('http') ? <img src={profile.avatar} className="w-full h-full object-cover" /> : profile.avatar}
            </div>
            <p className="text-sm font-extrabold text-slate-800 tracking-tight w-full overflow-hidden text-ellipsis whitespace-nowrap">{profile.fullName}</p>
            
            <div className="mt-2 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]"></span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Sen</span>
            </div>
          </motion.div>
        </Link>
        
        {partner ? (
          <Link href="/dashboard/map" className="block">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="bg-white p-5 rounded-3xl border border-pink-50 shadow-sm flex flex-col items-center justify-center text-center h-full cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-pink-50 rounded-full blur-2xl opacity-50 -z-0"></div>
              
              <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center text-3xl mb-3 border-4 border-white shadow-md overflow-hidden relative z-10">
                {partner.avatar.startsWith('http') ? <img src={partner.avatar} className="w-full h-full object-cover" /> : partner.avatar}
              </div>
              <p className="text-sm font-extrabold text-slate-800 tracking-tight w-full overflow-hidden text-ellipsis whitespace-nowrap relative z-10">{partner.fullName}</p>
              
              <div className="mt-2 flex items-center gap-1.5 bg-pink-50 px-2.5 py-1 rounded-full border border-pink-100 relative z-10">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse shadow-[0_0_5px_rgba(236,72,153,0.5)]"></span>
                <span className="text-[9px] font-bold text-pink-600 uppercase tracking-wider">Bağlı</span>
              </div>
            </motion.div>
          </Link>
        ) : (
          <Link href="/dashboard/profile" className="block">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="bg-pink-50 p-5 rounded-3xl border border-pink-100 shadow-sm flex flex-col justify-center items-center text-center h-full cursor-pointer">
              <UserPlus className="text-pink-400 mb-2" size={32} />
              <p className="text-xs font-bold text-pink-600 uppercase tracking-wider">Ruh Eşini Ekle</p>
              <p className="text-[10px] font-medium text-pink-400 mt-1">Davet için tıkla</p>
            </motion.div>
          </Link>
        )}
      </div>

      <motion.button 
        whileTap={{ scale: 0.95 }}
        onClick={handlePoke}
        className={`w-full py-6 rounded-[2rem] border-2 flex flex-col items-center gap-2 transition-all shadow-[0_15px_30px_rgba(0,0,0,0.08)] mb-8 ${isSent ? 'bg-pink-500 border-pink-500 text-white' : 'bg-white border-white text-slate-700'}`}
      >
        <Heart className={isSent ? "fill-white" : "text-pink-500"} size={32} />
        <span className="font-bold text-sm">{isSent ? "Sinyal Ona Ulaştı! ✨" : "Özledim"}</span>
      </motion.button>

      <div className="grid grid-cols-2 gap-4">
        <ActionTile href="/dashboard/instants" icon={<Camera size={22}/>} label="Anlık" color="rose" />
  <ActionTile href="/dashboard/map" icon={<MapPin size={22}/>} label="Haritamız" color="emerald" />
  <ActionTile href="/dashboard/future-notes" icon={<Lock size={22}/>} label="Zaman Kapsülü" color="purple" />
  <ActionTile href="/dashboard/memory-lane" icon={<Zap size={22}/>} label="Anılar" color="blue" />
  <ActionTile href="/dashboard/daily-question" icon={<Coffee size={22}/>} label="Soru Çöz" color="orange" />
  <ActionTile href="/dashboard/games/wheel" icon={<Loader size={22}/>} label="Karar Çarkı" color="emerald" />
</div>
    </div>
  );
}

function ActionTile({ href, icon, label, color }: any) {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100"
  };
  return (
    <Link href={href} className={`p-5 rounded-3xl border shadow-sm ${colors[color]} flex flex-col gap-3 group active:scale-95 transition-all`}>
      <div className="bg-white w-12 h-12 rounded-[1.25rem] flex items-center justify-center shadow-sm group-hover:rotate-12 transition-transform">{icon}</div>
      <div className="flex items-center justify-between mt-1"><span className="font-extrabold text-sm tracking-tight">{label}</span><ChevronRight size={16} className="opacity-40" /></div>
    </Link>
  );
}