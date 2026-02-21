"use client";

import { useState, useEffect } from "react";
import { Heart, Navigation, MapPin, Loader2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";

export default function MapPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [fetchingSoulmate, setFetchingSoulmate] = useState(false); 
  
  // Başlangıç konumu (GPS bulana kadar burası durur)
  const [myLocation, setMyLocation] = useState({ lat: 37.0222, lng: 35.3213 });
  const [viewPosition, setViewPosition] = useState({ lat: 37.0222, lng: 35.3213 });
  const [isViewingSoulmate, setIsViewingSoulmate] = useState(false);
  const [soulmateLastSeen, setSoulmateLastSeen] = useState<string | null>(null);

  // 1. KULLANICIYI TANI
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    getUser();
  }, []);

  // 2. KENDİ CANLI KONUMUNU BUL
  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyLocation(newPos);
          setViewPosition(newPos);
          setLoading(false);
        },
        (err) => {
          console.warn("GPS alınamadı. İzin verilmemiş olabilir:", err.message);
          setLoading(false); 
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLoading(false);
    }
  }, []);

  // 3. BACKEND HABERLEŞMESİ VE IŞINLANMA
  const toggleView = async () => {
    if (isViewingSoulmate) {
      // SADECE EKRANI KENDİ KONUMUMA KAYDIR (Veritabanına dokunma)
      setViewPosition(myLocation);
      setIsViewingSoulmate(false);
    } else {
      // ONUN KONUMUNU ÇEK VE BENİMKİNİ GÜNCELLE
      setFetchingSoulmate(true);

      try {
        if (!userId) {
          alert("Kullanıcı bulunamadı, lütfen uygulamaya tekrar giriş yap.");
          setFetchingSoulmate(false);
          return;
        }

        // A) BENİM ŞU ANKİ KONUMUMU VERİTABANINA YAZ
        await supabase.from("user_locations").upsert({
          user_id: userId,
          lat: myLocation.lat,
          lng: myLocation.lng,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }); // user_id çakışırsa üzerine yaz

        // B) ONUN EN SON KONUMUNU ÇEK (Benim ID'm olmayan tek kayıt)
        const { data, error } = await supabase
          .from("user_locations")
          .select("lat, lng, updated_at")
          .neq("user_id", userId)
          .single(); 

        if (error) {
          console.error("Supabase çekme hatası:", error);
          alert("Ruh eşin henüz sisteme konumunu bırakmamış.");
        } else if (data) {
          // HARİTAYI ONUN KOORDİNATLARINA UÇUR
          setViewPosition({ lat: data.lat, lng: data.lng });
          
          // Son görülme saatini ayarla
          const date = new Date(data.updated_at);
          const timeString = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          setSoulmateLastSeen(timeString);
          
          setIsViewingSoulmate(true);
        }
      } catch (err) {
        console.error("Beklenmeyen Hata:", err);
      }
      
      setFetchingSoulmate(false);
    }
  };

  // YÜKLENİYOR EKRANI
  if (loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#faf8f9]">
        <Loader2 className="animate-spin text-pink-500" size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#faf8f9] relative overflow-hidden">
      
      {/* İNTERAKTİF HARİTA (URL HATASI KESİN OLARAK ÇÖZÜLDÜ) */}
      <div className="absolute inset-0 z-0">
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          style={{ filter: "sepia(0.1) contrast(0.95) saturate(1.3) hue-rotate(-10deg)" }}
          // Kusursuz format:
          src={`https://maps.google.com/maps?q=${viewPosition.lat},${viewPosition.lng}&z=16&output=embed`}
          allowFullScreen
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-slate-900/50 pointer-events-none" />
      </div>

      {/* APPLE BUL (FIND MY) PROFIL FOTOSU */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none flex flex-col items-center">
        <div className={`absolute w-24 h-24 rounded-full opacity-50 animate-ping ${isViewingSoulmate ? 'bg-pink-400' : 'bg-blue-400'}`} />
        <div className="w-16 h-16 rounded-full border-4 border-white shadow-2xl overflow-hidden relative z-10 bg-white">
          <img 
            src={isViewingSoulmate 
              ? "https://ui-avatars.com/api/?name=O&background=ec4899&color=fff" 
              : "https://ui-avatars.com/api/?name=Ben&background=3b82f6&color=fff" 
            } 
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="w-4 h-4 bg-white transform rotate-45 -mt-2 shadow-xl" />
      </div>

      {/* ÜST BİLGİ KARTI */}
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

      {/* ALT KONTROL PANELİ */}
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
                {isViewingSoulmate ? "Onun Dünyası" : "Sen Buradasın"}
              </h2>
              
              {isViewingSoulmate && soulmateLastSeen ? (
                <div className="flex items-center justify-center gap-1 text-xs font-bold text-pink-500 bg-pink-50 py-1.5 px-3 rounded-full mx-auto w-max mt-2 border border-pink-100">
                  <Clock size={14} />
                  Son Güncelleme: {soulmateLastSeen}
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-medium">
                  {isViewingSoulmate ? "Konum yükleniyor..." : "Işınlan butonuna bastığında konumun sisteme bırakılır."}
                </p>
              )}
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
