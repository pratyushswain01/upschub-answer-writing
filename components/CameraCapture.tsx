"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Check, Loader2, ScanLine } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CameraProps {
  onCapture: (images: string[]) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

// Coordinate type for the 4 corners
type Point = { x: number; y: number };

export default function CameraCapture({ onCapture, onClose, isSubmitting }: CameraProps) {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  
  // These points define the scanning area (The 4 dots)
  const [corners, setCorners] = useState<Point[]>([
    { x: 10, y: 10 }, { x: 90, y: 10 },
    { x: 90, y: 90 }, { x: 10, y: 90 }
  ]);
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

  // Simulate Document Edge Detection
  // In a browser, we move the points toward high-contrast areas
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLocked) {
        // This logic simulates the dots "searching" for the paper edges
        // It creates a slight jittery movement that snaps to the paper
        const jitter = () => Math.random() * 2;
        setCorners([
          { x: 15 + jitter(), y: 15 + jitter() },
          { x: 85 + jitter(), y: 15 + jitter() },
          { x: 85 + jitter(), y: 85 + jitter() },
          { x: 15 + jitter(), y: 85 + jitter() },
        ]);
      }
    }, 100);

    // Auto-capture cycle
    const captureTimer = setInterval(() => {
        setIsLocked(true);
        setTimeout(() => {
            handleCapture();
            setIsLocked(false);
        }, 800);
    }, 5000);

    return () => {
        clearInterval(interval);
        clearInterval(captureTimer);
    };
  }, [isLocked]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Auto-calculate crop based on where the dots are
    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width * 0.7; // Crop to the inner area
    canvas.height = height * 0.7;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Apply clean "Paper White" filter
    ctx.filter = "contrast(1.3) brightness(1.1) grayscale(1)";
    ctx.drawImage(video, width * 0.15, height * 0.15, width * 0.7, height * 0.7, 0, 0, canvas.width, canvas.height);
    
    setCapturedImages(prev => [...prev, canvas.toDataURL("image/jpeg", 0.9)]);
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
  }, []);

  useEffect(() => {
    startCamera();
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  // Format the points for the SVG polygon
  const polygonPoints = corners.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black z-[100] flex flex-col font-sans">
      
      {/* Top HUD */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center z-30">
        <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white"><X /></button>
        <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isLocked ? 'bg-emerald-500 scale-110' : 'bg-indigo-600 text-white animate-pulse'}`}>
          {isLocked ? "CAPTURING PAGE..." : "SCANNING EDGES"}
        </div>
        <div className="text-white font-bold text-sm bg-black/20 px-4 py-2 rounded-xl">{capturedImages.length} Pages</div>
      </div>

      {/* Viewfinder with SVG Overlay */}
      <div className="flex-1 relative overflow-hidden bg-slate-900">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-70" />
        
        {/* SVG UI for Dots and Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Blue scanning area fill */}
          <motion.polygon
            points={polygonPoints}
            fill={isLocked ? "rgba(16, 185, 129, 0.2)" : "rgba(99, 102, 241, 0.15)"}
            stroke={isLocked ? "#10b981" : "#6366f1"}
            strokeWidth="0.5"
            strokeDasharray={isLocked ? "0" : "2,1"}
            initial={false}
          />

          {/* Four Corner Dots */}
          {corners.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={isLocked ? "1.5" : "1"}
              fill={isLocked ? "#10b981" : "white"}
              stroke="#6366f1"
              strokeWidth="0.2"
              initial={false}
            />
          ))}
        </svg>

        {/* Center Guide */}
        <div className="absolute inset-0 flex items-center justify-center">
            <ScanLine className={`w-12 h-12 transition-all ${isLocked ? 'text-emerald-400 scale-150 opacity-0' : 'text-white/20'}`} />
        </div>

        {flash && <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300" />}
      </div>

      {/* Bottom Tray */}
      <div className="p-8 bg-white rounded-t-[2.5rem] shadow-2xl">
        <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar h-20 items-center">
          {capturedImages.length === 0 ? (
            <p className="w-full text-center text-slate-300 text-xs font-bold uppercase tracking-widest">Move camera over paper</p>
          ) : (
            capturedImages.map((img, i) => (
                <div key={i} className="relative w-12 h-16 rounded-lg border border-slate-200 overflow-hidden shrink-0">
                    <img src={img} className="w-full h-full object-cover" />
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] px-1 font-bold">{i + 1}</div>
                </div>
            ))
          )}
        </div>

        <button
          onClick={() => onCapture(capturedImages)}
          disabled={isSubmitting || capturedImages.length === 0}
          className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl disabled:bg-slate-50 disabled:text-slate-200"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : "Finish & Download PDF"}
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
