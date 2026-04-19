"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Check, Loader2, AlertCircle, Type, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CameraCapture({ onCapture, onClose, isSubmitting }: any) {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [status, setStatus] = useState<string>("searching");
  const [textQuality, setTextQuality] = useState(0); // 0-100 score

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment", 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        }
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      streamRef.current = stream;
    } catch (err) {
      alert("Camera access denied");
      onClose();
    }
  };

  // ADVANCED TEXT CLARITY DETECTION
  const calculateTextSharpness = (imageData: ImageData): number => {
    const { data, width, height } = imageData;
    
    // 1. LAPLACIAN VARIANCE (Sharpness/Edge Detection)
    let variance = 0;
    const kernel = [0, 1, 0, 1, -4, 1, 0, 1, 0]; // Laplacian kernel
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let laplacian = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            laplacian += brightness * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        variance += laplacian * laplacian;
      }
    }
    
    const sharpness = variance / (width * height);
    
    // 2. TEXT STROKE DETECTION (Looking for thin lines = handwriting)
    let textPixels = 0;
    let edgePixels = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      
      // Dark pixels that could be text
      if (brightness < 100) textPixels++;
      
      // Check if pixel is on an edge (contrast change)
      if (i > width * 4) {
        const prevBrightness = (data[i - width * 4] + data[i - width * 4 + 1] + data[i - width * 4 + 2]) / 3;
        if (Math.abs(brightness - prevBrightness) > 50) edgePixels++;
      }
    }
    
    const totalPixels = data.length / 4;
    const textDensity = (textPixels / totalPixels) * 100;
    const edgeDensity = (edgePixels / totalPixels) * 100;
    
    // 3. COMBINED SCORE
    // Sharpness should be > 100 for clear text
    // Text density should be 3-30% (too little = blank, too much = noise)
    // Edge density should be 8-40% (handwriting has lots of edges)
    
    let score = 0;
    
    if (sharpness > 100) score += 30;
    else if (sharpness > 50) score += 15;
    
    if (textDensity > 3 && textDensity < 30) score += 35;
    else if (textDensity > 2 && textDensity < 35) score += 20;
    
    if (edgeDensity > 8 && edgeDensity < 40) score += 35;
    else if (edgeDensity > 5 && edgeDensity < 45) score += 20;
    
    return Math.min(100, score);
  };

  const analyzeAndCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const vW = video.videoWidth;
    const vH = video.videoHeight;

    // ANALYZE CENTER CROP (where answer should be)
    canvas.width = 300;
    canvas.height = 400;
    ctx.drawImage(
      video, 
      vW * 0.20, vH * 0.15,  // Source crop
      vW * 0.60, vH * 0.70, 
      0, 0, 300, 400         // Destination
    );
    
    const imageData = ctx.getImageData(0, 0, 300, 400);
    
    // GET TEXT QUALITY SCORE
    const quality = calculateTextSharpness(imageData);
    setTextQuality(quality);
    
    // DECISION LOGIC
    if (quality < 40) {
      setStatus("no_paper");
    } else if (quality < 70) {
      setStatus("no_text");
    } else {
      // ✅ HIGH QUALITY TEXT DETECTED
      setStatus("detected");
      
      // CAPTURE HIGH-RES IMAGE
      canvas.width = 1240;
      canvas.height = 1754;
      ctx.filter = "contrast(1.3) brightness(1.1)";
      ctx.drawImage(
        video, 
        vW * 0.15, vH * 0.10, 
        vW * 0.70, vH * 0.80, 
        0, 0, 1240, 1754
      );

      setCapturedImages(prev => [...prev, canvas.toDataURL("image/jpeg", 0.85)]);
      setFlash(true);
      setTimeout(() => { 
        setFlash(false); 
        setStatus("searching"); 
      }, 250);
    }
  }, []);

  useEffect(() => {
    startCamera();
    const scanner = setInterval(analyzeAndCapture, 2000); // Scan every 2 seconds
    return () => {
      clearInterval(scanner);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [analyzeAndCapture]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 bg-black z-[100] flex flex-col"
    >
      
      {/* TOP BAR */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-start z-30">
        <button 
          onClick={onClose} 
          className="p-3 bg-white/20 backdrop-blur-xl rounded-2xl text-white active:scale-95 transition-transform"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col items-center gap-2">
          <AnimatePresence mode="wait">
            <motion.div 
              key={status}
              initial={{ y: -10, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 10, opacity: 0 }}
              className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all shadow-2xl flex items-center gap-2 ${
                status === 'detected' ? 'bg-green-500 text-white' : 
                status === 'searching' ? 'bg-white text-black' : 
                'bg-red-500 text-white'
              }`}
            >
              {status === 'searching' && "Scanning..."}
              {status === 'no_paper' && <><AlertCircle className="w-3 h-3"/> No Document</>}
              {status === 'no_text' && <><Type className="w-3 h-3"/> Text Not Clear</>}
              {status === 'detected' && <><Check className="w-3 h-3"/> Captured!</>}
            </motion.div>
          </AnimatePresence>
          
          {/* QUALITY METER */}
          <div className="w-32 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              className={`h-full transition-all duration-300 ${
                textQuality > 70 ? 'bg-green-400' : 
                textQuality > 40 ? 'bg-yellow-400' : 
                'bg-red-400'
              }`}
              style={{ width: `${textQuality}%` }}
            />
          </div>
        </div>
        
        <div className="w-11" /> {/* Spacer */}
      </div>

      {/* CAMERA VIEW */}
      <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        
        {/* OVERLAY FRAME */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
          <div className={`relative w-full max-w-md aspect-[1/1.414] border-2 rounded-lg transition-all duration-300 ${
            status === 'detected' ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)]' : 
            status === 'no_text' || status === 'no_paper' ? 'border-red-400' : 
            'border-white/40'
          }`}>
            
            {/* CORNER MARKERS */}
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />

            {/* ERROR OVERLAY */}
            {(status === 'no_text' || status === 'no_paper') && (
              <div className="absolute inset-0 bg-red-500/10 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 px-6 text-center">
                {status === 'no_paper' ? (
                  <>
                    <FileText className="text-red-400 w-12 h-12 opacity-80" />
                    <p className="text-red-400 text-xs font-bold uppercase tracking-wider">
                      No Document Found
                    </p>
                    <p className="text-white/60 text-[10px] leading-tight">
                      Position your written answer inside the frame
                    </p>
                  </>
                ) : (
                  <>
                    <Type className="text-yellow-400 w-12 h-12 opacity-80" />
                    <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider">
                      Writing Not Clear
                    </p>
                    <p className="text-white/60 text-[10px] leading-tight">
                      Ensure handwriting is visible and in focus
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FLASH EFFECT */}
        {flash && <div className="absolute inset-0 bg-white animate-pulse" />}
      </div>

      {/* BOTTOM GALLERY & SUBMIT */}
      <div className="p-6 bg-gradient-to-t from-black via-black/95 to-transparent">
        <div className="flex gap-3 overflow-x-auto pb-4 mb-4">
          {capturedImages.length === 0 ? (
            <div className="w-full text-center text-white/40 text-[10px] font-semibold uppercase tracking-widest py-6">
              Align your answer sheet clearly
            </div>
          ) : (
            capturedImages.map((img, i) => (
              <div key={i} className="relative w-14 h-20 rounded-lg border-2 border-white/20 overflow-hidden shrink-0 shadow-xl">
                <img src={img} className="w-full h-full object-cover" alt={`Page ${i+1}`} />
                <div className="absolute bottom-1 right-1 bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded font-bold">
                  {i + 1}
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={() => onCapture(capturedImages)}
          disabled={isSubmitting || capturedImages.length === 0}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-wider shadow-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin mx-auto" />
          ) : (
            `Submit ${capturedImages.length} Page${capturedImages.length !== 1 ? 's' : ''}`
          )}
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
