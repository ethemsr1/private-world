"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { Loader2, ArrowLeft, Trophy, Delete, Send, Sparkles, Lightbulb, XCircle, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

// ZENGİN İÇERİKLİ BİLMECE HAVUZU
const RIDDLES = [
  { word: "GÜNEŞ", hint: "Gündüzün ateşten kralı, gece saklanır." },
  { word: "DENİZ", hint: "Mavi yorgan, balıklara ev, gemilere yol." },
  { word: "KİTAP", hint: "Konuşmaz ama her şeyi anlatır." },
  { word: "BEYAZ", hint: "Saflığın rengi, kirlenmeye en müsait olan." },
  { word: "SEVGİ", hint: "Gözle görülmez, sadece kalple hissedilir." },
  { word: "DÜNYA", hint: "Üzerinde yaşarız ama onu sürekli yorarız." },
  { word: "MUTLU", hint: "Herkesin aradığı ama az kişinin bulduğu his." },
  { word: "ÇİÇEK", hint: "Toprağın gülüşü, arının neşesi." },
  { word: "HAYAT", hint: "En uzun yolculuk, nefesle başlar." },
  { word: "BAHAR", hint: "Doğanın uyanışı, kışın vedası." },
  { word: "MELEK", hint: "Kanatsız iyilik timsali." },
  { word: "RÜZGA", hint: "Görünmez ama ağaçları dans ettirir." },
  { word: "BULUT", hint: "Gökyüzünün pamuk tarlası, yağmurun annesi." },
  { word: "DÜŞÜN", hint: "Beynin sporu, fikrin temeli." },
  { word: "KALBİ", hint: "Vücudun motoru, duyguların merkezi." },
  { word: "UMUTL", hint: "Karanlıkta yanan en son mum." },
  { word: "SEVDA", hint: "Kara değil ama insanı kör eder." },
  { word: "YILDI", hint: "Gece lambası, gökyüzü çivisi." },
  { word: "GÜZEL", hint: "Çirkine zıt, göze hoş gelen." },
  { word: "KAHVE", hint: "Hatrı kırk yıl sürer, uykuyu kaçırır." },
  { word: "ZAMAN", hint: "İlaçtır ama geri getirilemez." },
  { word: "İNSAN", hint: "Düşünen, seven ve hata yapan tek varlık." },
  { word: "YOLCU", hint: "Bir yerden bir yere giden, hancı olmayan." },
  { word: "SABAH", hint: "Gecenin bittiği, horozun öttüğü an." },
  { word: "AKŞAM", hint: "Güneşin vedası, günün yorgunluğu." },
  { word: "EKMEK", hint: "Sofranın baş tacı, fırının sıcak hediyesi." },
  { word: "YAĞMU", hint: "Gökten düşen bereket damlaları." },
  { word: "TOPRA", hint: "Bizi besleyen ana, sadık yar." },
  { word: "ŞEHİR", hint: "Binalar ormanı, kalabalık yuva." },
  { word: "MÜZİK", hint: "Ruhun gıdası, kulakların misafiri." },
  { word: "RESİM", hint: "Fırçanın tuvaldeki sessiz çığlığı." },
  { word: "KAPIY", hint: "Açılır kapanır, misafiri karşılar." },
  { word: "ÇOCUK", hint: "Evin neşesi, geleceğin meyvesi." },
  { word: "BİLGİ", hint: "Paylaştıkça çoğalan tek hazine." },
  { word: "GÖNÜL", hint: "Ferman dinlemeyen asi sultan." },
  { word: "KORKU", hint: "Cesaretin olmadığı yerde o vardır." },
  { word: "BARIŞ", hint: "Savaşın bittiği, güvercinin uçtuğu an." },
  { word: "MASAL", hint: "Gerçek değil ama inandırır, uyutur." },
  { word: "AYNA", hint: "Sana seni gösteren dilsiz dost." },
  { word: "CÜZD", hint: "Paranın evi, bazen dolu bazen boş." },
  { word: "ÇADIR", hint: "Taşınabilir ev, kampın olmazsa olmazı." },
  { word: "DOLAP", hint: "Elbiselerin saklandığı ahşap kutu." },
  { word: "KEMAN", hint: "Yaylıların en hüzünlü sesi." },
  { word: "PİLAV", hint: "Kurunun yanına en çok yakışan." },
  { word: "SAAT", hint: "Tiktakla ömür yer, koluna takılır." },
  { word: "PERDE", hint: "Pencerenin elbisesi, güneşi süzer." },
  { word: "BIÇAK", hint: "Keskin demir, mutfağın şövalyesi." },
  { word: "KALEM", hint: "Kılıçtan keskin, kağıdın sevgilisi." }
];

export default function RiddleWordle() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [game, setGame] = useState<any>(null);
  const [currentGuess, setCurrentGuess] = useState("");
  const [shakeRow, setShakeRow] = useState(false);

  // BAŞLANGIÇ AYARLARI
  useEffect(() => {
    let channel: any;

    const init = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      // Profilleri Çek
      const { data: me } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (me) {
        setMyProfile(me);
        if (me.partner_email) {
          const { data: partner } = await supabase.from('profiles').select('*').eq('email', me.partner_email).single();
          if (partner) setPartnerProfile(partner);
        }
      }

      // Aktif Oyunu Bul
      const fetchGame = async () => {
        const { data: activeGame } = await supabase
          .from('games_wordle')
          .select('*')
          .eq('status', 'playing')
          .or(`player_1.eq.${userId},player_2.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeGame) setGame(activeGame);
        else {
           // Bitmiş son oyunu göster
           const { data: lastGame } = await supabase
            .from('games_wordle')
            .select('*')
            .or(`player_1.eq.${userId},player_2.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
           if (lastGame) setGame(lastGame);
        }
        setLoading(false);
      };

      await fetchGame();

      // CANLI DİNLEME
      channel = supabase.channel('room_wordle_riddle')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'games_wordle' }, (payload) => {
          const newData = payload.new as any;
          if (newData.player_1 === userId || newData.player_2 === userId) {
            setGame(newData);
          }
        })
        .subscribe();
    };

    init();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  // YENİ OYUN BAŞLAT
  const startNewGame = async () => {
    if (!myProfile || !partnerProfile) return alert("Önce sevgilini eklemelisin!");
    setLoading(true);
    
    // Rastgele bir bilmece seç
    const selection = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
    
    const { data: newGame, error } = await supabase.from('games_wordle').insert([{
      player_1: myProfile.id,
      player_2: partnerProfile.id,
      target_word: selection.word,
      hint: selection.hint,
      p1_guesses: [],
      p2_guesses: [],
      status: "playing",
      winner_id: null
    }]).select().single();

    if (error) {
      console.error(error);
      alert("Oyun başlatılamadı!");
    } else {
      setGame(newGame);
      setCurrentGuess("");
    }
    setLoading(false);
  };

  // HAMLE YAP
  const onSubmit = async () => {
    if (currentGuess.length !== 5) {
      setShakeRow(true);
      setTimeout(() => setShakeRow(false), 500);
      return;
    }
    if (!game || game.status !== 'playing') return;

    const isP1 = game.player_1 === myProfile.id;
    const currentGuesses = isP1 ? (game.p1_guesses || []) : (game.p2_guesses || []);
    
    if (currentGuesses.length >= 6) return;
    
    const newGuesses = [...currentGuesses, currentGuess];
    let updates: any = isP1 ? { p1_guesses: newGuesses } : { p2_guesses: newGuesses };
    
    let status = 'playing';
    let winner = null;

    if (currentGuess === game.target_word) {
      status = 'finished';
      winner = myProfile.id;
    } else if (newGuesses.length === 6) {
      status = 'finished'; 
      winner = null; 
    }

    setGame((prev: any) => ({ ...prev, ...updates, status, winner_id: winner }));
    setCurrentGuess("");

    await supabase.from('games_wordle').update({
      ...updates,
      status: status === 'finished' ? 'finished' : game.status,
      winner_id: winner
    }).eq('id', game.id);
  };

  const onKeyClick = (key: string) => {
    if (game?.status !== 'playing') return;
    if (currentGuess.length < 5) setCurrentGuess(prev => prev + key);
  };
  const onDelete = () => setCurrentGuess(prev => prev.slice(0, -1));

  // RENKLENDİRME
  const getLetterColor = (word: string, index: number, isFinal: boolean) => {
    if (!game) return "bg-white border-slate-200";
    const letter = word[index];
    const target = game.target_word;

    if (!isFinal) return "bg-white border-slate-300 text-slate-900";

    if (target[index] === letter) return "bg-emerald-500 text-white border-emerald-500 shadow-md"; 
    if (target.includes(letter)) return "bg-amber-400 text-white border-amber-400 shadow-md"; 
    return "bg-slate-400 text-white border-slate-400"; 
  };

  const getKeyColor = (key: string) => {
    if (!game) return "bg-white";
    const isP1 = game.player_1 === myProfile?.id;
    const myGuesses = isP1 ? game.p1_guesses : game.p2_guesses;
    
    let status = "bg-white";
    myGuesses?.forEach((guess: string) => {
      for (let i = 0; i < 5; i++) {
        if (guess[i] === key) {
           if (game.target_word[i] === key) status = "bg-emerald-500 text-white border-emerald-600"; 
           else if (game.target_word.includes(key) && status !== "bg-emerald-500 text-white border-emerald-600") status = "bg-amber-400 text-white border-amber-500"; 
           else if (status === "bg-white") status = "bg-slate-300 text-slate-500 border-slate-300"; 
        }
      }
    });
    return status;
  };

  if (loading && !game) return <div className="h-[100dvh] flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;

  const isP1 = game?.player_1 === myProfile?.id;
  const myGuesses = isP1 ? game?.p1_guesses : game?.p2_guesses;
  const partnerGuesses = isP1 ? game?.p2_guesses : game?.p1_guesses;

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50 text-slate-800 overflow-hidden relative font-sans">
      
      {/* HEADER */}
      <header className="px-4 py-3 bg-white shadow-sm flex items-center justify-between z-10 shrink-0">
        <button onClick={() => router.push('/dashboard/games')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={22} className="text-slate-600" />
        </button>
        <h1 className="text-xs font-black tracking-[0.2em] text-slate-800 uppercase">Bilmece Bulmaca</h1>
        <div className="w-10"></div>
      </header>

      {!game ? (
        // BAŞLANGIÇ EKRANI
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
          <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-indigo-200"
          >
             <Sparkles size={48} className="text-white" />
          </motion.div>
          <h2 className="text-2xl font-black mb-2 text-slate-800">Bilmece Avı</h2>
          <p className="text-slate-500 font-medium mb-8 text-sm max-w-[250px] leading-relaxed">
            Sana kelimeyi söylemeyeceğiz, sadece ipucu vereceğiz. Bakalım 5 harfli cevabı bulabilecek misin?
          </p>
          <button onClick={startNewGame} className="bg-slate-900 text-white px-10 py-4 rounded-[1.5rem] font-bold shadow-xl active:scale-95 transition-all w-full max-w-xs">
            BİLMECEYİ GETİR
          </button>
        </div>
      ) : (
        // OYUN EKRANI - FLEX DÜZENLEMESİ İLE SIĞDIRMA
        <div className="flex-1 flex flex-col relative w-full h-full min-h-0">
          
          {/* ORTA BÖLÜM: BİLMECE + TAHTA (Kaydırılabilir) */}
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center py-2 px-4 gap-4">
            
            {/* BİLMECE KARTI */}
            <motion.div 
              initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-md bg-indigo-600 rounded-2xl p-4 shadow-lg text-white relative overflow-hidden shrink-0"
            >
               <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
               <div className="flex items-start gap-3 relative z-10">
                 <Lightbulb className="text-yellow-300 shrink-0 mt-1" size={20} />
                 <div>
                   <p className="text-[9px] font-bold text-indigo-200 uppercase tracking-widest mb-0.5">İPUCU</p>
                   <p className="font-bold text-sm leading-tight italic">"{game.hint}"</p>
                 </div>
               </div>
            </motion.div>

            {/* RAKİP DURUMU */}
            <div className="w-full max-w-md flex justify-end shrink-0">
               <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400">RAKİP:</span>
                  <div className="flex gap-1">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < (partnerGuesses?.length || 0) ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                    ))}
                  </div>
               </div>
            </div>

            {/* OYUN IZGARASI */}
            <div className="grid grid-rows-6 gap-2 w-full max-w-[280px] aspect-[5/6] shrink-0">
                {/* 1. Geçmiş */}
                {myGuesses?.map((guess: string, i: number) => (
                  <div key={i} className="grid grid-cols-5 gap-2">
                    {guess.split('').map((char, j) => (
                      <motion.div 
                        initial={{ rotateX: 90 }} animate={{ rotateX: 0 }} transition={{ delay: j * 0.1 }}
                        key={j} 
                        className={`rounded-lg flex items-center justify-center text-xl font-bold uppercase border-2 select-none ${getLetterColor(guess, j, true)}`}
                      >
                        {char}
                      </motion.div>
                    ))}
                  </div>
                ))}

                {/* 2. Aktif */}
                {myGuesses?.length < 6 && game.status === 'playing' && (
                  <motion.div 
                    animate={shakeRow ? { x: [-5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="grid grid-cols-5 gap-2"
                  >
                    {[0,1,2,3,4].map(i => (
                      <div key={i} className={`rounded-lg flex items-center justify-center text-xl font-bold uppercase border-2 transition-all ${currentGuess[i] ? 'border-slate-800 bg-white shadow-sm scale-105' : 'border-slate-300 bg-slate-50'}`}>
                        {currentGuess[i] || ""}
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* 3. Boş */}
                {[...Array(Math.max(0, 5 - (myGuesses?.length || 0) - (game.status === 'playing' ? 1 : 0)))].map((_, i) => (
                   <div key={`empty-${i}`} className="grid grid-cols-5 gap-2 opacity-30">
                     {[...Array(5)].map((_, j) => (
                       <div key={j} className="rounded-lg border-2 border-slate-200 bg-slate-100"></div>
                     ))}
                   </div>
                ))}
             </div>
          </div>

          {/* SONUÇ MODALI */}
          <AnimatePresence>
            {game.status === 'finished' && (
              <motion.div 
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }} 
                animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6"
              >
                <motion.div 
                  initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }}
                  className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
                >
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${game.winner_id === myProfile?.id ? 'bg-yellow-100' : 'bg-rose-100'}`}>
                    {game.winner_id === myProfile?.id ? <Trophy size={40} className="text-yellow-500" /> : <XCircle size={40} className="text-rose-500" />}
                  </div>
                  
                  <h2 className="text-2xl font-black text-slate-800 mb-1">
                    {game.winner_id === myProfile?.id ? "MÜKEMMEL!" : "OYUN BİTTİ"}
                  </h2>
                  <p className="text-sm text-slate-500 font-medium mb-6">
                    {game.winner_id === myProfile?.id ? "Bilmeceyi başarıyla çözdün." : "Maalesef hakların tükendi."}
                  </p>

                  <div className="bg-slate-50 rounded-xl p-4 w-full mb-6 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">CEVAP</p>
                    <p className="text-xl font-black text-emerald-500 tracking-[0.2em] uppercase">{game.target_word}</p>
                    <p className="text-[10px] text-slate-400 mt-2 italic">"{game.hint}"</p>
                  </div>

                  <button onClick={startNewGame} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <RotateCcw size={18} /> YENİ BİLMECE
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* KLAVYE (YÜKSELTİLMİŞ & MOBİL UYUMLU) */}
          <div className="bg-white pb-8 pt-2 px-1 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-[2rem] z-20 shrink-0">
            <div className="flex flex-col gap-1.5 max-w-md mx-auto">
              {["ERTYUIOPĞÜ", "ASDFGHJKLŞİ", "ZXCVBNMÖÇ"].map((row, rIdx) => (
                <div key={rIdx} className="flex justify-center gap-1">
                  {row.split('').map(char => (
                    <button 
                      key={char} 
                      onClick={() => onKeyClick(char)} 
                      className={`h-11 flex-1 min-w-[30px] rounded-lg border-b-2 text-xs font-bold active:border-b-0 active:translate-y-1 touch-manipulation transition-all uppercase ${getKeyColor(char)}`}
                    >
                      {char}
                    </button>
                  ))}
                </div>
              ))}
              <div className="flex justify-center gap-2 mt-2 px-4">
                <button onClick={onDelete} className="bg-slate-200 border-b-2 border-slate-300 text-slate-600 px-6 py-3 rounded-xl flex items-center justify-center active:border-b-0 active:translate-y-1 transition-all"><Delete size={20}/></button>
                <button onClick={onSubmit} disabled={currentGuess.length !== 5} className="flex-1 bg-slate-900 border-b-2 border-slate-700 text-white py-3 rounded-xl font-bold active:border-b-0 active:translate-y-1 disabled:opacity-50 disabled:active:translate-y-0 disabled:active:border-b-2 transition-all flex items-center justify-center gap-2">
                  GÖNDER <Send size={16}/>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}