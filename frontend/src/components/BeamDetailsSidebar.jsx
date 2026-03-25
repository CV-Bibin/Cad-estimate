import React from 'react';

const BeamDetailsSidebar = ({ beams, onDeleteBeam, onUpdateBeamType, onUpdateBeamSize }) => {
    // 🌟 MATH: Calculate Estimated Concrete Volume for Beams
    const totalVolume = beams.reduce((sum, beam) => {
        const length = parseFloat(beam.length || 0);
        const width = parseFloat(beam.width || 0.2);
        // If concealed, depth is usually slab thickness (e.g., 0.12m). If normal, use set depth.
        const depth = parseFloat(beam.beamType === 'CONCEALED' ? 0.12 : (beam.depth || 0.3));
        return sum + (length * width * depth);
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
                    Beam Details
                </h3>
                <span style={{ backgroundColor: '#3b82f620', color: '#3b82f6', padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #3b82f650' }}>
                    FRAMING
                </span>
            </div>

            {/* List of Placed Beams */}
            <div style={{ padding: '16px', overflowY: 'auto', flexGrow: 1 }}>
                {beams.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '60px' }}>
                        <span style={{ fontSize: '40px', opacity: 0.2, display: 'block', marginBottom: '12px' }}>📏</span>
                        <p style={{ color: '#52525b', fontSize: '13px' }}>No beams placed.<br/>Snap to columns to draw framing.</p>
                    </div>
                ) : (
                    beams.map((beam, index) => (
                        <div key={beam.id} style={{ backgroundColor: '#27272a', borderRadius: '8px', marginBottom: '12px', border: '1px solid #3f3f46', overflow: 'hidden' }}>
                            <div style={{ padding: '10px 14px', borderBottom: '1px solid #3f3f46', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #3b82f6' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>{beam.name || `B${index + 1}`}</span>
                                    <span style={{ fontSize: '9px', backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                        {beam.justification}
                                    </span>
                                </div>
                                <button onClick={() => onDeleteBeam(beam.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', opacity: 0.7 }} title="Delete Beam">✖</button>
                            </div>

                            {/* 🌟 EDITABLE DIMENSIONS */}
                            <div style={{ padding: '10px 14px', borderBottom: '1px solid #3f3f46', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#a1a1aa', fontSize: '11px', textTransform: 'uppercase' }}>Breadth (cm)</span>
                                    <input 
                                        type="number"
                                        value={Math.round((beam.width || 0.2) * 100)} 
                                        onChange={(e) => onUpdateBeamSize(beam.id, parseFloat(e.target.value) / 100, beam.depth)}
                                        style={{ width: '60px', backgroundColor: '#18181b', color: '#e4e4e7', border: '1px solid #3f3f46', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', outline: 'none', textAlign: 'center', fontFamily: 'monospace' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#a1a1aa', fontSize: '11px', textTransform: 'uppercase' }}>Depth (cm)</span>
                                    <input 
                                        type="number"
                                        disabled={beam.beamType === 'CONCEALED'}
                                        value={Math.round((beam.beamType === 'CONCEALED' ? 0.12 : (beam.depth || 0.3)) * 100)} 
                                        onChange={(e) => onUpdateBeamSize(beam.id, beam.width, parseFloat(e.target.value) / 100)}
                                        style={{ width: '60px', backgroundColor: beam.beamType === 'CONCEALED' ? '#27272a' : '#18181b', color: beam.beamType === 'CONCEALED' ? '#71717a' : '#e4e4e7', border: '1px solid #3f3f46', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', outline: 'none', textAlign: 'center', fontFamily: 'monospace' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#71717a', fontSize: '11px' }}>Span Length</span>
                                    <span style={{ color: '#a1a1aa', fontSize: '12px', fontFamily: 'monospace' }}>{beam.length.toFixed(2)}m</span>
                                </div>
                            </div>

                            {/* Type Toggle */}
                            <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#a1a1aa', fontSize: '11px', textTransform: 'uppercase' }}>Type</span>
                                <div style={{ display: 'flex', gap: '4px', backgroundColor: '#18181b', padding: '2px', borderRadius: '6px', border: '1px solid #3f3f46' }}>
                                    <button 
                                        onClick={() => onUpdateBeamType(beam.id, 'NORMAL')}
                                        style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer', backgroundColor: beam.beamType !== 'CONCEALED' ? '#3b82f6' : 'transparent', color: beam.beamType !== 'CONCEALED' ? '#fff' : '#71717a', transition: 'all 0.2s' }}
                                    >Drop</button>
                                    <button 
                                        onClick={() => onUpdateBeamType(beam.id, 'CONCEALED')}
                                        style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer', backgroundColor: beam.beamType === 'CONCEALED' ? '#3b82f6' : 'transparent', color: beam.beamType === 'CONCEALED' ? '#fff' : '#71717a', transition: 'all 0.2s' }}
                                    >Concealed</button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div style={{ padding: '20px', backgroundColor: '#18181b', borderTop: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: '600' }}>Total Beams</span>
                    <span style={{ color: '#e4e4e7', fontSize: '16px', fontWeight: 'bold', fontFamily: 'monospace' }}>{beams.length}</span>
                </div>
                <div style={{ height: '1px', backgroundColor: '#27272a', width: '100%' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', color: '#3b82f6', textTransform: 'uppercase', fontWeight: 'bold' }}>Est. Concrete</span>
                        <span style={{ color: '#52525b', fontSize: '10px' }}>Total Beam Volume</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#3b82f6', fontSize: '20px', fontWeight: 'bold', fontFamily: 'monospace' }}>{totalVolume} <span style={{ fontSize: '12px' }}>m³</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BeamDetailsSidebar;