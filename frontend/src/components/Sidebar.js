import React from 'react';

const Sidebar = ({ walls, deleteWall, updateHeight }) => {
  return (
    <div className="w-[380px] bg-white border-l border-slate-200 z-30 flex flex-col">
      <div className="p-6 border-b bg-slate-50">
        <h2 className="text-lg font-black text-slate-800">🧱 Wall List</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {walls.length === 0 ? (
          <div className="text-center py-10 opacity-30">
            <p>Select the 🧱 tool to draw walls.</p>
          </div>
        ) : (
          walls.map((wall, i) => (
            <div key={wall.id} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all relative">
              <div className="flex justify-between mb-2">
                <span className="font-bold text-sm text-slate-700">Wall {i + 1}</span>
                <button onClick={() => deleteWall(wall.id)} className="text-slate-300 hover:text-red-500 font-bold">✕</button>
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={wall.height} 
                  onChange={(e) => updateHeight(wall.id, e.target.value)}
                  className="w-full bg-slate-50 border-b border-orange-200 p-1 text-xs font-bold text-orange-600 focus:outline-none"
                  placeholder="Height (m)"
                />
              </div>
              
              <div className="mt-2 text-[10px] text-slate-400">
                {wall.length.toFixed(2)}m Length • {wall.justification} Align
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Sidebar;