"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Check, Loader2, AlertCircle, ScanText } from "lucide-react";
import { motion } from "framer-motion";

export default function CameraCapture({ onCapture, onClose, isSubmitting }: any) {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [status, setStatus] = useState<"ready" | "searching" | "error">("ready");

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
    } catch (err) { onClose(); }
  };

  const handleDeepScan = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // 1. Capture a very high-contrast sample
    canvas.width = 200;
    canvas.height = 200;
    // Look only at the VERY center (where the paper MUST be)
    ctx.drawImage(video, video.videoWidth * 0.3, video.videoHeight * 0.3, video.videoWidth * 0.4, video.videoHeight * 0.4, 0, 0, 200, 200);
    
    const pixels = ctx.getImageData(0, 0, 200, 200).data;
    let whiteScore = 0;
    let inkScore = 0;

    for (let i = 0; i < pixels.length; i += 4) {
        const avg = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
        if (avg > 200) whiteScore++; // Bright Paper
        if (avg < 70) inkScore++;    // Clear Ink
    }

    // CRITICAL VALIDATION: 
    // Must have at least 40% white paper AND visible ink strokes in the center.
    if (whiteScore > 15000 && inkScore > 200) {
        setStatus("ready");
        
        // Final Document Render
        canvas.width = 1240;
        canvas.height = 1754;
        
        // TRICK: We use a severe contrast filter to "Burn Out" the background
        ctx.filter = "contrast(1.8) brightness(1.1) grayscale(1)";
        
        // We crop VERY tightly to the scanner guide
        ctx.drawImage(video, video.videoWidth * 0.15, video.videoHeight * 0.1, video.videoWidth * 0.7, video.videoHeight * 0.8, 0, 0, 1240, 1754);

        setCapturedImages(prev => [...prev, canvas.toDataURL("image/jpeg", 0.7)]);
        setFlash(true);
        setTimeout(() => setFlash(false), 200);
    } else {
        setStatus("error");
    }
  }, []);

  useEffect(() => {
    startCamera();
    const interval = setInterval(handleDeepScan, 4000);
    return () => {
        clearInterval(interval);
        streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [handleDeepScan]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black z-[100] flex flex-col font-sans">
      
      {/* Header */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center z-30">
        <button onClick={onClose} className="p-3 bg-white/10 rounded-2xl text-white backdrop-blur-md"><X /></button>
        <div className={`px-5 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${status === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {status === 'error' ? "ALIGN PAPER & TEXT" : "DOCUMENT DETECTED"}
        </div>
        <div className="w-10" />
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative overflow-hidden bg-zinc-950 flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-30 grayscale" />
        
        {/* The "Safe Zone" Frame */}
        <div className="absolute inset-0 flex items-center justify-center p-12">
            <div className={`relative w-full aspect-[1/1.4] border-2 transition-colors duration-500 ${status === 'error' ? 'border-red-500/50' : 'border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]'}`}>
                {/* Visual corners */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400" />
                
                {status === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-500/5">
                        <AlertCircle className="text-red-500 w-8 h-8" />
                        <span className="text-red-500 text-[9px] font-black uppercase">Center the writing</span>
                    </div>
                )}
            </div>
        </div>

        {flash && <div className="absolute inset-0 bg-white z-50 animate-out fade-out" />}
      </div>

      {/* Footer */}
      <div className="p-8 bg-white rounded-t-[3rem] shadow-2xl">
        <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar h-20 items-center justify-center">
          {capturedImages.length === 0 ? (
            <div className="flex items-center gap-2 text-slate-300">
                <ScanText className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest">Scanning Answer Sheet...</span>
            </div>
          ) : (
            capturedImages.map((img, i) => (
                <div key={i} className="relative w-12 h-16 rounded-lg border-2 border-slate-100 overflow-hidden shrink-0 shadow-lg">
                    <img src={img} className="w-full h-full object-cover" />
                </div>
            ))
          )}
        </div>

        <button
          onClick={() => onCapture(capturedImages)}
          disabled={isSubmitting || capturedImages.length === 0}
          className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl disabled:opacity-5"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : `SUBMIT ${capturedImages.length} PAGES`}
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
