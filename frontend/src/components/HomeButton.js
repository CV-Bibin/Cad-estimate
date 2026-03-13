import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomeButton = ({ showWarning = true }) => {
    const navigate = useNavigate();

    const handleGoHome = () => {
        if (showWarning) {
            const confirmHome = window.confirm("Return to Dashboard? Make sure you have saved your progress so you don't lose any work.");
            if (!confirmHome) return; // Stop if they click Cancel
        }
        
        
        navigate('/dashboard'); 
    };

    return (
        <button
            onClick={handleGoHome}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[9px] font-black uppercase tracking-widest text-slate-200 hover:text-white transition-all active:scale-95 shadow-sm"
            title="Return to Dashboard"
        >
            <span className="text-sm">🏠</span>Home
        </button>
    );
};

export default HomeButton;