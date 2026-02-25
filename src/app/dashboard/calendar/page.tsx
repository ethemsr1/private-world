"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Star, X, Heart, Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase"; 

type DailyScore = { user_id: string; date_val: string; score: number; note: string };

const getLocalYYYYMMDD = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [scores, setScores] = useState<DailyScore[]>([]);
  const [myAverage, setMyAverage] = useState<number>(0);
  const [soulmateAverage, setSoulmateAverage] = useState<number>(0);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [inputScore, setInputScore] = useState(10);
  const [inputNote, setInputNote] = useState("");
  const [saving, setSaving] = useState(false);

  const todayStr = getLocalYYYYMMDD(new Date());

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    setUserId(session.user.id);
    const uid = session.user.id;

    const year = currentDate.getFullYear();
    const monthIndex = currentDate.getMonth(); 
    const month = String(monthIndex + 1).padStart(2, '0');
    const lastDayNum = new Date(year, monthIndex + 1, 0).getDate();
    
    const firstDay = `${year}-${month}-01`;
    const lastDay = `${year}-${month}-${String(lastDayNum).padStart(2, '0')}`;

    const { data: monthScores } = await supabase
      .from("daily_scores")
      .select("*")
      .gte("date_val", firstDay)
      .lte("date_val", lastDay);

    if (monthScores) setScores(monthScores);

    const { data: allScores } = await supabase.from("daily_scores").select("user_id, score");
    
    if (allScores) {
      const myScores = allScores.filter(n => n.user_id === uid).map(n => n.score);
      const theirScores = allScores.filter(n => n.user_id !== uid).map(n => n.score);
      
      if (myScores.length > 0) setMyAverage(Number((myScores.reduce((a, b) => a + b, 0) / myScores.length).toFixed(1)));
      if (theirScores.length > 0) setSoulmateAverage(Number((theirScores.reduce((a, b) => a + b, 0) / theirScores.length).toFixed(1)));
    }
    setLoading(false);
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const startDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const blankDays = startDay === 0 ? 6 : startDay - 1;

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const openDayModal = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(date);
    
    const dateString = getLocalYYYYMMDD(date);
    const myExistingScore = scores.find(n => n.date_val === dateString && n.user_id === userId);
    
    setInputScore(myExistingScore?.score || 10);
    setInputNote(myExistingScore?.note || "");
  };

  const saveNote = async () => {
    if (!userId || !selectedDate) return;
    setSaving(true);
    const dateString = getLocalYYYYMMDD(selectedDate);

    await supabase.from("daily_scores").upsert({
      user_id: userId,
      date_val: dateString,
      score: inputScore,
      note: inputNote,
    }, { onConflict: 'user_id, date_val' });

    await fetchData(); 
    setSelectedDate(null); 
    setSaving(false);
  };

  return (
    // overflow-hidden ile sayfanın tamamen kaymasını engelledik
    <div className="flex flex-col h-[100dvh] bg-[#faf8f9] relative overflow-hidden">
      
      {/* ÜST BAŞLIK (Sabit) */}
      <div className="pt-safe px-6 pt-8 pb-4 bg-white/50 backdrop-blur-lg flex justify-between items-center shrink-0 z-10">
        <button onClick={handlePrevMonth} className="p-2 bg-white rounded-full shadow-sm text-slate-700 active:scale-95"><ChevronLeft size={24} /></button>
        <h1 className="text-xl font-black text-slate-800 tracking-wide uppercase">
          {currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
        </h1>
        <button onClick={handleNextMonth} className="p-2 bg-white rounded-full shadow-sm text-slate-700 active:scale-95"><ChevronRight size={24} /></button>
      </div>

      {/* TAKVİM IZGARASI (Esnek, ortaya oturur) */}
      <div className="px-4 py-2 flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
            <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: blankDays }).map((_, i) => <div key={`blank-${i}`} />)}
          
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const iterDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateStr = getLocalYYYYMMDD(iterDate);
            const isToday = dateStr === todayStr; 
            
            const dayScores = scores.filter(n => n.date_val === dateStr);
            const myScore = dayScores.find(n => n.user_id === userId);
            const soulmateScore = dayScores.find(n => n.user_id !== userId);

            return (
              <motion.button 
                key={day}
                whileTap={{ scale: 0.9 }}
                onClick={() => openDayModal(day)}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative border shadow-sm transition-all
                  ${isToday ? 'ring-2 ring-[#ff2b85] ring-offset-1 bg-pink-50' : 'bg-white'} 
                  ${myScore && !isToday ? 'bg-blue-50/50 border-blue-100' : 'border-slate-100'}
                `}
              >
                <span className={`text-base ${isToday ? 'font-black text-[#ff2b85]' : 'font-bold text-slate-600'}`}>
                  {day}
                </span>
                <div className="flex gap-1 mt-1">
                  {myScore && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                  {soulmateScore && <div className="w-1.5 h-1.5 rounded-full bg-[#ff2b85]" />}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ALT ORTALAMA KARTI (SABİT) */}
      {/* pb-[100px] sayesinde Alt Bar (Bottom Nav) ile çakışmaz, ekranın tam altına oturur */}
      <div className="shrink-0 px-4 pb-[100px] pt-2 z-20">
        <div className="bg-white/90 backdrop-blur-2xl border border-slate-200/60 p-4 rounded-3xl shadow-lg flex justify-between items-center">
          
          <div className="flex flex-col items-center flex-1 border-r border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Senin Ort.</span>
            <div className="flex items-center gap-1 text-blue-500">
              <span className="text-2xl font-black">{myAverage}</span><Star size={16} className="fill-blue-500" />
            </div>
          </div>

          <div className="flex flex-col items-center flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ruh Eşinin Ort.</span>
            <div className="flex items-center gap-1 text-[#ff2b85]">
              <span className="text-2xl font-black">{soulmateAverage}</span><Heart size={16} className="fill-[#ff2b85]" />
            </div>
          </div>

        </div>
      </div>

      {/* MODAL (GÜN DETAYI) */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col justify-end"
          >
            <div className="bg-[#faf8f9] w-full rounded-t-[2.5rem] p-6 pb-12 shadow-2xl h-[85vh] overflow-y-auto">
              
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black text-slate-800">
                    {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                  </h2>
                  {getLocalYYYYMMDD(selectedDate) === todayStr && (
                    <span className="text-xs font-bold text-[#ff2b85] uppercase tracking-widest mt-0.5">Bugün</span>
                  )}
                </div>
                <button onClick={() => setSelectedDate(null)} className="p-2 bg-slate-200 rounded-full text-slate-600 active:scale-95"><X size={20} /></button>
              </div>

              {(() => {
                const dateStr = getLocalYYYYMMDD(selectedDate);
                const theirScore = scores.find(n => n.date_val === dateStr && n.user_id !== userId);
                if (theirScore) {
                  return (
                    <div className="mb-6 p-4 rounded-3xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 shadow-sm relative">
                      <div className="absolute -top-3 left-4 bg-[#ff2b85] text-white text-[10px] font-bold uppercase px-3 py-1 rounded-full shadow-md">Onun Günü</div>
                      <div className="flex items-center gap-1 text-[#ff2b85] font-black text-xl mb-2 mt-2">
                        {theirScore.score} / 10 <Heart size={18} className="fill-[#ff2b85]" />
                      </div>
                      <p className="text-sm text-slate-700 italic">"{theirScore.note}"</p>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-lg mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Edit3 size={18} className="text-blue-500" />
                  <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest">Senin Günün</h3>
                </div>

                <div className="flex justify-between items-center mb-6 bg-slate-50 p-2 rounded-2xl">
                  {[1,2,3,4,5,6,7,8,9,10].map(num => (
                    <button 
                      key={num} onClick={() => setInputScore(num)}
                      className={`w-8 h-8 rounded-full font-bold text-sm transition-all ${inputScore === num ? 'bg-blue-500 text-white shadow-md scale-110' : 'text-slate-400 hover:bg-slate-200'}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <textarea 
                  value={inputNote} onChange={(e) => setInputNote(e.target.value)}
                  placeholder="Bugün en çok neye mutlu oldun? Ona ne söylemek istersin?"
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm text-slate-700 h-32 focus:ring-2 focus:ring-blue-100 outline-none resize-none mb-4"
                />

                <button 
                  onClick={saveNote} disabled={saving}
                  className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex justify-center"
                >
                  {saving ? "Kaydediliyor..." : "Günü Mühürle"}
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}