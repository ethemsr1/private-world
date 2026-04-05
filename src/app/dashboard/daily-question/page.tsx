"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Coffee, Lock, Send, Loader2, Sparkles, Clock } from "lucide-react";
import { supabase } from "../../../lib/supabase";

// Özenle seçilmiş, sıkıcı olmayan, derin ve eğlenceli 60 İlişki Sorusu
const QUESTIONS = [
  "İlk tanıştığımızda veya ilk buluşmamızda benim hakkımda içinden geçen ilk düşünce neydi?",
  "Eğer şu an dünyadaki herhangi bir yere ışınlanabilseydik, neresi olurdu ve ne yapıyor olurduk?",
  "Bende en sevdiğin, dışarıdan kimsenin bilmediği o küçük detay nedir?",
  "Birlikte yaptığımız en unutulmaz plan veya yaşadığımız en komik an hangisiydi?",
  "Gelecekteki evimizde kesinlikle olmasını istediğin bir eşya veya oda ne olurdu?",
  "Bana bir lakap takacak olsaydın (şu anki dışında) bu ne olurdu?",
  "Benimle ilgili hafızana kazınan en güzel fotoğraf karesi (an) hangisi?",
  "Birbirimize en çok hangi konuda benziyoruz sence?",
  "Hangi huyum seni bazen delirtse de aslında içten içe hoşuna gidiyor?",
  "Eğer hayatımız bir film olsaydı, sence şu an hangi türde bir film olurdu?",
  "Benim yanımdayken kendini en çok ne zaman 'güvende' ve 'huzurlu' hissettin?",
  "Birlikte bir iş kursaydık, bu ne üzerine olurdu ve şirketin adı ne olurdu?",
  "Bende gördüğün ama benim henüz fark etmediğim en güçlü özelliğim sence ne?",
  "Şimdiye kadar sana aldığım hediyeler veya yaptığım sürprizler içinde en çok hangisi seni duygulandırdı?",
  "Eğer sana sadece bir kelime ile hitap etmek zorunda kalsaydım, o kelime ne olmalıydı?",
  "İkimizin ortak bir şarkısı (tema müziği) olsa, sence bu hangisi olurdu?",
  "Benimle tanıştıktan sonra hayatında olumlu anlamda değişen en belirgin şey ne oldu?",
  "Beni başkalarına anlatırken en çok hangi özelliğimden bahsederek övünüyorsun?",
  "Birlikte yapmayı en çok hayal ettiğin o büyük çılgınlık nedir?",
  "Sence ilişkimizin en güçlü, bizi diğerlerinden ayıran özelliği ne?",
  "Birlikte yaşlandığımızda sence günlerimiz nasıl geçecek? Nasıl bir dede/nine olacağız?",
  "En çok hangi yemeği benimle birlikte yerken keyif alıyorsun?",
  "Bir günlüğüne benim zihnime girebilseydin, ilk neyi merak edip bakardın?",
  "Bana söylemekten çekindiğin ama aslında çok hoşuna giden küçük bir sırrın var mı?",
  "Şimdiye kadar sana kurduğum hangi cümle kalbinde en çok yer etti?",
  "Eğer bir yeteneğimi veya huyumu kopyalayıp kendine alabilseydin, hangisini seçerdin?",
  "Sence benim en çocuksu ve en şirin halim hangisi?",
  "Moralim çok bozuk olduğunda beni keyiflendirmek için yapacağın o gizli taktik nedir?",
  "Birlikte izlediğimiz hangi film/dizi karakterlerini bize benzetiyorsun?",
  "Tanıştığımız o ilk güne dönebilseydin, o anki bana kulağıma eğilip ne fısıldardın?",
  "En son ne zaman bana bakıp 'İyi ki hayatımda' diye içinden geçirdin?",
  "Eğer her sabah uyandığında başucunda benden bir not bulacak olsaydın, o notta ne yazmasını isterdin?",
  "Benim hakkımda ilk başta yanıldığın ama sonradan 'Aslında böyleymiş' dediğin bir şey var mı?",
  "Aramızdaki en komik iletişim kazası veya yanlış anlaşılma neydi?",
  "Beni tek bir renkle tanımlayacak olsaydın, sence hangi renk olurdum ve neden?",
  "İlişkimiz boyunca benden öğrendiğin en değerli hayat dersi ne oldu?",
  "Herkesin içinde bana bakıp sadece ikimizin anladığı o gizli bakışımız sence ne anlama geliyor?",
  "Beni ne yaparken izlemek (ders çalışırken, araba kullanırken, uyurken vs.) çok hoşuna gidiyor?",
  "Gelecekte çocuğumuz olduğunda benim hangi huyumu kesinlikle almasını istersin?",
  "Bana bugüne kadar sormaya cesaret edemediğin ama cevabını çok merak ettiğin o soru ne?",
  "Eğer bir gün hafızamı kaybetseydim, bana kendimi ve aşkımızı hatırlatmak için yapacağın ilk şey ne olurdu?",
  "Dünyanın sonu gelse ve son 24 saatimiz kalsa, bu süreyi benimle nasıl geçirirdin?",
  "Tartıştığımızda veya trip attığımızda aslında benden duymayı beklediğin o cümle nedir?",
  "Şu ana kadar sana attığım en güzel mesaj hangisiydi?",
  "Beni hangi kokuyla eşleştiriyorsun? O kokuyu duyunca aklına direkt ben mi geliyorum?",
  "Zaman makinemiz olsa, ilişkimizin geçmişindeki hangi anı tekrar yaşamak için geri dönerdin?",
  "Senin gözünde 'Aşk' kelimesinin tanımı benimle birlikte nasıl değişti?",
  "Birlikte bir yemek programına katılsak, hangi efsane tabağımızla jüriyi etkilerdik?",
  "En çok hangi anlarda bana sarılma ihtiyacı hissediyorsun?",
  "Benimle ilgili en çok kurduğun hayal gece uyumadan önce hangisi oluyor?",
  "Telefonunda beni kaydederken ilk ne yazmıştın ve şu an ne olarak kayıtlıyım?",
  "Bana hiç bahsetmediğin ama içten içe benim için yaptığın küçük bir fedakarlık var mı?",
  "Birlikte gittiğimiz mekanlar arasında senin için en 'bizim' olan yer neresi?",
  "Benim yüz ifademden ne hissettiğimi en iyi hangi anlarda anlıyorsun?",
  "Dışarıdan çok sert veya ciddi görünsem de, senin yanında büründüğüm o pamuk gibi halimi nasıl tarif edersin?",
  "Eğer aşkımızı bir mevsimle anlatacak olsaydın bu hangi mevsim olurdu?",
  "Benim sana olan sevgimi en derinden hissettiğin o özel an hangisiydi?",
  "Gözlerime uzun uzun baktığında tam olarak orada ne görüyorsun?",
  "Seninle ilgili tüm dünyada sadece benim bildiğimi düşündüğün o şey ne?",
  "Şu an tam karşında olsaydım, bana ilk yapacağın şey ne olurdu?"
];

export default function DailyQuestionPage() {
  // FIX 1: Başlangıç değeri 0 yerine null yapıldı. Race Condition engellendi!
  const [questionIndex, setQuestionIndex] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [myProfile, setMyProfile] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  
  const [myAnswer, setMyAnswer] = useState<string | null>(null);
  const [partnerAnswer, setPartnerAnswer] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const dayValue = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
    const dailyIndex = dayValue % QUESTIONS.length;
    setQuestionIndex(dailyIndex);
  }, []);

  useEffect(() => {
    if (questionIndex !== null) {
      fetchData(questionIndex);
    }
  }, [questionIndex]);

  // currentIndex parametresi ekledik ki başka sorunun datasıyla karışmasın
  const fetchData = async (currentIndex: number) => {
    setLoading(true);
    setMyAnswer(null);
    setPartnerAnswer(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: me } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (me) {
      setMyProfile(me);
      if (me.partner_email) {
        const { data: partner } = await supabase.from('profiles').select('*').eq('email', me.partner_email).single();
        if (partner) setPartnerProfile(partner);
      }
    }

    // FIX 2: order('created_at', { ascending: false }) eklendi. En güncel cevabı çekecek!
    const { data: answers } = await supabase.from('answers')
      .select('*')
      .eq('question_id', currentIndex)
      .order('created_at', { ascending: false });
    
    if (answers && me) {
      const mine = answers.find(a => a.user_id === me.id);
      if (mine) setMyAnswer(mine.answer_text);

      if (me.partner_email) {
        const partnerInfo = await supabase.from('profiles').select('id').eq('email', me.partner_email).single();
        if (partnerInfo.data) {
          const partners = answers.find(a => a.user_id === partnerInfo.data.id);
          if (partners) setPartnerAnswer(partners.answer_text);
        }
      }
    }
    setLoading(false);
  };

  const submitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !myProfile || questionIndex === null) return;
    setSubmitting(true);

    const { error } = await supabase.from('answers').insert([{
      question_id: questionIndex,
      user_id: myProfile.id,
      answer_text: inputText
    }]);

    if (!error) {
      setMyAnswer(inputText);
      setInputText("");

      if (myProfile.partner_email) {
        await supabase.from('notifications').insert([{
          receiver_email: myProfile.partner_email,
          sender_name: myProfile.full_name,
          sender_avatar: myProfile.avatar_url,
          action_text: "günün sorusunu cevapladı! Cevabını merak ediyorsan sen de yanıtla 🤫"
        }]);
      }
    } else {
      alert("Cevap gönderilirken hata oluştu. Daha önce cevaplamış olabilirsin.");
    }
    setSubmitting(false);
  };

  return (
    <div className="p-6 pb-32 h-[100dvh] flex flex-col bg-[#faf8f9]">
      <header className="mb-6 mt-4 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          Günün Sorusu <Coffee className="text-purple-500" size={28} />
        </h1>
        <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-100 flex items-center gap-1.5 shadow-sm text-purple-600">
          <Clock size={16} className="animate-pulse" />
          <span className="text-xs font-bold">24 Saatte Bir</span>
        </div>
      </header>

      {/* SORU KARTI */}
      <motion.div 
        key={questionIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] p-8 shadow-[0_15px_40px_rgba(0,0,0,0.05)] border border-slate-50 mb-6 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-400 to-pink-400" />
        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-4">
          <Sparkles size={10} className="inline mr-1 mb-0.5" /> 
          Günün Özel Sorusu
        </p>
        <h2 className="text-xl font-black text-slate-800 leading-snug">
          {/* FIX 3: Index null iken uygulamanın çökmesini engeller */}
          {questionIndex !== null ? `"${QUESTIONS[questionIndex]}"` : "Günün sorusu hazırlanıyor..."}
        </h2>
      </motion.div>

      {/* CEVAPLAR ALANI */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-purple-400" size={32} /></div>
      ) : (
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pb-4">
          
          {/* SEVGİLİNİN CEVABI */}
          {partnerAnswer ? (
            <div className="bg-purple-50 border border-purple-100 p-5 rounded-3xl relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xl overflow-hidden shadow-sm">
                  {partnerProfile?.avatar_url?.startsWith('http') ? <img src={partnerProfile.avatar_url} className="w-full h-full object-cover"/> : partnerProfile?.avatar_url || "👸"}
                </div>
                <span className="font-bold text-sm text-purple-600 uppercase">{partnerProfile?.full_name || "Sevgilin"}</span>
              </div>
              
              {/* EĞER SEN CEVAPLAMADIYSAN BULANIK GÖSTER! */}
              {!myAnswer ? (
                <div className="relative overflow-hidden rounded-xl">
                  <p className="text-slate-700 font-medium blur-md select-none">Burası sevgilinin uzun ve güzel cevabını içeriyor ama okuman için önce kendi cevabını vermen gerek. Kopya çekmek yok!</p>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20 backdrop-blur-[2px]">
                    <Lock className="text-purple-600 mb-1 drop-shadow-md" size={24} />
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-widest drop-shadow-md bg-white/90 px-3 py-1.5 rounded-lg shadow-sm">Cevabını Gizledi</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-700 font-medium leading-relaxed">{partnerAnswer}</p>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 border-dashed p-5 rounded-3xl text-center">
              <p className="text-xs font-bold text-slate-400 uppercase">Sevgilin henüz cevaplamadı ⏳</p>
            </div>
          )}

          {/* SENİN CEVABIN VEYA GİRDİ ALANI */}
          {myAnswer ? (
            <div className="bg-blue-50 border border-blue-100 p-5 rounded-3xl mt-auto">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xl overflow-hidden shadow-sm">
                  {myProfile?.avatar_url?.startsWith('http') ? <img src={myProfile.avatar_url} className="w-full h-full object-cover"/> : myProfile?.avatar_url || "👨‍💻"}
                </div>
                <span className="font-bold text-sm text-blue-600 uppercase">Sen</span>
              </div>
              <p className="text-slate-700 font-medium leading-relaxed">{myAnswer}</p>
            </div>
          ) : (
            <form onSubmit={submitAnswer} className="mt-auto relative">
              <textarea 
                value={inputText} onChange={(e) => setInputText(e.target.value)}
                placeholder="İçinden geçenleri dürüstçe yaz..."
                className="w-full bg-white border border-slate-200 rounded-3xl p-5 pr-14 min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 font-medium shadow-sm"
              />
              <button 
                type="submit" disabled={!inputText.trim() || submitting}
                className="absolute bottom-4 right-4 w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg disabled:opacity-50 hover:bg-slate-800 transition-all active:scale-90"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} className="ml-0.5" />}
              </button>
            </form>
          )}

        </div>
      )}
    </div>
  );
}
