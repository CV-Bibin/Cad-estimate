import React from 'react';

const StructuralToolbar = ({ activeTool, setActiveTool, appStage, structuralMode, setStructuralMode }) => {
    
    // Only show toolbar in structural stages
    if (appStage !== 'STRUCTURAL' && appStage !== 'SLABS') return null;

    return (
        <div className="absolute top-20 right-6 z-[100] flex flex-col gap-2 p-2 bg-slate-900/90 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-md">
            
            {/* Column Button */}
            <button
                onClick={() => { 
                    setStructuralMode('COLUMN'); 
                    // If switching back to column, default to Ortho (or keep current if already a column tool)
                    setActiveTool(activeTool.startsWith('COLUMN') ? activeTool : 'COLUMN_ORTHO'); 
                }}
                className={`flex flex-col items-center justify-center w-20 h-16 rounded-xl font-bold text-xs transition-all ${
                    structuralMode === 'COLUMN' ? 'bg-indigo-600 text-white shadow-md border border-indigo-400' : 'text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white'
                }`}
            >
                <span className="text-xl mb-1">🏛️</span> Column
            </button>

            {/* Beam Button */}
            <button
                onClick={() => { 
                    setStructuralMode('BEAM'); 
                    setActiveTool('BEAM_DRAW'); // Activates beam tool
                }}
                className={`flex flex-col items-center justify-center w-20 h-16 rounded-xl font-bold text-xs transition-all ${
                    structuralMode === 'BEAM' ? 'bg-indigo-600 text-white shadow-md border border-indigo-400' : 'text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white'
                }`}
            >
                <span className="text-xl mb-1">📏</span> Beam
            </button>
            
        </div>
    );
};

export default StructuralToolbar;