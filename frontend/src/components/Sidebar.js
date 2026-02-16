import React from 'react';

const Sidebar = ({ 
    walls, 
    deleteWall, 
    updateHeight, 
    updateThickness, 
    onHoverWall,
    globalThickness, 
    setGlobalThickness, 
    globalHeight, 
    setGlobalHeight,
    // Ortho/Snap props kept for compatibility
    ortho, setOrtho, isSnapping, setIsSnapping,
    scaleFactor,     
    setScaleFactor,
    
    // --- NEW PROPS ---
    isCalibrated, 
    onStartCalibration,
    onUnlockScale
}) => {
  
  return (
    <div className="w-[380px] bg-white border-l border-slate-200 z-30 flex flex-col shadow-2xl h-full font-sans">

      {/* --- TOP SECTION: SETTINGS --- */}
      <div className="bg-slate-50 border-b border-slate-200 z-20 shadow-sm">
        
        {/* 1. SCALE CALIBRATION (CONDITIONAL UI) */}
        {isCalibrated ? (
            /* --- LOCKED STATE (Green) --- */
            <div className="px-4 py-3 border-b border-slate-200 bg-green-50/50">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1">
                        <span>🔒</span> Scale Locked
                    </h2>
                    <button 
                        onClick={onUnlockScale}
                        className="text-[9px] font-bold text-slate-400 hover:text-red-500 underline decoration-dotted cursor-pointer"
                        title="Click to reset scale"
                    >
                        UNLOCK
                    </button>
                </div>

                <div className="flex items-center justify-between bg-white border border-green-200 rounded px-3 py-2 shadow-sm">
                    <div className="flex flex-col">
                         <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Current Factor</span>
                         <span className="text-xs font-mono font-bold text-slate-700">{scaleFactor.toFixed(6)}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold border border-green-200">
                        ✓
                    </div>
                </div>
            </div>
        ) : (
            /* --- UNLOCKED STATE (Purple Button) --- */
            <div className="px-4 py-3 border-b border-slate-200 bg-purple-50/50">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1">
                        <span>📏</span> Calibrate Scale
                    </h2>
                    <div className="text-[9px] font-mono text-slate-400">Current: {scaleFactor ? scaleFactor.toFixed(5) : '1.0'}</div>
                </div>

                <button 
                    onClick={onStartCalibration}
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold py-2 rounded shadow-sm transition-all active:scale-95 uppercase tracking-wide"
                >
                    <span>🎯</span> Pick Dimension on Plan
                </button>
                <p className="text-[9px] text-purple-400/80 text-center mt-1.5 leading-tight">
                    Click 2 points on the plan, then enter the REAL length.
                </p>
            </div>
        )}

        {/* 2. DEFAULT SETTINGS (Unchanged) */}
        <div className="px-4 py-3">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <span>⚙️</span> Default Wall Measurements
            </h2>

            <div className="flex gap-3">
                <div className="flex-1">
                    <label className="text-[9px] font-bold text-slate-400 block mb-0.5">DEF. THICKNESS (m)</label>
                    <input 
                        type="number" 
                        step="0.01"
                        value={globalThickness}
                        onChange={(e) => setGlobalThickness(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-700 outline-none h-7 focus:border-blue-400"
                    />
                </div>
                <div className="flex-1">
                    <label className="text-[9px] font-bold text-slate-400 block mb-0.5">DEF. HEIGHT (m)</label>
                    <input 
                        type="number" 
                        step="0.1"
                        value={globalHeight}
                        onChange={(e) => setGlobalHeight(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-700 outline-none h-7 focus:border-blue-400"
                    />
                </div>
            </div>
        </div>
      </div>

      {/* --- WALL LIST (Unchanged) --- */}
      <div className="flex-1 overflow-y-auto bg-slate-100/50">
        <div className="px-4 py-2 border-b border-slate-200 sticky top-0 bg-slate-100/95 backdrop-blur-sm z-10 flex justify-between items-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Walls</h3>
            <span className="text-[9px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 rounded">{walls.length}</span>
        </div>

        <div className="p-3 space-y-2">
            {walls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 opacity-60">
                <div className="text-2xl mb-1">✏️</div>
                <p className="text-xs">No Walls Drawn</p>
            </div>
            ) : (
            walls.map((wall, i) => (
                <div 
                    key={wall.id} 
                    className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all overflow-hidden group"
                    onMouseEnter={() => onHoverWall(wall.id)}
                    onMouseLeave={() => onHoverWall(null)}
                >
                {/* Wall Header */}
                <div className="flex justify-between items-center px-3 py-1.5 bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-blue-500 transition-colors"></div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase">Wall {i + 1}</span>
                    </div>
                    <button 
                        onClick={() => deleteWall(wall.id)} 
                        className="text-slate-300 hover:text-red-500 transition-colors px-1"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Wall Inputs */}
                <div className="px-3 py-2 flex gap-2">
                    <div className="flex-1">
                        <label className="text-[8px] font-bold text-slate-400 block mb-0.5">HEIGHT (m)</label>
                        <input 
                            type="number" 
                            step="0.1"
                            value={wall.height} 
                            onChange={(e) => updateHeight(wall.id, e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-blue-400 focus:bg-white transition-all h-6"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-[8px] font-bold text-slate-400 block mb-0.5">THICK (m)</label>
                        <input 
                            type="number" 
                            step="0.01"
                            value={wall.thickness} 
                            onChange={(e) => updateThickness(wall.id, e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-blue-400 focus:bg-white transition-all h-6"
                        />
                    </div>
                </div>
                
                {/* Wall Footer */}
                <div className="px-3 py-1 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[9px]">
                    <span className="font-mono text-slate-500">📏 {wall.length.toFixed(2)}m</span>
                    <span className="font-bold text-slate-400 uppercase">{wall.justification}</span>
                </div>
                </div>
            ))
            )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;