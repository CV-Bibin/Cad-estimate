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
    onUnlockScale,
    isViewLocked,
    setIsViewLocked,
    deleteOpening,
    updateOpeningParams,
    onHoverOpening
}) => {



    // 🌟 Calculate beautiful names (Window 1, Window 2, Door 1) right before rendering
    const typeCounters = {};
    const wallsWithNamedOpenings = walls.map(w => {
        if (!w.openings) return w;
        return {
            ...w,
            openings: w.openings.map(op => {
                if (!typeCounters[op.type]) typeCounters[op.type] = 0;
                typeCounters[op.type]++;
                return { ...op, displayName: `${op.type} ${typeCounters[op.type]}` };
            })
        };
    });

    return (
        <div className="w-[380px] bg-white border-l border-slate-200 z-30 flex flex-col shadow-2xl h-full font-sans">

            {/* --- TOP SECTION: SETTINGS --- */}
            <div className="bg-slate-50 border-b border-slate-200 z-20 shadow-sm">

                {/* OPTIMIZED COMPACT ROW: 30% Lock / 70% Calibrate */}
                <div className="px-3 py-3 border-b border-slate-200 bg-slate-100/30">
                    <div className="flex gap-2 items-stretch h-12">

                        {/* 1. COMPACT VIEW LOCK (30% Width) */}
                        <button
                            onClick={() => setIsViewLocked(!isViewLocked)}
                            className={`w-[30%] flex flex-col items-center justify-center rounded-xl border transition-all active:scale-95
              ${isViewLocked
                                    ? 'bg-red-500 text-white border-red-600 shadow-inner'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                            title={isViewLocked ? "Unlock Navigation" : "Lock View"}
                        >
                            <span className="text-sm">{isViewLocked ? '🔒' : '🔓'}</span>
                            <span className="text-[7px] font-black uppercase tracking-tighter mt-0.5">
                                {isViewLocked ? 'Locked' : 'Lock'}
                            </span>
                        </button>

                        {/* 2. PROMINENT CALIBRATION (70% Width) */}
                        <div className="flex-1">
                            {isCalibrated ? (
                                <div className="h-full flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-green-600 uppercase tracking-tighter">Scale Locked</span>
                                        <span className="text-[11px] font-mono font-bold text-green-700 leading-none">{scaleFactor.toFixed(4)}</span>
                                    </div>
                                    <button
                                        onClick={onUnlockScale}
                                        className="p-1.5 hover:bg-green-100 rounded-lg transition-colors"
                                        title="Reset Scale"
                                    >
                                        <span className="text-[10px] text-green-600 grayscale hover:grayscale-0 transition-all">🔄</span>
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={onStartCalibration}
                                    className="w-full h-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md transition-all active:scale-95 group"
                                >
                                    <span className="text-base group-hover:rotate-12 transition-transform">📏</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Calibrate Plan</span>
                                </button>
                            )}
                        </div>

                    </div>
                </div>

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

            {/* --- WALL LIST --- */}
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
                                <div className="px-3 py-2 bg-slate-50/80 border-t border-slate-100 flex justify-between items-end">

                                    {/* 📏 MEDIUM LENGTH BADGE */}
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 ml-0.5">
                                            Total Length
                                        </span>
                                        <div className="bg-blue-50/80 text-blue-700 px-2 py-1 rounded border border-blue-100 flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                            <span className="text-blue-400 text-xs grayscale-[30%]">📏</span>
                                            <div className="flex items-baseline">
                                                <span className="text-sm font-black tracking-tight leading-none">
                                                    {wall.length.toFixed(2)}
                                                </span>
                                                <span className="text-[9px] font-bold ml-0.5 opacity-60">m</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ↔️ MEDIUM ALIGN BADGE */}
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 mr-0.5">
                                            Align
                                        </span>
                                        <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                            {wall.justification}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* --- OPENINGS LIST SECTION --- */}
                <div className="px-4 mt-6 mb-2 flex items-center gap-2">
                    <div className="h-[1px] flex-1 bg-slate-300"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Openings</span>
                    <div className="h-[1px] flex-1 bg-slate-300"></div>
                </div>

                <div className="p-3 space-y-3 mb-6">
            {wallsWithNamedOpenings.map(wall => (
                wall.openings && wall.openings.length > 0 && wall.openings.map((op, index) => (
                    <div 
                        key={op.id} 
                        // 🌟 HOVER EVENTS ADDED HERE
                        onMouseEnter={() => onHoverOpening(op.id)}
                        onMouseLeave={() => onHoverOpening(null)}
                        className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-yellow-400 hover:bg-yellow-50/30 transition-all cursor-pointer"
                    >

                        {/* Opening Header */}
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1.5">
                                <span className="text-sm">{op.type === 'WINDOW' ? '🪟' : op.type === 'GRILL' ? '🟨' : '🚪'}</span>
                                {/* 🌟 UNIQUE DISPLAY NAME USED HERE */}
                                {op.displayName} <span className="text-slate-400 opacity-60">(Wall {walls.findIndex(w => w.id === wall.id) + 1})</span>
                            </span>
                            <button
                                onClick={() => deleteOpening(wall.id, op.id)}
                                className="text-slate-300 hover:text-red-500 transition-colors"
                                title="Delete Opening"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Opening Dimensions Inputs */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                                <span className="text-[8px] font-bold text-slate-400 uppercase block text-center">Width</span>
                                <input
                                    type="number" step="0.01" value={op.width}
                                    onChange={(e) => updateOpeningParams(wall.id, op.id, 'width', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-1 text-[10px] font-bold text-slate-700 text-center outline-none focus:border-yellow-400 focus:bg-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[8px] font-bold text-slate-400 uppercase block text-center">Height</span>
                                <input
                                    type="number" step="0.01" value={op.height}
                                    onChange={(e) => updateOpeningParams(wall.id, op.id, 'height', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-1 text-[10px] font-bold text-slate-700 text-center outline-none focus:border-yellow-400 focus:bg-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[8px] font-bold text-slate-400 uppercase block text-center">Depth</span>
                                <input
                                    type="number" step="0.01" value={op.thickness}
                                    onChange={(e) => updateOpeningParams(wall.id, op.id, 'thickness', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-1 text-[10px] font-bold text-slate-700 text-center outline-none focus:border-yellow-400 focus:bg-white"
                                />
                            </div>
                        </div>
                    </div>
                ))
            ))}

            {/* Show a message if no openings exist on any walls */}
            {!walls.some(w => w.openings && w.openings.length > 0) && (
                <div className="text-center py-4 opacity-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No openings added</span>
                </div>
            )}
        </div>

            </div>
        </div>
    );
};

export default Sidebar;