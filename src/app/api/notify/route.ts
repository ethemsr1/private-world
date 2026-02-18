import { NextResponse } from 'next/server';
import webPush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Supabase'e güvenli admin bağlantısı
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Proje ayarlarından (API kısmından) service_role key'ini .env dosyana eklemelisin!
);

webPush.setVapidDetails(
  'mailto:senin@emailadresin.com', // Kendi e-postanı yaz
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  try {
    const { targetEmail, title, body, url } = await req.json();

    // 1. Hedef kişinin (sevgilinin) bildirim adresini (subscription) bul
    const { data: partner } = await supabaseAdmin
      .from('profiles')
      .select('push_subscription')
      .eq('email', targetEmail)
      .single();

    if (!partner || !partner.push_subscription) {
      return NextResponse.json({ error: "Kullanıcı bildirimlere abone değil." }, { status: 400 });
    }

    // 2. Bildirimi Ateşle!
    await webPush.sendNotification(
      partner.push_subscription,
      JSON.stringify({ title, body, icon: '/icon-192x192.png', url })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bildirim Hatası:", error);
    return NextResponse.json({ error: "Bildirim gönderilemedi." }, { status: 500 });
  }
}