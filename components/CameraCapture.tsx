"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Download, Trash2, Camera, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CameraCapture({ onCapture, onClose, isSubmitting }: any) {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [documentDetected, setDocumentDetected] = useState(false);
  const [corners, setCorners] = useState<{tl: [number, number], tr: [number, number], bl: [number, number], br: [number, number]} | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment", 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (err) {
      alert("Camera access denied");
      onClose();
    }
  };

  // SIMPLIFIED PAPER DETECTION
  const detectDocument = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const vW = video.videoWidth;
    const vH = video.videoHeight;
    
    if (vW === 0 || vH === 0) return;

    // Sample the center region
    canvas.width = 200;
    canvas.height = 280;
    
    ctx.drawImage(
      video, 
      vW * 0.20, vH * 0.15,
      vW * 0.60, vH * 0.70,
      0, 0, 200, 280
    );
    
    const imageData = ctx.getImageData(0, 0, 200, 280);
    const pixels = imageData.data;
    
    let whitePixels = 0;
    let darkPixels = 0;
    let totalPixels = pixels.length / 4;
    
    // Count white (paper) and dark (text/ink) pixels
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const brightness = (r + g + b) / 3;
      
      if (brightness > 170) whitePixels++; // White paper
      if (brightness < 100) darkPixels++;   // Dark text/ink
    }
    
    const whiteRatio = whitePixels / totalPixels;
    const darkRatio = darkPixels / totalPixels;
    
    // Document detected if:
    // - High white area (paper background)
    // - Some dark pixels (writing/content)
    const detected = whiteRatio > 0.35 && darkRatio > 0.03 && darkRatio < 0.40;
    
    setDocumentDetected(detected);
    
    // Set corner positions for overlay (relative to overlay container)
    if (detected && overlayRef.current) {
      const rect = overlayRef.current.getBoundingClientRect();
      const padding = 40; // 10 units from design
      
      setCorners({
        tl: [padding, padding],
        tr: [rect.width - padding, padding],
        bl: [padding, rect.height - padding],
        br: [rect.width - padding, rect.height - padding]
      });
    } else {
      setCorners(null);
    }
    
  }, []);

  // AUTO-CAPTURE when document is stable
  useEffect(() => {
    let stableFrames = 0;
    let captureTimeout: NodeJS.Timeout;
    
    const checkStability = () => {
      if (documentDetected && !isCapturing) {
        stableFrames++;
        
        // If stable for 5 frames (~1.5 seconds), auto-capture
        if (stableFrames >= 5) {
          captureImage();
          stableFrames = 0;
        }
      } else {
        stableFrames = 0;
      }
    };
    
    captureTimeout = setInterval(checkStability, 300);
    
    return () => clearInterval(captureTimeout);
  }, [documentDetected, isCapturing]);

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;
    
    setIsCapturing(true);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const vW = video.videoWidth;
    const vH = video.videoHeight;

    // HIGH-RES CAPTURE
    canvas.width = 1240;
    canvas.height = 1754;
    
    // Apply document enhancement
    ctx.filter = "contrast(1.2) brightness(1.05)";
    ctx.drawImage(
      video,
      vW * 0.15, vH * 0.10,
      vW * 0.70, vH * 0.80,
      0, 0, 1240, 1754
    );

    const imageData = canvas.toDataURL("image/jpeg", 0.90);
    setCapturedImages(prev => [...prev, imageData]);
    
    // Flash effect
    setFlash(true);
    setTimeout(() => {
      setFlash(false);
      setIsCapturing(false);
      setDocumentDetected(false);
    }, 300);
  };

  const deleteImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    startCamera();
    const scanner = setInterval(detectDocument, 300); // Check every 300ms
    
    return () => {
      clearInterval(scanner);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [detectDocument]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 bg-black z-[100] flex flex-col"
    >
      {/* TOP BAR */}
      <div className="absolute top-0 w-full px-4 py-3 flex justify-between items-center z-30 bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={onClose} 
          className="p-2.5 bg-white/10 backdrop-blur-md rounded-full text-white active:scale-95 transition-transform"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* PAGE COUNT + SAVE BUTTON */}
        {capturedImages.length > 0 && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold">
              {capturedImages.length} {capturedImages.length === 1 ? 'Page' : 'Pages'}
            </div>
            <button
              onClick={() => onCapture(capturedImages)}
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-full text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Save
                </>
              )}
            </button>
          </motion.div>
        )}
      </div>

      {/* CAMERA VIEW */}
      <div className="flex-1 relative overflow-hidden bg-black">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted
          className="w-full h-full object-cover"
        />
        
        {/* OVERLAY WITH CORNER DETECTION */}
        <div 
          ref={overlayRef}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          {/* DETECTION FRAME */}
          <div className={`relative w-[85%] aspect-[1/1.414] transition-all duration-300 ${
            documentDetected ? 'border-2 border-blue-500' : 'border-2 border-white/30'
          }`}>
            
            {/* CORNER DOTS (Adobe Scan Style) */}
            <AnimatePresence>
              {corners && documentDetected && (
                <>
                  {/* Top Left */}
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute w-5 h-5 bg-blue-500 border-3 border-white rounded-full shadow-lg"
                    style={{ 
                      left: -10, 
                      top: -10,
                    }}
                  />
                  
                  {/* Top Right */}
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute w-5 h-5 bg-blue-500 border-3 border-white rounded-full shadow-lg"
                    style={{ 
                      right: -10, 
                      top: -10,
                    }}
                  />
                  
                  {/* Bottom Left */}
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute w-5 h-5 bg-blue-500 border-3 border-white rounded-full shadow-lg"
                    style={{ 
                      left: -10, 
                      bottom: -10,
                    }}
                  />
                  
                  {/* Bottom Right */}
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute w-5 h-5 bg-blue-500 border-3 border-white rounded-full shadow-lg"
                    style={{ 
                      right: -10, 
                      bottom: -10,
                    }}
                  />
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* STATUS MESSAGE */}
        <div className="absolute bottom-32 w-full flex justify-center pointer-events-none">
          <AnimatePresence mode="wait">
            {isCapturing && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="px-6 py-3 bg-black/80 backdrop-blur-md rounded-full text-white text-sm font-medium"
              >
                Capturing... hold steady
              </motion.div>
            )}
            {documentDetected && !isCapturing && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="px-6 py-3 bg-green-600/90 backdrop-blur-md rounded-full text-white text-sm font-medium flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Document detected
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* FLASH EFFECT */}
        {flash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white"
          />
        )}
      </div>

      {/* BOTTOM GALLERY */}
      <div className="bg-black/95 backdrop-blur-md px-4 py-3 border-t border-white/10">
        {capturedImages.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {capturedImages.map((img, i) => (
              <motion.div 
                key={i}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative shrink-0"
              >
                <div className="w-16 h-20 rounded-lg border-2 border-blue-500 overflow-hidden shadow-lg">
                  <img src={img} className="w-full h-full object-cover" alt={`Page ${i+1}`} />
                </div>
                
                {/* PAGE NUMBER */}
                <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                  {i + 1}
                </div>
                
                {/* DELETE BUTTON */}
                <button
                  onClick={() => deleteImage(i)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-white/40 text-xs">
            Position document within the frame
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
