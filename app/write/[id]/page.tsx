"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import { Play, Camera, Download, X, Clock, FileText, ChevronRight } from "lucide-react";
import { questions } from "@/lib/questions";

export default function AnswerWritingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const q = questions.find((q) => q.id === parseInt(id));

    if (!q) return <div className="flex items-center justify-center min-h-screen">Question not found</div>;

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

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            if (videoRef.current) videoRef.current.srcObject = stream;
            streamRef.current = stream;
        } catch (err) {
            alert("Please allow camera access to scan your answer.");
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
        if (capturedImages.length === 0) return;
        const doc = new jsPDF("p", "mm", "a4");
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();

        capturedImages.forEach((img, i) => {
            if (i > 0) doc.addPage();
            doc.addImage(img, "JPEG", 0, 0, pw, ph);
            doc.setTextColor(220, 220, 220);
            doc.setFontSize(50);
            doc.text("UPSChub", pw / 2, ph / 2, { align: "center", angle: 45 });
        });

        doc.save(`UPSChub_Response.pdf`);
        stopCamera();
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans antialiased">
            <div className="max-w-2xl mx-auto px-6 py-8">
                
                {/* Header */}
                <header className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold italic">U</div>
                        <div>
                            <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-widest leading-tight">UPSChub</h2>
                            <p className="text-slate-400 text-[10px] font-medium uppercase tracking-tighter leading-tight">Practice Portal</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end text-slate-400 mb-0.5">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase">Timer</span>
                        </div>
                        <span className={`text-3xl font-mono tabular-nums leading-none font-medium ${isWriting ? 'text-slate-900' : 'text-slate-300'}`}>
                            {formatTime(time)}
                        </span>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
                    <div className="p-8 md:p-12">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="w-4 h-4 text-indigo-500" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{q.chapter}</span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-semibold text-slate-800 leading-snug">
                            {q.text}
                        </h3>
                    </div>

                    {!isWriting && !showCamera && (
                        <div className="p-8 pt-0">
                            <button
                                onClick={() => { setIsWriting(true); setTime(0); }}
                                className="w-full bg-slate-900 hover:bg-indigo-600 text-white transition-all duration-300 py-5 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 group shadow-lg shadow-slate-200"
                            >
                                Start Writing <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}
                </main>

                {/* Floating Action Controls */}
                <AnimatePresence>
                    {isWriting && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="fixed bottom-12 left-0 right-0 px-6 flex justify-center pointer-events-none"
                        >
                            <div className="bg-white border border-slate-200 shadow-2xl rounded-full p-2 flex items-center gap-6 pointer-events-auto">
                                <div className="flex items-center gap-3 pl-5 pr-2 border-r border-slate-100">
                                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">In Progress</span>
                                </div>
                                <button
                                    onClick={() => { setIsWriting(false); setShowCamera(true); }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-wider transition-colors shadow-md shadow-indigo-200"
                                >
                                    Finish & Scan
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Modern White Camera Overlay */}
                {showCamera && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-white z-[100] flex flex-col"
                    >
                        {/* Camera Top Bar */}
                        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100">
                            <button onClick={stopCamera} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                            <div className="text-xs font-black text-slate-800 uppercase tracking-widest">
                                Scanned: {capturedImages.length} Pages
                            </div>
                            <button 
                                onClick={generateAndDownloadPDF} 
                                disabled={capturedImages.length === 0}
                                className={`px-5 py-2 rounded-xl font-bold text-xs transition-all ${
                                    capturedImages.length > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'
                                }`}
                            >
                                DONE
                            </button>
                        </div>

                        {/* Viewfinder Area */}
                        <div className="flex-1 relative bg-slate-50 flex items-center justify-center overflow-hidden">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="h-full w-full object-cover"
                                onLoadedMetadata={startCamera}
                            />
                            {/* Scanning Guide */}
                            <div className="absolute inset-8 border border-white/40 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.2)] pointer-events-none" />
                        </div>

                        {/* Footer / Controls */}
                        <div className="p-8 bg-white flex flex-col items-center">
                            {/* Horizontal Page Gallery */}
                            {capturedImages.length > 0 && (
                                <div className="flex gap-2 mb-8 overflow-x-auto max-w-full pb-2 no-scrollbar">
                                    {capturedImages.map((img, idx) => (
                                        <div key={idx} className="relative w-12 h-16 shrink-0 border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
                                            <img src={img} className="w-full h-full object-cover" />
                                            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] px-1">{idx+1}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <canvas ref={canvasRef} className="hidden" />
                            
                            <button
                                onClick={capturePhoto}
                                className="w-20 h-20 bg-slate-900 rounded-full border-[6px] border-slate-100 flex items-center justify-center shadow-xl active:scale-90 transition-transform"
                            >
                                <Camera className="text-white w-8 h-8" />
                            </button>
                            <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Align page & Capture</p>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
