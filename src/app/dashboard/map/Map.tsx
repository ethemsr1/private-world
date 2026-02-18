"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Kendi fotoğraflarımızı harita iğnesine (Marker) çeviren sihirli fonksiyon
const createProfileIcon = (avatarUrl: string, color: string) => {
  const isImage = avatarUrl.startsWith('http');
  const content = isImage 
    ? `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` 
    : avatarUrl;

  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 44px; height: 44px; 
      border-radius: 50%; 
      border: 3px solid ${color}; 
      background: white; 
      display: flex; align-items: center; justify-content: center; 
      font-size: 24px; 
      box-shadow: 0 8px 15px rgba(0,0,0,0.2);
      overflow: hidden;
    ">${content}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 44], // İğnenin tam alt ucu konumu göstersin
    popupAnchor: [0, -44]
  });
};

export default function MapComponent({ myProfile, partnerProfile }: any) {
  // Varsayılan Adana Merkezi
  const defaultCenter: [number, number] = [37.0000, 35.3213];
  
  // Haritanın merkezini senin konumuna veya Adana'ya odakla
  const mapCenter = myProfile?.lat && myProfile?.lng 
    ? [myProfile.lat, myProfile.lng] 
    : defaultCenter;

  return (
    <div className="w-full h-full rounded-[2rem] overflow-hidden border-4 border-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] relative z-0">
      <MapContainer 
        center={mapCenter as [number, number]} 
        zoom={13} 
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />

        {/* SENİN KONUMUN */}
        {myProfile?.lat && myProfile?.lng && (
          <Marker 
            position={[myProfile.lat, myProfile.lng]} 
            icon={createProfileIcon(myProfile.avatar_url || "👨‍💻", "#3b82f6")}
          >
            <Popup className="rounded-xl">
              <div className="text-center font-bold text-slate-700">
                Buradasın! 📍<br/>
                <span className="text-xs font-normal text-slate-500">
                  {new Date(myProfile.location_updated_at).toLocaleTimeString('tr-TR')}
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* SEVGİLİNİN KONUMU (Eğer eşleştiyseniz ve o da haritayı açtıysa) */}
        {partnerProfile?.lat && partnerProfile?.lng && (
          <Marker 
            position={[partnerProfile.lat, partnerProfile.lng]} 
            icon={createProfileIcon(partnerProfile.avatar_url || "👸", "#ec4899")}
          >
            <Popup>
              <div className="text-center font-bold text-slate-700">
                Ruh Eşin Burada! 💕<br/>
                <span className="text-xs font-normal text-slate-500">
                  Son Görülme: {new Date(partnerProfile.location_updated_at).toLocaleTimeString('tr-TR')}
                </span>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}