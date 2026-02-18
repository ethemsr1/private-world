"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../../lib/supabase";
import { motion, useAnimation } from "framer-motion";
import { ArrowLeft, Plus, Trash2, RotateCw, AlertCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

const COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export default function SyncWheel() {
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [game, setGame] = useState<any>(null);
  const [statusText, setStatusText] = useState("Çevirmek için Hazır");
  
  const [winnerResult, setWinnerResult] = useState<string | null>(null);
  const [winnerColor, setWinnerColor] = useState<string>("#0f172a");

  const [rotation, setRotation] = useState(0); 
  const controls = useAnimation();
  const router = useRouter();

  const optionsRef = useRef(options);
  const gameRef = useRef(game);

  useEffect(() => { optionsRef.current = options; }, [options]);
  useEffect(() => { gameRef.current = game; }, [game]);

  // 1. BAŞLANGIÇ
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let { data } = await supabase.from('games_wheel').select('*').limit(1).maybeSingle();
      
      if (!data) {
         const { data: newGame } = await supabase.from('games_wheel').insert([{
           player_1: session.user.id,
           options: [] 
         }]).select().single();
         data = newGame;
      }

      setGame(data);
      if (data?.options) setOptions(data.options);

      const channel = supabase.channel('room_wheel_sync_v4')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games_wheel' }, (payload) => {
          const newData = payload.new;
          const oldGame = gameRef.current;
          const currentOptions = optionsRef.current;

          if (JSON.stringify(newData.options) !== JSON.stringify(currentOptions)) {
             setOptions(newData.options);
             if (newData.options.length === 0) {
               setWinnerResult(null);
               setWinnerColor("#0f172a");
               setStatusText("Çevirmek için Hazır");
             }
          }

          if (newData.spin_id !== oldGame?.spin_id && newData.is_spinning) {
             spinAnimation(newData.winner_index, newData.options.length);
          }

          setGame(newData);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };
    init();
  }, []);

  // 2. ÇEVİRME BUTONU
  const handleSpinClick = async () => {
    if (game?.is_spinning || options.length < 2) return;

    const randomIndex = Math.floor(Math.random() * options.length);
    const newSpinId = crypto.randomUUID();

    await supabase.from('games_wheel').update({
      winner_index: randomIndex,
      is_spinning: true,
      spin_id: newSpinId,
      options: options
    }).eq('id', game.id);
  };

  // 3. SIFIRLAMA
  const handleReset = async () => {
    if (!confirm("Çarkı sıfırlamak istiyor musun?")) return;
    await supabase.from('games_wheel').update({
      options: [],
      winner_index: null,
      is_spinning: false,
      spin_id: null
    }).eq('id', game.id);
    setOptions([]);
    setWinnerResult(null);
    setWinnerColor("#0f172a");
    setStatusText("Sıfırlandı");
  };

  // 4. ANİMASYON (HIZLI BAŞLA - YAVAŞ BİT)
  const spinAnimation = async (winnerIndex: number, totalOptions: number) => {
    setStatusText("Dönüyor...");
    setWinnerResult(null);
    setWinnerColor("#0f172a");

    const sliceAngle = 360 / totalOptions;
    
    // Ok sağ tarafta (0 derece) olduğu için, hedef dilimin ortasını 0 dereceye getirecek hesap:
    const centerOffset = sliceAngle / 2;
    const targetAngle = 360 - (winnerIndex * sliceAngle) - centerOffset; 
    
    // GÜNCELLEME: 10 Tam tur (Daha hızlı görünsün diye arttırdım)
    const extraSpins = 10 * 360; 
    
    const currentRotation = rotation; 
    const finalRotation = currentRotation + extraSpins + targetAngle;
    
    setRotation(finalRotation); 

    await controls.start({
      rotate: finalRotation,
      transition: { 
        duration: 6, // 6 saniye sürsün (uzun yavaşlama için)
        ease: [0.05, 0.9, 0.1, 1] // ÖZEL EĞRİ: Çok hızlı başla, çok yavaş bit.
      } 
    });

    const winnerName = optionsRef.current[winnerIndex];
    const color = COLORS[winnerIndex % COLORS.length];

    setWinnerColor(color);
    setWinnerResult(winnerName);
    setStatusText("Tamamlandı");
    
    if (gameRef.current) {
       await supabase.from('games_wheel').update({ is_spinning: false }).eq('id', gameRef.current.id);
    }
  };

  // 5. YARDIMCI FONKSİYONLAR
  const addOption = async () => {
    if (!newOption.trim()) return;
    const updated = [...options, newOption.trim()];
    setOptions(updated);
    setNewOption("");
    if (game) await supabase.from('games_wheel').update({ options: updated }).eq('id', game.id);
  };

  const removeOption = async (index: number) => {
    const updated = options.filter((_, i) => i !== index);
    setOptions(updated);
    if (game) await supabase.from('games_wheel').update({ options: updated }).eq('id', game.id);
  };

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-10">
      
      {/* HEADER */}
      <header className="p-4 flex items-center justify-between bg-white shadow-sm z-10 sticky top-0">
        <button onClick={() => router.back()} className="p-2 bg-slate-50 rounded-full active:scale-90"><ArrowLeft size={20} className="text-slate-700"/></button>
        <h1 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">Karar Çarkı 🎡</h1>
        <button onClick={handleReset} className="p-2 bg-rose-50 text-rose-500 rounded-full active:scale-90 border border-rose-100"><RefreshCw size={20} /></button>
      </header>

      {/* SONUÇ EKRANI (RENKLİ) */}
      <motion.div 
        className="w-full p-6 text-center shadow-lg z-20 transition-colors duration-500 ease-out flex flex-col items-center justify-center min-h-[100px]"
        style={{ backgroundColor: winnerResult ? winnerColor : '#0f172a' }}
      >
         {winnerResult ? (
           <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
             <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-1">KAZANAN</p>
             <p className="text-3xl font-black text-white drop-shadow-md">{winnerResult}</p>
           </motion.div>
         ) : (
           <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">{statusText}</p>
         )}
      </motion.div>

      <div className="flex-1 flex flex-col items-center justify-start pt-8 p-4 overflow-y-auto">
        
        {/* ÇARK */}
        <div className="relative w-[300px] h-[300px] mb-12 shrink-0">
           
           {/* GÖSTERGE (OK) - SAĞDA */}
           <div className="absolute top-1/2 -right-6 -translate-y-1/2 z-20 drop-shadow-xl filter">
             <div className="w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-r-[24px] border-r-slate-800"></div>
           </div>

           {options.length === 0 && (
             <div className="absolute inset-0 flex items-center justify-center z-10 text-slate-400 text-sm font-bold bg-slate-100/80 rounded-full border-4 border-slate-200 border-dashed backdrop-blur-sm">
                Seçenek Ekle 👇
             </div>
           )}

           <motion.div 
             className="w-full h-full rounded-full border-[6px] border-white shadow-2xl relative overflow-hidden bg-white box-border"
             animate={controls}
             style={{ rotate: 0 }}
           >
              {options.length > 0 && (
                <svg viewBox="-1 -1 2 2" className="w-full h-full transform">
                  {options.map((option, index) => {
                    const start = index / options.length;
                    const end = (index + 1) / options.length;
                    const [startX, startY] = getCoordinatesForPercent(start);
                    const [endX, endY] = getCoordinatesForPercent(end);
                    const largeArcFlag = end - start > 0.5 ? 1 : 0;
                    const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`;

                    return (
                      <path key={index} d={pathData} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth="0.02" />
                    );
                  })}
                </svg>
              )}
              
              {options.map((option, index) => {
                 const sliceAngle = 360 / options.length;
                 const rotateAngle = (index * sliceAngle) + (sliceAngle / 2);
                 return (
                   <div 
                     key={index}
                     className="absolute top-0 left-0 w-full h-full pointer-events-none"
                     style={{ transform: `rotate(${rotateAngle}deg)` }}
                   >
                     <div className="absolute top-1/2 left-1/2 w-[50%] -translate-y-1/2 origin-left flex items-center justify-end pr-5">
                        <span className="text-white font-bold text-[11px] uppercase truncate w-[85px] text-right drop-shadow-md leading-tight">
                          {option}
                        </span>
                     </div>
                   </div>
                 )
              })}
           </motion.div>

           {/* ORTA GÖBEK */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center z-30 border-4 border-slate-50">
             <motion.button 
               whileTap={{ scale: 0.9 }}
               onClick={handleSpinClick}
               disabled={game?.is_spinning || options.length < 2}
               className="w-full h-full rounded-full flex items-center justify-center text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed group"
             >
               {game?.is_spinning ? <RotateCw className="animate-spin text-indigo-500"/> : <span className="font-black text-[10px] group-active:scale-95 transition-transform">ÇEVİR</span>}
             </motion.button>
           </div>
        </div>

        {/* LİSTE YÖNETİMİ */}
        <div className="w-full max-w-sm">
           <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex gap-2 mb-4">
              <input 
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                placeholder="Seçenek ekle..."
                className="flex-1 bg-transparent p-3 text-sm font-bold outline-none placeholder:font-normal text-slate-800"
                onKeyDown={(e) => e.key === 'Enter' && addOption()}
              />
              <button onClick={addOption} className="bg-slate-900 text-white w-12 h-12 rounded-xl flex items-center justify-center active:scale-90 shadow-lg"><Plus size={20}/></button>
           </div>
           
           {options.length < 2 && (
             <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-3 rounded-xl mb-4 text-xs font-bold border border-rose-100 justify-center">
               <AlertCircle size={16}/> En az 2 seçenek gerekli!
             </div>
           )}

           <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto pr-1 pb-20 custom-scrollbar">
              {options.map((opt, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  key={i} 
                  className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"
                >
                   <div className="flex items-center gap-3">
                     <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                     <span className="text-sm font-bold text-slate-700 break-all">{opt}</span>
                   </div>
                   <button onClick={() => removeOption(i)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                </motion.div>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
}