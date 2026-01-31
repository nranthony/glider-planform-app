import React, { useState, useRef, useCallback, useMemo } from 'react';
import { STAGES, STAGE_CONFIG, SORTED_JOINTS, DARK_COLORS, LIGHT_COLORS } from './constants';
import { usePanZoom } from './hooks/usePanZoom';
import { useMouseHandlers } from './hooks/useMouseHandlers';
import { useCanvasRenderer } from './hooks/useCanvasRenderer';
import { getAllJoints, calculateMeasurements, exportAnnotatedImage, downloadJSON, downloadCSV } from './exporters';
import Sidebar from './components/Sidebar';
import MeasurementsPanel from './components/MeasurementsPanel';

const PlanformAnalyzer = () => {
  // Core state
  const [image, setImage] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [stage, setStage] = useState(STAGES.LOAD);

  // ROI state
  const [roi, setRoi] = useState(null);
  const [roiDrag, setRoiDrag] = useState(null);

  // Midline state
  const [midlineX, setMidlineX] = useState(null);
  const [draggingMidline, setDraggingMidline] = useState(false);

  // Scale bar state
  const [scaleBar, setScaleBar] = useState({ x: 50, y: 50, length: 100, realValue: 1, unit: 'cm' });
  const [draggingScale, setDraggingScale] = useState(null);

  // Joints state
  const [joints, setJoints] = useState({});
  const [currentJointIndex, setCurrentJointIndex] = useState(0);
  const [draggingJoint, setDraggingJoint] = useState(null);

  // View state
  const [annotationScale, setAnnotationScale] = useState(1);
  const [showMirrored, setShowMirrored] = useState(true);
  const [darkAnnotations, setDarkAnnotations] = useState(true);
  const [exportWithImage, setExportWithImage] = useState(true);
  const [imageRotation, setImageRotation] = useState(0);

  // Refs
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);

  const currentJoint = SORTED_JOINTS[currentJointIndex];
  const colors = darkAnnotations ? DARK_COLORS : LIGHT_COLORS;

  // Rotation center: midline X, vertical center of ROI. Fallback to image center.
  const rotationCenter = useMemo(() => {
    if (midlineX !== null && roi) {
      return { x: midlineX, y: roi.y + roi.height / 2 };
    }
    if (imageDimensions.width > 0) {
      return { x: imageDimensions.width / 2, y: imageDimensions.height / 2 };
    }
    return null;
  }, [midlineX, roi, imageDimensions]);

  const mirrorPoint = useCallback((point) => {
    if (midlineX === null || !point) return null;
    return { x: 2 * midlineX - point.x, y: point.y };
  }, [midlineX]);

  const getAllJointsFn = useCallback(() => {
    return getAllJoints(joints, mirrorPoint);
  }, [joints, mirrorPoint]);

  const measurements = useMemo(() => {
    return calculateMeasurements(getAllJointsFn(), scaleBar);
  }, [getAllJointsFn, scaleBar]);

  // Pan/zoom
  const {
    viewTransform, setViewTransform,
    isPanning, spacePressed,
    screenToImage, imageToScreen, zoomToROI,
    startPan, updatePan, endPan,
    zoomAtPoint, zoomAtCenter,
  } = usePanZoom(canvasRef, containerRef);

  // Mouse/touch handlers
  const {
    handleMouseDown, handleMouseMove, handleMouseUp,
    handleTouchStart, handleTouchMove, handleTouchEnd,
    handleWheel,
    getMidlineHandleY,
  } = useMouseHandlers({
    canvasRef, containerRef,
    stage, spacePressed, isPanning,
    screenToImage, imageToScreen, startPan, updatePan, endPan,
    viewTransform, annotationScale,
    roiDrag, setRoiDrag, setRoi, setMidlineX, setScaleBar, zoomToROI,
    midlineX, draggingMidline, setDraggingMidline,
    scaleBar, draggingScale, setDraggingScale,
    joints, setJoints, currentJoint, currentJointIndex, setCurrentJointIndex,
    draggingJoint, setDraggingJoint,
    imageRotation, setImageRotation,
    zoomAtPoint,
  });

  // Canvas rendering
  useCanvasRenderer({
    canvasRef, containerRef, imageRef,
    image, imageDimensions, viewTransform,
    roi, roiDrag, midlineX, draggingMidline,
    scaleBar, joints, currentJoint, draggingJoint,
    annotationScale, stage, showMirrored, spacePressed, isPanning,
    colors, darkAnnotations,
    getAllJoints: getAllJointsFn, imageToScreen, mirrorPoint, getMidlineHandleY,
    imageRotation, rotationCenter,
  });

  // Image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setImageDimensions({ width: img.width, height: img.height });
          setImage(event.target.result);
          imageRef.current = img;
          setStage(STAGES.ROI);
          setRoi(null);
          setMidlineX(null);
          setJoints({});
          setCurrentJointIndex(0);
          setImageRotation(0);

          if (containerRef.current) {
            const container = containerRef.current;
            const scaleX = (container.clientWidth - 40) / img.width;
            const scaleY = (container.clientHeight - 40) / img.height;
            const scale = Math.min(scaleX, scaleY, 1);
            setViewTransform({
              scale,
              offsetX: (container.clientWidth - img.width * scale) / 2,
              offsetY: (container.clientHeight - img.height * scale) / 2
            });
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Export handlers
  const getExportImageFn = useCallback(() => {
    return exportAnnotatedImage({
      roi, imageRef, midlineX, scaleBar, joints, colors,
      getAllJointsFn, mirrorPoint, showMirrored, annotationScale,
      imageRotation, rotationCenter,
    });
  }, [roi, midlineX, scaleBar, joints, colors, getAllJointsFn, mirrorPoint, showMirrored, annotationScale, imageRotation, rotationCenter]);

  const handleExportJSON = () => {
    const allJoints = getAllJointsFn();
    downloadJSON({
      allJoints, measurements, roi, midlineX, scaleBar, imageDimensions,
      exportWithImage, exportAnnotatedImageFn: getExportImageFn,
    });
  };

  const handleExportCSV = () => {
    downloadCSV({
      measurements, scaleBar, exportWithImage, exportAnnotatedImageFn: getExportImageFn,
    });
  };

  const stageConfig = {
    ...STAGE_CONFIG,
    [STAGES.ANNOTATE]: {
      ...STAGE_CONFIG[STAGES.ANNOTATE],
      instruction: `Click to place: ${currentJoint?.name || 'Complete!'}`,
    },
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #0d1117 0%, #161b22 100%)',
      color: '#e6edf3',
      fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
      overflow: 'hidden',
    }}>
      {/* Top Bar */}
      <header style={{
        padding: '12px 24px',
        borderBottom: '1px solid #30363d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.3)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#58a6ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Planform Analyzer
          </h1>

          <div style={{
            padding: '6px 14px',
            background: `${stageConfig[stage].color}22`,
            border: `1px solid ${stageConfig[stage].color}66`,
            borderRadius: '20px',
            fontSize: '12px',
            color: stageConfig[stage].color,
          }}>
            {stageConfig[stage].title}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#8b949e', marginRight: '8px' }}>
            Space + drag to pan | Ctrl + drag to rotate
          </span>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '8px 16px',
              background: '#238636',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '13px',
            }}
          >
            Load Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel */}
        <Sidebar
          stage={stage} setStage={setStage} image={image} roi={roi}
          scaleBar={scaleBar} setScaleBar={setScaleBar}
          annotationScale={annotationScale} setAnnotationScale={setAnnotationScale}
          darkAnnotations={darkAnnotations} setDarkAnnotations={setDarkAnnotations}
          joints={joints} currentJointIndex={currentJointIndex} setCurrentJointIndex={setCurrentJointIndex}
          showMirrored={showMirrored} setShowMirrored={setShowMirrored}
          exportWithImage={exportWithImage} setExportWithImage={setExportWithImage}
          currentJoint={currentJoint}
          onExportJSON={handleExportJSON} onExportCSV={handleExportCSV}
          imageRotation={imageRotation} setImageRotation={setImageRotation}
        />

        {/* Main Canvas */}
        <main
          ref={containerRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0d1117' }}
        >
          {!image ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', color: '#8b949e',
            }}>
              <p style={{ fontSize: '14px' }}>Load a planform image to begin analysis</p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              style={{
                cursor: spacePressed || isPanning ? 'grab' :
                        stage === STAGES.ROI ? 'crosshair' :
                        draggingJoint || draggingMidline || draggingScale ? 'grabbing' : 'default',
                width: '100%',
                height: '100%',
                touchAction: 'none',
              }}
            />
          )}

          {/* Zoom controls */}
          {image && (
            <div style={{
              position: 'absolute', bottom: '16px', right: '16px',
              display: 'flex', gap: '4px', background: '#21262d',
              padding: '4px', borderRadius: '6px', border: '1px solid #30363d',
            }}>
              <button
                onClick={() => zoomAtCenter(0.8)}
                style={{
                  width: '32px', height: '32px', background: 'transparent', border: 'none',
                  borderRadius: '4px', color: '#e6edf3', cursor: 'pointer', fontSize: '16px',
                }}
              >&minus;</button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '11px', color: '#8b949e' }}>
                {(viewTransform.scale * 100).toFixed(0)}%
              </span>
              <button
                onClick={() => zoomAtCenter(1.25)}
                style={{
                  width: '32px', height: '32px', background: 'transparent', border: 'none',
                  borderRadius: '4px', color: '#e6edf3', cursor: 'pointer', fontSize: '16px',
                }}
              >+</button>
            </div>
          )}
        </main>

        {/* Right Panel - Results */}
        {(stage === STAGES.ANNOTATE || stage === STAGES.REVIEW) && (
          <MeasurementsPanel
            measurements={measurements}
            joints={joints}
            scaleUnit={scaleBar.unit}
          />
        )}
      </div>
    </div>
  );
};

export default PlanformAnalyzer;
