"use client";

import { useState, useEffect } from "react";
import { Heart, MapPin, Loader2, Clock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase"; 
import dynamic from "next/dynamic";

const MapUI = dynamic(() => import("../../../components/MapUI"), { 
  ssr: false, 
  loading: () => <div className="w-full h-full bg-slate-100 animate-pulse" /> 
});

export default function MapPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [fetchingSoulmate, setFetchingSoulmate] = useState(false); 
  
  const [myLocation, setMyLocation] = useState({ lat: 37.0222, lng: 35.3213 });
  const [viewPosition, setViewPosition] = useState({ lat: 37.0222, lng: 35.3213 });
  const [isViewingSoulmate, setIsViewingSoulmate] = useState(false);
  
  const [soulmateLastSeen, setSoulmateLastSeen] = useState<string | null>(null);
  const [myLastSeen, setMyLastSeen] = useState<string | null>(null); // YENİ: Kendi son kaydedilme saatim

  const [myAvatar, setMyAvatar] = useState<string>("😎"); 
  const [soulmateAvatar, setSoulmateAvatar] = useState<string>("💖"); 

  // 1. KULLANICIYI VE VERİTABANINDAKİ KAYITLI SAATİNİ ÇEK
  useEffect(() => {
    const getUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        
        // Kendi profil logomu çek
        const { data: profile } = await supabase.from("profiles").select("avatar_url").eq("id", session.user.id).single();
        if (profile?.avatar_url) setMyAvatar(profile.avatar_url);

        // KENDİ EN SON KAYITLI KONUM SAATİMİ ÇEK (Eğer daha önce kaydetmişsem)
        const { data: myLoc } = await supabase.from("user_locations").select("updated_at").eq("user_id", session.user.id).single();
        if (myLoc) {
          const date = new Date(myLoc.updated_at);
          setMyLastSeen(date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
        }
      }
    };
    getUserData();
  }, []);

  // 2. KENDİ CANLI KONUMUNU TELEFONDAN BUL
  useEffect(() => {
    const getMyPosition = (highAccuracy: boolean) => {
      if (typeof window !== "undefined" && "geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setMyLocation(newPos);
            setViewPosition(newPos);
            setLoading(false);
          },
          (err) => {
            if (highAccuracy && err.code === err.TIMEOUT) {
              getMyPosition(false); 
            } else { setLoading(false); }
          },
          { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 8000 : 15000 }
        );
      } else { setLoading(false); }
    };
    getMyPosition(true);
  }, []);

  // 3. IŞINLANMA VE VERİTABANI GÜNCELLEME
  const toggleView = async () => {
    if (isViewingSoulmate) {
      setViewPosition(myLocation);
      setIsViewingSoulmate(false);
    } else {
      setFetchingSoulmate(true);
      try {
        if (userId) {
          // A) Kendi konumunu kaydet
          await supabase.from("user_locations").upsert({
            user_id: userId,
            lat: myLocation.lat,
            lng: myLocation.lng,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

          // Konumu kaydettiğim için "Benim Son Görülme" saatimi de anlık güncelliyorum
          setMyLastSeen(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));

          // B) Onun konumunu çek
          const { data: locData } = await supabase.from("user_locations").select("lat, lng, updated_at, user_id").neq("user_id", userId).single(); 

          if (locData) {
            setViewPosition({ lat: locData.lat, lng: locData.lng });
            const date = new Date(locData.updated_at);
            setSoulmateLastSeen(date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
            
            // C) ONUN PROFİL FOTOSUNU ÇEK
            const { data: soulmateProfile } = await supabase.from("profiles").select("avatar_url").eq("id", locData.user_id).single();
            if (soulmateProfile?.avatar_url) setSoulmateAvatar(soulmateProfile.avatar_url);

            setIsViewingSoulmate(true);
          } else {
            alert("Ruh eşin henüz konumunu sisteme bırakmamış.");
          }
        }
      } catch (err) {
        console.error("Hata:", err);
      }
      setFetchingSoulmate(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#faf8f9]">
        <Loader2 className="animate-spin text-pink-500" size={40} />
        <p className="text-slate-500 mt-4 text-sm font-medium animate-pulse">Radarlar taranıyor...</p>
      </div>
    );
  }

  // YENİ: Tıklandığında gösterilecek metni hazırlıyoruz
  const popupText = isViewingSoulmate 
    ? (soulmateLastSeen ? `Son Görülme: ${soulmateLastSeen}` : "Bekleniyor...")
    : (myLastSeen ? `Sisteme Kaydedildi: ${myLastSeen}` : "Canlı (Henüz Sisteme Bırakmadın)");

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#faf8f9] relative overflow-hidden">
      
      <div className="absolute inset-0 z-0 bg-[#e5e3df]">
        <MapUI 
          position={viewPosition} 
          isViewingSoulmate={isViewingSoulmate} 
          avatarContent={isViewingSoulmate ? soulmateAvatar : myAvatar} 
          lastSeenText={popupText} // YENİ: Saat bilgisini haritaya gönderdik
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-slate-900/30 pointer-events-none z-[1]" />
      </div>

      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-safe pt-6 left-0 right-0 px-4 z-20 flex justify-center pointer-events-none"
      >
        <div className="bg-white/80 backdrop-blur-2xl border border-white/60 px-5 py-3 rounded-full shadow-lg flex items-center gap-3">
          <span className={`relative inline-flex rounded-full h-3 w-3 ${isViewingSoulmate ? 'bg-pink-500' : 'bg-blue-500'}`}></span>
          <p className="text-sm font-bold text-slate-800">
            {isViewingSoulmate ? "Ruh Eşinin Konumu" : "Kendi Konumundasın"}
          </p>
        </div>
      </motion.div>

      <div className="absolute bottom-6 left-4 right-4 z-20">
        <div className="bg-white/90 backdrop-blur-3xl border border-white/50 p-5 rounded-[2rem] shadow-2xl flex flex-col items-center">
          
          <AnimatePresence mode="wait">
            <motion.div 
              key={isViewingSoulmate ? "soulmate" : "me"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center mb-5 w-full"
            >
              <h2 className="text-xl font-black text-slate-800 mb-1">
                {isViewingSoulmate ? <span className="flex items-center justify-center gap-2"><Sparkles className="text-pink-400" size={18}/> Onun Dünyası</span> : "Sen Buradasın"}
              </h2>
              
              <p className="text-xs text-slate-500 font-medium">
                {isViewingSoulmate 
                  ? "Tam saati görmek için haritadaki fotoğrafına tıkla." 
                  : "Işınlan butonuna bastığında konumun sisteme bırakılır."}
              </p>
            </motion.div>
          </AnimatePresence>

          <button 
            onClick={toggleView}
            disabled={fetchingSoulmate}
            className={`w-full relative overflow-hidden rounded-2xl p-4 shadow-xl transition-all active:scale-95 disabled:opacity-70 ${
              isViewingSoulmate 
                ? "bg-slate-900 text-white shadow-slate-900/20" 
                : "bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-pink-500/30"
            }`}
          >
            <div className="relative flex items-center justify-center gap-2">
              {fetchingSoulmate ? (
                <Loader2 size={20} className="animate-spin text-white" />
              ) : isViewingSoulmate ? (
                <>
                  <MapPin size={18} />
                  <span className="font-bold text-sm">Bana Geri Dön</span>
                </>
              ) : (
                <>
                  <Heart size={18} className="fill-white" />
                  <span className="font-bold text-sm">Onun Yanına Işınlan</span>
                </>
              )}
            </div>
          </button>

        </div>
      </div>
      
    </div>
  );
}
