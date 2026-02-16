import React, { useState, useEffect } from 'react';

const CalibrationModal = ({ isOpen, onClose, onConfirm, measuredValue }) => {
  const [realLength, setRealLength] = useState('');

  useEffect(() => { if (isOpen) setRealLength(''); }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-80 overflow-hidden p-5">
        <h3 className="text-purple-600 font-bold uppercase text-xs mb-4">📏 Calibrate Scale</h3>
        
        <div className="mb-4 bg-slate-100 p-2 rounded border border-slate-200">
           <span className="text-xs text-slate-500 block">Viewer Measured:</span>
           <span className="font-mono font-bold text-lg">{measuredValue.toFixed(4)} units</span>
        </div>

        <label className="text-xs font-bold text-slate-500 block mb-1">Enter Actual Length (Meters):</label>
        <input 
          type="number" autoFocus placeholder="e.g. 3.5"
          value={realLength} onChange={(e) => setRealLength(e.target.value)}
          className="w-full border-2 border-purple-200 focus:border-purple-600 rounded p-2 mb-4 outline-none font-bold text-lg"
        />

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
          <button 
            onClick={() => { if(realLength) onConfirm(parseFloat(realLength)); }}
            className="flex-1 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded shadow-md"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
export default CalibrationModal;