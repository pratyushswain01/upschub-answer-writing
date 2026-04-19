"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Download, Trash2, CheckCircle2, Camera, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [detectionQuality, setDetectionQuality] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stableFramesRef = useRef(0);

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

  // DETECT DOCUMENT
  const detectDocument = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraReady || cooldown) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const vW = video.videoWidth;
    const vH = video.videoHeight;

    if (vW === 0 || vH === 0) return;

    canvas.width = 300;
    canvas.height = 400;
    
    try {
      ctx.drawImage(video, vW * 0.20, vH * 0.15, vW * 0.60, vH * 0.70, 0, 0, 300, 400);
      
      const imageData = ctx.getImageData(0, 0, 300, 400);
      const pixels = imageData.data;
      
      let whitePixels = 0;
      let darkPixels = 0;
      const totalPixels = pixels.length / 4;
      
      for (let i = 0; i < pixels.length; i += 4) {
        const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        if (brightness > 180) whitePixels++;
        if (brightness < 80) darkPixels++;
      }
      
      const whiteRatio = whitePixels / totalPixels;
      const darkRatio = darkPixels / totalPixels;
      
      let quality = 0;
      if (whiteRatio > 0.35 && whiteRatio < 0.75) quality += 50;
      if (darkRatio > 0.03 && darkRatio < 0.30) quality += 50;
      
      setDetectionQuality(quality);
      const detected = quality >= 60;
      setDocumentDetected(detected);
      
      if (detected && !isCapturing) {
        stableFramesRef.current += 1;
        if (stableFramesRef.current >= 6) {
          captureImage();
          stableFramesRef.current = 0;
        }
      } else {
        stableFramesRef.current = 0;
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

      canvas.width = 1240;
      canvas.height = 1754;
      
      ctx.filter = "contrast(1.25) brightness(1.08) saturate(0)";
      ctx.drawImage(video, vW * 0.15, vH * 0.10, vW * 0.70, vH * 0.80, 0, 0, 1240, 1754);
      ctx.filter = "none";

      const imageData = canvas.toDataURL("image/jpeg", 0.92);
      setCapturedImages(prev => [...prev, imageData]);
      
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
      
      setCooldown(true);
      setTimeout(() => {
        setCooldown(false);
        setIsCapturing(false);
      }, 3000);
      
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
      const interval = setInterval(detectDocument, 300);
      return () => clearInterval(interval);
    }
  }, [detectDocument, cameraReady]);

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      {/* TOP BAR */}
      <div className="absolute top-0 w-full px-4 py-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/90 to-transparent">
        <button 
          onClick={onClose}
          className="p-2.5 bg-white/10 backdrop-blur-xl rounded-full text-white active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
        
        {capturedImages.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-white/20 backdrop-blur-xl rounded-full text-white text-xs font-bold">
              {capturedImages.length} {capturedImages.length === 1 ? 'Page' : 'Pages'}
            </div>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-5 py-1.5 bg-blue-600 rounded-full text-white text-xs font-bold flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4" />Save</>}
            </button>
          </div>
        )}
      </div>

      {/* CAMERA */}
      <div className="flex-1 relative bg-black">
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* FRAME OVERLAY */}
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className={`relative w-full max-w-md aspect-[1/1.414] border-2 transition-all ${
            documentDetected ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)]' : 'border-white/30'
          }`}>
            
            {/* CORNERS */}
            {documentDetected && (
              <>
                <div className="absolute w-6 h-6 bg-blue-500 border-[3px] border-white rounded-full -top-3 -left-3" />
                <div className="absolute w-6 h-6 bg-blue-500 border-[3px] border-white rounded-full -top-3 -right-3" />
                <div className="absolute w-6 h-6 bg-blue-500 border-[3px] border-white rounded-full -bottom-3 -left-3" />
                <div className="absolute w-6 h-6 bg-blue-500 border-[3px] border-white rounded-full -bottom-3 -right-3" />
              </>
            )}
          </div>
        </div>

        {/* STATUS */}
        <div className="absolute bottom-40 w-full flex justify-center">
          {isCapturing && (
            <div className="px-6 py-3 bg-black/80 backdrop-blur-xl rounded-full text-white text-sm font-bold">
              📸 Capturing...
            </div>
          )}
          {cooldown && !isCapturing && (
            <div className="px-6 py-3 bg-orange-500 rounded-full text-white text-sm font-bold">
              ⏱️ Wait 3 seconds...
            </div>
          )}
          {documentDetected && !isCapturing && !cooldown && (
            <div className="px-6 py-3 bg-green-500 rounded-full text-white text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Document Detected
            </div>
          )}
        </div>

        {/* FLASH */}
        {flash && <div className="absolute inset-0 bg-white" />}
      </div>

      {/* GALLERY */}
      <div className="bg-black px-4 py-4">
        {capturedImages.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto">
            {capturedImages.map((img, i) => (
              <div key={i} className="relative shrink-0">
                <div className="w-20 h-28 rounded-xl border-2 border-blue-500 overflow-hidden">
                  <img src={img} className="w-full h-full object-cover" alt={`Page ${i+1}`} />
                </div>
                <div className="absolute bottom-1 right-1 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-bold">{i + 1}</div>
                <button onClick={() => deleteImage(i)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-white/40 text-xs py-4">
            📄 Position your answer sheet
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
