import React from 'react';

const AreaDetailsSidebar = ({ savedAreas, onDeleteArea, onRenameArea }) => {
    const totalAreaM2 = savedAreas.reduce((sum, room) => sum + parseFloat(room.areaM2), 0).toFixed(2);
    const totalAreaSqFt = savedAreas.reduce((sum, room) => sum + parseFloat(room.areaSqFt), 0).toFixed(2);

    const getZoneColor = (type) => {
        switch(type) {
            case 'INDOOR': return '#3b82f6'; 
            case 'PORCH': return '#a855f7';  
            case 'COURTYARD': return '#eab308'; 
            case 'VERANDAH': return '#f97316'; 
            default: return '#22c55e';       
        }
    };

    return (
        <div style={{ 
            width: '340px', // Slightly wider for table layout
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
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#00FFFF' }}>Estimation Details</h3>
            </div>
            
            <div style={{ padding: '16px', overflowY: 'auto', flexGrow: 1 }}>
                {savedAreas.length === 0 ? (
                    <p style={{ color: '#888', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
                        No areas drawn yet.
                    </p>
                ) : (
                    savedAreas.map((room) => {
                        const zoneColor = getZoneColor(room.zoneType);
                        
                        return (
                            <div key={room.id} style={{ 
                                backgroundColor: '#2a2a2a', 
                                padding: '12px', 
                                borderRadius: '6px', 
                                marginBottom: '12px',
                                borderLeft: `4px solid ${zoneColor}`,
                                position: 'relative',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                            }}>
                                <button 
                                    onClick={() => onDeleteArea(room.id)}
                                    style={{
                                        position: 'absolute', top: '8px', right: '8px',
                                        background: 'none', border: 'none', color: '#ff4444',
                                        cursor: 'pointer', fontSize: '14px', opacity: 0.7
                                    }}
                                >✖</button>

                                {/* Title & Badges */}
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', paddingRight: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <input 
                                        type="text" 
                                        value={room.name}
                                        onChange={(e) => onRenameArea(room.id, e.target.value)}
                                        style={{
                                            background: 'transparent', border: 'none', borderBottom: '1px dashed #666',
                                            color: '#fff', fontSize: '15px', fontWeight: 'bold', outline: 'none', width: '110px'
                                        }}
                                    />
                                    <span style={{ fontSize: '9px', backgroundColor: `${zoneColor}33`, color: zoneColor, border: `1px solid ${zoneColor}66`, padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                        {room.zoneType}
                                    </span>
                                    <span style={{ fontSize: '9px', backgroundColor: '#444', color: '#ccc', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                        {room.shape}
                                    </span>
                                </div>
                                
                                {/* 🌟 COMPACT DATA TABLE */}
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: '1fr 1fr 1.5fr', 
                                    backgroundColor: '#1f1f1f', 
                                    borderRadius: '6px', 
                                    padding: '8px',
                                    marginBottom: '10px',
                                    border: '1px solid #333'
                                }}>
                                    {/* Table Headers */}
                                    <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Length</div>
                                    <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Width</div>
                                    <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', textAlign: 'right' }}>Exact Area</div>
                                    
                                    {/* Table Values */}
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '2px' }}>{room.length} <span style={{fontSize:'10px', color:'#666'}}>m</span></div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '2px' }}>{room.breadth} <span style={{fontSize:'10px', color:'#666'}}>m</span></div>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', textAlign: 'right', marginTop: '2px' }}>{room.areaM2} <span style={{fontSize:'10px', color:'#666'}}>m²</span></div>
                                    
                                    {/* Sub-row for SqFt */}
                                    <div style={{ gridColumn: '1 / span 3', textAlign: 'right', fontSize: '11px', color: '#888', marginTop: '2px' }}>
                                        {room.areaSqFt} sq ft
                                    </div>
                                </div>

                               {/* 🌟 CONNECTED ELEMENTS TRACKER */}
<div style={{ fontSize: '11px', color: '#aaa', borderTop: '1px dashed #444', paddingTop: '8px' }}>
    
    <div style={{ display: 'flex', marginBottom: '4px' }}>
        <span style={{ color: '#888', width: '65px' }}>Walls:</span>
        <span style={{ color: '#fff', fontWeight: 'bold' }}>
            {room.wallsCount > 0 ? `Touching ${room.wallsCount} sides` : 'None detected'}
        </span>
    </div>
    
    <div style={{ display: 'flex' }}>
        <span style={{ color: '#888', width: '65px' }}>Openings:</span>
        <span style={{ color: '#fff', fontWeight: 'bold' }}>
            {room.openings?.length > 0 ? (
                // Displays nicely like: 0.90 x 2.10, 1.20 x 1.50
                room.openings.join(', ')
            ) : (
                'None detected'
            )}
        </span>
    </div>
    
</div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Total Summary Footer */}
            <div style={{ padding: '20px 16px', backgroundColor: '#2d2d2d', borderTop: '1px solid #444' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                    <span>Total Est. Area:</span>
                    <span style={{ color: '#00FFFF' }}>{totalAreaM2} m²</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', fontWeight: 'bold' }}>
                    <span>Imperial:</span>
                    <span>{totalAreaSqFt} sq ft</span>
                </div>
            </div>
        </div>
    );
};

export default AreaDetailsSidebar;