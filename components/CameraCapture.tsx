"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Download, Trash2, Loader2, ZoomIn } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (images: string[]) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export default function CameraCapture({ onCapture, onClose, isSubmitting = false }: CameraCaptureProps) {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [documentDetected, setDocumentDetected] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [detectionStrength, setDetectionStrength] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stableFramesRef = useRef(0);
  const detectionCanvasRef = useRef<HTMLCanvasElement>(null);

  // START CAMERA
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
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setCameraReady(true);
          });
        };
      }
      
      streamRef.current = stream;
    } catch (err) {
      console.error("Camera error:", err);
      alert("Cannot access camera. Please allow camera permissions.");
      onClose();
    }
  };

  // ADVANCED DOCUMENT DETECTION
  const detectDocument = useCallback(() => {
    if (!videoRef.current || !detectionCanvasRef.current || !cameraReady || cooldown) return;

    const video = videoRef.current;
    const canvas = detectionCanvasRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const vW = video.videoWidth;
    const vH = video.videoHeight;

    if (vW === 0 || vH === 0) return;

    // Sample region of interest
    const roiX = vW * 0.15;
    const roiY = vH * 0.10;
    const roiW = vW * 0.70;
    const roiH = vH * 0.80;

    canvas.width = 320;
    canvas.height = 480;
    
    try {
      ctx.drawImage(video, roiX, roiY, roiW, roiH, 0, 0, 320, 480);
      
      const imageData = ctx.getImageData(0, 0, 320, 480);
      const pixels = imageData.data;
      
      // Multi-factor detection
      let whitePixels = 0;
      let darkPixels = 0;
      let edgePixels = 0;
      const totalPixels = pixels.length / 4;
      
      // Edge detection using simple gradient
      for (let y = 1; y < 479; y++) {
        for (let x = 1; x < 319; x++) {
          const idx = (y * 320 + x) * 4;
          const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
          
          if (brightness > 200) whitePixels++;
          if (brightness < 60) darkPixels++;
          
          // Check gradient
          const rightIdx = (y * 320 + (x + 1)) * 4;
          const bottomIdx = ((y + 1) * 320 + x) * 4;
          
          const rightBright = (pixels[rightIdx] + pixels[rightIdx + 1] + pixels[rightIdx + 2]) / 3;
          const bottomBright = (pixels[bottomIdx] + pixels[bottomIdx + 1] + pixels[bottomIdx + 2]) / 3;
          
          const gradX = Math.abs(brightness - rightBright);
          const gradY = Math.abs(brightness - bottomBright);
          
          if (gradX > 30 || gradY > 30) edgePixels++;
        }
      }
      
      const whiteRatio = whitePixels / totalPixels;
      const darkRatio = darkPixels / totalPixels;
      const edgeRatio = edgePixels / totalPixels;
      
      let quality = 0;
      
      // Paper should have good white content
      if (whiteRatio > 0.30 && whiteRatio < 0.80) quality += 35;
      
      // Some text/dark content
      if (darkRatio > 0.05 && darkRatio < 0.40) quality += 35;
      
      // Document edges
      if (edgeRatio > 0.03 && edgeRatio < 0.15) quality += 30;
      
      setDetectionStrength(quality);
      const detected = quality >= 70;
      setDocumentDetected(detected);
      
      if (detected && !isCapturing) {
        stableFramesRef.current += 1;
        if (stableFramesRef.current >= 8) {
          captureImage();
          stableFramesRef.current = 0;
        }
      } else {
        stableFramesRef.current = Math.max(0, stableFramesRef.current - 1);
      }
    } catch (err) {
      console.error("Detection error:", err);
    }
  }, [cameraReady, cooldown, isCapturing]);

  // CAPTURE IMAGE
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isCapturing || cooldown) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    setIsCapturing(true);
    
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const vW = video.videoWidth;
      const vH = video.videoHeight;

      // High quality capture
      canvas.width = 1654;
      canvas.height = 2339;
      
      // Image enhancement
      ctx.filter = "contrast(1.15) brightness(1.05) saturate(0)";
      ctx.drawImage(video, vW * 0.12, vH * 0.08, vW * 0.76, vH * 0.84, 0, 0, 1654, 2339);
      ctx.filter = "none";

      const imageData = canvas.toDataURL("image/jpeg", 0.95);
      setCapturedImages(prev => [...prev, imageData]);
      
      // Flash effect
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
      
      // Cooldown period
      setCooldown(true);
      setTimeout(() => {
        setCooldown(false);
        setIsCapturing(false);
      }, 2500);
      
    } catch (err) {
      console.error("Capture error:", err);
      setIsCapturing(false);
    }
  }, [isCapturing, cooldown]);

  const deleteImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (capturedImages.length > 0) {
      onCapture(capturedImages);
    }
  };

  useEffect(() => {
    startCamera();
    
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    if (cameraReady) {
      const interval = setInterval(detectDocument, 250);
      return () => clearInterval(interval);
    }
  }, [detectDocument, cameraReady]);

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      {/* TOP BAR */}
      <div className="absolute top-0 w-full px-4 py-3 flex justify-between items-center z-50 bg-gradient-to-b from-black/95 via-black/60 to-transparent">
        <button 
          onClick={onClose}
          className="p-2 bg-white/15 backdrop-blur-md rounded-full text-white active:scale-95 transition-transform"
          disabled={isSubmitting}
        >
          <X className="w-6 h-6" />
        </button>
        
        {capturedImages.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-semibold">
              {capturedImages.length} {capturedImages.length === 1 ? 'Page' : 'Pages'}
            </div>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 rounded-full text-white text-sm font-semibold flex items-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* CAMERA VIEWPORT */}
      <div className="flex-1 relative bg-black overflow-hidden">
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* DOCUMENT DETECTION OVERLAY - ADOBE STYLE */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-[85%] max-w-md aspect-[1/1.414]">
            
            {/* HOLLOW RING CORNERS - ALWAYS VISIBLE LIKE ADOBE */}
            <div className={`absolute -top-3 -left-3 w-12 h-12 rounded-full transition-all duration-300 ${
              documentDetected 
                ? 'border-4 border-blue-500 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.6)]' 
                : 'border-[3px] border-white/60 bg-transparent'
            }`}>
              <div className={`absolute inset-[6px] rounded-full ${
                documentDetected ? 'bg-blue-500' : 'bg-transparent'
              }`} />
            </div>
            
            <div className={`absolute -top-3 -right-3 w-12 h-12 rounded-full transition-all duration-300 ${
              documentDetected 
                ? 'border-4 border-blue-500 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.6)]' 
                : 'border-[3px] border-white/60 bg-transparent'
            }`}>
              <div className={`absolute inset-[6px] rounded-full ${
                documentDetected ? 'bg-blue-500' : 'bg-transparent'
              }`} />
            </div>
            
            <div className={`absolute -bottom-3 -left-3 w-12 h-12 rounded-full transition-all duration-300 ${
              documentDetected 
                ? 'border-4 border-blue-500 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.6)]' 
                : 'border-[3px] border-white/60 bg-transparent'
            }`}>
              <div className={`absolute inset-[6px] rounded-full ${
                documentDetected ? 'bg-blue-500' : 'bg-transparent'
              }`} />
            </div>
            
            <div className={`absolute -bottom-3 -right-3 w-12 h-12 rounded-full transition-all duration-300 ${
              documentDetected 
                ? 'border-4 border-blue-500 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.6)]' 
                : 'border-[3px] border-white/60 bg-transparent'
            }`}>
              <div className={`absolute inset-[6px] rounded-full ${
                documentDetected ? 'bg-blue-500' : 'bg-transparent'
              }`} />
            </div>

            {/* DETECTION BORDER GLOW */}
            <div className={`absolute inset-0 border-2 rounded-sm transition-all duration-300 ${
              documentDetected 
                ? 'border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.5)]' 
                : 'border-white/30'
            }`} />
          </div>
        </div>

        {/* STATUS MESSAGE - ADOBE STYLE */}
        <div className="absolute bottom-[180px] w-full flex justify-center px-4">
          {isCapturing && (
            <div className="px-6 py-3 bg-black/80 backdrop-blur-lg rounded-full text-white text-sm font-medium shadow-lg">
              📸 Capturing...
            </div>
          )}
          {cooldown && !isCapturing && (
            <div className="px-6 py-3 bg-orange-500/90 backdrop-blur-lg rounded-full text-white text-sm font-medium shadow-lg">
              ⏱️ Wait 2.5s before next capture
            </div>
          )}
          {documentDetected && !isCapturing && !cooldown && (
            <div className="px-6 py-3 bg-blue-600/90 backdrop-blur-lg rounded-full text-white text-sm font-medium shadow-lg flex items-center gap-2 animate-pulse">
              <ZoomIn className="w-4 h-4" />
              Capturing... hold steady
            </div>
          )}
          {!documentDetected && !isCapturing && !cooldown && cameraReady && (
            <div className="px-6 py-3 bg-black/70 backdrop-blur-lg rounded-full text-white/80 text-sm font-medium">
              Position document in frame
            </div>
          )}
        </div>

        {/* FLASH EFFECT */}
        {flash && (
          <div className="absolute inset-0 bg-white animate-flash" />
        )}
      </div>

      {/* BOTTOM GALLERY */}
      <div className="bg-black/95 backdrop-blur-xl px-4 py-4 border-t border-white/10">
        {capturedImages.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {capturedImages.map((img, i) => (
              <div key={i} className="relative shrink-0">
                <div className="w-24 h-32 rounded-lg border-2 border-blue-500 overflow-hidden shadow-lg">
                  <img src={img} className="w-full h-full object-cover" alt={`Page ${i+1}`} />
                </div>
                <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-lg">
                  {i + 1}
                </div>
                <button 
                  onClick={() => deleteImage(i)} 
                  className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-white/50 text-sm py-6">
            📄 Position your document within the frame
          </div>
        )}
      </div>

      {/* HIDDEN CANVASES */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={detectionCanvasRef} className="hidden" />
    </div>
  );
}
