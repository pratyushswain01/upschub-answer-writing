"use client";

import React, { useState } from "react";
import jsPDF from "jspdf";
import { Camera } from "lucide-react";
import { questions } from "@/lib/questions";
import CameraCapture from "@/components/CameraCapture"; // Import the component

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const q = questions.find((q) => q.id === parseInt(id));
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFinalSubmit = async (images: string[]) => {
    setLoading(true);
    const doc = new jsPDF("p", "mm", "a4");
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    images.forEach((img, i) => {
      if (i > 0) doc.addPage();
      doc.addImage(img, "JPEG", 0, 0, pw, ph);
      doc.setTextColor(220);
      doc.setFontSize(40);
      doc.text("UPSChub", pw / 2, ph / 2, { align: "center", angle: 45 });
    });

    doc.save("UPSChub_Answer.pdf");
    setLoading(false);
    setShowCamera(false);
  };

  if (!q) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{q.chapter}</h1>
        <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 italic text-slate-600 text-lg">
          "{q.text}"
        </div>
        
        <button
          onClick={() => setShowCamera(true)}
          className="mx-auto w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center shadow-xl shadow-indigo-100 hover:scale-110 transition-transform group"
        >
          <Camera className="text-white w-10 h-10 group-hover:rotate-12 transition-transform" />
        </button>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Open Scanner</p>
      </div>

      {showCamera && (
        <CameraCapture 
          onCapture={handleFinalSubmit} 
          onClose={() => setShowCamera(false)} 
          isSubmitting={loading} 
        />
      )}
    </div>
  );
}
