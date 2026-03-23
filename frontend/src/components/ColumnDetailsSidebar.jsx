import React from 'react';

const ColumnDetailsSidebar = ({ columns, onDeleteColumn, onUpdateColumnSize }) => {
    // 🌟 MATH: Calculate Estimated Concrete Volume (3m height)
    const floorHeight = 3.0; 
    const totalVolume = columns.reduce((sum, col) => {
        if (col.shape === 'CIRCULAR') {
            const r = parseFloat(col.radius || 0.1);
            return sum + (Math.PI * r * r * floorHeight); // Cylinder Volume
        } else {
            const width = parseFloat(col.width || 0.2);
            const depth = parseFloat(col.depth || 0.2);
            return sum + (width * depth * floorHeight); // Rectangular Volume
        }
    }, 0).toFixed(2);

    return (
        <div style={{
            width: '340px', backgroundColor: '#18181b', color: '#ffffff',
            borderLeft: '1px solid #27272a', display: 'flex', flexDirection: 'column',
            height: '100%', fontFamily: 'Inter, system-ui, sans-serif', zIndex: 50
        }}>
            {/* Header */}
            <div style={{ padding: '20px', backgroundColor: '#18181b', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#fff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    Column Details
                </h3>
                <span style={{ backgroundColor: '#a855f720', color: '#a855f7', padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #a855f750' }}>
                    STRUCTURAL
                </span>
            </div>

            {/* List of Placed Columns */}
            <div style={{ padding: '16px', overflowY: 'auto', flexGrow: 1 }}>
                {columns.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '60px' }}>
                        <span style={{ fontSize: '40px', opacity: 0.2, display: 'block', marginBottom: '12px' }}>🏛️</span>
                        <p style={{ color: '#52525b', fontSize: '13px' }}>No columns placed.<br/>Select a tool and trace on the blueprint.</p>
                    </div>
                ) : (
                    columns.map((col, index) => (
                        <div key={col.id} style={{ backgroundColor: '#27272a', borderRadius: '8px', marginBottom: '12px', border: '1px solid #3f3f46', overflow: 'hidden' }}>
                            <div style={{ padding: '10px 14px', borderBottom: '1px solid #3f3f46', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #a855f7' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>{col.name || `C${index + 1}`}</span>
                                    <span style={{ fontSize: '9px', backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#a1a1aa', padding: '2px 6px', borderRadius: '4px' }}>
                                        {col.shape === 'CIRCULAR' ? 'RC Circular' : 'RC Concrete'}
                                    </span>
                                </div>
                                <button onClick={() => onDeleteColumn(col.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', opacity: 0.7 }} title="Delete Column">✖</button>
                            </div>

                            {/* 🌟 EXACT SIZE INPUTS (Shows CM) */}
                            <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#a1a1aa', fontSize: '11px', textTransform: 'uppercase' }}>Size (cm)</span>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {col.shape === 'CIRCULAR' ? (
                                        <>
                                            <span style={{ color: '#71717a', fontSize: '10px' }}>Rad:</span>
                                            <input 
                                                type="number"
                                                value={Math.round((col.radius || 0.1) * 100)} 
                                                onChange={(e) => {
                                                    const newRadiusMeters = parseFloat(e.target.value) / 100;
                                                    // Pass the 4th parameter for radius
                                                    onUpdateColumnSize(col.id, col.width, col.depth, newRadiusMeters);
                                                }}
                                                style={{ width: '60px', backgroundColor: '#18181b', color: '#e4e4e7', border: '1px solid #3f3f46', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', outline: 'none', textAlign: 'center', fontFamily: 'monospace' }}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            {/* Width Input (cm -> meters) */}
                                            <input 
                                                type="number"
                                                value={Math.round((col.width || 0.2) * 100)} 
                                                onChange={(e) => {
                                                    const newWidthMeters = parseFloat(e.target.value) / 100;
                                                    onUpdateColumnSize(col.id, newWidthMeters, col.depth);
                                                }}
                                                style={{ width: '50px', backgroundColor: '#18181b', color: '#e4e4e7', border: '1px solid #3f3f46', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', outline: 'none', textAlign: 'center', fontFamily: 'monospace' }}
                                            />
                                            <span style={{ color: '#71717a', fontSize: '10px' }}>×</span>
                                            {/* Depth Input (cm -> meters) */}
                                            <input 
                                                type="number"
                                                value={Math.round((col.depth || 0.2) * 100)} 
                                                onChange={(e) => {
                                                    const newDepthMeters = parseFloat(e.target.value) / 100;
                                                    onUpdateColumnSize(col.id, col.width, newDepthMeters);
                                                }}
                                                style={{ width: '50px', backgroundColor: '#18181b', color: '#e4e4e7', border: '1px solid #3f3f46', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', outline: 'none', textAlign: 'center', fontFamily: 'monospace' }}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>

                        </div>
                    ))
                )}
            </div>

            {/* Pro Structural Footer */}
            <div style={{ padding: '20px', backgroundColor: '#18181b', borderTop: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: '600' }}>Total Columns</span>
                    <span style={{ color: '#e4e4e7', fontSize: '16px', fontWeight: 'bold', fontFamily: 'monospace' }}>{columns.length}</span>
                </div>
                <div style={{ height: '1px', backgroundColor: '#27272a', width: '100%' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', color: '#a855f7', textTransform: 'uppercase', fontWeight: 'bold' }}>Est. Concrete</span>
                        <span style={{ color: '#52525b', fontSize: '10px' }}>Vol. per floor (3m height)</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#a855f7', fontSize: '20px', fontWeight: 'bold', fontFamily: 'monospace' }}>{totalVolume} <span style={{ fontSize: '12px' }}>m³</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ColumnDetailsSidebar;