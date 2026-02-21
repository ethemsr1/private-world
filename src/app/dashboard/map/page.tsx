"use client";

import { useState, useEffect } from "react";
import { Heart, Navigation, MapPin, Loader2, Sparkles, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";

export default function MapPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [fetchingSoulmate, setFetchingSoulmate] = useState(false); 
  
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

  // 2. SADECE UYGULAMA AÇILDIĞINDA KENDİ KONUMUNU BUL (Arka plan takibi yok!)
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
          console.warn("GPS bulunamadı:", err.message);
          setLoading(false); // Bulamazsa varsayılan Adana konumunu açar
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setLoading(false);
    }
  }, []);

  // 3. IŞINLANMA VE KONUM GÜNCELLEME MANTIĞI
  const toggleView = async () => {
    if (isViewingSoulmate) {
      // Kendi konumuma dön (Veritabanına yazmaz, sadece haritayı kaydırır)
      setViewPosition(myLocation);
      setIsViewingSoulmate(false);
    } else {
      setFetchingSoulmate(true);

      try {
        if (userId) {
          // A) BUTONA BASTIĞIN İÇİN SENİN KONUMUNU VERİTABANINA GÜNCELLE
          // (Karşı taraf sana baktığında bu anki konumunu görecek)
          await supabase.from("user_locations").upsert({
            user_id: userId,
            lat: myLocation.lat,
            lng: myLocation.lng,
            updated_at: new Date().toISOString(),
          });

          // B) ONUN EN SON BASTIĞI KONUMU ÇEK
          const { data, error } = await supabase
            .from("user_locations")
            .select("lat, lng, updated_at")
            .neq("user_id", userId)
            .single(); 

          if (data) {
            setViewPosition({ lat: data.lat, lng: data.lng });
            
            // Saati okunabilir formata çevir (Örn: 14:30)
            const date = new Date(data.updated_at);
            const timeString = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            setSoulmateLastSeen(timeString);
            
            setIsViewingSoulmate(true);
          } else {
            alert("Ruh eşin henüz sisteme konumunu bırakmamış 🥺");
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
      </div>
    );
  }

  return (
    // overflow-hidden ve h-[100dvh] ekranın kaymasını kesinlikle engeller
    <div className="flex flex-col h-[100dvh] w-full bg-[#faf8f9] relative overflow-hidden">
      
      {/* İNTERAKTİF HARİTA (Parmağınla gezinebilirsin) */}
      <div className="absolute inset-0 z-0">
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          // Apple Maps hissiyatı vermek için pastel CSS filtresi
          style={{ filter: "sepia(0.1) contrast(0.95) saturate(1.3) hue-rotate(-10deg)" }}
          src={`https://maps.google.com/maps?q=${viewPosition.lat},${viewPosition.lng}&hl=tr&z=16&output=embed`}
          allowFullScreen
        />
        {/* Yazıların okunması için üst ve alta hafif karartma */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-slate-900/50 pointer-events-none" />
      </div>

      {/* ÜST BİLGİ KARTI */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-safe pt-6 left-0 right-0 px-4 z-10 flex justify-center pointer-events-none"
      >
        <div className="bg-white/80 backdrop-blur-2xl border border-white/60 px-5 py-3 rounded-full shadow-lg flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isViewingSoulmate ? 'bg-pink-400' : 'bg-blue-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isViewingSoulmate ? 'bg-pink-500' : 'bg-blue-500'}`}></span>
          </span>
          <p className="text-sm font-bold text-slate-800">
            {isViewingSoulmate ? "Ruh Eşinin Konumu" : "Kendi Konumundasın"}
          </p>
        </div>
      </motion.div>

      {/* ALT KONTROL PANELİ (Ekrana sabit, kaydırma gerektirmez) */}
      <div className="absolute bottom-6 left-4 right-4 z-10">
        <div className="bg-white/90 backdrop-blur-3xl border border-white/50 p-5 rounded-[2rem] shadow-2xl flex flex-col items-center">
          
          <AnimatePresence mode="wait">
            <motion.div 
              key={isViewingSoulmate ? "soulmate" : "me"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center mb-5 w-full"
            >
              <h2 className="text-xl font-black text-slate-800 mb-1 flex items-center justify-center gap-2">
                {isViewingSoulmate ? <><Sparkles className="text-pink-400" size={20} /> Onun Dünyası</> : "Sen Buradasın"}
              </h2>
              
              {/* EN SON GÖRÜLME SAATİ BURADA YAZIYOR */}
              {isViewingSoulmate && soulmateLastSeen ? (
                <div className="flex items-center justify-center gap-1 text-xs font-bold text-pink-500 bg-pink-50 py-1.5 px-3 rounded-full mx-auto w-max mt-2 border border-pink-100">
                  <Clock size={14} />
                  Son Güncelleme: {soulmateLastSeen}
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-medium">
                  {isViewingSoulmate ? "Konum yükleniyor..." : "Işınlan butonuna bastığında konumun güncellenir."}
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
