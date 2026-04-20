"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Download, Loader2, Camera } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (images: string[]) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

interface Point {
  x: number;
  y: number;
}

export default function CameraCapture({ onCapture, onClose, isSubmitting = false }: CameraCaptureProps) {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [documentCorners, setDocumentCorners] = useState<Point[] | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [autoMode, setAutoMode] = useState(true);

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

  // IMPROVED DOCUMENT DETECTION - FOCUS ON WHITE PAPER
  const findDocumentCorners = useCallback((): Point[] | null => {
    if (!videoRef.current || !detectionCanvasRef.current || !cameraReady) return null;

    const video = videoRef.current;
    const canvas = detectionCanvasRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return null;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    const vW = video.videoWidth;
    const vH = video.videoHeight;

    if (vW === 0 || vH === 0) return null;

    // Downsample for performance
    const scale = 0.3;
    canvas.width = Math.floor(vW * scale);
    canvas.height = Math.floor(vH * scale);
    
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      // Find white regions (paper)
      const whiteMap: boolean[][] = [];
      for (let y = 0; y < canvas.height; y++) {
        whiteMap[y] = [];
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];
          const brightness = (r + g + b) / 3;
          
          // Check if pixel is whitish (paper)
          const isWhite = brightness > 160 && 
                         Math.abs(r - g) < 30 && 
                         Math.abs(g - b) < 30 && 
                         Math.abs(r - b) < 30;
          
          whiteMap[y][x] = isWhite;
        }
      }
      
      // Find largest white rectangular region
      let maxArea = 0;
      let bestRect: { x: number, y: number, w: number, h: number } | null = null;
      
      const step = 5; // Skip pixels for speed
      for (let y = 10; y < canvas.height - 10; y += step) {
        for (let x = 10; x < canvas.width - 10; x += step) {
          if (whiteMap[y][x]) {
            // Expand rectangle from this point
            let w = 0, h = 0;
            
            // Find width
            while (x + w < canvas.width - 10 && whiteMap[y][x + w]) {
              w++;
            }
            
            // Find height
            let validHeight = true;
            while (y + h < canvas.height - 10 && validHeight) {
              for (let dx = 0; dx < w; dx++) {
                if (!whiteMap[y + h][x + dx]) {
                  validHeight = false;
                  break;
                }
              }
              if (validHeight) h++;
            }
            
            const area = w * h;
            if (area > maxArea && w > 30 && h > 40 && h / w > 1.2 && h / w < 2.0) {
              maxArea = area;
              bestRect = { x, y, w, h };
            }
          }
        }
      }
      
      if (!bestRect) return null;
      
      // Check if rectangle is large enough (at least 15% of frame)
      const minArea = (canvas.width * canvas.height) * 0.15;
      if (maxArea < minArea) return null;
      
      // Convert to corners and scale back
      const corners: Point[] = [
        { x: bestRect.x / scale, y: bestRect.y / scale },
        { x: (bestRect.x + bestRect.w) / scale, y: bestRect.y / scale },
        { x: (bestRect.x + bestRect.w) / scale, y: (bestRect.y + bestRect.h) / scale },
        { x: bestRect.x / scale, y: (bestRect.y + bestRect.h) / scale }
      ];
      
      return corners;
      
    } catch (err) {
      console.error("Detection error:", err);
      return null;
    }
  }, [cameraReady]);

  // PERSPECTIVE TRANSFORM
  const perspectiveTransform = (srcCorners: Point[], canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    // Calculate source dimensions
    const srcWidth = Math.max(
      Math.abs(srcCorners[1].x - srcCorners[0].x),
      Math.abs(srcCorners[2].x - srcCorners[3].x)
    );
    const srcHeight = Math.max(
      Math.abs(srcCorners[3].y - srcCorners[0].y),
      Math.abs(srcCorners[2].y - srcCorners[1].y)
    );
    
    // Output dimensions (maintain aspect ratio)
    const aspectRatio = srcHeight / srcWidth;
    const outputWidth = 1240;
    const outputHeight = Math.floor(outputWidth * aspectRatio);
    
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    
    // Create temporary canvas with source image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    tempCtx.drawImage(video, 0, 0);
    
    // Simple perspective correction using 4-point transform
    // Map source quad to destination rectangle
    for (let y = 0; y < outputHeight; y++) {
      for (let x = 0; x < outputWidth; x++) {
        const u = x / outputWidth;
        const v = y / outputHeight;
        
        // Bilinear interpolation
        const top = {
          x: srcCorners[0].x + (srcCorners[1].x - srcCorners[0].x) * u,
          y: srcCorners[0].y + (srcCorners[1].y - srcCorners[0].y) * u
        };
        const bottom = {
          x: srcCorners[3].x + (srcCorners[2].x - srcCorners[3].x) * u,
          y: srcCorners[3].y + (srcCorners[2].y - srcCorners[3].y) * u
        };
        
        const srcX = Math.floor(top.x + (bottom.x - top.x) * v);
        const srcY = Math.floor(top.y + (bottom.y - top.y) * v);
        
        if (srcX >= 0 && srcX < video.videoWidth && srcY >= 0 && srcY < video.videoHeight) {
          const srcPixel = tempCtx.getImageData(srcX, srcY, 1, 1);
          ctx.putImageData(srcPixel, x, y);
        }
      }
    }
    
    // Apply image enhancement
    const imageData = ctx.getImageData(0, 0, outputWidth, outputHeight);
    const data = imageData.data;
    
    // Convert to grayscale and enhance contrast
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      
      // Increase contrast
      const contrast = 1.3;
      const enhanced = ((gray - 128) * contrast) + 128;
      const clamped = Math.max(0, Math.min(255, enhanced));
      
      data[i] = data[i + 1] = data[i + 2] = clamped;
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  // AUTO DETECT DOCUMENT
  const detectDocument = useCallback(() => {
    if (!autoMode || cooldown || isCapturing) return;
    
    const corners = findDocumentCorners();
    setDocumentCorners(corners);
    
    if (corners) {
      stableFramesRef.current += 1;
      if (stableFramesRef.current >= 12) {
        captureWithCorners(corners);
        stableFramesRef.current = 0;
      }
    } else {
      stableFramesRef.current = 0;
    }
  }, [autoMode, cameraReady, cooldown, isCapturing, findDocumentCorners]);

  // MANUAL CAPTURE
  const manualCapture = () => {
    if (isCapturing || cooldown) return;
    
    const corners = documentCorners;
    if (corners) {
      captureWithCorners(corners);
    } else {
      // Fallback: use center frame
      if (!videoRef.current) return;
      const vW = videoRef.current.videoWidth;
      const vH = videoRef.current.videoHeight;
      
      const centerCorners: Point[] = [
        { x: vW * 0.15, y: vH * 0.15 },
        { x: vW * 0.85, y: vH * 0.15 },
        { x: vW * 0.85, y: vH * 0.85 },
        { x: vW * 0.15, y: vH * 0.85 }
      ];
      
      captureWithCorners(centerCorners);
    }
  };

  // CAPTURE WITH PERSPECTIVE CORRECTION
  const captureWithCorners = useCallback((corners: Point[]) => {
    if (!videoRef.current || !canvasRef.current || isCapturing || cooldown) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    setIsCapturing(true);
    
    try {
      // Apply perspective transform
      perspectiveTransform(corners, canvas, ctx);
      
      const imageData = canvas.toDataURL("image/jpeg", 0.92);
      setCapturedImages(prev => [...prev, imageData]);
      
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
      
      setCooldown(true);
      setTimeout(() => {
        setCooldown(false);
        setIsCapturing(false);
      }, 2000);
      
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
    if (cameraReady && autoMode) {
      const interval = setInterval(detectDocument, 250);
      return () => clearInterval(interval);
    }
  }, [detectDocument, cameraReady, autoMode]);

  // Convert corners for display
  const getDisplayCorners = (): Point[] | null => {
    if (!documentCorners || !videoRef.current) return null;
    
    const video = videoRef.current;
    const rect = video.getBoundingClientRect();
    const scaleX = rect.width / video.videoWidth;
    const scaleY = rect.height / video.videoHeight;
    
    return documentCorners.map(corner => ({
      x: corner.x * scaleX,
      y: corner.y * scaleY
    }));
  };

  const displayCorners = getDisplayCorners();

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
        
        <div className="flex items-center gap-2">
          {/* Auto/Manual Toggle */}
          <button
            onClick={() => setAutoMode(!autoMode)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              autoMode 
                ? 'bg-blue-600 text-white' 
                : 'bg-white/20 text-white backdrop-blur-md'
            }`}
          >
            {autoMode ? '🤖 Auto' : '👆 Manual'}
          </button>
          
          {capturedImages.length > 0 && (
            <>
              <div className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-semibold">
                {capturedImages.length}
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
            </>
          )}
        </div>
      </div>

      {/* CAMERA */}
      <div className="flex-1 relative bg-black overflow-hidden">
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* CORNER OVERLAY */}
        {displayCorners && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Border lines */}
            <line
              x1={displayCorners[0].x} y1={displayCorners[0].y}
              x2={displayCorners[1].x} y2={displayCorners[1].y}
              stroke="#3b82f6" strokeWidth="3"
              className="drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
            />
            <line
              x1={displayCorners[1].x} y1={displayCorners[1].y}
              x2={displayCorners[2].x} y2={displayCorners[2].y}
              stroke="#3b82f6" strokeWidth="3"
              className="drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
            />
            <line
              x1={displayCorners[2].x} y1={displayCorners[2].y}
              x2={displayCorners[3].x} y2={displayCorners[3].y}
              stroke="#3b82f6" strokeWidth="3"
              className="drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
            />
            <line
              x1={displayCorners[3].x} y1={displayCorners[3].y}
              x2={displayCorners[0].x} y2={displayCorners[0].y}
              stroke="#3b82f6" strokeWidth="3"
              className="drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
            />
            
            {/* Corner circles */}
            {displayCorners.map((corner, i) => (
              <g key={i}>
                <circle
                  cx={corner.x} cy={corner.y} r="18"
                  fill="rgba(59, 130, 246, 0.3)"
                  stroke="#3b82f6" strokeWidth="3"
                  className="drop-shadow-[0_0_12px_rgba(59,130,246,0.9)]"
                />
                <circle
                  cx={corner.x} cy={corner.y} r="8"
                  fill="#3b82f6"
                />
              </g>
            ))}
          </svg>
        )}

        {/* STATUS */}
        <div className="absolute bottom-[200px] w-full flex justify-center px-4">
          {isCapturing && (
            <div className="px-6 py-3 bg-black/80 backdrop-blur-lg rounded-full text-white text-sm font-medium shadow-lg">
              📸 Capturing...
            </div>
          )}
          {cooldown && !isCapturing && (
            <div className="px-6 py-3 bg-orange-500/90 backdrop-blur-lg rounded-full text-white text-sm font-medium shadow-lg">
              ⏱️ Processing...
            </div>
          )}
          {documentCorners && !isCapturing && !cooldown && autoMode && (
            <div className="px-6 py-3 bg-blue-600/90 backdrop-blur-lg rounded-full text-white text-sm font-medium shadow-lg flex items-center gap-2 animate-pulse">
              <Camera className="w-4 h-4" />
              Hold steady...
            </div>
          )}
          {!documentCorners && !isCapturing && !cooldown && cameraReady && (
            <div className="px-6 py-3 bg-black/70 backdrop-blur-lg rounded-full text-white/80 text-sm font-medium">
              {autoMode ? '📄 Position white paper in frame' : '📸 Tap capture button'}
            </div>
          )}
        </div>

        {/* MANUAL CAPTURE BUTTON */}
        {!autoMode && (
          <div className="absolute bottom-[120px] w-full flex justify-center">
            <button
              onClick={manualCapture}
              disabled={isCapturing || cooldown}
              className="w-20 h-20 rounded-full bg-white border-4 border-blue-500 shadow-2xl active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </button>
          </div>
        )}

        {/* FLASH */}
        {flash && <div className="absolute inset-0 bg-white animate-flash" />}
      </div>

      {/* GALLERY */}
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
            📄 No pages captured yet
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={detectionCanvasRef} className="hidden" />
    </div>
  );
}
