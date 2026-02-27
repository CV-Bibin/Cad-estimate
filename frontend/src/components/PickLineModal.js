import React from 'react';

const PickLineModal = ({ isOpen, data, onConfirm, onCancel, defaultThickness, defaultHeight }) => {
    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 w-[320px] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-blue-600 px-4 py-3 flex items-center gap-2">
                    <span className="text-lg">🧱</span>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Create Auto-Wall</h3>
                </div>
                
                <div className="p-5 space-y-4">
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Detected Length</span>
                        <span className="text-xl font-mono font-bold text-blue-400">{data.length.toFixed(3)} m</span>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Thickness</label>
                            <input disabled defaultValue={defaultThickness} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none" />
                        </div>
                        <div className="flex-1">
                            <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Height</label>
                            <input disabled defaultValue={defaultHeight} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none" />
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-800/30 flex gap-2">
                    <button onClick={onCancel} className="flex-1 py-2 text-[10px] font-bold text-slate-400 hover:bg-slate-700 rounded-xl transition-all uppercase">Cancel</button>
                    <button onClick={onConfirm} className="flex-1 py-2 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-900/20 transition-all uppercase">Create Wall</button>
                </div>
            </div>
        </div>
    );
};

export default PickLineModal;