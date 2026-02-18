"use client";

import { motion } from "framer-motion";
import { Gamepad2, Swords, Scissors, Grid3x3, Sparkles, ChevronRight, Ticket } from "lucide-react";
import Link from "next/link";

export default function GamesHub() {
  return (
    <div className="p-6 pb-32 min-h-screen flex flex-col bg-[#faf8f9]">
      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          Oyun Salonu <Gamepad2 className="text-indigo-500" size={32} />
        </h1>
        <p className="text-slate-500 text-sm mt-1 flex items-center gap-1 font-medium">
          <Sparkles size={14} className="text-indigo-400" /> Yenilmeye hazır mısın?
        </p>
      </header>

      <div className="flex flex-col gap-5">
        
        {/* OYUN 1: CANLI XOX */}
        <Link href="/dashboard/games/xox" className="block">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-[2.5rem] shadow-lg text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
            <div className="flex justify-between items-center mb-4 relative z-10">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                <Swords size={24} className="text-white" />
              </div>
              <span className="bg-emerald-400 text-emerald-900 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse">Düello</span>
            </div>
            <h2 className="text-2xl font-black mb-1 relative z-10"> (XOX)</h2>
            <p className="text-indigo-100 text-sm font-medium flex items-center justify-between relative z-10">
               <ChevronRight size={18} />
            </p>
          </motion.div>
        </Link>

        {/* OYUN 2: TAŞ, KAĞIT, MAKAS */}
        <Link href="/dashboard/games/rps" className="block">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="flex justify-between items-center mb-4">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-100">
                <Scissors size={24} className="text-rose-500" />
              </div>
              <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-rose-100">Hızlı Karar</span>
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-1">Taş, Kağıt, Makas</h2>
            <p className="text-slate-500 text-sm font-medium flex items-center justify-between">
              <ChevronRight size={18} className="text-slate-400" />
            </p>
          </motion.div>
        </Link>

        {/* OYUN 3: KELİME SAVAŞLARI */}
        <Link href="/dashboard/games/wordle" className="block">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="flex justify-between items-center mb-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                <Grid3x3 size={24} className="text-emerald-500" />
              </div>
              <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100">Test</span>
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-1">Kelime Savaşları</h2>
            <p className="text-slate-500 text-sm font-medium flex items-center justify-between">
               <ChevronRight size={18} className="text-slate-400" />
            </p>
          </motion.div>
        </Link>

        {/* --- YENİ EKLENEN: KAZI KAZAN (SÜRPRİZ KUPON) --- */}
        <Link href="/dashboard/games/scratch" className="block">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="flex justify-between items-center mb-4">
              <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center border border-pink-100">
                <Ticket size={24} className="text-pink-500" />
              </div>
              <span className="bg-pink-50 text-pink-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-pink-100">Sürpriz</span>
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-1">Kazı Kazan</h2>
            <p className="text-slate-500 text-sm font-medium flex items-center justify-between">
              Resmi yükle, kazıdıkça görünsün. <ChevronRight size={18} className="text-slate-400" />
            </p>
          </motion.div>
        </Link>

      </div>
    </div>
  );
}