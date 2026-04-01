"use client";
import React, { useState } from 'react';
import { Send, Sparkles, Loader2, Bot, FileText, Check } from 'lucide-react';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { jsPDF } from 'jspdf';

export default function BrainstormChat({ trends = [] }: { trends?: any[] }) {
  const { activeBrand } = useActiveBrand();
  const [input, setInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const handleChat = async () => {
    if (!input.trim() || !activeBrand) return;
    const userMsg = { role: 'user', content: input };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/ai/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedHistory, brandData: activeBrand, trends })
      });
      const data = await res.json();
      let responseContent = data.content;
      const match = responseContent.match(/\[GENERATE_IMAGE:\s*([\s\S]*?)\]/);
      if (match && match[1]) {
         const imagePrompt = match[1].replace(/^["']|["']$/g, '');
         window.dispatchEvent(new CustomEvent('generateVisual', { detail: imagePrompt }));
         // Remove the tag from the displayed text
         responseContent = responseContent.replace(/\[GENERATE_IMAGE:[\s\S]*?\]/, '').trim();
      }

      setChatHistory(p => [...p, { role: 'assistant', content: responseContent }]);
    } catch (err) {
      setChatHistory(p => [...p, { role: 'assistant', content: "Unable to reach brainstorm service." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleDownloadIdea = (text: string) => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const brandName = activeBrand?.company_name || "Omni Orchestrator";

      doc.setFillColor(18, 18, 18);
      doc.rect(0, 0, 210, 297, 'F');
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, 210, 4, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("BRAINSTORMED IDEA FILE", 20, 20);

      doc.setFontSize(28);
      doc.setTextColor(240, 240, 240);
      doc.text(brandName.toUpperCase(), 20, 35);

      // Add Content
      let cursorY = 55;
      const lines = doc.splitTextToSize(text, 170);
      lines.forEach((line: string) => {
        if (cursorY > 280) {
          doc.addPage();
          doc.setFillColor(18, 18, 18);
          doc.rect(0, 0, 210, 297, 'F');
          cursorY = 20;
        }
        
        if (line.includes("VIDEO IDEA FILE:")) {
          doc.setFontSize(14);
          doc.setTextColor(16, 185, 129);
        } else if (line.trim().startsWith("**") && line.trim().endsWith("**")) {
          doc.setFontSize(12);
          doc.setTextColor(255, 255, 255);
        } else {
          doc.setFontSize(10);
          doc.setTextColor(200, 200, 200);
        }
        doc.text(line.replace(/\*\*/g, ''), 20, cursorY);
        cursorY += 6;
      });

      doc.save(`${brandName.replace(/\s+/g, '_')}_Brainstorm.pdf`);
    } catch (err) {
      console.error("PDF Export failed", err);
    }
  };

  if (!activeBrand) return null;

  return (
    <div className="flex flex-col h-full bg-black/20 overflow-hidden relative group">
      <div className="p-6 border-b border-white/5 flex items-center justify-between z-10 sticky top-0 bg-zinc-950/80 backdrop-blur-3xl">
        <div className="flex gap-3 items-center">
            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <Bot size={16} className="text-purple-500" />
            </div>
            <div>
              <span className="text-xs font-black uppercase italic tracking-widest text-white">Brainstorm Agent</span>
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Co-Pilot Mode</p>
            </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
        {chatHistory.length === 0 && (
           <div className="flex flex-col items-center justify-center h-full gap-4 text-center opacity-70">
              <Sparkles className="text-purple-500 opacity-50" size={48} />
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 shadow-md">Bounce campaign ideas <br/> Save the winners as Idea Files</p>
           </div>
        )}
        
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-6 rounded-[2rem] text-xs leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-purple-500 text-black font-semibold rounded-br-none' : 'bg-white/5 border border-white/10 text-zinc-300 rounded-bl-none'}`}>
              <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
              
              {msg.role === 'assistant' && msg.content.includes('VIDEO IDEA FILE') && (
                <button 
                  onClick={() => handleDownloadIdea(msg.content)}
                  className="mt-4 flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-4 py-2 rounded-xl transition-all w-full justify-center group/btn"
                >
                  <FileText size={14} className="group-hover/btn:scale-110 transition-transform" />
                  <span className="text-[9px] font-bold font-mono uppercase tracking-[0.2em]">Save Idea File</span>
                </button>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
             <div className="max-w-[80%] p-4 rounded-[2rem] rounded-bl-none bg-white/5 border border-white/10 flex gap-2 items-center text-purple-500">
                <Loader2 className="animate-spin" size={14} /> 
                <span className="text-[9px] font-mono uppercase tracking-widest">Synthesizing...</span>
             </div>
          </div>
        )}
      </div>
      
      <div className="p-6 border-t border-white/5 flex gap-4 bg-zinc-950/80 backdrop-blur-3xl sticky bottom-0 z-10 w-full">
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && handleChat()} 
          placeholder={`Brainstorm for ${activeBrand.company_name}...`} 
          className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-purple-500/50 text-white placeholder:text-zinc-700" 
        />
        <button 
          onClick={handleChat} 
          disabled={!input.trim() || isTyping}
          className="bg-purple-500 p-4 rounded-2xl text-black hover:bg-purple-400 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
