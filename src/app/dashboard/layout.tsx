"use client";

import { Home, Image as ImageIcon, Map, ListTodo, User, Bell, Gamepad2, CalendarHeart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [notification, setNotification] = useState<any>(null);

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const setupRealtimeNotifications = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const myEmail = session.user.email;

      const channel = supabase.channel('realtime:notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
          const newNotif = payload.new;
          
          if (newNotif.receiver_email === myEmail) {
            setNotification(newNotif);
            setTimeout(() => setNotification(null), 5000); 

            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(`Ruh Eşinden Bildirim! 💕`, {
                body: `${newNotif.sender_name} ${newNotif.action_text}`,
                icon: newNotif.sender_avatar || "https://cdn-icons-png.flaticon.com/512/833/833472.png"
              });
            }
          }
        })
        .subscribe();
    };

    setupRealtimeNotifications();
  }, []);

  // YENİ: Oyunlar sekmesi (Gamepad2) menüye eklendi
  const navItems = [
    { icon: Home, label: "Ana Sayfa", href: "/dashboard" },
    { icon: ImageIcon, label: "Anılar", href: "/dashboard/memory-lane" },
    { icon: CalendarHeart, label: "Günlük", href: "/dashboard/calendar" },
    { icon: Map, label: "Harita", href: "/dashboard/map" },
    { icon: ListTodo, label: "Planlar", href: "/dashboard/plans" },
    { icon: Gamepad2, label: "Oyun", href: "/dashboard/games" },
    { icon: User, label: "Profil", href: "/dashboard/profile" },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] text-slate-800 relative bg-[#faf8f9]">
      
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }} 
            animate={{ y: 20, opacity: 1 }} 
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-4 right-4 z-[999] bg-white/90 backdrop-blur-xl border border-pink-100 p-4 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full border border-slate-100 shadow-sm overflow-hidden flex-shrink-0 bg-slate-50 flex items-center justify-center text-xl">
              {notification.sender_avatar?.startsWith('http') ? <img src={notification.sender_avatar} className="w-full h-full object-cover"/> : notification.sender_avatar || "👸"}
            </div>
            <div>
              <p className="text-[11px] font-bold text-pink-500 uppercase tracking-widest flex items-center gap-1">
                <Bell size={12} /> Yeni Bildirim
              </p>
              <p className="text-sm font-bold text-slate-700 leading-tight">
                {notification.sender_name} <span className="font-medium text-slate-500">{notification.action_text}</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

   

      <main className="flex-1 pb-32 pt-4">
        {children}
      </main>

      {/* 6 BUTONLU YENİ NESİL ALT MENÜ */}
      <div className="fixed bottom-6 left-2 right-2 sm:left-4 sm:right-4 bg-white/70 backdrop-blur-xl border border-white shadow-lg rounded-3xl z-50">
        <div className="flex justify-between items-center px-2 py-3 max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className="relative flex flex-col items-center p-1.5 w-[16%]">
                <item.icon size={20} className={isActive ? "text-pink-500" : "text-slate-400"} />
                <span className={`text-[8px] sm:text-[9px] mt-1 font-bold ${isActive ? "text-pink-500" : "text-slate-400"}`}>{item.label}</span>
                {isActive && <motion.div layoutId="nav-dot" className="absolute -bottom-2 w-1.5 h-1.5 bg-pink-500 rounded-full" />}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
