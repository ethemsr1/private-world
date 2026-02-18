"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { MapPin, Navigation, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "../../../lib/supabase";

const MapComponent = dynamic(() => import("./Map"), { 
  ssr: false, 
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 rounded-[2rem] border-4 border-white shadow-sm">
      <Loader2 className="animate-spin text-pink-500 mb-2" size={32} />
      <p className="text-sm font-bold text-slate-400">Harita Yükleniyor...</p>
    </div>
  )
});

export default function MapPage() {
  const [myProfile, setMyProfile] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Veritabanından İkimizin Bilgilerini Çek (Son Görülmeleri Alır)
  const fetchLocations = async () => {
    setRefreshing(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: myData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

    if (myData) {
      setMyProfile(myData);
      if (myData.partner_email) {
        const { data: partnerData } = await supabase.from('profiles').select('*').eq('email', myData.partner_email).single();
        if (partnerData) setPartnerProfile(partnerData);
      }
    }
    setRefreshing(false);
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // TELEFONUN GPS'İNDEN KONUM AL VE VERİTABANINA YAZ
  const updateMyLocation = () => {
    setLoadingLocation(true);
    
    if (!navigator.geolocation) {
      alert("Cihazınız konum özelliğini desteklemiyor.");
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Supabase'e yeni koordinatları kaydet (Son Görülmeni Günceller)
          await supabase.from('profiles').update({ 
            lat: lat, 
            lng: lng,
            location_updated_at: new Date().toISOString()
          }).eq('id', session.user.id);

          fetchLocations(); // Ekranı yenile
        }
        setLoadingLocation(false);
      }, 
      (error) => {
        setLoadingLocation(false);
        // Hata mesajlarını daha net hale getirdik
        if (error.code === 1) alert("Konum izni reddedildi. Tarayıcı ayarlarından izin verin.");
        else if (error.code === 2) alert("Konum bulunamadı. Kapalı bir alanda olabilirsiniz veya bilgisayardan deniyorsunuz.");
        else alert("Konum alınırken zaman aşımı oldu.");
      }, 
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 saniye bulamazsa iptal et
        maximumAge: 0
      }
    );
  };

  return (
    <div className="p-6 pb-32 h-[100dvh] flex flex-col">
      <header className="mb-6 mt-4 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            Haritamız <MapPin className="text-pink-500" size={28} />
          </h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-1 font-medium">
            <Sparkles size={14} className="text-emerald-400" /> Birbirimizden hiç kopmayalım.
          </p>
        </div>
        
        {/* YENİ: Sadece veritabanındaki son konumları çeken yenileme tuşu */}
        <button 
          onClick={fetchLocations} 
          disabled={refreshing}
          className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-pink-500 active:scale-90 transition-all"
        >
          <RefreshCw size={20} className={refreshing ? "animate-spin text-pink-500" : ""} />
        </button>
      </header>

      {/* HARİTA ALANI */}
      <div className="flex-1 min-h-[400px] mb-6 relative">
        <MapComponent myProfile={myProfile} partnerProfile={partnerProfile} />
      </div>

      {/* KONUM GÜNCELLEME BUTONU (Kendi GPS'ini yazar) */}
      <motion.button 
        whileTap={{ scale: 0.95 }}
        onClick={updateMyLocation}
        disabled={loadingLocation}
        className="w-full bg-slate-900 text-white font-bold py-5 rounded-[2rem] shadow-[0_15px_30px_rgba(0,0,0,0.15)] hover:bg-slate-800 transition-all active:scale-95 flex justify-center items-center gap-3 disabled:opacity-70"
      >
        {loadingLocation ? (
          <>
            <Loader2 className="animate-spin text-emerald-400" size={24} /> 
            Uydu Aranıyor...
          </>
        ) : (
          <>
            <Navigation className="text-emerald-400" size={24} fill="currentColor" /> 
            Konumumu Haritaya Sabitle
          </>
        )}
      </motion.button>
    </div>
  );
}