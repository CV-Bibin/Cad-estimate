import React from 'react';

const ViewerStatusBar = ({ activeTool, openingMode, isSnapping, ortho }) => {
  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-xl p-1.5 rounded-full border border-slate-700/50 shadow-2xl shadow-black/50">
        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest flex items-center gap-2 border ${
            activeTool === 'CALIBRATION' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 
            activeTool === 'WALL' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
            activeTool === 'OPENINGS' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 
            activeTool === 'EDIT' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
            activeTool === 'ERASER' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
            'bg-slate-800 text-slate-400 border-slate-700'
        }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
                activeTool === 'CALIBRATION' ? 'bg-purple-400 animate-pulse' : 
                activeTool === 'WALL' ? 'bg-orange-400 animate-pulse' :
                activeTool === 'OPENINGS' ? 'bg-yellow-400 animate-pulse' : 
                activeTool === 'EDIT' ? 'bg-green-400 animate-pulse' :
                activeTool === 'ERASER' ? 'bg-red-400 animate-pulse' :
                'bg-slate-500'
            }`}></div>
            {activeTool === 'CALIBRATION' ? 'PICKING POINTS...' : 
             activeTool === 'WALL' ? 'DRAWING' : 
             activeTool === 'OPENINGS' ? `PLACING ${openingMode}` : 
             activeTool === 'EDIT' ? 'EDITING' : 
             activeTool === 'ERASER' ? 'ERASING' : 'VIEWING'}
        </div>
        <div className="w-px h-4 bg-slate-700 mx-1"></div>
        <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-colors ${isSnapping ? 'text-blue-300 bg-blue-500/10' : 'text-slate-600'}`}>
            <span className="text-xs">🧲</span>
            <span className={isSnapping ? 'opacity-100' : 'opacity-50'}>SNAP {isSnapping ? 'ON' : 'OFF'}</span>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-colors ${ortho ? 'text-cyan-300 bg-cyan-500/10' : 'text-slate-600'}`}>
            <span className="text-xs">📐</span>
            <span className={ortho ? 'opacity-100' : 'opacity-50'}>ORTHO {ortho ? 'ON' : 'OFF'}</span>
        </div>
      </div>
    </div>
  );
};

export default ViewerStatusBar;