import React, { useState, useEffect } from 'react';

const OpeningModal = ({ isOpen, openingData, scaleFactor, onConfirm, onCancel }) => {
    // We convert the raw CAD width to real-world meters for the UI
    const initialWidth = openingData ? (openingData.measuredWidth * scaleFactor).toFixed(2) : 0.9;
    
    const [width, setWidth] = useState(initialWidth);
    const [height, setHeight] = useState(2.1); // Default height

    // Reset values when a new opening is requested
    useEffect(() => {
        if (isOpen && openingData) {
            setWidth((openingData.measuredWidth * scaleFactor).toFixed(2));
            setHeight(openingData.type === 'WINDOW' ? 1.2 : 2.1);
        }
    }, [isOpen, openingData, scaleFactor]);

    if (!isOpen || !openingData) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm({
            ...openingData,
            finalWidth: parseFloat(width),
            finalHeight: parseFloat(height)
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-96 overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-sm font-black text-slate-200 tracking-widest uppercase flex items-center gap-2">
                        {openingData.type === 'WINDOW' ? '🪟' : '🚪'} Configure {openingData.type}
                    </h2>
                    <button onClick={onCancel} className="text-slate-400 hover:text-red-400 transition-colors">✕</button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Width (m)</label>
                            <input 
                                type="number" step="0.01" required
                                value={width} onChange={(e) => setWidth(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Height (m)</label>
                            <input 
                                type="number" step="0.01" required
                                value={height} onChange={(e) => setHeight(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-400 bg-slate-900 border border-slate-700 hover:bg-slate-700 transition-all">Cancel</button>
                        <button type="submit" className="flex-1 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-900 bg-yellow-500 hover:bg-yellow-400 transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)]">Create Opening</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OpeningModal;