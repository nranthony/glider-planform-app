import React from 'react';

const MeasurementsPanel = ({ measurements, joints, scaleUnit }) => {
  return (
    <aside style={{
      width: '240px',
      padding: '16px',
      borderLeft: '1px solid #30363d',
      overflowY: 'auto',
      background: 'rgba(0,0,0,0.2)',
      flexShrink: 0,
    }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8b949e' }}>
        Measurements
      </h3>

      {Object.keys(joints).length > 0 ? (
        <>
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '12px', color: '#3fb950' }}>Bone Lengths</h4>
            {measurements.bones.filter(b => b.length).map(bone => (
              <div key={bone.id} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '4px 0', borderBottom: '1px solid #21262d', fontSize: '11px',
              }}>
                <span style={{ color: '#8b949e' }}>{bone.name}</span>
                <span style={{ color: '#3fb950', fontWeight: 500 }}>
                  {bone.length?.toFixed(2)} {scaleUnit}
                </span>
              </div>
            ))}
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: '12px', color: '#d29922' }}>Joint Angles</h4>
            {measurements.angles.map((angle, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '4px 0', borderBottom: '1px solid #21262d', fontSize: '11px',
              }}>
                <span style={{ color: '#8b949e' }}>{angle.joint.replace('_r', '').replace(/_/g, ' ')}</span>
                <span style={{ color: '#d29922', fontWeight: 500 }}>{angle.angle}&deg;</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p style={{ color: '#8b949e', fontSize: '12px' }}>Place joints to see measurements</p>
      )}
    </aside>
  );
};

export default MeasurementsPanel;
