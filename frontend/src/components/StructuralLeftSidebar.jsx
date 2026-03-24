import React from 'react';
import { useNavigate } from 'react-router-dom';

const StructuralLeftSidebar = ({
    urn, archFloors, currentFloorIndex, setCurrentFloorIndex,
    appStage, setAppStage, activeTool, setActiveTool,
    unlockedFromStructural, setUnlockedFromStructural,
    areaMode, setAreaMode, setEditingAreaId,
    drawnAreas, setDrawnAreas, backupAreas,
    orthoEnabled, setOrthoEnabled, osnapEnabled, setOsnapEnabled,
    zoneType, setZoneType, isSaving, handleNextStep,
    showWalls, setShowWalls, structuralMode,
    beamJustification, setBeamJustification // 🌟 ADDED MISSING PROPS
}) => {
    const navigate = useNavigate();

    return (
        <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col z-10 shadow-2xl relative">
            <div className="p-6 border-b border-slate-700 bg-slate-900/50">
                <h2 className="text-white text-lg font-black tracking-wider uppercase mb-1">Stage 2</h2>
                <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">Structural Design</p>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
                {/* 🌟 FLOOR SWITCHER UI */}
                {archFloors.length > 1 && (
                    <div className="mb-6">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 border-b border-slate-700 pb-1">Select Floor:</p>
                        <div id="floor-switcher" className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-600">
                            {archFloors.map((floor, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentFloorIndex(idx)}
                                    className={`px-4 py-2 text-xs font-bold rounded-lg border whitespace-nowrap transition-all ${currentFloorIndex === idx
                                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                                        }`}
                                >
                                    {floor.name || `Floor ${idx + 1}`}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Workflow Stages</h3>

                {/* 🌟 STAGE 2: AREA TRACING */}
                {appStage !== 'ARCHITECTURE' ? (
                    <div className="flex gap-2 mb-2 animate-fade-in">
                        <button disabled className="flex-1 py-3 px-4 rounded-xl text-sm font-bold shadow-md bg-slate-800/80 text-slate-500 border border-slate-700 flex items-center gap-3 cursor-not-allowed">
                            <span>🔒</span> 2. Area Tracing
                        </button>
                        <button onClick={() => { setAppStage('ARCHITECTURE'); setActiveTool('NONE'); setUnlockedFromStructural(true); }} title="Unlock and Edit Areas" className="py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white border border-slate-500 shadow-md flex items-center justify-center">🔓</button>
                    </div>
                ) : areaMode === 'EDIT' ? (
                    <div className="flex gap-2 mb-2 animate-fade-in-down">
                        <button onClick={() => { setAreaMode('DRAW'); setEditingAreaId(null); setActiveTool('NONE'); }} className="flex-1 py-3 px-2 rounded-xl text-xs font-bold shadow-md transition-all bg-green-600 hover:bg-green-500 text-white border-2 border-green-400 flex justify-center items-center gap-2"><span>✅</span> Done</button>
                        <button onClick={() => { setDrawnAreas(backupAreas); setAreaMode('DRAW'); setEditingAreaId(null); setActiveTool('NONE'); }} className="flex-1 py-3 px-2 rounded-xl text-xs font-bold shadow-md transition-all bg-red-600 hover:bg-red-500 text-white border-2 border-red-400 flex justify-center items-center gap-2"><span>❌</span> Cancel</button>
                    </div>
                ) : (
                    <button onClick={() => { setActiveTool(activeTool === 'AREA' ? 'NONE' : 'AREA'); setAreaMode('DRAW'); }} className={`w-full py-3 px-4 rounded-xl text-sm font-bold shadow-md transition-colors mb-2 flex items-center justify-between ${activeTool === 'AREA' ? "bg-green-600 hover:bg-green-500 text-white border-2 border-green-400" : "bg-slate-700 hover:bg-slate-600 text-white border-2 border-transparent"}`}>
                        <div className="flex items-center gap-3"><span>🟩</span> 2. Draw Areas</div>
                        {activeTool === 'AREA' && <span className="text-xs">ON</span>}
                    </button>
                )}

                {/* Area Options Panel */}
                {activeTool === 'AREA' && areaMode === 'DRAW' && appStage === 'ARCHITECTURE' && (
                    <div className="bg-slate-900/60 rounded-xl p-4 mb-4 border border-slate-700 animate-fade-in-down shadow-inner">
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setOrthoEnabled(!orthoEnabled)} className={`flex-1 py-2 text-[10px] font-black tracking-widest uppercase rounded-lg border transition-all ${orthoEnabled ? 'bg-blue-600/30 text-blue-400 border-blue-500/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>📐 Ortho: {orthoEnabled ? 'ON' : 'OFF'}</button>
                            <button onClick={() => setOsnapEnabled(!osnapEnabled)} className={`flex-1 py-2 text-[10px] font-black tracking-widest uppercase rounded-lg border transition-all ${osnapEnabled ? 'bg-cyan-600/30 text-cyan-400 border-cyan-500/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>🧲 Osnap: {osnapEnabled ? 'ON' : 'OFF'}</button>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 border-b border-slate-700 pb-1">Select Zone Type:</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setZoneType('INDOOR')} className={`py-2 text-xs font-bold rounded-lg border ${zoneType === 'INDOOR' ? 'bg-blue-500 text-white border-blue-400' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}>Indoor</button>
                            <button onClick={() => setZoneType('PORCH')} className={`py-2 text-xs font-bold rounded-lg border ${zoneType === 'PORCH' ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}>Car Porch</button>
                            <button onClick={() => setZoneType('COURTYARD')} className={`py-2 text-xs font-bold rounded-lg border ${zoneType === 'COURTYARD' ? 'bg-yellow-500 text-white border-yellow-400' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}>Courtyard</button>
                            <button onClick={() => setZoneType('VERANDAH')} className={`py-2 text-xs font-bold rounded-lg border ${zoneType === 'VERANDAH' ? 'bg-orange-500 text-white border-orange-400' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}>Verandah</button>
                        </div>
                    </div>
                )}

                {/* 🌟 STAGE 3: COLUMNS & BEAMS */}
                {appStage === 'STRUCTURAL' ? (
                    <div className="bg-slate-900/60 rounded-xl p-3 mb-4 border border-slate-700 animate-fade-in-down shadow-inner">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span>{structuralMode === 'COLUMN' ? '🏛️' : '📏'}</span>
                                <span className="text-white text-sm font-bold">
                                    3. Supports <span className="text-slate-400 text-xs font-normal">({structuralMode === 'COLUMN' ? 'Columns' : 'Beams'})</span>
                                </span>
                            </div>
                        </div>

                        {structuralMode === 'COLUMN' ? (
                            <>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 border-b border-slate-700 pb-1">Select Column Type:</p>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => setActiveTool(activeTool === 'COLUMN_FREE' ? 'NONE' : 'COLUMN_FREE')} className={`py-2 px-3 text-xs font-bold rounded-lg border flex justify-between transition-all ${activeTool === 'COLUMN_FREE' ? 'bg-purple-600 text-white border-purple-400 shadow-md' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'}`}>
                                        <span>📐 3-Point (Angled)</span> {activeTool === 'COLUMN_FREE' && <span className="text-[10px] bg-purple-500 px-1.5 rounded">ON</span>}
                                    </button>
                                    <button onClick={() => setActiveTool(activeTool === 'COLUMN_ORTHO' ? 'NONE' : 'COLUMN_ORTHO')} className={`py-2 px-3 text-xs font-bold rounded-lg border flex justify-between transition-all ${activeTool === 'COLUMN_ORTHO' ? 'bg-purple-600 text-white border-purple-400 shadow-md' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'}`}>
                                        <span>⏹️ 2-Point (Ortho)</span> {activeTool === 'COLUMN_ORTHO' && <span className="text-[10px] bg-purple-500 px-1.5 rounded">ON</span>}
                                    </button>
                                    <button onClick={() => setActiveTool(activeTool === 'COLUMN_CIRCULAR' ? 'NONE' : 'COLUMN_CIRCULAR')} className={`py-2 px-3 text-xs font-bold rounded-lg border flex justify-between transition-all ${activeTool === 'COLUMN_CIRCULAR' ? 'bg-purple-600 text-white border-purple-400 shadow-md' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'}`}>
                                        <span>🔵 Circular</span> {activeTool === 'COLUMN_CIRCULAR' && <span className="text-[10px] bg-purple-500 px-1.5 rounded">ON</span>}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 border-b border-slate-700 pb-1">Beam Tools:</p>
                                <div className="flex flex-col gap-3">
                                    <button onClick={() => setActiveTool(activeTool === 'BEAM_DRAW' ? 'NONE' : 'BEAM_DRAW')} className={`py-2 px-3 text-xs font-bold rounded-lg border flex justify-between transition-all ${activeTool === 'BEAM_DRAW' ? 'bg-blue-600 text-white border-blue-400 shadow-md' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'}`}>
                                        <span>📏 Draw Beam</span> {activeTool === 'BEAM_DRAW' && <span className="text-[10px] bg-blue-500 px-1.5 rounded">ON</span>}
                                    </button>

                                    {/* 🌟 BEAM ALIGNMENT (JUSTIFICATION) UI */}
                                    {activeTool === 'BEAM_DRAW' && (
                                        <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 animate-fade-in-down shadow-lg">
                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">Align (Spacebar):</p>
                                            <div className="flex gap-1">
                                                <button onClick={() => setBeamJustification('LEFT')} className={`flex-1 py-2 text-[10px] font-bold rounded border transition-all ${beamJustification === 'LEFT' ? 'bg-blue-600 text-white border-blue-400 shadow-md' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>Inside</button>
                                                <button onClick={() => setBeamJustification('CENTER')} className={`flex-1 py-2 text-[10px] font-bold rounded border transition-all ${beamJustification === 'CENTER' ? 'bg-blue-600 text-white border-blue-400 shadow-md' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>Center</button>
                                                <button onClick={() => setBeamJustification('RIGHT')} className={`flex-1 py-2 text-[10px] font-bold rounded border transition-all ${beamJustification === 'RIGHT' ? 'bg-blue-600 text-white border-blue-400 shadow-md' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>Outside</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ) : appStage === 'SLABS' || appStage === 'FOUNDATION' ? (
                    <div className="flex gap-2 mb-2 animate-fade-in">
                        <button disabled className="flex-1 py-3 px-4 rounded-xl text-sm font-bold shadow-md bg-slate-800/80 text-slate-500 border border-slate-700 flex items-center gap-3 cursor-not-allowed">
                            <span>🔒</span> 3. Supports Locked
                        </button>
                        <button onClick={() => { setAppStage('STRUCTURAL'); setActiveTool('NONE'); }} className="py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white border border-slate-500 shadow-md flex items-center justify-center">🔓</button>
                    </div>
                ) : (
                    <button disabled className="w-full py-3 px-4 bg-slate-800/40 rounded-xl text-slate-600 border border-slate-700/50 text-sm font-bold mb-2 flex items-center gap-3 cursor-not-allowed">
                        <span className="opacity-40">🏛️</span> 3. Supports (Locked)
                    </button>
                )}

                {/* 🌟 STAGE 4: SLABS & LINTELS */}
                {appStage === 'SLABS' ? (
                    <button onClick={() => setActiveTool(activeTool !== 'NONE' ? 'NONE' : 'SLAB_ROOF')} className={`w-full py-3 px-4 rounded-xl text-sm font-bold shadow-md transition-colors mb-2 flex items-center justify-between animate-fade-in ${activeTool !== 'NONE' ? "bg-blue-600 text-white border-2 border-blue-400" : "bg-slate-700 hover:bg-slate-600 text-white border-2 border-transparent"}`}>
                        <div className="flex items-center gap-3"><span>🧊</span> 4. Spans (Slabs/Lintels)</div>
                        {activeTool !== 'NONE' && <span className="text-xs">ON</span>}
                    </button>
                ) : appStage === 'FOUNDATION' ? (
                     <div className="flex gap-2 mb-2 animate-fade-in">
                        <button disabled className="flex-1 py-3 px-4 rounded-xl text-sm font-bold shadow-md bg-slate-800/80 text-slate-500 border border-slate-700 flex items-center gap-3 cursor-not-allowed"><span>🔒</span> 4. Spans Locked</button>
                        <button onClick={() => { setAppStage('SLABS'); setActiveTool('NONE'); }} className="py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white border border-slate-500 shadow-md flex items-center justify-center">🔓</button>
                    </div>
                ) : (
                    <button disabled className="w-full py-3 px-4 bg-slate-800/40 rounded-xl text-slate-600 border border-slate-700/50 text-sm font-bold mb-2 flex items-center gap-3 cursor-not-allowed"><span className="opacity-40">🧊</span> 4. Spans (Locked)</button>
                )}

                {/* 🌟 STAGE 5: FOUNDATION */}
                {appStage === 'FOUNDATION' ? (
                     <button onClick={() => setActiveTool(activeTool !== 'NONE' ? 'NONE' : 'FOUNDATION')} className={`w-full py-3 px-4 rounded-xl text-sm font-bold shadow-md transition-colors mb-2 flex items-center justify-between animate-fade-in ${activeTool !== 'NONE' ? "bg-orange-600 text-white border-2 border-orange-400" : "bg-slate-700 hover:bg-slate-600 text-white border-2 border-transparent"}`}>
                        <div className="flex items-center gap-3"><span>🏗️</span> 5. Foundation</div>
                        {activeTool !== 'NONE' && <span className="text-xs">ON</span>}
                    </button>
                ) : (
                    <button disabled className="w-full py-3 px-4 bg-slate-800/40 rounded-xl text-slate-600 border border-slate-700/50 text-sm font-bold mb-2 flex items-center gap-3 cursor-not-allowed"><span className="opacity-40">🏗️</span> 5. Foundation (Locked)</button>
                )}
            </div>

            {/* --- PROGRESS SECTION --- */}
            <div className="px-5 pb-5 mt-auto">
                {appStage === 'ARCHITECTURE' ? (
                    <div className="p-5 rounded-xl bg-[#1e293b]/80 border border-[#334155] shadow-lg backdrop-blur-md">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                                <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Stage 2: Area Tracing</span>
                            </div>
                            <span className="text-xs font-mono text-slate-400">{currentFloorIndex + 1} / {archFloors.length}</span>
                        </div>
                        <button onClick={handleNextStep} disabled={isSaving} className={`w-full py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isSaving ? "bg-slate-700 text-slate-400 cursor-wait" : unlockedFromStructural || currentFloorIndex === archFloors.length - 1 ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.3)]" : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]"}`}>
                            {isSaving ? (<><span>⏳</span> Saving...</>) : unlockedFromStructural ? (<><span>✅</span> Save & Return</>) : currentFloorIndex === archFloors.length - 1 ? (<><span>🏛️</span> Finish Tracing</>) : (<><span>📂</span> Next Floor</>)}
                        </button>
                    </div>
                ) : appStage === 'STRUCTURAL' ? (
                    <div className="p-5 rounded-xl bg-[#2e1065]/60 border border-[#7e22ce]/50 shadow-lg backdrop-blur-md animate-fade-in">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                            <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Stage 3: Supports</span>
                        </div>
                        <button onClick={() => { setAppStage('SLABS'); setActiveTool('SLAB_ROOF'); }} className="w-full py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]">
                            <span>✅</span> Complete Supports
                        </button>
                    </div>
                ) : appStage === 'SLABS' ? (
                    <div className="p-5 rounded-xl bg-[#1e3a8a]/60 border border-[#2563eb]/50 shadow-lg backdrop-blur-md animate-fade-in">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                            <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Stage 4: Spans</span>
                        </div>
                        <button onClick={() => { setAppStage('FOUNDATION'); setActiveTool('FOUNDATION'); }} className="w-full py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                            <span>✅</span> Complete Spans
                        </button>
                    </div>
                ) : (
                    <div className="p-5 rounded-xl bg-[#7c2d12]/60 border border-[#ea580c]/50 shadow-lg backdrop-blur-md animate-fade-in">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
                            <span className="text-[10px] text-orange-300 font-bold uppercase tracking-wider">Stage 5: Foundation</span>
                        </div>
                        <button onClick={() => alert("Ready to calculate final Bill of Quantities!")} className="w-full py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_15px_rgba(234,88,12,0.4)]">
                            <span>📊</span> Generate BOQ
                        </button>
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-slate-700 bg-slate-900/50 flex gap-3">
                <button onClick={() => navigate(`/editor/${encodeURIComponent(urn)}`)} className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 text-xs font-bold uppercase tracking-widest transition-colors">⬅️ Back</button>
                <button onClick={() => setShowWalls(!showWalls)} className={`flex-1 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-colors ${showWalls ? "bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/40" : "bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-700"}`}>
                    {showWalls ? '👀 Hide Walls' : '👁️ Show Walls'}
                </button>
            </div>
        </div>
    );
};

export default StructuralLeftSidebar;