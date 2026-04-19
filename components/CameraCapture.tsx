"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Check, Loader2, ScanLine, Info } from "lucide-react";
import { motion } from "framer-motion";

interface CameraProps {
  onCapture: (images: string[]) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

export default function CameraCapture({ onCapture, onClose, isSubmitting }: CameraProps) {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      streamRef.current = stream;
    } catch (err) {
      alert("Camera access required.");
      onClose();
    }
  };

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // 1. Get real video dimensions
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    /** * THE FIX: CLIPPING LOGIC
     * We define a "Safe Zone" (the paper area). 
     * We ignore the outer 15% of the image (the table/background).
     */
    const clipX = vWidth * 0.15;
    const clipY = vHeight * 0.10;
    const clipWidth = vWidth * 0.70;
    const clipHeight = vHeight * 0.80;

    // Set canvas to ONLY the size of the paper
    canvas.width = clipWidth;
    canvas.height = clipHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 2. Enhance the "Paper" look
    ctx.filter = "contrast(1.4) brightness(1.1) grayscale(1)";
    
    // 3. drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    // This strictly captures ONLY the area inside the scanner guide
    ctx.drawImage(
        video, 
        clipX, clipY, clipWidth, clipHeight, // SOURCE (The "Crop")
        0, 0, clipWidth, clipHeight           // DESTINATION
    );
    
    setCapturedImages(prev => [...prev, canvas.toDataURL("image/jpeg", 0.9)]);
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    if (navigator.vibrate) navigator.vibrate(100);
  }, []);

  useEffect(() => {
    startCamera();
    // Auto-capture cycle: Every 5 seconds
    const cycle = setInterval(() => {
        setIsLocked(true);
        setTimeout(() => {
            handleCapture();
            setIsLocked(false);
        }, 1000); // 1s visual lock-on before capture
    }, 6000);

    return () => {
        clearInterval(cycle);
        streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [handleCapture]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black z-[100] flex flex-col font-sans">
      
      {/* Top HUD */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center z-30">
        <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white"><X /></button>
        <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${isLocked ? 'bg-emerald-500 scale-105' : 'bg-indigo-600 text-white'}`}>
          {isLocked ? "LOCKING ON..." : "AUTO-SCANNING"}
        </div>
        <div className="text-white font-bold text-sm bg-black/40 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10">
            {capturedImages.length} Pages
        </div>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative overflow-hidden bg-slate-900 flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-60" />
        
        {/* The Guided Frame (Visual representation of what is being captured) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`relative w-[70%] h-[80%] border-2 transition-all duration-500 ${isLocked ? 'border-emerald-400 bg-emerald-400/10' : 'border-indigo-500/50 bg-indigo-500/5'}`}>
                {/* Corner Dots */}
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-white rounded-full border-2 border-indigo-500" />
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-white rounded-full border-2 border-indigo-500" />
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-white rounded-full border-2 border-indigo-500" />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-white rounded-full border-2 border-indigo-500" />
                
                {/* Scanning Laser Line */}
                <motion.div 
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-0.5 bg-indigo-400 shadow-[0_0_15px_rgba(99,102,241,1)]"
                />
            </div>
        </div>

        <div className="absolute bottom-10 left-0 right-0 flex justify-center">
            <p className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-[10px] text-white/70 uppercase tracking-widest flex items-center gap-2">
                <Info className="w-3 h-3" /> Keep paper inside the dots
            </p>
        </div>

        {flash && <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300" />}
      </div>

      {/* Bottom Result Tray */}
      <div className="p-8 bg-white rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.4)]">
        <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar h-20 items-center">
          {capturedImages.length === 0 ? (
            <div className="w-full text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                Align document to begin auto-capture
            </div>
          ) : (
            capturedImages.map((img, i) => (
                <div key={i} className="relative w-12 h-16 rounded-lg border border-slate-200 overflow-hidden shrink-0 shadow-sm">
                    <img src={img} className="w-full h-full object-cover" />
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] px-1 font-bold rounded-bl-md">
                        {i + 1}
                    </div>
                </div>
            ))
          )}
        </div>

        <button
          onClick={() => onCapture(capturedImages)}
          disabled={isSubmitting || capturedImages.length === 0}
          className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:bg-slate-50 disabled:text-slate-200"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : "Finish & Generate PDF"}
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
