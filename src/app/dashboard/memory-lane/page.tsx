"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, ImagePlus, Send, MessageCircle, Heart, Loader2, Sparkles, X, Download, Trash2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";

export default function MemoryLane() {
  const [memories, setMemories] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [myProfile, setMyProfile] = useState<any>(null);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchMemories = async () => {
    const { data } = await supabase
      .from('memories')
      .select(`
        *,
        profiles:user_id (full_name, avatar_url),
        comments (*, profiles:user_id(full_name, avatar_url))
      `)
      .order('created_at', { ascending: false });
    
    if (data) {
      const sortedData = data.map(memory => ({
        ...memory,
        comments: memory.comments?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      }));
      setMemories(sortedData);
    }
    setFetching(false);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (data) setMyProfile(data);
      }
      fetchMemories();
    };
    init();

    const channel = supabase.channel('realtime:memories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memories' }, () => fetchMemories())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => fetchMemories())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      setPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !imageFile) return;
    setLoading(true);

    let finalImageUrl = null;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const safeFileName = Math.random().toString(36).substring(2, 15);
      const fileName = `${Date.now()}_${safeFileName}.${fileExt}`;

      const { error } = await supabase.storage.from('avatars').upload(fileName, imageFile);
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        finalImageUrl = data.publicUrl;
      } else {
        alert("Fotoğraf yüklenirken hata oluştu.");
        setLoading(false);
        return;
      }
    }

    const { data: newMemory } = await supabase.from('memories').insert([{
      user_id: myProfile.id,
      content: content,
      image_url: finalImageUrl
    }]).select().single();

    if (myProfile.partner_email && newMemory) {
      await supabase.from('notifications').insert([{
        receiver_email: myProfile.partner_email,
        sender_name: myProfile.full_name,
        sender_avatar: myProfile.avatar_url,
        action_text: finalImageUrl ? "sizin için yeni bir fotoğraflı anı paylaştı! 📸" : "yeni bir anı paylaştı! ✍️"
      }]);
    }

    setContent("");
    setImageFile(null);
    setPreview(null);
    setLoading(false);
    fetchMemories();
  };

  // YENİ: KENDİ PAYLAŞTIĞIN ANIYI TAMAMEN SİLME FONKSİYONU
  const handleDeleteMemory = async (memoryId: string) => {
    const isConfirmed = window.confirm("Bu anıyı tamamen silmek istediğine emin misin? (İçindeki yorumlar da silinecek)");
    if (!isConfirmed) return;

    // Veritabanından sil (Yorumlar cascade ile otomatik silinir)
    await supabase.from('memories').delete().eq('id', memoryId);
    
    // Ekranda anında güncellenmesi için (Gerçek zamanlı da yapar ama bu daha hızlı hissettirir)
    setMemories(memories.filter(m => m.id !== memoryId));
  };

  const handleComment = async (memoryId: string) => {
    const text = commentText[memoryId];
    if (!text || !text.trim() || !myProfile) return;

    await supabase.from('comments').insert([{ memory_id: memoryId, user_id: myProfile.id, content: text }]);

    if (myProfile.partner_email) {
      await supabase.from('notifications').insert([{
        receiver_email: myProfile.partner_email,
        sender_name: myProfile.full_name,
        sender_avatar: myProfile.avatar_url,
        action_text: `bir anıya yorum yaptı: "${text.substring(0, 25)}..." 💬`
      }]);
    }

    setCommentText({ ...commentText, [memoryId]: "" });
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('comments').delete().eq('id', commentId);
  };

  const handleLikeComment = async (comment: any) => {
    if (!myProfile) return;
    
    const isLiked = comment.likes?.includes(myProfile.id);
    const newLikes = isLiked
      ? comment.likes.filter((id: string) => id !== myProfile.id)
      : [...(comment.likes || []), myProfile.id];

    await supabase.from('comments').update({ likes: newLikes }).eq('id', comment.id);

    if (!isLiked && comment.user_id !== myProfile.id && myProfile.partner_email) {
      await supabase.from('notifications').insert([{
        receiver_email: myProfile.partner_email,
        sender_name: myProfile.full_name,
        sender_avatar: myProfile.avatar_url,
        action_text: "bir yorumunu beğendi! ❤️"
      }]);
    }
  };

  return (
    <div className="p-6 pb-32 h-[100dvh] flex flex-col bg-[#faf8f9] overflow-y-auto relative">
      
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4"
          >
            <button onClick={() => setSelectedImage(null)} className="absolute top-6 right-6 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all active:scale-90">
              <X size={24} />
            </button>
            <a href={selectedImage} target="_blank" rel="noopener noreferrer" download className="absolute bottom-10 text-white bg-white/20 px-6 py-3 rounded-2xl backdrop-blur-md flex items-center gap-2 font-bold hover:bg-white/30 transition-all active:scale-95 border border-white/30">
              <Download size={20} /> Fotoğrafı İndir
            </a>
            <motion.img 
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 20 }} 
              src={selectedImage} 
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border-4 border-white/10" 
            />
          </motion.div>
        )}
      </AnimatePresence>

      <header className="mb-6 mt-4">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          Anılarımız <ImageIcon className="text-blue-500" size={28} />
        </h1>
        <p className="text-slate-500 text-sm mt-1 flex items-center gap-1 font-medium">
          <Sparkles size={14} className="text-blue-400" /> 
        </p>
      </header>

      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 mb-8">
        <textarea 
          value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="Buraya yaz."
          className="w-full bg-slate-50 border-none rounded-2xl p-4 min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 font-medium text-slate-700"
        />
        
        {preview && (
          <div className="relative mt-3 w-full h-48 rounded-xl overflow-hidden border border-slate-100">
            <img src={preview} alt="Önizleme" className="w-full h-full object-cover" />
            <button onClick={() => { setPreview(null); setImageFile(null); }} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-2 text-xs font-bold">İptal</button>
          </div>
        )}

        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
          <label className="flex items-center gap-2 text-blue-500 font-bold bg-blue-50 px-4 py-2 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors">
            <ImagePlus size={20} /> <span className="text-sm">Fotoğraf</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          </label>

          <button onClick={handlePost} disabled={loading || (!content && !imageFile)} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800 active:scale-95 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Paylaş"} <Send size={16} />
          </button>
        </div>
      </div>

      {fetching ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
      ) : memories.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200">
          <p className="text-slate-400 font-medium">İlk anınızı henüz paylaşmadınız.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {memories.map((memory) => (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={memory.id} className="bg-white rounded-[2rem] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-slate-50 relative">
              
              {/* YENİ: PAYLAŞIMI SİLME BUTONU (Sadece kendi paylaşımınsa görünür) */}
              {memory.user_id === myProfile?.id && (
                <button 
                  onClick={() => handleDeleteMemory(memory.id)}
                  className="absolute top-4 right-4 text-slate-300 hover:text-red-500 bg-slate-50 hover:bg-red-50 p-2 rounded-full transition-all active:scale-90"
                  title="Anıyı Sil"
                >
                  <Trash2 size={16} />
                </button>
              )}

              <div className="flex items-center gap-3 mb-4 pr-10">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl overflow-hidden shadow-sm">
                  {memory.profiles?.avatar_url?.startsWith('http') ? <img src={memory.profiles.avatar_url} className="w-full h-full object-cover"/> : memory.profiles?.avatar_url || "👤"}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{memory.profiles?.full_name}</p>
                  <p className="text-xs text-slate-400 font-medium">{new Date(memory.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              {memory.image_url && (
                <div 
                  onClick={() => setSelectedImage(memory.image_url)}
                  className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden mb-4 border border-slate-100 cursor-pointer relative group"
                >
                  <img src={memory.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="bg-white/80 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">Büyüt</span>
                  </div>
                </div>
              )}
              
              <p className="text-slate-700 font-medium leading-relaxed mb-4">{memory.content}</p>

              <div className="flex gap-4 border-t border-slate-50 pt-3">
                <button onClick={() => setActiveCommentId(activeCommentId === memory.id ? null : memory.id)} className="flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-blue-500 transition-colors">
                  <MessageCircle size={18} /> Yorumlar ({memory.comments?.length || 0})
                </button>
              </div>

              {activeCommentId === memory.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4 border-t border-dashed border-slate-200">
                  <div className="flex flex-col gap-3 mb-4 max-h-60 overflow-y-auto pr-2">
                    {memory.comments?.map((comment: any) => (
                      <div key={comment.id} className="bg-slate-50 rounded-xl p-3 relative group border border-slate-100/50">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[11px] font-bold text-slate-400">{comment.profiles?.full_name}</p>
                          
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleLikeComment(comment)} className="text-slate-300 hover:text-pink-500 transition-all flex items-center gap-1 active:scale-75">
                              <Heart size={14} className={comment.likes?.includes(myProfile?.id) ? "fill-pink-500 text-pink-500" : ""} />
                              {comment.likes?.length > 0 && <span className="text-[10px] text-pink-500 font-bold">{comment.likes.length}</span>}
                            </button>
                            
                            {comment.user_id === myProfile?.id && (
                              <button onClick={() => handleDeleteComment(comment.id)} className="text-slate-300 hover:text-red-500 transition-colors active:scale-75">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 font-medium">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" value={commentText[memory.id] || ""} onChange={(e) => setCommentText({...commentText, [memory.id]: e.target.value})}
                      placeholder="Bir yorum yaz..." className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <button onClick={() => handleComment(memory.id)} disabled={!commentText[memory.id]?.trim()} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold hover:bg-blue-100 transition-colors disabled:opacity-50">Gönder</button>
                  </div>
                </motion.div>
              )}

            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}