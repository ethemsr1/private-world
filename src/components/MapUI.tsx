"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
// İŞTE RESİMDEKİ O ÖZEL İKONU (HeartHandshake) BURAYA EKLEDİK
import { HeartHandshake, Navigation } from "lucide-react"; 

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 16, { animate: true, duration: 1.5 });
  }, [center, map]);
  return null;
}

export default function MapUI({ 
  position, 
  isViewingSoulmate,
  avatarContent,
  lastSeenText
}: { 
  position: { lat: number, lng: number }, 
  isViewingSoulmate: boolean,
  avatarContent: string,
  lastSeenText: string | null 
}) {
  
  const glowColor = isViewingSoulmate ? "#ff2b85" : "#3b82f6"; // Attığın resimdeki o canlı pembe/kırmızı tonu
  const isImage = avatarContent && (avatarContent.startsWith("http") || avatarContent.startsWith("/"));

  const innerHtml = isImage 
    ? `<img src="${avatarContent}" style="width: 100%; height: 100%; object-fit: cover;" />`
    : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 26px; background-color: #fdf2f8; color: #333;">${avatarContent || "💖"}</div>`;

  const customIcon = L.divIcon({
    className: "custom-profile-marker",
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 60px; height: 60px;">
        <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: ${glowColor}; opacity: 0.3; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        
        <div style="width: 48px; height: 48px; border-radius: 50%; border: 3px solid white; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.4); overflow: hidden; position: relative; z-index: 10; background-color: white;">
          ${innerHtml}
        </div>
        
        <div style="position: absolute; bottom: 2px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid white; z-index: 9;"></div>
      </div>
    `,
    iconSize: [60, 60],
    iconAnchor: [30, 60], 
    popupAnchor: [0, -65] 
  });

  return (
    <>
      <style>{`
        .leaflet-popup-content-wrapper {
          background: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(12px) !important;
          border-radius: 1.2rem !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15) !important;
          padding: 4px !important;
        }
        .leaflet-popup-tip {
          background: rgba(255, 255, 255, 0.95) !important;
        }
        .leaflet-popup-content {
          margin: 12px 14px !important;
        }
        .leaflet-container a.leaflet-popup-close-button {
          display: none !important;
        }
      `}</style>

      <MapContainer 
        center={[position.lat, position.lng]} 
        zoom={16} 
        zoomControl={false} 
        style={{ width: "100%", height: "100%", zIndex: 0 }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; OSM'
        />
        <MapUpdater center={[position.lat, position.lng]} />
        
        <Marker position={[position.lat, position.lng]} icon={customIcon}>
          <Popup>
            <div className="flex flex-col items-center justify-center min-w-[140px]">
              
              {/* BİREBİR ATTIĞIN RESİMDEKİ TASARIM */}
              <div className={`flex items-center justify-center gap-1.5 ${isViewingSoulmate ? 'text-[#ff2b85]' : 'text-blue-500'}`}>
                {isViewingSoulmate ? (
                  <>
                    {/* El sıkışan kalp ikonu! */}
                    <HeartHandshake size={22} strokeWidth={2.5} />
                    <span className="font-black text-[15px] tracking-wide uppercase mt-0.5">RUH EŞİN</span>
                  </>
                ) : (
                  <>
                    <Navigation size={18} strokeWidth={2.5} />
                    <span className="font-black text-[15px] tracking-wide uppercase mt-0.5">SEN</span>
                  </>
                )}
              </div>
              
              {/* SON GÖRÜLME ZAMANI */}
              <div className="mt-2.5 text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-slate-100/80 px-3 py-1.5 rounded-lg w-full text-center border border-slate-200/50">
                {lastSeenText}
              </div>

            </div>
          </Popup>
        </Marker>

      </MapContainer>
    </>
  );
}
