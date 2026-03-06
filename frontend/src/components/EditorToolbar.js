import React from 'react';

const EditorToolbar = ({
  isCalibrated,
  activeTool, setActiveTool,
  wallMode, setWallMode,
  openingMode, setOpeningMode,
  handleUndo, handleRedo,
  historyLength, futureLength,
  justification, toggleJustification,
  ortho, setOrtho,
  isSnapping, setIsSnapping
}) => {
  return (
    <div 
      className={`absolute left-4 top-20 bottom-20 w-16 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl z-30 flex flex-col items-center py-4 gap-4 transition-all duration-300 
        ${!isCalibrated ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100 pointer-events-auto'}`}
    >
      <div className="relative group">
        <button 
          onClick={() => setActiveTool(activeTool === 'WALL' ? 'NONE' : 'WALL')} 
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTool === 'WALL' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400'}`} 
          title="Draw Wall"
        >
          🧱
        </button>
        {activeTool === 'WALL' && (
          <div className="absolute left-14 top-0 bg-slate-800 border border-slate-700 rounded-xl p-1 flex gap-1 shadow-2xl z-50">
            <button 
              onClick={() => setWallMode('MANUAL')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${wallMode === 'MANUAL' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
            >
              ✏️ Manual
            </button>
            <button 
              onClick={() => setWallMode('PICK')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${wallMode === 'PICK' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
            >
              🖱️ Pick Line
            </button>
          </div>
        )}
      </div>

      {/* OPENINGS TOOL */}
      <div className="relative group">
        <button 
          onClick={() => setActiveTool(activeTool === 'OPENINGS' ? 'NONE' : 'OPENINGS')} 
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTool === 'OPENINGS' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`} 
          title="Add Openings"
        >
          🚪
        </button>
        {activeTool === 'OPENINGS' && (
          <div className="absolute left-14 top-0 bg-slate-800 border border-slate-700 rounded-xl p-1 flex flex-col gap-1 shadow-2xl z-50 w-36">
            <button onClick={() => setOpeningMode('DOOR')} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-left transition-all ${openingMode === 'DOOR' ? 'bg-yellow-500 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>🚪 Door</button>
            <button onClick={() => setOpeningMode('WINDOW')} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-left transition-all ${openingMode === 'WINDOW' ? 'bg-yellow-500 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>🪟 Window</button>
            <button onClick={() => setOpeningMode('ARCH')} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-left transition-all ${openingMode === 'ARCH' ? 'bg-yellow-500 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>🏛️ Arch</button>
            <button onClick={() => setOpeningMode('RECT_ARCH')} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-left transition-all ${openingMode === 'RECT_ARCH' ? 'bg-yellow-500 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>🔲 Rect Arch</button>
            <button onClick={() => setOpeningMode('GRILL')} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-left transition-all ${openingMode === 'GRILL' ? 'bg-yellow-500 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>▦ Grill</button>
          </div>
        )}
      </div>

      <button onClick={() => setActiveTool(activeTool === 'EDIT' ? 'NONE' : 'EDIT')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTool === 'EDIT' ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400'}`} title="Edit Wall">✏️</button>
      <button onClick={() => setActiveTool(activeTool === 'ERASER' ? 'NONE' : 'ERASER')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTool === 'ERASER' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400'}`} title="Erase Wall">✕</button>
      
      <div className="w-8 h-px bg-slate-600 my-1"></div>
      
      <button onClick={handleUndo} disabled={historyLength === 0} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all text-xl ${historyLength === 0 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-700 text-white hover:bg-slate-600 active:scale-95'}`} title="Undo (Ctrl+Z)">↩️</button>
      <button onClick={handleRedo} disabled={futureLength === 0} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all text-xl ${futureLength === 0 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-700 text-white hover:bg-slate-600 active:scale-95'}`} title="Redo (Ctrl+Y)">↪️</button>

      <div className="w-8 h-px bg-slate-600 my-1"></div>

      <button onClick={toggleJustification} className="w-10 h-10 rounded-xl flex flex-col items-center justify-center bg-slate-700 text-white border border-slate-600" title="Toggle Justification"><span className="text-xl">{justification === 'CENTER' ? '⌾' : justification === 'LEFT' ? '⇠' : '⇢'}</span></button>
      <button onClick={() => setOrtho(!ortho)} className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all ${ortho ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-500'}`} title="Toggle Ortho"><span className="text-xl">📐</span><span className="text-[6px]">ORTHO</span></button>
      <button onClick={() => setIsSnapping(!isSnapping)} className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all ${isSnapping ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-500'}`} title="Toggle Snap"><span className="text-xl">🧲</span><span className="text-[6px]">SNAP</span></button>
    </div>
  );
};

export default EditorToolbar;