import React from 'react';

const SlabDetailsSidebar = ({ slabs, onDeleteSlab, onUpdateSlabThickness }) => {
    // 🌟 MATH: Calculate Estimated Concrete Volume for Slabs
    const totalVolume = slabs.reduce((sum, slab) => {
        const area = parseFloat(slab.area || 10); // Default to 10m2 if not calculated yet
        const thickness = parseFloat(slab.thickness || 0.15); // Default 150mm
        return sum + (area * thickness);
    }, 0).toFixed(2);

    const getSlabColor = (type) => {
        if (type === 'SLAB_ROOF') return '#3b82f6'; // Blue
        if (type === 'LINTEL') return '#eab308'; // Yellow
        if (type === 'SUNSHADE') return '#f97316'; // Orange
        return '#22d3ee'; // Cyan for standard RCC Slab
    };

    return (
        <div style={{
            width: '340px', backgroundColor: '#18181b', color: '#ffffff',
            borderLeft: '1px solid #27272a', display: 'flex', flexDirection: 'column',
            height: '100%', fontFamily: 'Inter, system-ui, sans-serif', zIndex: 50
        }}>
            {/* Header */}
            <div style={{ padding: '20px', backgroundColor: '#18181b', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#fff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    Slab & Span Details
                </h3>
                <span style={{ backgroundColor: '#2563eb20', color: '#3b82f6', padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #2563eb50' }}>
                    STAGE 4
                </span>
            </div>

            {/* List of Placed Slabs */}
            <div style={{ padding: '16px', overflowY: 'auto', flexGrow: 1 }}>
                {slabs.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '60px' }}>
                        <span style={{ fontSize: '40px', opacity: 0.2, display: 'block', marginBottom: '12px' }}>🧊</span>
                        <p style={{ color: '#52525b', fontSize: '13px' }}>No slabs or lintels placed.<br/>Select a tool and click rooms to generate slabs.</p>
                    </div>
                ) : (
                    slabs.map((slab, index) => {
                        const slabColor = getSlabColor(slab.type);
                        
                        return (
                            <div key={slab.id} style={{ backgroundColor: '#27272a', borderRadius: '8px', marginBottom: '12px', border: '1px solid #3f3f46', overflow: 'hidden' }}>
                                <div style={{ padding: '10px 14px', borderBottom: '1px solid #3f3f46', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `3px solid ${slabColor}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>{slab.name || `Slab ${index + 1}`}</span>
                                        <span style={{ fontSize: '9px', backgroundColor: `${slabColor}20`, border: `1px solid ${slabColor}50`, color: slabColor, padding: '2px 6px', borderRadius: '4px' }}>
                                            {slab.type.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <button onClick={() => onDeleteSlab(slab.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', opacity: 0.7 }} title="Delete Slab">✖</button>
                                </div>

                                <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#a1a1aa', fontSize: '11px', textTransform: 'uppercase' }}>Thickness</span>
                                    <select 
                                        value={slab.thickness}
                                        onChange={(e) => onUpdateSlabThickness(slab.id, parseFloat(e.target.value))}
                                        style={{ backgroundColor: '#18181b', color: '#e4e4e7', border: '1px solid #3f3f46', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', outline: 'none', cursor: 'pointer', fontFamily: 'monospace' }}
                                    >
                                        <option value="0.10">100 mm (4")</option>
                                        <option value="0.12">120 mm (5")</option>
                                        <option value="0.15">150 mm (6")</option>
                                        <option value="0.20">200 mm (8")</option>
                                    </select>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Total Summary Footer */}
            <div style={{ padding: '20px', backgroundColor: '#18181b', borderTop: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', color: '#3b82f6', textTransform: 'uppercase', fontWeight: 'bold' }}>Slab Concrete</span>
                        <span style={{ color: '#52525b', fontSize: '10px' }}>Estimated Vol. for Floor</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#3b82f6', fontSize: '20px', fontWeight: 'bold', fontFamily: 'monospace' }}>{totalVolume} <span style={{ fontSize: '12px' }}>m³</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SlabDetailsSidebar;