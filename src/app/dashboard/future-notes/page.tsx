"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, Clock, ArrowLeft, Loader2, Image as ImageIcon, X, Camera, Hourglass, ZoomIn } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdvancedFutureNotes() {
  const [notes, setNotes] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [content, setContent] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // YENİ: Büyütülen resim için state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const router = useRouter();

  // 1. BAŞLANGIÇ
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: me } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (me) setMyProfile(me);
        await fetchAndCheckNotes(session.user.id, session.user.email);
      }
    };
    init();
  }, []);

  // 2. VERİ ÇEKME VE KONTROL
  const fetchAndCheckNotes = async (userId: string, userEmail: string | undefined) => {
    const { data } = await supabase
      .from('future_notes')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_email.eq.${userEmail}`)
      .order('unlock_date', { ascending: false });

    if (data) {
      const now = new Date();
      const validNotes: any[] = [];
      const oneDay = 24 * 60 * 60 * 1000; 

      for (const note of data) {
        const unlockTime = new Date(note.unlock_date);
        const timeDiff = now.getTime() - unlockTime.getTime();

        // 24 saat geçtiyse silinmiş gibi davran
        if (timeDiff > oneDay) continue;

        // Zamanı geldiyse ve kapalıysa -> AÇ ve BİLDİRİM AT
        if (timeDiff >= 0 && !note.is_opened) {
          await supabase.from('future_notes').update({ is_opened: true }).eq('id', note.id);
          
          if (note.sender_id === userId) {
             await fetch('/api/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                targetEmail: note.receiver_email,
                title: "Kapsülün Kilidi Açıldı! 🔓",
                body: "Zaman doldu! Gizli anıyı görmek için hemen tıkla.",
                url: "/dashboard/future-notes"
              })
            });
          }
          note.is_opened = true;
        }
        validNotes.push(note);
      }
      setNotes(validNotes);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) return alert("Dosya çok büyük (Max 5MB)");
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const sendCapsule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockDate) return alert("Lütfen bir açılış tarihi seç!");
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: me } = await supabase.from('profiles').select('partner_email, full_name').eq('id', session?.user.id).single();

      if (!me?.partner_email) return alert("Önce sevgilini eklemelisin!");

      let uploadedImageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('capsule_images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from('capsule_images').getPublicUrl(fileName);
        uploadedImageUrl = publicUrl.publicUrl;
      }

      const { error } = await supabase.from('future_notes').insert([{
        sender_id: session?.user.id,
        receiver_email: me?.partner_email,
        content,
        image_url: uploadedImageUrl,
        unlock_date: new Date(unlockDate).toISOString(),
        is_opened: false 
      }]);

      if (error) throw error;

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEmail: me?.partner_email,
          title: "Gelecekten Bir Paket! 📦",
          body: `${me?.full_name} senin için bir anıyı kilitledi...`,
          url: "/dashboard/future-notes"
        })
      });
      
      setContent("");
      setUnlockDate("");
      setImageFile(null);
      setPreviewUrl(null);
      if (session) fetchAndCheckNotes(session.user.id, session.user.email);
      alert("Kapsül mühürlendi! 🔒");

    } catch (err: any) { 
      alert(`Hata: ${err.message}`); 
    } finally { setLoading(false); }
  };

  const getTimeLeftText = (unlockDateStr: string) => {
    const unlockTime = new Date(unlockDateStr).getTime();
    const expiryTime = unlockTime + (24 * 60 * 60 * 1000);
    const now = new Date().getTime();
    const timeLeft = expiryTime - now;
    if (timeLeft < 0) return "Süre Doldu";
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} sa ${minutes} dk kaldı`;
  };

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen bg-[#f8fafc] pb-24 font-sans relative">
      <header className="flex items-center gap-4 mb-6 pt-4">
        <button onClick={() => router.back()} className="p-2 bg-white rounded-full shadow-sm active:scale-90 border border-slate-100"><ArrowLeft size={20}/></button>
        <h1 className="text-xl font-black text-slate-800 tracking-tight">Zaman Kapsülü</h1>
      </header>

      {/* FORM */}
      <form onSubmit={sendCapsule} className="bg-white p-5 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white mb-8">
        <textarea 
          placeholder="O gün geldiğinde ne bilmesini istersin?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-28 p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-100 mb-4 text-sm font-medium resize-none"
          required
        />
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="flex flex-col items-center justify-center gap-1 p-3 bg-indigo-50 text-indigo-600 rounded-2xl border-2 border-dashed border-indigo-100 cursor-pointer active:scale-95 transition-all">
            <Camera size={20}/>
            <span className="text-[10px] font-bold uppercase">Fotoğraf</span>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
          
          <div className="flex flex-col items-center gap-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <Clock size={18} className="text-slate-400" />
            <input type="datetime-local" value={unlockDate} onChange={(e) => setUnlockDate(e.target.value)} className="bg-transparent text-[10px] font-bold text-slate-600 outline-none w-full text-center" required />
          </div>
        </div>

        {previewUrl && (
          <div className="relative mb-4 rounded-2xl overflow-hidden aspect-video border-2 border-indigo-100 shadow-inner">
            <img src={previewUrl} className="w-full h-full object-cover" />
            <button type="button" onClick={() => {setImageFile(null); setPreviewUrl(null);}} className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-rose-500 shadow-md"><X size={16}/></button>
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/20">
          {loading ? <Loader2 className="animate-spin" size={20}/> : <><Lock size={18}/> Kapsülü Kilitle</>}
        </button>
      </form>

      {/* LİSTE */}
      <div className="space-y-4">
        {notes.length === 0 && (
          <div className="text-center py-10 opacity-50">
            <Clock size={48} className="mx-auto mb-2 text-slate-300"/>
            <p className="text-xs font-bold text-slate-400">Henüz aktif bir kapsül yok.</p>
          </div>
        )}
        
        {notes.map((note) => {
          const now = new Date();
          const unlockTime = new Date(note.unlock_date);
          const isLocked = unlockTime > now;
          const isSender = note.sender_id === myProfile?.id;
          const timeLeftText = !isLocked ? getTimeLeftText(note.unlock_date) : "";

          return (
            <motion.div 
              key={note.id} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className={`p-4 rounded-[2rem] border-2 transition-all relative overflow-hidden ${isLocked ? 'bg-white/60 border-dashed border-slate-200' : 'bg-white border-white shadow-md'}`}
            >
              {!isLocked && (
                <div className="absolute top-0 right-0 bg-rose-50 px-3 py-1.5 rounded-bl-2xl border-l border-b border-rose-100 flex items-center gap-1 z-10">
                   <Hourglass size={10} className="text-rose-500 animate-pulse" />
                   <span className="text-[9px] font-black text-rose-500">{timeLeftText}</span>
                </div>
              )}

              <div className="flex justify-between items-center mb-3">
                <div className={`p-2 rounded-xl ${isLocked ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600'}`}>
                  {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                </div>
                {isLocked && (
                  <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black text-slate-300 uppercase">{isSender ? 'Sen bıraktın' : 'Sana geldi'}</span>
                      <span className="text-[8px] font-bold text-indigo-400">
                        {unlockTime.toLocaleDateString('tr-TR')} {unlockTime.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
                      </span>
                  </div>
                )}
              </div>

              {isLocked ? (
                <div className="py-6 text-center border border-slate-100 rounded-2xl bg-slate-50/50">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Zamanı Bekliyor...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {note.image_url && (
                    // YENİ ÖZELLİK: TIKLANABİLİR FOTOĞRAF
                    <div 
                      onClick={() => setSelectedImage(note.image_url)} 
                      className="rounded-2xl overflow-hidden shadow-sm aspect-video bg-slate-100 relative group cursor-zoom-in"
                    >
                      <img src={note.image_url} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24}/>
                      </div>
                    </div>
                  )}
                  <p className="text-sm font-medium text-slate-700 leading-relaxed px-1">{note.content}</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* TAM EKRAN FOTOĞRAF MODU (Lightbox) */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          >
             <button onClick={() => setSelectedImage(null)} className="absolute top-6 right-6 p-2 bg-white/20 rounded-full text-white hover:bg-white/40 transition-colors">
               <X size={24} />
             </button>
             
             <motion.img 
               initial={{ scale: 0.8 }} 
               animate={{ scale: 1 }} 
               src={selectedImage} 
               className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
             />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}