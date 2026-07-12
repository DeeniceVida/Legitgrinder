import React, { useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import { Download, Globe, Mail, MapPin, Phone, Instagram, Facebook } from 'lucide-react';

const BusinessCard: React.FC = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: null });
      const image = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.href = image;
      link.download = "Legitgrinder_Business_Card.png";
      link.click();
    } catch (error) {
      console.error("Error generating business card:", error);
      alert("Failed to download the business card. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-50 min-h-full rounded-2xl">
      <div 
        ref={cardRef} 
        className="relative w-full max-w-[1050px] aspect-[1.75/1] rounded-3xl overflow-hidden shadow-2xl flex items-stretch text-white"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        }}
      >
        {/* Abstract shapes for premium aesthetic */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#3D8593] opacity-20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500 opacity-10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4"></div>

        {/* Left Side: Logo & Info */}
        <div className="flex-1 flex flex-col justify-between p-12 lg:p-16 relative z-10 border-r border-white/10">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <img src="/favicon.png" alt="Legitgrinder Logo" className="w-16 h-16 object-contain" crossOrigin="anonymous" />
              <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-white">LEGITGRINDER</h1>
            </div>
            <p className="text-[#3D8593] font-bold tracking-[0.2em] uppercase text-sm lg:text-base">Premium Imports & Logistics</p>
          </div>
          
          <div className="mt-8 space-y-2">
            <h2 className="text-3xl lg:text-4xl font-bold">Purchasing Manager</h2>
          </div>

          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-4 text-gray-300">
              <Mail className="w-5 h-5 text-[#3D8593]" />
              <span className="text-lg">mungaimports@gmail.com</span>
            </div>
            <div className="flex items-center gap-4 text-gray-300">
              <Instagram className="w-5 h-5 text-[#3D8593]" />
              <span className="text-lg">@legitgrinder.imports</span>
            </div>
            <div className="flex items-center gap-4 text-gray-300">
              <span className="text-[#3D8593] font-bold text-lg w-5 h-5 flex items-center justify-center">🎵</span>
              <span className="text-lg">@legitgrinderimports</span>
            </div>
            <div className="flex items-center gap-4 text-gray-300">
              <Facebook className="w-5 h-5 text-[#3D8593]" />
              <span className="text-lg">legitgrinder.ke</span>
            </div>
          </div>
        </div>

        {/* Right Side: QR Code */}
        <div className="w-[40%] flex flex-col items-center justify-center p-12 relative z-10 bg-black/20 backdrop-blur-sm">
          <div className="bg-white p-4 rounded-xl shadow-2xl mb-6">
            <QRCode value="https://legitgrinder.com" size={200} fgColor="#0f172a" />
          </div>
          <p className="text-gray-400 font-medium tracking-widest text-sm uppercase text-center">Scan to visit<br/>legitgrinder.com</p>
        </div>
      </div>

      <button 
        onClick={handleDownload}
        disabled={downloading}
        className="mt-12 btn-vibrant-teal px-12 py-4 rounded-full font-black text-sm uppercase tracking-widest shadow-2xl flex items-center gap-3 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-5 h-5" />
        {downloading ? 'Generating...' : 'Download High-Res Card'}
      </button>
    </div>
  );
};

export default BusinessCard;
