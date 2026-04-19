"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Download, Trash2, CheckCircle2, Camera, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CameraCaptureProps {
  onCapture: (images: string[]) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export default function CameraCapture({ onCapture, onClose, isSubmitting = false }: CameraCaptureProps) {
  // STATE MANAGEMENT
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [documentDetected, setDocumentDetected] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const [detectionQuality, setDetectionQuality] = useState(0);

  // REFS
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stableFramesRef = useRef(0);

  // CAMERA INITIALIZATION
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
        await videoRef.current.play();
      }
      
      streamRef.current = stream;
      setCameraError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Camera access denied";
      setCameraError(errorMessage);
      console.error("Camera error:", err);
    }
  };

  // DOCUMENT DETECTION ALGORITHM
  const detectDocument = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || cooldown) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Safety checks
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const vW = video.videoWidth;
    const vH = video.videoHeight;

    // Analyze center region (where document should be)
    const sampleWidth = 300;
    const sampleHeight = 400;
    
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    
    try {
      ctx.drawImage(
        video,
        vW * 0.20, vH * 0.15,  // Start position
        vW * 0.60, vH * 0.70,  // Width/height to sample
        0, 0, sampleWidth, sampleHeight
      );
      
      const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
      const pixels = imageData.data;
      
      let whitePixels = 0;
      let darkPixels = 0;
      let mediumPixels = 0;
      const totalPixels = pixels.length / 4;
      
      // Analyze pixel brightness distribution
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const brightness = (r + g + b) / 3;
        
        if (brightness > 180) whitePixels++;      // Paper background
        else if (brightness < 80) darkPixels++;   // Text/ink
        else mediumPixels++;                       // Shadows/mid-tones
      }
      
      const whiteRatio = whitePixels / totalPixels;
      const darkRatio = darkPixels / totalPixels;
      const mediumRatio = mediumPixels / totalPixels;
      
      // Quality scoring (0-100)
      let quality = 0;
      
      // Good paper detection (40-70% white)
      if (whiteRatio > 0.40 && whiteRatio < 0.75) quality += 40;
      else if (whiteRatio > 0.30 && whiteRatio < 0.80) quality += 20;
      
      // Text presence (3-25% dark pixels)
      if (darkRatio > 0.03 && darkRatio < 0.25) quality += 40;
      else if (darkRatio > 0.02 && darkRatio < 0.30) quality += 20;
      
      // Reasonable mid-tones (not too much shadow)
      if (mediumRatio < 0.40) quality += 20;
      
      setDetectionQuality(quality);
      
      // Document is "detected" if quality > 60
      const detected = quality >= 60;
      setDocumentDetected(detected);
      
      // Stability tracking for auto-capture
      if (detected && !isCapturing) {
        stableFramesRef.current += 1;
        
        // Auto-capture after 6 stable frames (~2 seconds at 300ms intervals)
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
  }, [cooldown, isCapturing]);

  // IMAGE CAPTURE
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isCapturing || cooldown) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) return;
    
    setIsCapturing(true);
    
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");

      const vW = video.videoWidth;
      const vH = video.videoHeight;

      // High-resolution capture
      canvas.width = 1240;
      canvas.height = 1754;
      
      // Document enhancement filters
      ctx.filter = "contrast(1.25) brightness(1.08) saturate(0)"; // Grayscale + enhance
      ctx.drawImage(
        video,
        vW * 0.15, vH * 0.10,
        vW * 0.70, vH * 0.80,
        0, 0, 1240, 1754
      );
      
      ctx.filter = "none"; // Reset filter

      const imageData = canvas.toDataURL("image/jpeg", 0.92);
      
      // Add to gallery
      setCapturedImages(prev => [...prev, imageData]);
      
      // Flash effect
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
      
      // Cooldown period (prevent rapid captures)
      setCooldown(true);
      setTimeout(() => {
        setCooldown(false);
        setIsCapturing(false);
      }, 3000); // 3 second cooldown
      
    } catch (err) {
      console.error("Capture error:", err);
      setIsCapturing(false);
    }
  }, [isCapturing, cooldown]);

  // Delete captured image
  const deleteImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  // LIFECYCLE MANAGEMENT
  useEffect(() => {
    startCamera();
    
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  // Start detection loop after camera loads
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      detectionIntervalRef.current = setInterval(detectDocument, 300);
      
      return () => {
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
        }
      };
    }
  }, [detectDocument, streamRef.current]);

  // Handle save
  const handleSave = () => {
    if (capturedImages.length > 0 && !isSubmitting) {
      onCapture(capturedImages);
    }
  };

  // ERROR STATE
  if (cameraError) {
    return (
      <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
        <div className="text-center px-6">
          <Camera className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-white text-lg font-bold mb-2">Camera Error</h3>
          <p className="text-white/60 text-sm mb-6">{cameraError}</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white/10 text-white rounded-full font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-[100] flex flex-col font-sans"
    >
      {/* TOP BAR */}
      <div className="absolute top-0 w-full px-4 py-4 flex justify-between items-center z-40 bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        <button 
          onClick={onClose}
          disabled={isSubmitting}
          className="p-2.5 bg-white/10 backdrop-blur-xl rounded-full text-white active:scale-95 transition-transform disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* PAGE COUNT + SAVE */}
        <AnimatePresence>
          {capturedImages.length > 0 && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, x: 20 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0.8, opacity: 0, x: 20 }}
              className="flex items-center gap-2"
            >
              <div className="px-3.5 py-1.5 bg-white/15 backdrop-blur-xl rounded-full text-white text-xs font-bold border border-white/10">
                {capturedImages.length} {capturedImages.length === 1 ? 'Page' : 'Pages'}
              </div>
              <button
                onClick={handleSave}
                disabled={isSubmitting || capturedImages.length === 0}
                className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-full text-white text-xs font-bold flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Save
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CAMERA VIEWPORT */}
      <div className="flex-1 relative overflow-hidden bg-black">
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* DETECTION OVERLAY */}
        <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
          <div className={`relative w-full max-w-md aspect-[1/1.414] transition-all duration-300 ${
            documentDetected 
              ? 'border-2 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.4)]' 
              : 'border-2 border-white/30'
          }`}>
            
            {/* CORNER MARKERS */}
            <AnimatePresence>
              {documentDetected && (
                <>
                  {[
                    { pos: "top-left", style: { top: -12, left: -12 } },
                    { pos: "top-right", style: { top: -12, right: -12 } },
                    { pos: "bottom-left", style: { bottom: -12, left: -12 } },
                    { pos: "bottom-right", style: { bottom: -12, right: -12 } }
                  ].map((corner, i) => (
                    <motion.div
                      key={corner.pos}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="absolute w-6 h-6 bg-blue-500 border-[3px] border-white rounded-full shadow-lg"
                      style={corner.style}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>

            {/* QUALITY INDICATOR */}
            <div className="absolute -bottom-8 left-0 right-0 flex justify-center">
              <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full transition-all duration-300 ${
                    detectionQuality > 70 ? 'bg-green-500' :
                    detectionQuality > 40 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${detectionQuality}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* STATUS MESSAGES */}
        <div className="absolute bottom-40 w-full flex justify-center pointer-events-none px-6">
          <AnimatePresence mode="wait">
            {isCapturing ? (
              <motion.div
                key="capturing"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="px-6 py-3 bg-black/80 backdrop-blur-xl rounded-full text-white text-sm font-semibold border border-white/20"
              >
                📸 Capturing... hold steady
              </motion.div>
            ) : cooldown ? (
              <motion.div
                key="cooldown"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="px-6 py-3 bg-orange-600/90 backdrop-blur-xl rounded-full text-white text-sm font-semibold flex items-center gap-2"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing... wait 3 sec
              </motion.div>
            ) : documentDetected ? (
              <motion.div
                key="detected"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="px-6 py-3 bg-green-600/90 backdrop-blur-xl rounded-full text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-green-600/30"
              >
                <CheckCircle2 className="w-4 h-4" />
                Document detected
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* FLASH EFFECT */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-white pointer-events-none"
            />
          )}
        </AnimatePresence>
      </div>

      {/* GALLERY STRIP */}
      <div className="bg-gradient-to-t from-black via-black/95 to-black/80 px-4 py-4 border-t border-white/10">
        <AnimatePresence mode="sync">
          {capturedImages.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex gap-3 overflow-x-auto pb-2 no-scrollbar"
            >
              {capturedImages.map((img, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative shrink-0 group"
                >
                  <div className="w-20 h-28 rounded-xl border-2 border-blue-500/50 overflow-hidden shadow-xl bg-white">
                    <img 
                      src={img} 
                      className="w-full h-full object-cover" 
                      alt={`Page ${i + 1}`}
                    />
                  </div>
                  
                  {/* PAGE NUMBER */}
                  <div className="absolute bottom-1 right-1 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-md font-bold shadow-lg">
                    {i + 1}
                  </div>
                  
                  {/* DELETE BUTTON */}
                  <button
                    onClick={() => deleteImage(i)}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6 text-white/40 text-xs font-medium"
            >
              📄 Position your answer sheet within the frame
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
