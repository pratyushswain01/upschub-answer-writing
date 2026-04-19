"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Zap, Check, Loader2, Maximize } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CameraProps {
  onCapture: (images: string[]) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

export default function CameraCapture({ onCapture, onClose, isSubmitting }: CameraProps) {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [isStable, setIsStable] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
            facingMode: "environment", 
            width: { ideal: 1920 }, 
            height: { ideal: 1080 },
            focusMode: { ideal: "continuous" } as any 
        },
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      streamRef.current = stream;
    } catch (err) {
      alert("Please enable camera permissions.");
      onClose();
    }
  };

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // We capture a high-res version
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Apply "Document Enhancer" filters before drawing to canvas
    // This makes the paper white and text dark
    ctx.filter = "contrast(1.2) brightness(1.1) saturate(0.8)";
    ctx.drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImages((prev) => [...prev, dataUrl]);
    
    setFlash(true);
    setTimeout(() => setFlash(false), 100);
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
  }, []);

  useEffect(() => {
    startCamera();
    // Auto-capture logic: triggers every 4 seconds to allow user to flip pages
    const interval = setInterval(() => {
      setIsStable(true);
      setTimeout(() => {
        capture();
        setIsStable(false);
      }, 1000);
    }, 4500);

    return () => {
      clearInterval(interval);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [capture]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#000] z-[100] flex flex-col font-sans overflow-hidden"
    >
      {/* HUD Overlay */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-start z-20">
        <button onClick={onClose} className="p-3 bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl text-white">
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col items-center gap-2">
            <div className="px-4 py-1.5 bg-indigo-600 rounded-full text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-lg flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full bg-white ${isStable ? 'animate-ping' : ''}`} />
                {isStable ? 'Detecting Page...' : 'Auto-Scanner Active'}
            </div>
            <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest bg-black/20 backdrop-blur-md px-3 py-1 rounded-lg">
                {capturedImages.length} SCANS SAVED
            </span>
        </div>

        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Scanner Viewfinder */}
      <div className="flex-1 relative flex items-center justify-center">
        <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover opacity-80" 
        />
        
        {/* The "Document" Frame Guide */}
        <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="relative w-full aspect-[1/1.414] max-h-[70vh]">
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-indigo-500 rounded-tl-3xl" />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-indigo-500 rounded-tr-3xl" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-indigo-500 rounded-bl-3xl" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-indigo-500 rounded-br-3xl" />
                
                {/* Scanning Line Animation */}
                <motion.div 
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_15px_rgba(99,102,241,0.8)] z-10"
                />

                <div className="absolute inset-0 bg-indigo-500/5 rounded-3xl" />
                <p className="absolute -bottom-10 left-0 right-0 text-center text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">
                    Align paper within frame
                </p>
            </div>
        </div>

        {flash && <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-500" />}
      </div>

      {/* Bottom Result Tray */}
      <div className="p-6 bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar h-24 items-center">
          {capturedImages.length === 0 ? (
            <div className="w-full flex items-center justify-center text-slate-300 gap-3 italic text-sm">
                <Maximize className="w-4 h-4" /> Position document to begin
            </div>
          ) : (
            capturedImages.map((img, i) => (
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    key={i} 
                    className="relative w-14 h-20 rounded-lg border border-slate-200 overflow-hidden shrink-0 shadow-sm"
                >
                    <img src={img} className="w-full h-full object-cover" />
                    <div className="absolute top-0 left-0 bg-slate-900 text-white text-[8px] w-4 h-4 flex items-center justify-center font-bold">
                        {i + 1}
                    </div>
                </motion.div>
            ))
          )}
        </div>

        <button
          onClick={() => onCapture(capturedImages)}
          disabled={isSubmitting || capturedImages.length === 0}
          className="w-full bg-slate-900 hover:bg-indigo-700 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all disabled:bg-slate-50 disabled:text-slate-300"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : "Finalize & Submit"}
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
