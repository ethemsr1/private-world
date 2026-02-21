"use client";

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

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
  avatarContent // YENİ: Artık buraya veritabanından dinamik Emoji veya Link gelecek
}: { 
  position: { lat: number, lng: number }, 
  isViewingSoulmate: boolean,
  avatarContent: string 
}) {
  
  const glowColor = isViewingSoulmate ? "#ec4899" : "#3b82f6";

  // Zeka Kısmı: Gelen veri bir link mi (fotoğraf) yoksa düz metin mi (emoji)?
  const isImage = avatarContent && (avatarContent.startsWith("http") || avatarContent.startsWith("/"));

  // Eğer resimse <img> etiketi, emojiyse <div> içinde ortalanmış metin oluştur
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
  });

  return (
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
      <Marker position={[position.lat, position.lng]} icon={customIcon} />
    </MapContainer>
  );
}