"use client";

import React from "react";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import { Play, Camera, Download, ArrowUp, X } from "lucide-react";
import { questions } from "@/lib/questions";

export default function AnswerWritingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);   // ← This is the fix
    const q = questions.find((q) => q.id === parseInt(id));

    if (!q) return <div className="text-center py-20 text-red-400">Question not found</div>;

    const [isWriting, setIsWriting] = useState(false);
    const [time, setTime] = useState(0);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [showCamera, setShowCamera] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Timer
    useEffect(() => {
        if (isWriting) {
            timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isWriting]);

    const formatTime = (seconds: number) =>
        `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

    const startWriting = () => {
        setIsWriting(true);
        setTime(0);
        setCapturedImages([]);
    };

    const endWriting = () => {
        setIsWriting(false);
        setShowCamera(true);
    };

    // Camera
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });
            if (videoRef.current) videoRef.current.srcObject = stream;
            streamRef.current = stream;
        } catch (err) {
            alert("Camera permission denied. Please allow access.");
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.95);
        setCapturedImages((prev) => [...prev, imageData]);
    };

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        setShowCamera(false);
    };

    const generateAndDownloadPDF = () => {
        if (capturedImages.length === 0) {
            alert("Please capture at least one page");
            return;
        }

        const doc = new jsPDF("p", "mm", "a4");
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        capturedImages.forEach((imgData, index) => {
            if (index > 0) doc.addPage();
            doc.addImage(imgData, "JPEG", 10, 15, 190, 0);

            // UPSChub Watermark
            doc.setTextColor(220, 220, 220);
            doc.setFontSize(55);
            doc.text("UPSChub", pageWidth / 2, pageHeight / 2 + 20, { align: "center", angle: 45 });

            doc.setFontSize(14);
            doc.setTextColor(180, 180, 180);
            doc.text("UPSChub - UPSC Answer Writing Practice", pageWidth / 2, pageHeight - 15, { align: "center" });
        });

        doc.save(`UPSChub_Answer_${q.chapter.replace(/\s+/g, "_")}.pdf`);
        alert("PDF downloaded successfully!");
        stopCamera();
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-4">
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <p className="text-emerald-400 text-sm">{q.chapter}</p>
                        <h1 className="text-xl font-semibold">Answer Writing</h1>
                    </div>
                    <div className="text-3xl font-mono text-emerald-400 tabular-nums">
                        {formatTime(time)}
                    </div>
                </div>

                {/* Question */}
                <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 mb-8 text-lg leading-relaxed">
                    {q.text}
                </div>

                {/* Start Button */}
                {!isWriting && !showCamera && (
                    <button
                        onClick={startWriting}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 py-5 rounded-2xl text-lg font-medium flex items-center justify-center gap-3"
                    >
                        <Play className="w-6 h-6" /> Start Writing
                    </button>
                )}

                {/* Swipe Up Area */}
                {isWriting && (
                    <motion.div
                        drag="y"
                        dragConstraints={{ top: -150, bottom: 0 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y < -100) endWriting();
                        }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-3xl px-8 py-5 flex items-center gap-4 shadow-2xl z-50 cursor-grab active:cursor-grabbing"
                    >
                        <ArrowUp className="w-6 h-6 text-emerald-400" />
                        <span className="text-lg">Swipe up to End Answer</span>
                        <button
                            onClick={endWriting}
                            className="ml-auto bg-red-600 px-6 py-2 rounded-2xl text-sm font-medium"
                        >
                            End
                        </button>
                    </motion.div>
                )}

                {/* Camera Modal */}
                {showCamera && (
                    <div className="fixed inset-0 bg-black z-50 flex flex-col">
                        <div className="p-4 bg-zinc-900 flex justify-between">
                            <button onClick={stopCamera} className="text-red-500">Cancel</button>
                            <div>Captured: {capturedImages.length}</div>
                            <button onClick={generateAndDownloadPDF} className="text-emerald-500">
                                Download PDF
                            </button>
                        </div>

                        <div className="flex-1 relative bg-black">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                                onLoadedMetadata={startCamera}
                            />
                            <canvas ref={canvasRef} className="hidden" />
                        </div>

                        <div className="p-6 bg-zinc-900">
                            <button
                                onClick={capturePhoto}
                                className="w-full bg-white text-black py-5 rounded-2xl font-medium flex items-center justify-center gap-3 text-lg"
                            >
                                <Camera className="w-6 h-6" /> Capture Page
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}