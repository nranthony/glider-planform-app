import React from 'react';
import { STAGES, STAGE_CONFIG, SORTED_JOINTS } from '../constants';

const Sidebar = ({
  stage, setStage, image, roi,
  scaleBar, setScaleBar,
  annotationScale, setAnnotationScale,
  darkAnnotations, setDarkAnnotations,
  joints, currentJointIndex, setCurrentJointIndex,
  showMirrored, setShowMirrored,
  exportWithImage, setExportWithImage,
  currentJoint, onExportJSON, onExportCSV,
}) => {
  const stageConfig = {
    ...STAGE_CONFIG,
    [STAGES.ANNOTATE]: {
      ...STAGE_CONFIG[STAGES.ANNOTATE],
      instruction: `Click to place: ${currentJoint?.name || 'Complete!'}`,
    },
  };

  return (
    <aside style={{
      width: '280px',
      padding: '16px',
      borderRight: '1px solid #30363d',
      overflowY: 'auto',
      background: 'rgba(0,0,0,0.2)',
      flexShrink: 0,
    }}>
      {/* Instruction */}
      <div style={{
        padding: '12px',
        background: `${stageConfig[stage].color}15`,
        border: `1px solid ${stageConfig[stage].color}40`,
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '11px', color: stageConfig[stage].color, marginBottom: '4px', textTransform: 'uppercase' }}>
          Current Step
        </div>
        <div style={{ fontSize: '13px' }}>{stageConfig[stage].instruction}</div>
      </div>

      {/* Stage Navigation */}
      <section style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8b949e' }}>
          Workflow
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {Object.entries(STAGES).map(([key, value]) => (
            <button
              key={key}
              onClick={() => {
                if (value === STAGES.LOAD) return;
                if (value === STAGES.ROI && !image) return;
                if (value !== STAGES.LOAD && value !== STAGES.ROI && !roi) return;
                setStage(value);
              }}
              disabled={value === STAGES.LOAD || (value !== STAGES.ROI && !roi) || (!image && value === STAGES.ROI)}
              style={{
                padding: '8px 12px',
                background: stage === value ? `${stageConfig[value].color}30` : 'transparent',
                border: stage === value ? `1px solid ${stageConfig[value].color}` : '1px solid transparent',
                borderRadius: '6px',
                color: stage === value ? stageConfig[value].color : '#8b949e',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '12px',
                textAlign: 'left',
                opacity: (value === STAGES.LOAD || (value !== STAGES.ROI && !roi) || (!image && value === STAGES.ROI)) ? 0.4 : 1,
              }}
            >
              {stageConfig[value].title}
            </button>
          ))}
        </div>
      </section>

      {/* Scale Settings */}
      {stage !== STAGES.LOAD && stage !== STAGES.ROI && (
        <section style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8b949e' }}>
            Scale Reference
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              value={scaleBar.realValue}
              onChange={(e) => setScaleBar(prev => ({ ...prev, realValue: parseFloat(e.target.value) || 1 }))}
              style={{
                width: '60px', padding: '6px 8px', background: '#21262d',
                border: '1px solid #30363d', borderRadius: '4px', color: '#e6edf3',
                fontFamily: 'inherit', fontSize: '12px',
              }}
            />
            <input
              type="text"
              value={scaleBar.unit}
              onChange={(e) => setScaleBar(prev => ({ ...prev, unit: e.target.value }))}
              style={{
                width: '50px', padding: '6px 8px', background: '#21262d',
                border: '1px solid #30363d', borderRadius: '4px', color: '#e6edf3',
                fontFamily: 'inherit', fontSize: '12px',
              }}
            />
          </div>
          <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '6px' }}>
            {scaleBar.length.toFixed(0)} px = {scaleBar.realValue} {scaleBar.unit}
          </div>
        </section>
      )}

      {/* Annotation Scale Slider */}
      {stage !== STAGES.LOAD && (
        <section style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8b949e' }}>
            Annotation Size
          </h3>
          <input
            type="range" min="0.5" max="2" step="0.1"
            value={annotationScale}
            onChange={(e) => setAnnotationScale(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#58a6ff' }}
          />
          <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '4px' }}>
            {(annotationScale * 100).toFixed(0)}%
          </div>
        </section>
      )}

      {/* Dark/Light annotation toggle */}
      {stage !== STAGES.LOAD && (
        <section style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8b949e' }}>
            Annotation Style
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setDarkAnnotations(true)}
              style={{
                flex: 1, padding: '8px',
                background: darkAnnotations ? '#21262d' : 'transparent',
                border: darkAnnotations ? '1px solid #58a6ff' : '1px solid #30363d',
                borderRadius: '4px', color: darkAnnotations ? '#58a6ff' : '#8b949e',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px',
              }}
            >
              Dark (light bg)
            </button>
            <button
              onClick={() => setDarkAnnotations(false)}
              style={{
                flex: 1, padding: '8px',
                background: !darkAnnotations ? '#21262d' : 'transparent',
                border: !darkAnnotations ? '1px solid #58a6ff' : '1px solid #30363d',
                borderRadius: '4px', color: !darkAnnotations ? '#58a6ff' : '#8b949e',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px',
              }}
            >
              Light (dark bg)
            </button>
          </div>
        </section>
      )}

      {/* Joint List */}
      {(stage === STAGES.ANNOTATE || stage === STAGES.REVIEW) && (
        <section style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8b949e' }}>
            Joints ({Object.keys(joints).length}/{SORTED_JOINTS.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '180px', overflowY: 'auto' }}>
            {SORTED_JOINTS.map((j, i) => (
              <button
                key={j.id}
                onClick={() => setCurrentJointIndex(i)}
                style={{
                  padding: '6px 10px',
                  background: joints[j.id] ? 'rgba(46, 160, 67, 0.15)' : 'transparent',
                  border: currentJointIndex === i ? '1px solid #58a6ff' : '1px solid transparent',
                  borderRadius: '4px', color: joints[j.id] ? '#3fb950' : '#8b949e',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px',
                  textAlign: 'left', display: 'flex', justifyContent: 'space-between',
                }}
              >
                <span>{j.name}</span>
                <span>{joints[j.id] ? '\u2713' : '\u25CB'}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Options */}
      {(stage === STAGES.ANNOTATE || stage === STAGES.REVIEW) && (
        <section style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', marginBottom: '8px' }}>
            <input
              type="checkbox" checked={showMirrored}
              onChange={(e) => setShowMirrored(e.target.checked)}
              style={{ accentColor: '#58a6ff' }}
            />
            Show mirrored joints
          </label>
        </section>
      )}

      {/* Export */}
      {stage === STAGES.REVIEW && (
        <section>
          <h3 style={{ margin: '0 0 10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8b949e' }}>
            Export Data
          </h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', marginBottom: '12px' }}>
            <input
              type="checkbox" checked={exportWithImage}
              onChange={(e) => setExportWithImage(e.target.checked)}
              style={{ accentColor: '#58a6ff' }}
            />
            Include annotated ROI image
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onExportJSON} style={{
              flex: 1, padding: '8px', background: '#21262d', border: '1px solid #30363d',
              borderRadius: '4px', color: '#e6edf3', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px',
            }}>
              JSON
            </button>
            <button onClick={onExportCSV} style={{
              flex: 1, padding: '8px', background: '#21262d', border: '1px solid #30363d',
              borderRadius: '4px', color: '#e6edf3', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px',
            }}>
              CSV
            </button>
          </div>
        </section>
      )}
    </aside>
  );
};

export default Sidebar;
