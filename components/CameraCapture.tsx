"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Zap, Check, Loader2, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CameraProps {
  onCapture: (images: string[]) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

export default function CameraCapture({ onCapture, onClose, isSubmitting }: CameraProps) {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [lastCaptureTime, setLastCaptureTime] = useState(0);
  const [flash, setFlash] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      streamRef.current = stream;
    } catch (err) {
      alert("Camera access denied.");
      onClose();
    }
  };

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const now = Date.now();
    if (now - lastCaptureTime < 2500) return; // 2.5s cooldown

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImages((prev) => [...prev, dataUrl]);
    setLastCaptureTime(now);
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    if (navigator.vibrate) navigator.vibrate(100);
  }, [lastCaptureTime]);

  useEffect(() => {
    startCamera();
    const interval = setInterval(capture, 3000); // Auto-capture every 3 seconds
    return () => {
      clearInterval(interval);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [capture]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white z-[100] flex flex-col font-sans"
    >
      {/* Top Controls */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
        <button onClick={onClose} className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white"><X /></button>
        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-600 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
          <Zap className="w-3 h-3 fill-current" /> Auto-Scanning
        </div>
        <div className="bg-white/10 backdrop-blur-md px-4 py-1 rounded-full text-white font-bold text-sm">
          {capturedImages.length} Pages
        </div>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative bg-slate-100 flex items-center justify-center overflow-hidden">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <div className="absolute inset-10 border-2 border-dashed border-white/40 rounded-2xl pointer-events-none" />
        {flash && <div className="absolute inset-0 bg-white z-20" />}
      </div>

      {/* Bottom Tray */}
      <div className="p-8 bg-white rounded-t-[2.5rem] shadow-2xl">
        <div className="flex gap-3 overflow-x-auto pb-6 mb-2 no-scrollbar">
          {capturedImages.map((img, i) => (
            <div key={i} className="relative w-16 h-20 rounded-xl border-2 border-indigo-500 overflow-hidden shrink-0 shadow-md">
              <img src={img} className="w-full h-full object-cover" />
              <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] px-1.5 py-0.5 rounded-bl-lg font-bold">{i + 1}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => onCapture(capturedImages)}
          disabled={isSubmitting || capturedImages.length === 0}
          className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all disabled:bg-slate-100 disabled:text-slate-300"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : "Finish & Download PDF"}
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
