"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import { Play, Camera, Download, ArrowUp, X, CheckCircle2, Clock } from "lucide-react";
import { questions } from "@/lib/questions";

export default function AnswerWritingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const q = questions.find((q) => q.id === parseInt(id));

    if (!q) return <div className="flex items-center justify-center min-h-screen text-red-400">Question not found</div>;

    const [isWriting, setIsWriting] = useState(false);
    const [time, setTime] = useState(0);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [showCamera, setShowCamera] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        if (isWriting) {
            timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isWriting]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
        const secs = (seconds % 60).toString().padStart(2, "0");
        return `${mins}:${secs}`;
    };

    const startWriting = () => {
        setIsWriting(true);
        setTime(0);
        setCapturedImages([]);
    };

    const endWriting = () => {
        setIsWriting(false);
        setShowCamera(true);
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            if (videoRef.current) videoRef.current.srcObject = stream;
            streamRef.current = stream;
        } catch (err) {
            alert("Camera access denied. Please enable it in settings.");
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0);
        setCapturedImages((prev) => [...prev, canvas.toDataURL("image/jpeg", 0.9)]);
    };

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        setShowCamera(false);
    };

    const generateAndDownloadPDF = () => {
        if (capturedImages.length === 0) return alert("No pages captured.");

        const doc = new jsPDF("p", "mm", "a4");
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();

        capturedImages.forEach((img, i) => {
            if (i > 0) doc.addPage();
            doc.addImage(img, "JPEG", 0, 0, pw, ph);
            doc.setTextColor(200, 200, 200);
            doc.setFontSize(40);
            doc.text("UPSChub", pw / 2, ph / 2, { align: "center", angle: 45 });
        });

        doc.save(`UPSChub_${new Date().getTime()}.pdf`);
        stopCamera();
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-emerald-500/30">
            <div className="max-w-2xl mx-auto px-6 py-10">

                {/* Status Bar */}
                <header className="flex justify-between items-end mb-12">
                    <div className="space-y-1">
                        <span className="text-emerald-500 font-bold tracking-widest text-[10px] uppercase">{q.chapter}</span>
                        <h1 className="text-3xl font-bold tracking-tight">Answer Writing</h1>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2 text-zinc-400 mb-1">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] uppercase font-medium">Session Time</span>
                        </div>
                        <span className={`text-4xl font-mono leading-none ${isWriting ? 'text-emerald-400' : 'text-zinc-600'}`}>
                            {formatTime(time)}
                        </span>
                    </div>
                </header>

                {/* Question Card */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
                    <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                        <p className="text-lg md:text-xl leading-relaxed text-zinc-200 font-medium italic">
                            "{q.text}"
                        </p>
                    </div>
                </div>

                {/* Action Button */}
                {!isWriting && !showCamera && (
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={startWriting}
                        className="w-full mt-12 bg-white text-black hover:bg-emerald-400 transition-colors py-6 rounded-2xl text-xl font-bold flex items-center justify-center gap-3 shadow-xl"
                    >
                        <Play fill="black" className="w-5 h-5" /> Start Attempt
                    </motion.button>
                )}

                {/* Floating End Controls */}
                <AnimatePresence>
                    {isWriting && (
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            exit={{ y: 100 }}
                            className="fixed bottom-10 left-0 right-0 px-6 z-50"
                        >
                            <div className="max-w-md mx-auto bg-zinc-900/90 backdrop-blur-xl border border-zinc-700 p-4 rounded-full flex items-center justify-between shadow-2xl">
                                <div className="flex items-center gap-4 pl-4">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                    <span className="text-sm font-semibold tracking-wide">RECORDING SESSION</span>
                                </div>
                                <button
                                    onClick={endWriting}
                                    className="bg-emerald-500 hover:bg-emerald-600 px-8 py-3 rounded-full text-sm font-bold text-black transition-all"
                                >
                                    FINISH
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Professional Camera Interface */}
                {showCamera && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-black z-[100] flex flex-col"
                    >
                        {/* Camera Header */}
                        <div className="p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
                            <button onClick={stopCamera} className="p-2 bg-white/10 rounded-full backdrop-blur-md">
                                <X className="w-6 h-6" />
                            </button>
                            <div className="bg-emerald-500/20 border border-emerald-500/50 px-4 py-1 rounded-full text-emerald-400 text-xs font-bold">
                                {capturedImages.length} PAGES READY
                            </div>
                            <button
                                onClick={generateAndDownloadPDF}
                                className="flex items-center gap-2 bg-emerald-500 text-black px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20"
                            >
                                <Download className="w-4 h-4" /> SAVE PDF
                            </button>
                        </div>

                        {/* Viewfinder */}
                        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="h-full w-full object-cover"
                                onLoadedMetadata={startCamera}
                            />
                            {/* Scanning Guide Overlay */}
                            <div className="absolute inset-10 border-2 border-white/20 rounded-lg pointer-events-none">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 -ml-1 -mt-1" />
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 -mr-1 -mt-1" />
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 -ml-1 -mb-1" />
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 -mr-1 -mb-1" />
                            </div>
                        </div>

                        {/* Shutter Section */}
                        <div className="p-10 bg-zinc-950 flex flex-col items-center gap-4">
                            <canvas ref={canvasRef} className="hidden" />
                            <button
                                onClick={capturePhoto}
                                className="group relative flex items-center justify-center"
                            >
                                <div className="absolute inset-0 bg-white/20 rounded-full scale-125 group-active:scale-110 transition-transform" />
                                <div className="w-20 h-20 bg-white rounded-full border-4 border-black flex items-center justify-center">
                                    <Camera className="text-black w-8 h-8" />
                                </div>
                            </button>
                            <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">Tap to capture page</p>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
