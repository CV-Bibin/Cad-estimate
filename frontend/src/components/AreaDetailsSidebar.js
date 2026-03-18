import React from 'react';

const AreaDetailsSidebar = ({ savedAreas, onDeleteArea, onRenameArea, onEditArea }) => {
    // 🌟 MATH: Gross Area (Everything)
    const totalAreaM2 = savedAreas.reduce((sum, room) => sum + parseFloat(room.areaM2), 0).toFixed(2);
    const totalAreaSqFt = savedAreas.reduce((sum, room) => sum + parseFloat(room.areaSqFt), 0).toFixed(2);

    // 🌟 MATH: Plinth Area (Excludes Porch & Courtyard)
    const plinthAreas = savedAreas.filter(room => room.zoneType !== 'PORCH' && room.zoneType !== 'COURTYARD');
    const plinthAreaM2 = plinthAreas.reduce((sum, room) => sum + parseFloat(room.areaM2), 0).toFixed(2);
    const plinthAreaSqFt = plinthAreas.reduce((sum, room) => sum + parseFloat(room.areaSqFt), 0).toFixed(2);

    const getZoneColor = (type) => {
        switch (type) {
            case 'INDOOR': return '#3b82f6'; // Clean Blue
            case 'PORCH': return '#a855f7';  // Clean Purple
            case 'COURTYARD': return '#eab308'; // Clean Yellow
            case 'VERANDAH': return '#f97316'; // Clean Orange
            default: return '#22c55e'; // Clean Green
        }
    };

    return (
        <div style={{
            width: '340px',
            backgroundColor: '#18181b',
            color: '#ffffff',
            borderLeft: '1px solid #27272a',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            fontFamily: 'Inter, system-ui, sans-serif',
            zIndex: 50
        }}>
            {/* Header */}
            <div style={{ padding: '20px', backgroundColor: '#18181b', borderBottom: '1px solid #27272a' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#fff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    Estimation Details
                </h3>
            </div>

            {/* Room List */}
            <div style={{ padding: '16px', overflowY: 'auto', flexGrow: 1 }}>
                {savedAreas.length === 0 ? (
                    <p style={{ color: '#52525b', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>
                        No areas traced on this floor.
                    </p>
                ) : (
                    savedAreas.map((room) => {
                        const zoneColor = getZoneColor(room.zoneType);

                        return (
                            <div key={room.id} style={{
                                backgroundColor: '#27272a',
                                borderRadius: '8px',
                                marginBottom: '16px',
                                border: '1px solid #3f3f46',
                                overflow: 'hidden'
                            }}>
                                {/* Room Header */}
                                <div style={{ 
                                    padding: '12px 16px', 
                                    borderBottom: '1px solid #3f3f46', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'flex-start',
                                    borderLeft: `3px solid ${zoneColor}`
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <input
                                            type="text"
                                            value={room.name}
                                            onChange={(e) => onRenameArea(room.id, e.target.value)}
                                            style={{
                                                background: 'transparent', border: '1px solid transparent',
                                                color: '#fff', fontSize: '15px', fontWeight: '600', outline: 'none',
                                                padding: '2px 6px', marginLeft: '-6px', borderRadius: '4px',
                                                transition: 'all 0.2s', width: '150px'
                                            }}
                                            onFocus={(e) => { e.target.style.backgroundColor = '#18181b'; e.target.style.border = '1px solid #52525b'; }}
                                            onBlur={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.border = '1px solid transparent'; }}
                                        />
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <span style={{ fontSize: '9px', backgroundColor: `${zoneColor}20`, color: zoneColor, padding: '3px 8px', borderRadius: '12px', fontWeight: '700', letterSpacing: '0.5px' }}>
                                                {room.zoneType}
                                            </span>
                                            <span style={{ fontSize: '9px', backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#a1a1aa', padding: '3px 8px', borderRadius: '12px', fontWeight: '600' }}>
                                                {room.shape}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
                                        <button onClick={() => onEditArea(room.id)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '14px', transition: 'color 0.2s' }} title="Edit Corners" onMouseOver={(e) => e.target.style.color = '#eab308'} onMouseOut={(e) => e.target.style.color = '#a1a1aa'}>✏️</button>
                                        <button onClick={() => onDeleteArea(room.id)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '14px', transition: 'color 0.2s' }} title="Delete Room" onMouseOver={(e) => e.target.style.color = '#ef4444'} onMouseOut={(e) => e.target.style.color = '#a1a1aa'}>✖</button>
                                    </div>
                                </div>

                                {/* Room Data Body */}
                                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#a1a1aa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dimensions</span>
                                        <span style={{ color: '#e4e4e7', fontSize: '13px', fontFamily: 'monospace' }}>{room.length}m × {room.breadth}m</span>
                                    </div>
                                    
                                    {/* 🌟 UPDATED: Advanced Walls Tracker */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <span style={{ color: '#a1a1aa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Walls</span>
                                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {room.wallsCount > 0 && <span style={{ color: '#e4e4e7', fontSize: '12px' }}>Touching {room.wallsCount} sides</span>}
                                            {room.insideWallsCount > 0 && <span style={{ color: '#34d399', fontSize: '12px', fontWeight: 'bold' }}>{room.insideWallsCount} inside</span>}
                                            {(room.wallsCount === 0 && !room.insideWallsCount) && <span style={{ color: '#71717a', fontSize: '12px' }}>None</span>}
                                        </div>
                                    </div>

                                    {/* 🌟 UPDATED: Advanced Openings Tracker */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <span style={{ color: '#a1a1aa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Openings</span>
                                        <div style={{ textAlign: 'right', maxWidth: '180px', display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'flex-end' }}>
                                            {room.openings?.length > 0 ? (
                                                room.openings.map((op, i) => (
                                                    <span key={i} style={{ backgroundColor: '#3f3f46', color: '#e4e4e7', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontFamily: 'monospace' }}>
                                                        {op}
                                                    </span>
                                                ))
                                            ) : (
                                                <span style={{ color: '#71717a', fontSize: '12px' }}>None</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #3f3f46' }}>
                                        <span style={{ color: '#a1a1aa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Exact Area</span>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#34d399', fontSize: '16px', fontWeight: 'bold', fontFamily: 'monospace' }}>{room.areaM2} m²</div>
                                            <div style={{ color: '#71717a', fontSize: '11px', fontFamily: 'monospace' }}>{room.areaSqFt} sq ft</div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* 🌟 Pro Detailed Footer */}
            <div style={{ padding: '20px', backgroundColor: '#18181b', borderTop: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Gross Area Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Gross Area</span>
                        <span style={{ color: '#52525b', fontSize: '10px' }}>Includes all drawn zones</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#e4e4e7', fontSize: '15px', fontWeight: 'bold', fontFamily: 'monospace' }}>{totalAreaM2} <span style={{ fontSize: '11px', color: '#71717a' }}>m²</span></div>
                        <div style={{ color: '#71717a', fontSize: '11px', fontFamily: 'monospace' }}>{totalAreaSqFt} sq ft</div>
                    </div>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', backgroundColor: '#27272a', width: '100%' }}></div>

                {/* Plinth Area Row (Highlighted) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>Plinth Area</span>
                        <span style={{ color: '#52525b', fontSize: '10px' }}>Excludes Porch & Courtyard</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#22d3ee', fontSize: '22px', fontWeight: 'bold', fontFamily: 'monospace' }}>{plinthAreaM2} <span style={{ fontSize: '13px', color: '#0891b2' }}>m²</span></div>
                        <div style={{ color: '#0891b2', fontSize: '12px', fontFamily: 'monospace' }}>{plinthAreaSqFt} sq ft</div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AreaDetailsSidebar;