import React from 'react';

const Toolbar = ({ 
  activeTool, 
  setActiveTool, 
  justification, 
  toggleJustification, 
  ortho, 
  setOrtho, 
  snapMode,       // <--- CHANGED from osnap
  setSnapMode     // <--- CHANGED from setOsnap
}) => {
  
  // Helper to cycle: STANDARD -> STRICT -> OFF
  const cycleSnap = () => {
      if (snapMode === 'STANDARD') setSnapMode('STRICT');
      else if (snapMode === 'STRICT') setSnapMode('OFF');
      else setSnapMode('STANDARD');
  };

  return (
    <div className="absolute left-4 top-20 bottom-20 w-16 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl z-30 flex flex-col items-center py-4 gap-4">
      
      {/* 1. WALL TOOL */}
      <button 
        title="Draw Walls"
        onClick={() => setActiveTool(activeTool === 'WALL' ? 'NONE' : 'WALL')}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTool === 'WALL' ? 'bg-orange-500 text-white shadow-[0_0_15px_orange]' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
      >
        🧱
      </button>

      {/* 2. ALIGNMENT */}
      <button 
        title={`Alignment: ${justification}`}
        onClick={toggleJustification}
        className="w-10 h-10 rounded-xl flex flex-col items-center justify-center bg-slate-700 text-white hover:bg-slate-600 border border-slate-600"
      >
        <span className="text-xl">
          {justification === 'CENTER' ? '⌾' : justification === 'LEFT' ? '⇠' : '⇢'}
        </span>
        <span className="text-[6px] font-bold uppercase">{justification}</span>
      </button>

      {/* 3. ORTHO */}
      <button 
        title="Ortho Mode"
        onClick={() => setOrtho(!ortho)}
        className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all ${ortho ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-500'}`}
      >
        <span className="text-xl">📐</span>
        <span className="text-[6px] font-bold">ORTHO</span>
      </button>

      {/* 4. OSNAP (3-WAY TOGGLE) */}
      <button 
        title={`Snap Mode: ${snapMode}`}
        onClick={cycleSnap} // <--- Uses the new cycle function
        className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all border ${
            snapMode === 'STANDARD' ? 'bg-blue-600 text-white border-blue-400' : 
            snapMode === 'STRICT' ? 'bg-red-600 text-white border-red-400 shadow-[0_0_10px_red]' : 
            'bg-slate-700 text-slate-500 border-slate-700'
        }`}
      >
        <span className="text-xl">🧲</span>
        <span className="text-[6px] font-bold uppercase">
            {snapMode === 'STANDARD' ? 'STD' : snapMode === 'STRICT' ? 'STRICT' : 'OFF'}
        </span>
      </button>

      <div className="w-8 h-px bg-slate-600 my-1"></div>

      {/* 5. EDIT MODE */}
      {/* In Toolbar.js */}
<button 
    title="Edit Wall Points"
    onClick={() => setActiveTool(activeTool === 'EDIT' ? 'NONE' : 'EDIT')}
    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTool === 'EDIT' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'}`}
>
    ✏️
</button>

    </div>
  );
};

export default Toolbar;