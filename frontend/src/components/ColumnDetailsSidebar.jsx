import React from 'react';

const ColumnDetailsSidebar = ({ columns = [] }) => {
    return (
        <div style={{
            width: '340px',
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            borderLeft: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            fontFamily: 'sans-serif',
            zIndex: 50
        }}>
            <div style={{ padding: '16px', backgroundColor: '#2d2d2d', borderBottom: '1px solid #444' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#a855f7' }}>
                    🏛️ Column Details
                </h3>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flexGrow: 1 }}>
                {columns.length === 0 ? (
                    <div className="text-center mt-10">
                        <span className="text-4xl opacity-20 block mb-3">🏛️</span>
                        <p style={{ color: '#888', fontSize: '13px' }}>
                            No columns placed yet.<br/>
                            Click corners on the blueprint to add columns.
                        </p>
                    </div>
                ) : (
                    <p className="text-slate-400 text-sm text-center">Column list will appear here!</p>
                )}
            </div>

            {/* Total Summary Footer */}
            <div style={{ padding: '20px 16px', backgroundColor: '#2d2d2d', borderTop: '1px solid #444' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', marginBottom: '6px' }}>
                    <span>Total Columns:</span>
                    <span style={{ color: '#a855f7' }}>{columns.length}</span>
                </div>
            </div>
        </div>
    );
};

export default ColumnDetailsSidebar;