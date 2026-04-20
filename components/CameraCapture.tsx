"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Download, Loader2, ZoomIn } from "lucide-react";

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

  // FIND DOCUMENT CORNERS
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
    const scale = 0.25;
    canvas.width = vW * scale;
    canvas.height = vH * scale;
    
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Convert to grayscale and apply edge detection
      const gray = new Uint8ClampedArray(canvas.width * canvas.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const avg = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
        gray[i / 4] = avg;
      }

      // Apply Gaussian blur
      const blurred = gaussianBlur(gray, canvas.width, canvas.height);
      
      // Sobel edge detection
      const edges = sobelEdgeDetection(blurred, canvas.width, canvas.height);
      
      // Find contours
      const corners = findLargestQuadrilateral(edges, canvas.width, canvas.height);
      
      if (corners) {
        // Scale back to original video dimensions
        return corners.map(p => ({
          x: p.x / scale,
          y: p.y / scale
        }));
      }
      
      return null;
    } catch (err) {
      console.error("Corner detection error:", err);
      return null;
    }
  }, [cameraReady]);

  // GAUSSIAN BLUR
  const gaussianBlur = (data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray => {
    const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
    const kernelSum = 16;
    const output = new Uint8ClampedArray(data.length);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx);
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            sum += data[idx] * kernel[kernelIdx];
          }
        }
        output[y * width + x] = sum / kernelSum;
      }
    }
    
    return output;
  };

  // SOBEL EDGE DETECTION
  const sobelEdgeDetection = (data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray => {
    const output = new Uint8ClampedArray(data.length);
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx);
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            gx += data[idx] * sobelX[kernelIdx];
            gy += data[idx] * sobelY[kernelIdx];
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        output[y * width + x] = magnitude > 50 ? 255 : 0;
      }
    }
    
    return output;
  };

  // FIND LARGEST QUADRILATERAL
  const findLargestQuadrilateral = (edges: Uint8ClampedArray, width: number, height: number): Point[] | null => {
    // Simple contour detection - find edge pixels
    const edgePoints: Point[] = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (edges[y * width + x] > 0) {
          edgePoints.push({ x, y });
        }
      }
    }
    
    if (edgePoints.length < 100) return null;
    
    // Find approximate corners using grid sampling
    const gridSize = 20;
    const density: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
    
    for (const point of edgePoints) {
      const gx = Math.floor((point.x / width) * gridSize);
      const gy = Math.floor((point.y / height) * gridSize);
      if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
        density[gy][gx]++;
      }
    }
    
    // Find corners based on edge density
    const corners: Point[] = [];
    const margin = 2;
    
    // Top-left
    let maxDensity = 0;
    let topLeft = { x: 0, y: 0 };
    for (let y = margin; y < gridSize / 2; y++) {
      for (let x = margin; x < gridSize / 2; x++) {
        if (density[y][x] > maxDensity) {
          maxDensity = density[y][x];
          topLeft = { x: (x / gridSize) * width, y: (y / gridSize) * height };
        }
      }
    }
    corners.push(topLeft);
    
    // Top-right
    maxDensity = 0;
    let topRight = { x: width, y: 0 };
    for (let y = margin; y < gridSize / 2; y++) {
      for (let x = gridSize / 2; x < gridSize - margin; x++) {
        if (density[y][x] > maxDensity) {
          maxDensity = density[y][x];
          topRight = { x: (x / gridSize) * width, y: (y / gridSize) * height };
        }
      }
    }
    corners.push(topRight);
    
    // Bottom-right
    maxDensity = 0;
    let bottomRight = { x: width, y: height };
    for (let y = gridSize / 2; y < gridSize - margin; y++) {
      for (let x = gridSize / 2; x < gridSize - margin; x++) {
        if (density[y][x] > maxDensity) {
          maxDensity = density[y][x];
          bottomRight = { x: (x / gridSize) * width, y: (y / gridSize) * height };
        }
      }
    }
    corners.push(bottomRight);
    
    // Bottom-left
    maxDensity = 0;
    let bottomLeft = { x: 0, y: height };
    for (let y = gridSize / 2; y < gridSize - margin; y++) {
      for (let x = margin; x < gridSize / 2; x++) {
        if (density[y][x] > maxDensity) {
          maxDensity = density[y][x];
          bottomLeft = { x: (x / gridSize) * width, y: (y / gridSize) * height };
        }
      }
    }
    corners.push(bottomLeft);
    
    // Validate corners form a reasonable quadrilateral
    const area = calculateQuadrilateralArea(corners);
    const minArea = (width * height) * 0.1; // At least 10% of frame
    
    if (area < minArea) return null;
    
    return corners;
  };

  // CALCULATE QUADRILATERAL AREA
  const calculateQuadrilateralArea = (corners: Point[]): number => {
    if (corners.length !== 4) return 0;
    
    // Shoelace formula
    let area = 0;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      area += corners[i].x * corners[j].y;
      area -= corners[j].x * corners[i].y;
    }
    
    return Math.abs(area) / 2;
  };

  // PERSPECTIVE TRANSFORM
  const perspectiveTransform = (srcCorners: Point[], canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    if (!videoRef.current) return;
    
    // Calculate output dimensions (A4 aspect ratio)
    const outputWidth = 1654;
    const outputHeight = 2339;
    
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    
    // Destination corners (rectangular output)
    const dstCorners = [
      { x: 0, y: 0 },
      { x: outputWidth, y: 0 },
      { x: outputWidth, y: outputHeight },
      { x: 0, y: outputHeight }
    ];
    
    // Simple bilinear interpolation
    const video = videoRef.current;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    tempCtx.drawImage(video, 0, 0);
    const srcImageData = tempCtx.getImageData(0, 0, video.videoWidth, video.videoHeight);
    
    const destImageData = ctx.createImageData(outputWidth, outputHeight);
    
    for (let y = 0; y < outputHeight; y++) {
      for (let x = 0; x < outputWidth; x++) {
        // Map destination pixel to source using bilinear interpolation
        const u = x / outputWidth;
        const v = y / outputHeight;
        
        // Bilinear interpolation of corners
        const top = {
          x: srcCorners[0].x * (1 - u) + srcCorners[1].x * u,
          y: srcCorners[0].y * (1 - u) + srcCorners[1].y * u
        };
        const bottom = {
          x: srcCorners[3].x * (1 - u) + srcCorners[2].x * u,
          y: srcCorners[3].y * (1 - u) + srcCorners[2].y * u
        };
        
        const srcX = Math.floor(top.x * (1 - v) + bottom.x * v);
        const srcY = Math.floor(top.y * (1 - v) + bottom.y * v);
        
        if (srcX >= 0 && srcX < video.videoWidth && srcY >= 0 && srcY < video.videoHeight) {
          const srcIdx = (srcY * video.videoWidth + srcX) * 4;
          const destIdx = (y * outputWidth + x) * 4;
          
          destImageData.data[destIdx] = srcImageData.data[srcIdx];
          destImageData.data[destIdx + 1] = srcImageData.data[srcIdx + 1];
          destImageData.data[destIdx + 2] = srcImageData.data[srcIdx + 2];
          destImageData.data[destIdx + 3] = 255;
        }
      }
    }
    
    ctx.putImageData(destImageData, 0, 0);
    
    // Apply image enhancement
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'contrast(1.2) brightness(1.05) saturate(0)';
    const enhanced = ctx.getImageData(0, 0, outputWidth, outputHeight);
    ctx.filter = 'none';
    ctx.putImageData(enhanced, 0, 0);
  };

  // DETECT DOCUMENT
  const detectDocument = useCallback(() => {
    if (cooldown || isCapturing) return;
    
    const corners = findDocumentCorners();
    setDocumentCorners(corners);
    
    if (corners) {
      stableFramesRef.current += 1;
      if (stableFramesRef.current >= 10) {
        captureImage(corners);
        stableFramesRef.current = 0;
      }
    } else {
      stableFramesRef.current = 0;
    }
  }, [cameraReady, cooldown, isCapturing, findDocumentCorners]);

  // CAPTURE IMAGE WITH PERSPECTIVE CORRECTION
  const captureImage = useCallback((corners: Point[]) => {
    if (!videoRef.current || !canvasRef.current || isCapturing || cooldown) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    setIsCapturing(true);
    
    try {
      // Apply perspective transform
      perspectiveTransform(corners, canvas, ctx);
      
      const imageData = canvas.toDataURL("image/jpeg", 0.95);
      setCapturedImages(prev => [...prev, imageData]);
      
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
      
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
      const interval = setInterval(detectDocument, 300);
      return () => clearInterval(interval);
    }
  }, [detectDocument, cameraReady]);

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
        <div className="absolute bottom-[180px] w-full flex justify-center px-4">
          {isCapturing && (
            <div className="px-6 py-3 bg-black/80 backdrop-blur-lg rounded-full text-white text-sm font-medium shadow-lg">
              📸 Capturing...
            </div>
          )}
          {cooldown && !isCapturing && (
            <div className="px-6 py-3 bg-orange-500/90 backdrop-blur-lg rounded-full text-white text-sm font-medium shadow-lg">
              ⏱️ Wait 2.5s
            </div>
          )}
          {documentCorners && !isCapturing && !cooldown && (
            <div className="px-6 py-3 bg-blue-600/90 backdrop-blur-lg rounded-full text-white text-sm font-medium shadow-lg flex items-center gap-2 animate-pulse">
              <ZoomIn className="w-4 h-4" />
              Capturing... hold steady
            </div>
          )}
          {!documentCorners && !isCapturing && !cooldown && cameraReady && (
            <div className="px-6 py-3 bg-black/70 backdrop-blur-lg rounded-full text-white/80 text-sm font-medium">
              Position document in frame
            </div>
          )}
        </div>

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
            📄 Position your document within the frame
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={detectionCanvasRef} className="hidden" />
    </div>
  );
}
