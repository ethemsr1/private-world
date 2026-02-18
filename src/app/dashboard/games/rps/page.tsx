"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { Loader2, ArrowLeft, RefreshCw, Swords, CheckCircle2, User } from "lucide-react";
import { useRouter } from "next/navigation";

const CHOICES = [
  { id: "rock", label: "Taş", icon: "✊", color: "from-slate-600 to-slate-800" },
  { id: "paper", label: "Kağıt", icon: "✋", color: "from-blue-500 to-blue-700" },
  { id: "scissors", label: "Makas", icon: "✌️", color: "from-rose-500 to-rose-700" }
];

export default function RPSGame() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [game, setGame] = useState<any>(null);

  // 1. PROFILLERİ VE OYUNU İLK KEZ ÇEK
  useEffect(() => {
    let channel: any;

    const init = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const userId = session.user.id;

      // Profilimi Çek
      const { data: me } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (me) {
        setMyProfile(me);
        // Partnerimi Çek
        if (me.partner_email) {
          const { data: partner } = await supabase.from('profiles').select('*').eq('email', me.partner_email).single();
          if (partner) setPartnerProfile(partner);
        }
      }

      // Aktif Maçı Çek (Sadece BU İKİLİYE ait olan maçı çek - BAŞKALARININKİNİ DEĞİL!)
      const { data: activeGame } = await supabase
        .from('games_rps')
        .select('*')
        .eq('status', 'playing')
        .or(`player_1.eq.${userId},player_2.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeGame) {
        setGame(activeGame);
      } else {
        const { data: lastGame } = await supabase
          .from('games_rps')
          .select('*')
          .or(`player_1.eq.${userId},player_2.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastGame) setGame(lastGame);
      }
      setLoading(false);

      // 2. GERÇEK ZAMANLI DİNLEME (Sadece kendi maçlarımızı dinliyoruz)
      channel = supabase.channel('realtime:rps')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'games_rps' }, (payload) => {
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

  // 3. KAZANAN KONTROLÜ (Hakem Sistemi - Kilitlenmeyi Önler)
  useEffect(() => {
    const checkWinner = async () => {
      // Eğer oyun oynanıyorsa ve İKİ TARAF DA seçimini yaptıysa:
      if (game?.status === 'playing' && game?.p1_choice && game?.p2_choice) {
        // Çakışmayı önlemek için sonucu sadece Player 1 (Oyunu Kuran) veritabanına yazsın
        if (game.player_1 === myProfile?.id) {
          let winner = null;
          const p1 = game.p1_choice;
          const p2 = game.p2_choice;

          if (p1 !== p2) {
            const p1Wins = 
              (p1 === 'rock' && p2 === 'scissors') ||
              (p1 === 'paper' && p2 === 'rock') ||
              (p1 === 'scissors' && p2 === 'paper');
            winner = p1Wins ? game.player_1 : game.player_2;
          }

          // Maçı bitir ve kazananı yaz
          await supabase.from('games_rps').update({
            status: 'finished',
            winner_id: winner
          }).eq('id', game.id);
        }
      }
    };
    checkWinner();
  }, [game, myProfile]);

  // YENİ OYUN BAŞLAT
  const startNewGame = async () => {
    if (!myProfile || !partnerProfile) return alert("Önce profilinden sevgilini eklemelisin!");
    setLoading(true);
    
    const { data: newGame, error } = await supabase.from('games_rps').insert([{
      player_1: myProfile.id,
      player_2: partnerProfile.id,
      p1_choice: null,
      p2_choice: null,
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

  // SEÇİM YAP
  const makeChoice = async (choiceId: string) => {
    if (!game || game.status !== 'playing' || !myProfile) return;
    
    const isP1 = game.player_1 === myProfile.id;
    const isP2 = game.player_2 === myProfile.id;

    if (isP1 && game.p1_choice) return;
    if (isP2 && game.p2_choice) return;

    const updates: any = isP1 ? { p1_choice: choiceId } : { p2_choice: choiceId };
    
    // ANINDA TEPKİ (Optimistic UI) - Bekleme hissini yok eder
    setGame((prev: any) => ({ ...prev, ...updates }));

    const { error } = await supabase.from('games_rps').update(updates).eq('id', game.id);
    if (error) alert("Seçim kaydedilemedi, internet bağlantını kontrol et.");
  };

  const getRuleText = () => {
    if (!game || game.p1_choice === game.p2_choice) return "Berabere! İkiniz de aynı şeyi seçtiniz.";
    const choices = [game.p1_choice, game.p2_choice];
    if (choices.includes('rock') && choices.includes('scissors')) return "Taş, Makası kırar!";
    if (choices.includes('paper') && choices.includes('rock')) return "Kağıt, Taşı sarar!";
    if (choices.includes('scissors') && choices.includes('paper')) return "Makas, Kağıdı keser!";
    return "";
  };

  if (loading && !game) return <div className="h-[100dvh] flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-rose-500" size={40} /></div>;

  const isP1 = game?.player_1 === myProfile?.id;
  const myChoice = isP1 ? game?.p1_choice : game?.p2_choice;
  const partnerChoice = isP1 ? game?.p2_choice : game?.p1_choice;
  const isFinished = game?.status === 'finished';

  return (
    <div className="p-6 pb-32 h-[100dvh] flex flex-col bg-slate-900 text-white overflow-hidden">
      <header className="mb-6 mt-4 flex justify-between items-center">
        <button onClick={() => router.push('/dashboard/games')} className="p-2 bg-white/10 rounded-full"><ArrowLeft size={24}/></button>
        <span className="font-black tracking-widest text-xs uppercase opacity-50">Düello Alanı</span>
        <div className="w-10"></div>
      </header>

      {/* DURUM PANOSU */}
      <div className="bg-white/5 border border-white/10 p-4 rounded-3xl flex items-center justify-between mb-10">
        <div className="flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-full border-2 border-emerald-500/50 overflow-hidden bg-slate-800 flex items-center justify-center">
            {myProfile?.avatar_url?.startsWith('http') ? (
               <img src={myProfile.avatar_url} className="w-full h-full object-cover" />
            ) : <User className="text-emerald-500/50" />}
          </div>
          <span className="text-[10px] font-bold text-emerald-400">SEN</span>
        </div>

        <Swords size={20} className="text-white/20 animate-pulse" />

        <div className="flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-full border-2 border-rose-500/50 overflow-hidden bg-slate-800 flex items-center justify-center relative">
            {partnerProfile?.avatar_url?.startsWith('http') ? (
               <img src={partnerProfile.avatar_url} className="w-full h-full object-cover" />
            ) : <User className="text-rose-500/50" />}
            
            {partnerChoice && !isFinished && (
              <div className="absolute inset-0 bg-emerald-500/80 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-white" />
              </div>
            )}
          </div>
          <span className="text-[10px] font-bold text-rose-400">{partnerProfile?.full_name?.split(' ')[0] || "O"}</span>
        </div>
      </div>

      {/* OYUN ALANI */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {!game ? (
          <div className="text-center">
             <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-dashed border-white/20">
               <span className="text-4xl animate-bounce">✊</span>
             </div>
             <button onClick={startNewGame} className="bg-white text-slate-900 px-10 py-5 rounded-[2rem] font-black shadow-xl active:scale-95 transition-all">DÜELLO BAŞLAT</button>
          </div>
        ) : isFinished ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center w-full">
            <div className="flex items-center justify-center gap-6 mb-10">
              <div className="flex flex-col items-center gap-2">
                <div className="text-7xl drop-shadow-2xl">{CHOICES.find(c => c.id === myChoice)?.icon || "❓"}</div>
                <span className="text-[10px] font-bold opacity-30">SEN</span>
              </div>
              <div className="text-xl font-black text-white/10 uppercase italic">vs</div>
              <div className="flex flex-col items-center gap-2">
                <div className="text-7xl drop-shadow-2xl">{CHOICES.find(c => c.id === partnerChoice)?.icon || "❓"}</div>
                <span className="text-[10px] font-bold opacity-30">O</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-[3rem] shadow-2xl">
              <p className="text-yellow-400 font-bold text-xs mb-3 uppercase tracking-widest">{getRuleText()}</p>
              <h2 className={`text-4xl font-black mb-8 ${game.winner_id === myProfile?.id ? 'text-emerald-400' : game.winner_id === null ? 'text-white' : 'text-rose-400'}`}>
                {game.winner_id === myProfile?.id ? "KAZANDIN! 🎉" : game.winner_id === null ? "BERABERE! 🤝" : "KAYBETTİN! 💸"}
              </h2>
              <button onClick={startNewGame} className="bg-white text-slate-900 w-full py-5 rounded-[1.5rem] font-black active:scale-95 transition-all flex items-center justify-center gap-3">
                <RefreshCw size={20} /> TEKRAR DENE
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="w-full text-center">
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.3em] mb-12">
              {myChoice ? "Partnerin Seçiyor..." : "Hamleni Kilitle!"}
            </p>
            <div className="flex justify-center gap-5">
              {CHOICES.map((c) => (
                <motion.button
                  key={c.id}
                  whileHover={!myChoice ? { y: -12 } : {}}
                  whileTap={!myChoice ? { scale: 0.85 } : {}}
                  onClick={() => makeChoice(c.id)}
                  disabled={!!myChoice}
                  className={`w-24 h-32 rounded-[2rem] bg-gradient-to-br ${c.color} flex flex-col items-center justify-center shadow-2xl border-2 transition-all duration-300 ${myChoice === c.id ? 'border-white scale-110' : 'border-white/10 grayscale-[0.5] opacity-80'}`}
                >
                  <span className="text-4xl mb-2">{c.icon}</span>
                  <span className="text-[10px] font-extrabold uppercase">{c.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}