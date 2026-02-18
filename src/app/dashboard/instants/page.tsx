"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ArrowLeft, Send, Clock, Loader2, X, Eye, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function InstantsStories() {
  const [instants, setInstants] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [viewingStory, setViewingStory] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: me } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (me) {
          setMyProfile(me);
          if (me.partner_email) {
            const { data: partner } = await supabase.from('profiles').select('*').eq('email', me.partner_email).single();
            if (partner) setPartnerProfile(partner);
          }
        }
        fetchInstants();
      }
    };
    init();

    // CANLI DİNLEME (Görüldü bilgisini anlık almak için UPDATE'i de dinliyoruz)
    const channel = supabase.channel('realtime:instants_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'instants' }, (payload) => {
        if (payload.eventType === 'INSERT') {
           setInstants((prev) => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
           setInstants((prev) => prev.map(item => item.id === payload.new.id ? payload.new : item));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchInstants = async () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('instants')
      .select('*')
      .gt('created_at', oneDayAgo)
      .order('created_at', { ascending: false });

    if (data) setInstants(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsUploading(true);
    }
  };

  const shareInstant = async () => {
    if (!imageFile) return;
    setLoading(true);

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('instant_images').upload(fileName, imageFile);
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('instant_images').getPublicUrl(fileName);

      await supabase.from('instants').insert([{
        user_id: myProfile.id,
        image_url: publicUrl.publicUrl,
        caption: caption,
        seen_by: [] // Başlangıçta kimse görmedi
      }]);

      if (myProfile?.partner_email) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetEmail: myProfile.partner_email,
            title: "Yeni Bir Hikaye! 📸",
            body: `${myProfile.full_name} bir an paylaştı.`,
            url: "/dashboard/instants"
          })
        });
      }

      setCaption("");
      setImageFile(null);
      setPreviewUrl(null);
      setIsUploading(false);
      
    } catch (error) {
      alert("Hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // HİKAYEYE BAKINCA VERİTABANINA "GÖRDÜM" DİYE İŞLE
  const handleViewStory = async (post: any) => {
    setViewingStory(post);
    
    // Eğer ben zaten gördüysem tekrar işlem yapma
    const seenBy = post.seen_by || [];
    if (seenBy.includes(myProfile?.id)) return;

    // Görmediysem ID'mi ekle ve güncelle
    const updatedSeenBy = [...seenBy, myProfile.id];
    
    // Önce yerel state'i güncelle (hızlı tepki için)
    setInstants(prev => prev.map(item => item.id === post.id ? { ...item, seen_by: updatedSeenBy } : item));

    // Sonra veritabanına yaz
    await supabase.from('instants').update({ seen_by: updatedSeenBy }).eq('id', post.id);
  };

  const renderAvatar = (url: string | null, isSeen: boolean) => {
    const isUrl = url && url.startsWith('http');
    // Eğer gördüysem GRİ, görmediysem RENKLİ (Rose)
    const ringColor = isSeen ? 'border-slate-300' : 'border-rose-500'; 
    
    return (
      <div className={`p-[3px] rounded-full border-2 ${ringColor} ${!isSeen && 'animate-pulse'}`}>
        <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border-2 border-white">
          {isUrl ? <img src={url} className="w-full h-full object-cover" /> : <span className="text-2xl">{url || "👤"}</span>}
        </div>
      </div>
    );
  };

  const getTimeAgo = (dateStr: string) => {
    const created = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diff = now - created;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours} sa`;
    if (minutes > 0) return `${minutes} dk`;
    return "Şimdi";
  };

  return (
    <div className="min-h-screen bg-white pb-32 font-sans relative">
      
      {/* HEADER */}
      <header className="p-4 flex items-center justify-between sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-50">
        <button onClick={() => router.back()} className="p-2 bg-slate-50 rounded-full active:scale-90"><ArrowLeft size={20} className="text-slate-700"/></button>
        <h1 className="text-sm font-black text-slate-800 tracking-tight uppercase">Anlık Akış</h1>
        <div className="w-10"></div>
      </header>

      {!isUploading && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => fileInputRef.current?.click()}
          className="fixed bottom-24 right-6 z-40 bg-black text-white p-4 rounded-full shadow-2xl flex items-center justify-center"
        >
          <Camera size={28} />
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </motion.button>
      )}

      {/* LİSTE */}
      <div className="flex flex-col">
        {instants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
             <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Camera size={32} className="text-slate-400"/>
             </div>
             <p className="text-sm font-bold text-slate-400">Henüz hikaye yok</p>
          </div>
        )}

        {instants.map((post) => {
          const isMe = post.user_id === myProfile?.id;
          const userAvatar = isMe ? myProfile?.avatar_url : partnerProfile?.avatar_url;
          const userName = isMe ? "Sen" : partnerProfile?.full_name?.split(' ')[0] || "Partnerin";
          
          // GÖRDÜM MÜ KONTROLÜ (Veritabanındaki array'e bakıyoruz)
          const seenByList = post.seen_by || [];
          const isSeenByMe = seenByList.includes(myProfile?.id);
          
          // PARTNER GÖRDÜ MÜ KONTROLÜ (Sadece benim paylaşımlarım için)
          const isSeenByPartner = isMe && seenByList.includes(partnerProfile?.id);

          return (
            <motion.div 
              key={post.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => handleViewStory(post)}
              className="flex items-center gap-4 p-4 border-b border-slate-50 active:bg-slate-50 cursor-pointer transition-colors relative"
            >
              {/* AVATAR (Gördüysem Gri, Görmediysem Kırmızı) */}
              {renderAvatar(userAvatar, isSeenByMe)}

              {/* BİLGİ */}
              <div className="flex-1">
                 <p className="text-sm font-bold text-slate-800">
                   {userName} <span className="font-medium text-slate-500">bir an paylaştı</span>
                 </p>
                 
                 <div className="flex items-center gap-2 mt-1">
                   {/* Süre */}
                   <span className="text-xs font-bold text-slate-300">
                      {getTimeAgo(post.created_at)}
                   </span>

                   {/* EĞER BEN PAYLAŞTIYSAM VE PARTNER GÖRDÜYSE -> GÖRÜLDÜ İKONU */}
                   {isSeenByPartner && (
                     <motion.div 
                       initial={{ scale: 0 }} animate={{ scale: 1 }}
                       className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"
                     >
                        {/* Küçük partner avatarı */}
                        <div className="w-3 h-3 rounded-full overflow-hidden">
                           {partnerProfile?.avatar_url?.startsWith('http') ? 
                             <img src={partnerProfile.avatar_url} className="w-full h-full object-cover"/> : 
                             <span className="text-[8px] leading-none">👤</span>
                           }
                        </div>
                        <span className="text-[9px] font-bold text-emerald-600">Gördü</span>
                     </motion.div>
                   )}
                 </div>
              </div>

              {/* Sağ ok işareti (Görsellik) */}
              {!isSeenByMe && !isMe && <div className="w-2 h-2 rounded-full bg-rose-500"></div>}
            </motion.div>
          );
        })}
      </div>

      {/* --- TAM EKRAN HİKAYE (AYNI) --- */}
      <AnimatePresence>
        {viewingStory && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            <div className="absolute top-0 left-0 w-full p-4 pt-8 bg-gradient-to-b from-black/60 to-transparent z-10 flex justify-between items-start">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex items-center justify-center backdrop-blur-md">
                    {(() => {
                        const isMe = viewingStory.user_id === myProfile?.id;
                        const avatar = isMe ? myProfile?.avatar_url : partnerProfile?.avatar_url;
                        return avatar?.startsWith('http') ? <img src={avatar} className="w-full h-full object-cover"/> : <span className="text-lg">{avatar}</span>
                    })()}
                 </div>
                 <div>
                    <p className="text-white text-xs font-bold shadow-black drop-shadow-md">
                      {viewingStory.user_id === myProfile?.id ? "Senin Hikayen" : partnerProfile?.full_name}
                    </p>
                    <p className="text-white/70 text-[10px] font-medium">
                      {getTimeAgo(viewingStory.created_at)} önce
                    </p>
                 </div>
               </div>
               <button onClick={() => setViewingStory(null)} className="p-2 bg-white/10 rounded-full backdrop-blur-md text-white"><X size={24}/></button>
            </div>

            <div className="flex-1 flex items-center justify-center relative" onClick={() => setViewingStory(null)}>
               <img src={viewingStory.image_url} className="max-w-full max-h-full object-contain" />
            </div>

            {viewingStory.caption && (
               <div className="absolute bottom-0 left-0 w-full p-6 pb-12 bg-gradient-to-t from-black/80 to-transparent text-center">
                  <p className="text-white font-medium text-lg leading-relaxed drop-shadow-md">{viewingStory.caption}</p>
               </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- YÜKLEME MODALI (AYNI) --- */}
      <AnimatePresence>
        {isUploading && previewUrl && (
          <motion.div 
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            className="fixed inset-0 z-[60] bg-black flex flex-col"
          >
             <div className="absolute top-0 w-full p-4 flex justify-between z-10">
                <button onClick={() => setIsUploading(false)} className="p-2 bg-black/40 rounded-full text-white backdrop-blur-md"><X size={24}/></button>
             </div>
             <div className="flex-1 flex items-center justify-center bg-black">
                <img src={previewUrl} className="max-w-full max-h-full object-contain" />
             </div>
             <div className="p-6 bg-black pb-10">
                <input 
                  type="text" 
                  placeholder="Bir şeyler yaz..." 
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full bg-white/10 text-white p-4 rounded-full mb-4 outline-none border border-white/20 placeholder:text-white/50 text-center"
                />
                <button 
                  onClick={shareInstant} 
                  disabled={loading}
                  className="w-full bg-white text-black py-4 rounded-full font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  {loading ? <Loader2 className="animate-spin"/> : <><Send size={20}/> Hikayeni Paylaş</>}
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}