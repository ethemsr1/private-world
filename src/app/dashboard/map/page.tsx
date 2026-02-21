"use client";

import { useState, useEffect } from "react";
import { Heart, Navigation, MapPin, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase"; // Supabase yolunu kendi dosyana göre ayarla

export default function MapPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [fetchingSoulmate, setFetchingSoulmate] = useState(false); // Butona basılınca dönecek loader
  
  const [myLocation, setMyLocation] = useState({ lat: 37.0222, lng: 35.3213 });
  const [viewPosition, setViewPosition] = useState({ lat: 37.0222, lng: 35.3213 });
  const [isViewingSoulmate, setIsViewingSoulmate] = useState(false);

  // 1. SAYFA AÇILINCA KULLANICIYI TANI
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    getUser();
  }, []);

  // 2. KENDİ CANLI KONUMUNU TELEFONDAN TAKİP ET
  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyLocation(newPos);
          if (!isViewingSoulmate) setViewPosition(newPos);
          setLoading(false);
        },
        (err) => {
          console.error("Konum hatası:", err);
          setLoading(false);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    } else {
      setLoading(false);
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isViewingSoulmate]);

  // 3. IŞINLANMA BUTONU MANTIĞI (BACKEND HABERLEŞMESİ)
  const toggleView = async () => {
    if (isViewingSoulmate) {
      // Kendi konumuma geri dön
      setViewPosition(myLocation);
      setIsViewingSoulmate(false);
    } else {
      // ONUN YANINA IŞINLANMA İŞLEMİ BAŞLIYOR
      setFetchingSoulmate(true);

      if (userId) {
        // A) Önce BENİM en güncel konumumu veritabanına yaz (O da beni güncel görsün diye)
        await supabase.from("user_locations").upsert({
          user_id: userId,
          lat: myLocation.lat,
          lng: myLocation.lng,
          updated_at: new Date().toISOString(),
        });

        // B) Sonra ONUN (Benim ID'm olmayan kişinin) en son konumunu veritabanından çek
        const { data, error } = await supabase
          .from("user_locations")
          .select("lat, lng, updated_at")
          .neq("user_id", userId)
          .single(); // Sadece 1 kişi (ruh eşin) dönecek

        if (data) {
          setViewPosition({ lat: data.lat, lng: data.lng });
          setIsViewingSoulmate(true);
        } else {
          alert("Ruh eşin henüz Amor'a konumunu bırakmamış... 🥺");
        }
      }
      
      setFetchingSoulmate(false);
    }
  };

  // YÜKLENİYOR EKRANI
  if (loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#faf8f9] relative overflow-hidden">
        <div className="absolute w-64 h-64 bg-pink-200/50 rounded-full blur-[80px] animate-pulse" />
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
          className="z-10 bg-white p-6 rounded-full shadow-2xl shadow-pink-200"
        >
          <Navigation className="text-pink-500" size={32} />
        </motion.div>
        <p className="mt-6 text-slate-400 font-medium z-10 tracking-widest text-xs uppercase">Uydu Bağlantısı Kuruluyor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#faf8f9] relative overflow-hidden">
      
      <div className="absolute inset-0 z-0">
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          style={{ filter: "sepia(0.2) contrast(1.05) saturate(1.2) hue-rotate(-5deg)" }}
          src={`https://maps.google.com/maps?q=${viewPosition.lat},${viewPosition.lng}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
          allowFullScreen
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-slate-900/40 pointer-events-none" />
      </div>

      {/* ÜST BİLGİ KARTI */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-safe pt-6 left-0 right-0 px-4 z-10 flex justify-center pointer-events-none"
      >
        <div className="bg-white/70 backdrop-blur-2xl border border-white/60 px-5 py-3 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isViewingSoulmate ? 'bg-pink-400' : 'bg-blue-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isViewingSoulmate ? 'bg-pink-500' : 'bg-blue-500'}`}></span>
          </span>
          <p className="text-sm font-bold text-slate-800 tracking-tight">
            {isViewingSoulmate ? "Onun Dünyasındasın" : "Kendi Konumundasın"}
          </p>
        </div>
      </motion.div>

      {/* ALT KONTROL PANELİ */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-safe">
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mx-4 mb-6"
        >
          <div className="bg-white/80 backdrop-blur-3xl border border-white/50 p-6 rounded-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col items-center">
            
            <div className="w-12 h-1 bg-slate-200 rounded-full mb-6" /> 

            <AnimatePresence mode="wait">
              <motion.div 
                key={isViewingSoulmate ? "soulmate" : "me"}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center mb-6"
              >
                <h2 className="text-2xl font-black text-slate-800 mb-1 flex items-center justify-center gap-2">
                  {isViewingSoulmate ? <><Sparkles className="text-pink-400" size={24} /> Ruh Eşin</> : "Sen Buradasın"}
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  {isViewingSoulmate ? "Şu an kalbinin attığı yeri görüyorsun." : "Radarlar seni takip ediyor."}
                </p>
              </motion.div>
            </AnimatePresence>

            <button 
              onClick={toggleView}
              disabled={fetchingSoulmate}
              className={`w-full relative overflow-hidden rounded-2xl p-4 shadow-xl transition-transform active:scale-95 disabled:opacity-70 ${
                isViewingSoulmate 
                  ? "bg-slate-900 text-white shadow-slate-900/20" 
                  : "bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-pink-500/30"
              }`}
            >
              <div className="relative flex items-center justify-center gap-3">
                {fetchingSoulmate ? (
                  <Loader2 size={20} className="animate-spin text-white" />
                ) : isViewingSoulmate ? (
                  <>
                    <MapPin size={20} />
                    <span className="font-bold text-base">Bana Geri Dön</span>
                  </>
                ) : (
                  <>
                    <Heart size={20} className="fill-white" />
                    <span className="font-bold text-base">Onun Yanına Işınlan</span>
                  </>
                )}
              </div>
            </button>

          </div>
        </motion.div>
      </div>
      
    </div>
  );
}
