"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Check, Loader2, AlertCircle, Type } from "lucide-react";
import { motion } from "framer-motion";

export default function CameraCapture({ onCapture, onClose, isSubmitting }: any) {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  // Statuses: searching, no_paper, no_text, detected
  const [status, setStatus] = useState<string>("searching");

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
      onClose();
    }
  };

  const analyzeAndCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const vW = video.videoWidth;
    const vH = video.videoHeight;

    // 1. ANALYZE FOR TEXT DENSITY
    // We take a small sample of the center area
    canvas.width = 150; 
    canvas.height = 150;
    ctx.drawImage(video, vW * 0.25, vH * 0.25, vW * 0.50, vH * 0.50, 0, 0, 150, 150);
    
    const pixels = ctx.getImageData(0, 0, 150, 150).data;
    let inkPixels = 0;
    let paperPixels = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i+1];
      const b = pixels[i+2];
      const brightness = (r + g + b) / 3;

      if (brightness < 80) inkPixels++;    // Dark spots (Pen Ink)
      if (brightness > 180) paperPixels++; // Bright spots (White Paper)
    }

    // 2. LOGIC GATES
    if (paperPixels < 1500) {
      // Not enough white area (probably a wall or floor)
      setStatus("no_paper");
    } else if (inkPixels < 150) { 
      // Paper detected, but not enough "ink" (blank page or too blurry)
      setStatus("no_text");
    } else {
      // SUCCESS: Paper + Clear Writing Detected
      setStatus("detected");
      
      // High Res Capture
      canvas.width = 1240;
      canvas.height = 1754;
      ctx.filter = "contrast(1.5) grayscale(1) brightness(1.05)";
      ctx.drawImage(video, vW * 0.15, vH * 0.10, vW * 0.70, vH * 0.80, 0, 0, 1240, 1754);

      setCapturedImages(prev => [...prev, canvas.toDataURL("image/jpeg", 0.8)]);
      setFlash(true);
      setTimeout(() => { setFlash(false); setStatus("searching"); }, 200);
    }
  }, []);

  useEffect(() => {
    startCamera();
    const scanner = setInterval(analyzeAndCapture, 3500); // Check every 3.5s
    return () => {
      clearInterval(scanner);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [analyzeAndCapture]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black z-[100] flex flex-col font-sans">
      
      {/* Smart Status Bar */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-start z-30 pointer-events-none">
        <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl text-white pointer-events-auto active:scale-95"><X /></button>
        
        <div className="flex flex-col items-center gap-2">
            <AnimatePresence mode="wait">
                <motion.div 
                    key={status}
                    initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}
                    className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl flex items-center gap-2 ${
                        status === 'detected' ? 'bg-emerald-500 text-white' : 
                        status === 'searching' ? 'bg-white text-black' : 'bg-red-500 text-white'
                    }`}
                >
                    {status === 'searching' && "Scanning for Content..."}
                    {status === 'no_paper' && <><AlertCircle className="w-3 h-3"/> No Paper Found</>}
                    {status === 'no_text' && <><Type className="w-3 h-3"/> Writing not clear</>}
                    {status === 'detected' && <><Check className="w-3 h-3"/> Scan Complete</>}
                </motion.div>
            </AnimatePresence>
        </div>
        <div className="w-10" />
      </div>

      {/* Viewfinder Overlay */}
      <div className="flex-1 relative overflow-hidden bg-[#050505] flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-40 grayscale" />
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-10">
            <div className={`relative w-full aspect-[1/1.414] border-2 transition-all duration-500 ${
                status === 'no_text' || status === 'no_paper' ? 'border-red-500/30' : 'border-indigo-500'
            }`}>
                {/* Visual Corners */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-500" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-500" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-500" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-500" />

                {/* Warning Message Overlay */}
                {status === 'no_text' && (
                    <div className="absolute inset-0 bg-red-500/5 flex flex-col items-center justify-center gap-2 text-center px-6">
                        <Type className="text-red-500 w-10 h-10 mb-2 opacity-50" />
                        <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">Writing not detected</p>
                        <p className="text-white/40 text-[8px] font-medium leading-tight">Focus on your written answer clearly</p>
                    </div>
                )}
            </div>
        </div>

        {flash && <div className="absolute inset-0 bg-white z-50" />}
      </div>

      {/* Footer Gallery */}
      <div className="p-8 bg-white rounded-t-[3rem] shadow-2xl">
        <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar h-20 items-center justify-center">
          {capturedImages.length === 0 ? (
            <div className="text-slate-300 text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
                <Scan className="w-4 h-4" /> Align paper and writing
            </div>
          ) : (
            capturedImages.map((img, i) => (
                <div key={i} className="relative w-12 h-16 rounded-lg border-2 border-slate-50 overflow-hidden shrink-0 shadow-xl">
                    <img src={img} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 right-0 bg-indigo-600 text-white text-[8px] px-1.5 font-bold">{i + 1}</div>
                </div>
            ))
          )}
        </div>

        <button
          onClick={() => onCapture(capturedImages)}
          disabled={isSubmitting || capturedImages.length === 0}
          className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl disabled:opacity-5 transition-opacity"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : `Submit ${capturedImages.length} Pages`}
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
