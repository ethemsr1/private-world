"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Loader2, Ticket, Plus, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";

export default function DestinyScratchGame() {
  const [myProfile, setMyProfile] = useState<any>(null);
  const [activeGame, setActiveGame] = useState<any>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showCreateMode, setShowCreateMode] = useState(false);
  const [revealedIndex, setRevealedIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const router = useRouter();

  // 1. BAŞLANGIÇ VE REALTIME
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: me } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setMyProfile(me);
      fetchActiveGame(session.user.id, me?.email);

      const channel = supabase.channel('realtime:destiny_scratch_final')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'games_scratch' }, (payload) => {
           const newGame = payload.new as any;
           if (!activeGame || newGame.id === activeGame.id) {
             setActiveGame(newGame);
             if (newGame.is_played && newGame.selected_index !== null) setRevealedIndex(newGame.selected_index);
           }
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    };
    init();
  }, [activeGame?.id]);

  const fetchActiveGame = async (userId: string, email: string) => {
    const { data } = await supabase.from('games_scratch').select('*').or(`sender_id.eq.${userId},receiver_email.eq.${email}`).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data) {
       setActiveGame(data);
       if (data.is_played) {
         setRevealedIndex(data.selected_index);
       } else {
         setRevealedIndex(null);
       }
    } else { setShowCreateMode(true); }
  };

  // 2. MİSTİK KART ÇİZİMİ (CANVAS)
  const drawTarotBack = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    
    const w = canvas.width = canvas.clientWidth;
    const h = canvas.height = canvas.clientHeight;

    // Arka Plan: Derin Mor
    ctx.fillStyle = "#2e1065";
    ctx.fillRect(0, 0, w, h);

    // Mistik Işınlar
    ctx.strokeStyle = "rgba(192, 132, 252, 0.15)";
    ctx.lineWidth = 1;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    for (let i = 0; i < 360; i += 10) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(i) * Math.max(w, h), Math.sin(i) * Math.max(w, h));
      ctx.stroke();
    }
    ctx.restore();

    // Altın Çerçeve
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 14;
    ctx.strokeRect(0, 0, w, h);
    
    // Orta Sembol (Yıldız)
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.moveTo(0, -45);
    ctx.quadraticCurveTo(0, 0, 45, 0);
    ctx.quadraticCurveTo(0, 0, 0, 45);
    ctx.quadraticCurveTo(0, 0, -45, 0);
    ctx.quadraticCurveTo(0, 0, 0, -45);
    ctx.fill();
    ctx.restore();
  };

  // 3. KAZIMA VE BİLDİRİM
  const handleScratch = (e: any, index: number) => {
    if (activeGame?.sender_id === myProfile?.id || revealedIndex !== null) return;
    const canvas = canvasRefs.current[index];
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.type.includes('touch') ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.type.includes('touch') ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fill();
    
    // Kazıma Durumu Kontrolü
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = 0;
    for (let i = 3; i < data.length; i += 64) { if (data[i] === 0) transparent++; }
    
    // %55 kazınmadan açılmaz
    if (transparent / (data.length / 64) > 0.55) {
      finishGame(index);
    }
  };

  const finishGame = async (index: number) => {
    if (revealedIndex !== null) return;
    setRevealedIndex(index);
    canvasRefs.current[index]?.getContext("2d")?.clearRect(0, 0, 2000, 2000);
    confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });

    await supabase.from('games_scratch').update({ is_played: true, selected_index: index }).eq('id', activeGame.id);

    // Partnere Bildirim Gönder
    if (activeGame.sender_id !== myProfile?.id) {
        const { data: sender } = await supabase.from('profiles').select('email').eq('id', activeGame.sender_id).single();
        if (sender?.email) {
            await fetch('/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetEmail: sender.email,
                    title: "Kader Belirlendi! 🎁",
                    body: `${myProfile.full_name} kartını seçti ve kazıdı!`,
                    url: "/dashboard/games/scratch"
                })
            });
        }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    setUploading(true);
    const file = e.target.files[0];
    const fileName = `destiny-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('tarot_images').upload(fileName, file);
    if (!error) {
       const { data } = supabase.storage.from('tarot_images').getPublicUrl(fileName);
       setUploadedImages(prev => [...prev, data.publicUrl]);
    }
    setUploading(false);
  };

  const createGame = async () => {
    if (uploadedImages.length < 2) return alert("En az 2 seçenek!");
    const shuffled = [...uploadedImages].sort(() => Math.random() - 0.5);
    await supabase.from('games_scratch').insert([{ sender_id: myProfile.id, receiver_email: myProfile.partner_email, images: shuffled, is_played: false }]);
    setUploadedImages([]);
    setShowCreateMode(false);
    fetchActiveGame(myProfile.id, myProfile.email);
  };

  return (
    <div className="min-h-screen bg-[#fdf2f8] flex flex-col font-sans pb-10 overflow-x-hidden">
      
      {/* HEADER (Home butonu kaldırıldı) */}
      <header className="p-4 flex items-center justify-between sticky top-0 bg-[#fdf2f8]/90 backdrop-blur-sm z-30">
        <h1 className="text-lg font-black text-pink-600 tracking-tight flex items-center gap-2">
          <Sparkles size={22}/> Kader Kartları
        </h1>
        <button 
          onClick={() => { setShowCreateMode(true); setActiveGame(null); }} 
          className="bg-white border border-pink-200 text-pink-600 px-4 py-2 rounded-full text-xs font-bold active:scale-95 shadow-sm"
        >
          <Plus size={14} className="inline mr-1"/> Yeni Oyun
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center p-6 w-full max-w-4xl mx-auto">
        {!showCreateMode && activeGame && (
          <div className="w-full flex flex-col items-center">
            <div className="text-center mb-10">
               <h2 className="text-3xl font-black text-slate-800 mb-2">
                 {activeGame.is_played ? "Kader Belirlendi!" : (activeGame.sender_id === myProfile?.id ? "Partnerin Bekleniyor..." : "Bir Kart Seç")}
               </h2>
               <p className="text-slate-500 font-medium italic">
                 {activeGame.is_played ? "Tebrikler!" : "Resmi görene kadar kazımaya devam et."}
               </p>
            </div>

            <div className={`grid gap-8 w-full ${revealedIndex !== null ? 'grid-cols-1 max-w-sm' : (activeGame.images.length <= 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-3 md:grid-cols-4')}`}>
               {activeGame.images.map((img: string, i: number) => {
                 if (revealedIndex !== null && revealedIndex !== i) return null;
                 return (
                   <motion.div layout key={i} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative aspect-[2/3] rounded-[2.5rem] overflow-hidden shadow-2xl border-none bg-white ring-4 ring-white">
                      <img 
                        src={img} 
                        className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-all duration-1000 ${activeGame.sender_id !== myProfile?.id && revealedIndex !== i ? 'blur-3xl scale-125' : 'blur-0 scale-100'}`} 
                      />
                      
                      {activeGame.sender_id === myProfile?.id && !activeGame.is_played && (
                        <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center backdrop-blur-sm z-20">
                           <Loader2 className="text-white animate-spin mb-2"/>
                           <span className="text-white text-[10px] font-black uppercase tracking-widest">Bekleniyor</span>
                        </div>
                      )}

                      {activeGame.sender_id !== myProfile?.id && !activeGame.is_played && (
                        <canvas 
                          ref={(el) => { if (el) { canvasRefs.current[i] = el; drawTarotBack(el); } }} 
                          className="absolute inset-0 z-10 touch-none cursor-crosshair w-full h-full block" 
                          onTouchMove={(e) => handleScratch(e, i)} 
                          onMouseMove={(e) => e.buttons === 1 && handleScratch(e, i)} 
                        />
                      )}
                   </motion.div>
                 );
               })}
            </div>
          </div>
        )}

        {showCreateMode && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white p-8 rounded-[3.5rem] shadow-xl border border-pink-100">
             <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2"><Ticket size={24} className="text-pink-500"/> Kartları Hazırla</h2>
             <div className="grid grid-cols-3 gap-3 mb-8">
                {uploadedImages.map((img, i) => (
                   <div key={i} className="relative aspect-[2/3] rounded-2xl overflow-hidden border group">
                      <img src={img} className="w-full h-full object-cover"/>
                      <button onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100"><X size={12}/></button>
                   </div>
                ))}
                {uploadedImages.length < 9 && (
                   <label className="aspect-[2/3] rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50">
                     {uploading ? <Loader2 className="animate-spin text-slate-400"/> : <Plus className="text-slate-400"/>}
                     <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload}/>
                   </label>
                )}
             </div>
             <button onClick={createGame} disabled={uploadedImages.length < 2} className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-4 rounded-2xl font-bold shadow-lg disabled:opacity-50 active:scale-95 transition-all">Kartları Gönder 🔮</button>
          </motion.div>
        )}
      </div>
    </div>
  );
}