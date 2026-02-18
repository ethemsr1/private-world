"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { Loader2, ArrowLeft, RefreshCw, X, Circle, Trophy, Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function XOXGame() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [game, setGame] = useState<any>(null);

  // KAZANMA KOMBİNASYONLARI
  const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Yatay
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Dikey
    [0, 4, 8], [2, 4, 6]             // Çapraz
  ];

  // 1. BAŞLANGIÇ AYARLARI VE CANLI DİNLEME
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

      // Aktif Maçı Bul (Sadece bu çifte ait olan)
      const { data: activeGame } = await supabase
        .from('games_xox')
        .select('*')
        .eq('status', 'playing')
        .or(`player_1.eq.${userId},player_2.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeGame) setGame(activeGame);
      else {
        // Eğer oynanan oyun yoksa son bitmiş oyunu göster (sonucu görmek için)
        const { data: lastGame } = await supabase
          .from('games_xox')
          .select('*')
          .or(`player_1.eq.${userId},player_2.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastGame) setGame(lastGame);
      }
      setLoading(false);

      // CANLI DİNLEME (REALTIME)
      channel = supabase.channel('realtime:xox')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'games_xox' }, (payload) => {
          const newData = payload.new as any;
          // Sadece benim oyunumla ilgili güncellemeyi al
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
    
    // Player 1 her zaman oyunu başlatan kişidir ve "X" olur.
    const { data: newGame, error } = await supabase.from('games_xox').insert([{
      player_1: myProfile.id,
      player_2: partnerProfile.id,
      board: ["", "", "", "", "", "", "", "", ""],
      turn: myProfile.id, // Oyunu kuran başlar
      status: "playing",
      winner_id: null
    }]).select().single();

    if (error) {
      console.error(error);
      alert("Oyun başlatılamadı!");
    } else {
      setGame(newGame);
    }
    setLoading(false);
  };

  // HAMLE YAP
  const makeMove = async (index: number) => {
    // Kontroller: Oyun oynanıyor mu? Sıra bende mi? Kare boş mu?
    if (!game || game.status !== 'playing') return;
    if (game.turn !== myProfile.id) return; 
    if (game.board[index] !== "") return; 

    // 1. Yeni Tahta Durumunu Hesapla
    const newBoard = [...game.board];
    const amIX = game.player_1 === myProfile.id;
    const mySymbol = amIX ? "X" : "O";
    newBoard[index] = mySymbol;

    // 2. Kazanma Kontrolü
    let winner = null;
    let status = 'playing';
    let nextTurn = game.turn === game.player_1 ? game.player_2 : game.player_1;

    // Biri kazandı mı?
    for (let line of WIN_LINES) {
      const [a, b, c] = line;
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        winner = newBoard[a] === "X" ? game.player_1 : game.player_2;
        status = 'finished';
        break;
      }
    }

    // Berabere mi? (Kazanan yoksa ve boş kare kalmadıysa)
    if (!winner && !newBoard.includes("")) {
      status = 'finished';
      winner = null; // Berabere
    }

    // 3. Optimistic UI (Veritabanını beklemeden ekranda göster)
    setGame((prev: any) => ({ ...prev, board: newBoard, turn: nextTurn, status, winner_id: winner }));

    // 4. Veritabanını Güncelle
    await supabase.from('games_xox').update({
      board: newBoard,
      turn: nextTurn, // Sırayı diğerine ver (veya oyun bittiyse önemi yok)
      status: status,
      winner_id: winner
    }).eq('id', game.id);
  };

  if (loading && !game) return <div className="h-[100dvh] flex items-center justify-center bg-indigo-950"><Loader2 className="animate-spin text-indigo-400" size={40} /></div>;

  const isMyTurn = game?.status === 'playing' && game?.turn === myProfile?.id;
  const amIX = game?.player_1 === myProfile?.id; // Oyunu kuran (P1) her zaman X
  
  // Sembolleri Belirle
  const mySymbol = amIX ? "X" : "O";
  const partnerSymbol = amIX ? "O" : "X";

  return (
    <div className="p-6 h-[100dvh] flex flex-col bg-indigo-950 text-white overflow-hidden relative">
      {/* Arka Plan Dekorasyonu */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] bg-purple-500 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-indigo-500 rounded-full blur-[100px]"></div>
      </div>

      <header className="mb-6 mt-4 flex justify-between items-center z-10">
        <button onClick={() => router.push('/dashboard/games')} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"><ArrowLeft size={24}/></button>
        <span className="font-black tracking-widest text-xs uppercase opacity-50">Tic-Tac-Toe</span>
        <div className="w-10"></div>
      </header>

      {/* SKOR VE SIRA PANOSU */}
      <div className="bg-white/5 border border-white/10 p-4 rounded-3xl flex items-center justify-between mb-8 z-10 backdrop-blur-md shadow-2xl">
        {/* SEN */}
        <div className={`flex flex-col items-center gap-1 transition-all duration-300 ${isMyTurn ? 'opacity-100 scale-110' : 'opacity-50 scale-95'}`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg border-2 ${mySymbol === "X" ? 'bg-indigo-600 border-indigo-400' : 'bg-purple-600 border-purple-400'}`}>
            {mySymbol === "X" ? <X size={32} /> : <Circle size={28} />}
          </div>
          <span className="text-[10px] font-bold">SEN</span>
        </div>

        {/* ORTA DURUM */}
        <div className="flex flex-col items-center">
          <div className="px-5 py-2 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest mb-1">
            {game?.status === 'finished' ? "OYUN BİTTİ" : isMyTurn ? "SENİN SIRAN" : "BEKLENİYOR"}
          </div>
          {isMyTurn && <span className="text-[9px] text-emerald-400 font-bold animate-pulse">Hamle Yap!</span>}
        </div>

        {/* PARTNER */}
        <div className={`flex flex-col items-center gap-1 transition-all duration-300 ${!isMyTurn && game?.status === 'playing' ? 'opacity-100 scale-110' : 'opacity-50 scale-95'}`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg border-2 ${partnerSymbol === "X" ? 'bg-indigo-600 border-indigo-400' : 'bg-purple-600 border-purple-400'}`}>
            {partnerSymbol === "X" ? <X size={32} /> : <Circle size={28} />}
          </div>
          <span className="text-[10px] font-bold">{partnerProfile?.full_name?.split(' ')[0] || "O"}</span>
        </div>
      </div>

      {/* OYUN TAHTASI */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 relative">
        {!game ? (
           <div className="text-center">
             <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-8 border-2 border-dashed border-white/20 rotate-12">
               <X size={48} className="text-white/20" />
             </div>
             <button onClick={startNewGame} className="bg-white text-indigo-900 px-10 py-5 rounded-[2rem] font-black shadow-xl active:scale-95 transition-all">OYUNU BAŞLAT</button>
           </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 w-full max-w-[340px] aspect-square p-3 bg-white/5 rounded-[2.5rem] border border-white/5 shadow-2xl">
              {game.board.map((cell: string, i: number) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.9 }}
                  disabled={cell !== "" || !isMyTurn || game.status !== 'playing'}
                  onClick={() => makeMove(i)}
                  className={`rounded-2xl flex items-center justify-center text-4xl shadow-inner transition-all duration-300 relative overflow-hidden
                    ${cell === "" ? 'bg-white/5 hover:bg-white/10' : cell === "X" ? 'bg-indigo-600 text-white shadow-indigo-500/50' : 'bg-purple-600 text-white shadow-purple-500/50'}
                  `}
                >
                  <AnimatePresence>
                    {cell === "X" && <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}><X size={44} strokeWidth={3} /></motion.div>}
                    {cell === "O" && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><Circle size={36} strokeWidth={4} /></motion.div>}
                  </AnimatePresence>
                </motion.button>
              ))}
            </div>

            {/* SONUÇ EKRANI (Overlay) */}
            <AnimatePresence>
              {game.status === 'finished' && (
                <motion.div 
                  initial={{ opacity: 0, y: 50, scale: 0.9 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-indigo-950/90 backdrop-blur-xl"
                >
                  <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }} 
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(255,255,255,0.2)]"
                  >
                    {game.winner_id === myProfile.id ? <Trophy size={64} className="text-yellow-500" /> : game.winner_id === null ? <Shuffle size={64} className="text-slate-400" /> : <X size={64} className="text-rose-500" />}
                  </motion.div>
                  
                  <h2 className="text-4xl font-black text-center mb-2 tracking-tight">
                    {game.winner_id === myProfile.id ? "KAZANDIN! 🎉" : game.winner_id === null ? "BERABERE! 🤝" : "KAYBETTİN... 💔"}
                  </h2>
                  <p className="text-white/60 text-sm font-medium mb-10 text-center max-w-[200px] leading-relaxed">
                    {game.winner_id === myProfile.id ? "Zekanı konuşturdun, tebrikler!" : game.winner_id === null ? "İkiniz de çok güçlüsünüz." : "Rövanş zamanı geldi mi?"}
                  </p>

                  <button onClick={startNewGame} className="bg-white text-indigo-950 w-full py-5 rounded-[2rem] font-black active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl">
                    <RefreshCw size={22} /> TEKRAR OYNA
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}