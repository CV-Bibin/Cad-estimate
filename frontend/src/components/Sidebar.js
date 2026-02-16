import React from 'react';

const Sidebar = ({ 
    walls, 
    deleteWall, 
    updateHeight, 
    updateThickness, // NEW prop
    onHoverWall,
    globalThickness, // NEW prop
    setGlobalThickness, // NEW prop
    globalHeight, // NEW prop
    setGlobalHeight // NEW prop
}) => {
  return (
    <div className="w-[380px] bg-white border-l border-slate-200 z-30 flex flex-col shadow-2xl">
      
      {/* 1. GLOBAL DEFAULTS HEADER */}
      <div className="p-6 border-b bg-slate-50">
        <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
            <span>🧱</span> Wall Settings
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
            {/* Default Thickness */}
            <div className="bg-white p-2 rounded border border-slate-200">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Def. Thickness</label>
                <div className="flex items-center">
                    <input 
                        type="number" 
                        step="0.01"
                        value={globalThickness}
                        onChange={(e) => setGlobalThickness(parseFloat(e.target.value) || 0)}
                        className="w-full font-mono text-sm font-bold text-slate-700 outline-none"
                    />
                    <span className="text-xs text-slate-400 ml-1">m</span>
                </div>
            </div>

            {/* Default Height */}
            <div className="bg-white p-2 rounded border border-slate-200">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Def. Height</label>
                <div className="flex items-center">
                    <input 
                        type="number" 
                        step="0.1"
                        value={globalHeight}
                        onChange={(e) => setGlobalHeight(parseFloat(e.target.value) || 0)}
                        className="w-full font-mono text-sm font-bold text-slate-700 outline-none"
                    />
                    <span className="text-xs text-slate-400 ml-1">m</span>
                </div>
            </div>
        </div>
      </div>
      
      {/* 2. WALL LIST */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100/50">
        {walls.length === 0 ? (
          <div className="text-center py-10 opacity-40 flex flex-col items-center">
            <div className="text-4xl mb-2">📐</div>
            <p className="font-medium text-slate-500">No walls yet.</p>
            <p className="text-xs text-slate-400">Select the tool and start drawing.</p>
          </div>
        ) : (
          walls.map((wall, i) => (
            <div 
                key={wall.id} 
                className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all relative hover:border-blue-400 group"
                onMouseEnter={() => onHoverWall(wall.id)}
                onMouseLeave={() => onHoverWall(null)}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                <span className="font-bold text-xs text-slate-500 uppercase tracking-wide">Wall #{i + 1}</span>
                <button 
                    onClick={() => deleteWall(wall.id)} 
                    className="text-slate-300 hover:text-red-500 transition-colors p-1"
                    title="Delete Wall"
                >
                    ✕
                </button>
              </div>
              
              {/* Inputs Grid */}
              <div className="grid grid-cols-2 gap-3 mb-2">
                  {/* Height Input */}
                  <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-0.5">HEIGHT</label>
                      <div className="flex items-center bg-slate-50 rounded px-2 py-1 border border-slate-200 focus-within:border-blue-400 transition-colors">
                        <input 
                            type="number" 
                            value={wall.height} 
                            onChange={(e) => updateHeight(wall.id, e.target.value)}
                            className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none"
                        />
                        <span className="text-[9px] text-slate-400 ml-1">m</span>
                      </div>
                  </div>

                  {/* Thickness Input */}
                  <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-0.5">THICKNESS</label>
                      <div className="flex items-center bg-slate-50 rounded px-2 py-1 border border-slate-200 focus-within:border-blue-400 transition-colors">
                        <input 
                            type="number" 
                            step="0.01"
                            value={wall.thickness} 
                            onChange={(e) => updateThickness(wall.id, e.target.value)}
                            className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none"
                        />
                        <span className="text-[9px] text-slate-400 ml-1">m</span>
                      </div>
                  </div>
              </div>
              
              {/* Info Footer */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 bg-slate-50 p-1.5 rounded">
                <span>📏 {wall.length.toFixed(2)}m</span>
                <span className="font-mono">{wall.justification}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Sidebar;