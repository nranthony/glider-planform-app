import React, { useState, useRef, useCallback, useEffect } from 'react';

// Simplified topology for gliding mammals
const TOPOLOGY = {
  joints: [
    { id: 'head', name: 'Head Center', midline: true, order: 1 },
    { id: 'neck', name: 'Neck/Shoulder Line', midline: true, order: 2 },
    { id: 'torso', name: 'Torso Center', midline: true, order: 3 },
    { id: 'pelvis', name: 'Pelvis Center', midline: true, order: 4 },
    { id: 'tail', name: 'Tail Tip', midline: true, order: 5 },
    { id: 'shoulder_r', name: 'Shoulder (R)', side: 'right', order: 6 },
    { id: 'elbow_r', name: 'Elbow (R)', side: 'right', order: 7 },
    { id: 'wrist_r', name: 'Wrist (R)', side: 'right', order: 8 },
    { id: 'hand_r', name: 'Hand Tip (R)', side: 'right', order: 9 },
    { id: 'hip_r', name: 'Hip (R)', side: 'right', order: 10 },
    { id: 'knee_r', name: 'Knee (R)', side: 'right', order: 11 },
    { id: 'ankle_r', name: 'Ankle (R)', side: 'right', order: 12 },
    { id: 'foot_r', name: 'Foot Tip (R)', side: 'right', order: 13 },
  ],
  bones: [
    { id: 'spine_upper', from: 'head', to: 'neck', name: 'Upper Spine' },
    { id: 'spine_mid', from: 'neck', to: 'torso', name: 'Mid Spine' },
    { id: 'spine_lower', from: 'torso', to: 'pelvis', name: 'Lower Spine' },
    { id: 'tail_bone', from: 'pelvis', to: 'tail', name: 'Tail' },
    { id: 'scapula_r', from: 'neck', to: 'shoulder_r', name: 'Scapula/Clavicle', side: 'right' },
    { id: 'humerus_r', from: 'shoulder_r', to: 'elbow_r', name: 'Humerus', side: 'right' },
    { id: 'forearm_r', from: 'elbow_r', to: 'wrist_r', name: 'Forearm', side: 'right' },
    { id: 'hand_bone_r', from: 'wrist_r', to: 'hand_r', name: 'Hand', side: 'right' },
    { id: 'pelvis_bone_r', from: 'pelvis', to: 'hip_r', name: 'Pelvis', side: 'right' },
    { id: 'femur_r', from: 'hip_r', to: 'knee_r', name: 'Femur', side: 'right' },
    { id: 'tibia_r', from: 'knee_r', to: 'ankle_r', name: 'Tibia', side: 'right' },
    { id: 'foot_bone_r', from: 'ankle_r', to: 'foot_r', name: 'Foot', side: 'right' },
  ]
};

const STAGES = {
  LOAD: 'load',
  ROI: 'roi',
  MIDLINE: 'midline',
  SCALE: 'scale',
  ANNOTATE: 'annotate',
  REVIEW: 'review'
};

const PlaniformAnalyzer = () => {
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
  const [viewTransform, setViewTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [annotationScale, setAnnotationScale] = useState(1);
  const [showMirrored, setShowMirrored] = useState(true);
  const [darkAnnotations, setDarkAnnotations] = useState(true);
  const [exportWithImage, setExportWithImage] = useState(true);
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [lastPanOffset, setLastPanOffset] = useState({ x: 0, y: 0 });
  
  // Refs
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);

  const sortedJoints = [...TOPOLOGY.joints].sort((a, b) => a.order - b.order);
  const currentJoint = sortedJoints[currentJointIndex];

  // Annotation colors based on dark/light mode
  const colors = darkAnnotations ? {
    midline: 'rgba(180, 40, 40, 0.9)',
    midlineActive: 'rgba(220, 60, 60, 1)',
    midlineHandle: '#aa3333',
    midlineHandleActive: '#dd4444',
    scale: '#996600',
    scaleText: '#664400',
    boneMidline: 'rgba(180, 120, 0, 0.9)',
    boneSide: 'rgba(0, 140, 80, 0.9)',
    boneMirrored: 'rgba(0, 140, 80, 0.4)',
    jointMidline: '#aa7700',
    jointSide: '#008850',
    jointCurrent: '#cc0000',
    jointFill: 'rgba(255, 255, 255, 0.1)',
    jointFillDrag: 'rgba(255, 255, 255, 0.3)',
    labelText: '#222222',
    labelShadow: 'rgba(255, 255, 255, 0.8)',
    roi: '#006644',
  } : {
    midline: 'rgba(255, 120, 120, 0.9)',
    midlineActive: 'rgba(255, 150, 150, 1)',
    midlineHandle: '#ff8888',
    midlineHandleActive: '#ffaaaa',
    scale: '#ffcc44',
    scaleText: '#ffdd66',
    boneMidline: 'rgba(255, 200, 100, 0.9)',
    boneSide: 'rgba(100, 255, 180, 0.9)',
    boneMirrored: 'rgba(100, 255, 180, 0.4)',
    jointMidline: '#ffcc66',
    jointSide: '#66ffaa',
    jointCurrent: '#ff6666',
    jointFill: 'rgba(0, 0, 0, 0.1)',
    jointFillDrag: 'rgba(0, 0, 0, 0.3)',
    labelText: '#ffffff',
    labelShadow: 'rgba(0, 0, 0, 0.8)',
    roi: '#44ffaa',
  };

  // Convert screen coordinates to image coordinates
  const screenToImage = useCallback((screenX, screenY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;
    
    const imageX = (canvasX - viewTransform.offsetX) / viewTransform.scale;
    const imageY = (canvasY - viewTransform.offsetY) / viewTransform.scale;
    
    return { x: imageX, y: imageY };
  }, [viewTransform]);

  // Convert image coordinates to screen coordinates
  const imageToScreen = useCallback((imageX, imageY) => {
    return {
      x: imageX * viewTransform.scale + viewTransform.offsetX,
      y: imageY * viewTransform.scale + viewTransform.offsetY
    };
  }, [viewTransform]);

  // Mirror a point across the midline
  const mirrorPoint = useCallback((point) => {
    if (midlineX === null || !point) return null;
    return { x: 2 * midlineX - point.x, y: point.y };
  }, [midlineX]);

  // Get mirrored joint ID
  const getMirroredId = (id) => {
    if (id.endsWith('_r')) return id.replace('_r', '_l');
    if (id.endsWith('_l')) return id.replace('_l', '_r');
    return null;
  };

  // Calculate distance
  const distance = (p1, p2) => {
    if (!p1 || !p2) return null;
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  // Calculate angle at joint
  const calculateAngle = (p1, pJoint, p2) => {
    if (!p1 || !pJoint || !p2) return null;
    const v1 = { x: p1.x - pJoint.x, y: p1.y - pJoint.y };
    const v2 = { x: p2.x - pJoint.x, y: p2.y - pJoint.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const cross = v1.x * v2.y - v1.y * v2.x;
    return Math.abs(Math.atan2(cross, dot) * (180 / Math.PI));
  };

  // Get all joints including mirrored
  const getAllJoints = useCallback(() => {
    const all = { ...joints };
    Object.entries(joints).forEach(([id, pos]) => {
      const mirroredId = getMirroredId(id);
      if (mirroredId && !all[mirroredId]) {
        all[mirroredId] = mirrorPoint(pos);
      }
    });
    return all;
  }, [joints, mirrorPoint]);

  // Calculate measurements
  const calculateMeasurements = useCallback(() => {
    const allJoints = getAllJoints();
    const pixelsPerUnit = scaleBar.length / scaleBar.realValue;
    
    const boneMeasurements = TOPOLOGY.bones.map(bone => {
      const fromPos = allJoints[bone.from];
      const toPos = allJoints[bone.to];
      const pixelLength = distance(fromPos, toPos);
      
      return {
        id: bone.id,
        name: bone.name,
        side: bone.side || 'midline',
        pixelLength,
        length: pixelLength ? pixelLength / pixelsPerUnit : null,
      };
    });
    
    const angleMeasurements = [];
    TOPOLOGY.bones.forEach((bone, i) => {
      TOPOLOGY.bones.forEach((otherBone, j) => {
        if (i >= j) return;
        
        let sharedJoint = null, p1 = null, p2 = null;
        
        if (bone.to === otherBone.from) {
          sharedJoint = bone.to;
          p1 = allJoints[bone.from];
          p2 = allJoints[otherBone.to];
        } else if (bone.from === otherBone.to) {
          sharedJoint = bone.from;
          p1 = allJoints[bone.to];
          p2 = allJoints[otherBone.from];
        } else if (bone.to === otherBone.to) {
          sharedJoint = bone.to;
          p1 = allJoints[bone.from];
          p2 = allJoints[otherBone.from];
        } else if (bone.from === otherBone.from) {
          sharedJoint = bone.from;
          p1 = allJoints[bone.to];
          p2 = allJoints[otherBone.to];
        }
        
        if (sharedJoint && p1 && p2) {
          const jointPos = allJoints[sharedJoint];
          const angle = calculateAngle(p1, jointPos, p2);
          if (angle !== null) {
            angleMeasurements.push({
              joint: sharedJoint,
              bones: [bone.name, otherBone.name],
              angle: angle.toFixed(1),
            });
          }
        }
      });
    });
    
    return { bones: boneMeasurements, angles: angleMeasurements };
  }, [getAllJoints, scaleBar]);

  // Zoom to ROI with 10% padding
  const zoomToROI = useCallback((roiRect) => {
    if (!containerRef.current || !roiRect) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const padding = 0.1; // 10% padding
    const roiWidthWithPadding = roiRect.width * (1 + 2 * padding);
    const roiHeightWithPadding = roiRect.height * (1 + 2 * padding);
    
    const scaleX = containerWidth / roiWidthWithPadding;
    const scaleY = containerHeight / roiHeightWithPadding;
    const newScale = Math.min(scaleX, scaleY, 3); // Cap at 3x zoom
    
    const roiCenterX = roiRect.x + roiRect.width / 2;
    const roiCenterY = roiRect.y + roiRect.height / 2;
    
    const offsetX = containerWidth / 2 - roiCenterX * newScale;
    const offsetY = containerHeight / 2 - roiCenterY * newScale;
    
    setViewTransform({ scale: newScale, offsetX, offsetY });
  }, []);

  // Handle image upload
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
          
          // Fit image to container
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

  // Keyboard handlers for space bar panning
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !spacePressed) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };
    
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(false);
        setIsPanning(false);
        setPanStart(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spacePressed]);

  // Get midline handle position (below the canvas view)
  const getMidlineHandleY = useCallback(() => {
    if (!containerRef.current) return 30;
    return containerRef.current.clientHeight - 25;
  }, []);

  // Mouse handlers
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const screenX = e.clientX;
    const screenY = e.clientY;
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;
    const imgCoords = screenToImage(screenX, screenY);
    
    // Handle panning with space + click
    if (spacePressed) {
      setIsPanning(true);
      setPanStart({ x: screenX, y: screenY });
      setLastPanOffset({ x: viewTransform.offsetX, y: viewTransform.offsetY });
      return;
    }
    
    if (stage === STAGES.ROI) {
      setRoiDrag({ startX: imgCoords.x, startY: imgCoords.y, currentX: imgCoords.x, currentY: imgCoords.y });
    } else if (stage === STAGES.MIDLINE) {
      // Check if clicking on midline handle (at bottom of canvas)
      const handleY = getMidlineHandleY();
      const screenMidline = midlineX !== null ? imageToScreen(midlineX, 0) : null;
      
      if (screenMidline && Math.abs(canvasX - screenMidline.x) < 20 && Math.abs(canvasY - handleY) < 20) {
        setDraggingMidline(true);
      } else if (midlineX === null) {
        // First click sets the midline
        setMidlineX(imgCoords.x);
        setDraggingMidline(true);
      }
    } else if (stage === STAGES.SCALE) {
      const screenScale = imageToScreen(scaleBar.x, scaleBar.y);
      const screenScaleEnd = imageToScreen(scaleBar.x + scaleBar.length, scaleBar.y);
      
      const hitRadius = 15 * annotationScale;
      
      if (Math.abs(canvasX - screenScaleEnd.x) < hitRadius && Math.abs(canvasY - screenScaleEnd.y) < hitRadius) {
        setDraggingScale('resize');
      } else if (Math.abs(canvasX - screenScale.x) < hitRadius && Math.abs(canvasY - screenScale.y) < hitRadius) {
        setDraggingScale('move');
      } else if (canvasX > screenScale.x - hitRadius && canvasX < screenScaleEnd.x + hitRadius &&
                 Math.abs(canvasY - screenScale.y) < hitRadius * 2) {
        setDraggingScale('move');
      }
    } else if (stage === STAGES.ANNOTATE || stage === STAGES.REVIEW) {
      const hitRadius = 12 * annotationScale / viewTransform.scale;
      
      // Check for joint drag
      for (const [jointId, pos] of Object.entries(joints)) {
        if (distance(imgCoords, pos) < hitRadius) {
          setDraggingJoint(jointId);
          return;
        }
      }
      
      // Check midline handle drag (only at handle position)
      const handleY = getMidlineHandleY();
      const screenMidline = midlineX !== null ? imageToScreen(midlineX, 0) : null;
      if (screenMidline && Math.abs(canvasX - screenMidline.x) < 20 && Math.abs(canvasY - handleY) < 20) {
        setDraggingMidline(true);
        return;
      }
      
      // Place new joint if in annotate mode
      if (stage === STAGES.ANNOTATE && currentJoint) {
        setJoints(prev => ({ ...prev, [currentJoint.id]: imgCoords }));
        if (currentJointIndex < sortedJoints.length - 1) {
          setCurrentJointIndex(prev => prev + 1);
        }
      }
    }
  };

  const handleMouseMove = (e) => {
    const screenX = e.clientX;
    const screenY = e.clientY;
    const imgCoords = screenToImage(screenX, screenY);
    
    // Handle panning
    if (isPanning && panStart) {
      const dx = screenX - panStart.x;
      const dy = screenY - panStart.y;
      setViewTransform(prev => ({
        ...prev,
        offsetX: lastPanOffset.x + dx,
        offsetY: lastPanOffset.y + dy
      }));
      return;
    }
    
    if (stage === STAGES.ROI && roiDrag) {
      setRoiDrag(prev => ({ ...prev, currentX: imgCoords.x, currentY: imgCoords.y }));
    } else if (draggingMidline) {
      setMidlineX(imgCoords.x);
    } else if (draggingScale === 'move') {
      setScaleBar(prev => ({ ...prev, x: imgCoords.x, y: imgCoords.y }));
    } else if (draggingScale === 'resize') {
      const newLength = Math.max(20, imgCoords.x - scaleBar.x);
      setScaleBar(prev => ({ ...prev, length: newLength }));
    } else if (draggingJoint) {
      setJoints(prev => ({ ...prev, [draggingJoint]: imgCoords }));
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }
    
    if (stage === STAGES.ROI && roiDrag) {
      const x = Math.min(roiDrag.startX, roiDrag.currentX);
      const y = Math.min(roiDrag.startY, roiDrag.currentY);
      const width = Math.abs(roiDrag.currentX - roiDrag.startX);
      const height = Math.abs(roiDrag.currentY - roiDrag.startY);
      
      if (width > 20 && height > 20) {
        const newRoi = { x, y, width, height };
        setRoi(newRoi);
        setMidlineX(x + width / 2);
        setScaleBar(prev => ({ ...prev, x: x + 20, y: y + height - 30 }));
        
        // Auto-zoom to ROI
        setTimeout(() => zoomToROI(newRoi), 50);
      }
      setRoiDrag(null);
    }
    
    setDraggingMidline(false);
    setDraggingScale(null);
    setDraggingJoint(null);
  };

  // Touch handlers for mobile/tablet
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Two-finger touch starts panning
      e.preventDefault();
      const touch = e.touches[0];
      setIsPanning(true);
      setPanStart({ x: touch.clientX, y: touch.clientY });
      setLastPanOffset({ x: viewTransform.offsetX, y: viewTransform.offsetY });
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && isPanning && panStart) {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - panStart.x;
      const dy = touch.clientY - panStart.y;
      setViewTransform(prev => ({
        ...prev,
        offsetX: lastPanOffset.x + dx,
        offsetY: lastPanOffset.y + dy
      }));
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !image) return;
    
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    if (!img) return;
    
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image with transform
    ctx.save();
    ctx.translate(viewTransform.offsetX, viewTransform.offsetY);
    ctx.scale(viewTransform.scale, viewTransform.scale);
    ctx.drawImage(img, 0, 0);
    
    // Draw ROI dimming overlay
    if (roi || roiDrag) {
      const activeRoi = roi || {
        x: Math.min(roiDrag.startX, roiDrag.currentX),
        y: Math.min(roiDrag.startY, roiDrag.currentY),
        width: Math.abs(roiDrag.currentX - roiDrag.startX),
        height: Math.abs(roiDrag.currentY - roiDrag.startY)
      };
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, imageDimensions.width, activeRoi.y);
      ctx.fillRect(0, activeRoi.y, activeRoi.x, activeRoi.height);
      ctx.fillRect(activeRoi.x + activeRoi.width, activeRoi.y, imageDimensions.width - activeRoi.x - activeRoi.width, activeRoi.height);
      ctx.fillRect(0, activeRoi.y + activeRoi.height, imageDimensions.width, imageDimensions.height - activeRoi.y - activeRoi.height);
      
      ctx.strokeStyle = colors.roi;
      ctx.lineWidth = 2 / viewTransform.scale;
      ctx.setLineDash([8 / viewTransform.scale, 4 / viewTransform.scale]);
      ctx.strokeRect(activeRoi.x, activeRoi.y, activeRoi.width, activeRoi.height);
      ctx.setLineDash([]);
    }
    
    ctx.restore();
    
    const uiScale = annotationScale;
    
    // Draw midline (full height line)
    if (midlineX !== null && stage !== STAGES.ROI && stage !== STAGES.LOAD) {
      const screenMidline = imageToScreen(midlineX, 0);
      
      ctx.strokeStyle = draggingMidline ? colors.midlineActive : colors.midline;
      ctx.lineWidth = 2 * uiScale;
      ctx.setLineDash([10 * uiScale, 5 * uiScale]);
      ctx.beginPath();
      ctx.moveTo(screenMidline.x, 0);
      ctx.lineTo(screenMidline.x, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Midline handle at bottom of canvas
      const handleY = getMidlineHandleY();
      ctx.fillStyle = draggingMidline ? colors.midlineHandleActive : colors.midlineHandle;
      ctx.beginPath();
      ctx.arc(screenMidline.x, handleY, 10 * uiScale, 0, Math.PI * 2);
      ctx.fill();
      
      // Handle icon
      ctx.strokeStyle = darkAnnotations ? '#ffffff' : '#000000';
      ctx.lineWidth = 2 * uiScale;
      ctx.beginPath();
      ctx.moveTo(screenMidline.x - 5 * uiScale, handleY);
      ctx.lineTo(screenMidline.x + 5 * uiScale, handleY);
      ctx.moveTo(screenMidline.x - 3 * uiScale, handleY - 3 * uiScale);
      ctx.lineTo(screenMidline.x - 5 * uiScale, handleY);
      ctx.lineTo(screenMidline.x - 3 * uiScale, handleY + 3 * uiScale);
      ctx.moveTo(screenMidline.x + 3 * uiScale, handleY - 3 * uiScale);
      ctx.lineTo(screenMidline.x + 5 * uiScale, handleY);
      ctx.lineTo(screenMidline.x + 3 * uiScale, handleY + 3 * uiScale);
      ctx.stroke();
    }
    
    // Draw scale bar
    if (stage !== STAGES.ROI && stage !== STAGES.LOAD) {
      const screenStart = imageToScreen(scaleBar.x, scaleBar.y);
      const screenEnd = imageToScreen(scaleBar.x + scaleBar.length, scaleBar.y);
      
      ctx.strokeStyle = colors.scale;
      ctx.lineWidth = 3 * uiScale;
      ctx.beginPath();
      ctx.moveTo(screenStart.x, screenStart.y);
      ctx.lineTo(screenEnd.x, screenEnd.y);
      ctx.stroke();
      
      const capHeight = 12 * uiScale;
      ctx.beginPath();
      ctx.moveTo(screenStart.x, screenStart.y - capHeight);
      ctx.lineTo(screenStart.x, screenStart.y + capHeight);
      ctx.moveTo(screenEnd.x, screenEnd.y - capHeight);
      ctx.lineTo(screenEnd.x, screenEnd.y + capHeight);
      ctx.stroke();
      
      ctx.fillStyle = colors.scale;
      ctx.beginPath();
      ctx.arc(screenStart.x, screenStart.y, 6 * uiScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(screenEnd.x, screenEnd.y, 6 * uiScale, 0, Math.PI * 2);
      ctx.fill();
      
      // Label with shadow for readability
      ctx.font = `bold ${12 * uiScale}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = colors.labelShadow;
      ctx.fillText(`${scaleBar.realValue} ${scaleBar.unit}`, (screenStart.x + screenEnd.x) / 2 + 1, screenStart.y - 15 * uiScale + 1);
      ctx.fillStyle = colors.scaleText;
      ctx.fillText(`${scaleBar.realValue} ${scaleBar.unit}`, (screenStart.x + screenEnd.x) / 2, screenStart.y - 15 * uiScale);
    }
    
    // Draw bones and joints
    if (stage === STAGES.ANNOTATE || stage === STAGES.REVIEW) {
      const allJoints = getAllJoints();
      
      // Draw bones
      TOPOLOGY.bones.forEach(bone => {
        const from = allJoints[bone.from];
        const to = allJoints[bone.to];
        
        if (from && to) {
          const screenFrom = imageToScreen(from.x, from.y);
          const screenTo = imageToScreen(to.x, to.y);
          
          ctx.strokeStyle = bone.side ? colors.boneSide : colors.boneMidline;
          ctx.lineWidth = 3 * uiScale;
          ctx.beginPath();
          ctx.moveTo(screenFrom.x, screenFrom.y);
          ctx.lineTo(screenTo.x, screenTo.y);
          ctx.stroke();
          
          if (showMirrored && bone.side === 'right') {
            const mirroredFrom = mirrorPoint(from);
            const mirroredTo = mirrorPoint(to);
            if (mirroredFrom && mirroredTo) {
              const screenMirrorFrom = imageToScreen(mirroredFrom.x, mirroredFrom.y);
              const screenMirrorTo = imageToScreen(mirroredTo.x, mirroredTo.y);
              ctx.strokeStyle = colors.boneMirrored;
              ctx.beginPath();
              ctx.moveTo(screenMirrorFrom.x, screenMirrorFrom.y);
              ctx.lineTo(screenMirrorTo.x, screenMirrorTo.y);
              ctx.stroke();
            }
          }
        }
      });
      
      // Draw joints
      Object.entries(joints).forEach(([id, pos]) => {
        const jointDef = TOPOLOGY.joints.find(j => j.id === id);
        const isCurrentJoint = currentJoint && id === currentJoint.id;
        const isDragging = draggingJoint === id;
        const screenPos = imageToScreen(pos.x, pos.y);
        
        const radius = (isDragging ? 12 : 10) * uiScale;
        
        ctx.strokeStyle = isCurrentJoint ? colors.jointCurrent : (jointDef?.midline ? colors.jointMidline : colors.jointSide);
        ctx.lineWidth = 2 * uiScale;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = isDragging ? colors.jointFillDrag : colors.jointFill;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, radius - 2 * uiScale, 0, Math.PI * 2);
        ctx.fill();
        
        // Label with shadow
        ctx.font = `${11 * uiScale}px monospace`;
        ctx.textAlign = 'left';
        ctx.fillStyle = colors.labelShadow;
        ctx.fillText(jointDef?.name || id, screenPos.x + radius + 4 * uiScale + 1, screenPos.y + 4 * uiScale + 1);
        ctx.fillStyle = colors.labelText;
        ctx.fillText(jointDef?.name || id, screenPos.x + radius + 4 * uiScale, screenPos.y + 4 * uiScale);
        
        if (showMirrored && jointDef?.side === 'right') {
          const mirrored = mirrorPoint(pos);
          if (mirrored) {
            const screenMirror = imageToScreen(mirrored.x, mirrored.y);
            ctx.strokeStyle = colors.boneMirrored;
            ctx.lineWidth = 2 * uiScale;
            ctx.beginPath();
            ctx.arc(screenMirror.x, screenMirror.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = colors.jointFill;
            ctx.beginPath();
            ctx.arc(screenMirror.x, screenMirror.y, radius - 2 * uiScale, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }
    
    // Pan mode indicator
    if (spacePressed || isPanning) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(canvas.width / 2 - 60, 10, 120, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Pan Mode', canvas.width / 2, 30);
    }
    
  }, [image, imageDimensions, viewTransform, roi, roiDrag, midlineX, draggingMidline, 
      scaleBar, joints, currentJoint, draggingJoint, annotationScale, stage, 
      getAllJoints, imageToScreen, mirrorPoint, showMirrored, spacePressed, isPanning,
      colors, darkAnnotations, getMidlineHandleY]);

  // Export image with annotations
  const exportAnnotatedImage = useCallback(() => {
    if (!roi || !imageRef.current) return null;
    
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');
    const img = imageRef.current;
    
    // Set canvas to ROI size
    exportCanvas.width = roi.width;
    exportCanvas.height = roi.height;
    
    // Draw cropped image
    ctx.drawImage(img, roi.x, roi.y, roi.width, roi.height, 0, 0, roi.width, roi.height);
    
    const uiScale = annotationScale;
    const offsetX = -roi.x;
    const offsetY = -roi.y;
    
    // Draw midline
    if (midlineX !== null) {
      const localMidlineX = midlineX + offsetX;
      ctx.strokeStyle = colors.midline;
      ctx.lineWidth = 2 * uiScale;
      ctx.setLineDash([10 * uiScale, 5 * uiScale]);
      ctx.beginPath();
      ctx.moveTo(localMidlineX, 0);
      ctx.lineTo(localMidlineX, roi.height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Draw scale bar
    const localScaleX = scaleBar.x + offsetX;
    const localScaleY = scaleBar.y + offsetY;
    
    ctx.strokeStyle = colors.scale;
    ctx.lineWidth = 3 * uiScale;
    ctx.beginPath();
    ctx.moveTo(localScaleX, localScaleY);
    ctx.lineTo(localScaleX + scaleBar.length, localScaleY);
    ctx.stroke();
    
    const capHeight = 12 * uiScale;
    ctx.beginPath();
    ctx.moveTo(localScaleX, localScaleY - capHeight);
    ctx.lineTo(localScaleX, localScaleY + capHeight);
    ctx.moveTo(localScaleX + scaleBar.length, localScaleY - capHeight);
    ctx.lineTo(localScaleX + scaleBar.length, localScaleY + capHeight);
    ctx.stroke();
    
    ctx.font = `bold ${12 * uiScale}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.scaleText;
    ctx.fillText(`${scaleBar.realValue} ${scaleBar.unit}`, localScaleX + scaleBar.length / 2, localScaleY - 15 * uiScale);
    
    // Draw bones
    const allJoints = getAllJoints();
    
    TOPOLOGY.bones.forEach(bone => {
      const from = allJoints[bone.from];
      const to = allJoints[bone.to];
      
      if (from && to) {
        ctx.strokeStyle = bone.side ? colors.boneSide : colors.boneMidline;
        ctx.lineWidth = 3 * uiScale;
        ctx.beginPath();
        ctx.moveTo(from.x + offsetX, from.y + offsetY);
        ctx.lineTo(to.x + offsetX, to.y + offsetY);
        ctx.stroke();
        
        if (showMirrored && bone.side === 'right') {
          const mirroredFrom = mirrorPoint(from);
          const mirroredTo = mirrorPoint(to);
          if (mirroredFrom && mirroredTo) {
            ctx.strokeStyle = colors.boneMirrored;
            ctx.beginPath();
            ctx.moveTo(mirroredFrom.x + offsetX, mirroredFrom.y + offsetY);
            ctx.lineTo(mirroredTo.x + offsetX, mirroredTo.y + offsetY);
            ctx.stroke();
          }
        }
      }
    });
    
    // Draw joints
    Object.entries(joints).forEach(([id, pos]) => {
      const jointDef = TOPOLOGY.joints.find(j => j.id === id);
      const localX = pos.x + offsetX;
      const localY = pos.y + offsetY;
      const radius = 10 * uiScale;
      
      ctx.strokeStyle = jointDef?.midline ? colors.jointMidline : colors.jointSide;
      ctx.lineWidth = 2 * uiScale;
      ctx.beginPath();
      ctx.arc(localX, localY, radius, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.fillStyle = colors.jointFill;
      ctx.beginPath();
      ctx.arc(localX, localY, radius - 2 * uiScale, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.font = `${11 * uiScale}px monospace`;
      ctx.textAlign = 'left';
      ctx.fillStyle = colors.labelText;
      ctx.fillText(jointDef?.name || id, localX + radius + 4 * uiScale, localY + 4 * uiScale);
      
      if (showMirrored && jointDef?.side === 'right') {
        const mirrored = mirrorPoint(pos);
        if (mirrored) {
          ctx.strokeStyle = colors.boneMirrored;
          ctx.beginPath();
          ctx.arc(mirrored.x + offsetX, mirrored.y + offsetY, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    });
    
    return exportCanvas.toDataURL('image/png');
  }, [roi, midlineX, scaleBar, joints, getAllJoints, mirrorPoint, showMirrored, annotationScale, colors]);

  // Export functions
  const exportJSON = () => {
    const measurements = calculateMeasurements();
    const allJoints = getAllJoints();
    const pixelsPerUnit = scaleBar.length / scaleBar.realValue;
    
    const data = {
      metadata: {
        exportDate: new Date().toISOString(),
        roi,
        midlineX,
        scale: { pixelsPerUnit, unit: scaleBar.unit },
        imageDimensions,
      },
      joints: Object.entries(allJoints).map(([id, pos]) => ({
        id,
        name: TOPOLOGY.joints.find(j => j.id === id || j.id === id.replace('_l', '_r'))?.name,
        x_px: pos?.x,
        y_px: pos?.y,
        x_units: pos ? pos.x / pixelsPerUnit : null,
        y_units: pos ? pos.y / pixelsPerUnit : null,
      })),
      bones: measurements.bones,
      angles: measurements.angles,
    };
    
    if (exportWithImage) {
      data.annotatedImage = exportAnnotatedImage();
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'planiform_measurements.json';
    a.click();
  };

  const exportCSV = () => {
    const measurements = calculateMeasurements();
    let csv = 'Type,Name,Side,Value,Unit\n';
    measurements.bones.forEach(bone => {
      csv += `Bone,${bone.name},${bone.side},${bone.length?.toFixed(3) || 'N/A'},${scaleBar.unit}\n`;
    });
    measurements.angles.forEach(angle => {
      csv += `Angle,${angle.joint} (${angle.bones.join(' - ')}),${angle.joint.includes('_r') ? 'right' : 'midline'},${angle.angle},degrees\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'planiform_measurements.csv';
    a.click();
    
    // Also export image if enabled
    if (exportWithImage) {
      const imageData = exportAnnotatedImage();
      if (imageData) {
        const imgLink = document.createElement('a');
        imgLink.href = imageData;
        imgLink.download = 'planiform_annotated.png';
        imgLink.click();
      }
    }
  };

  const stageConfig = {
    [STAGES.LOAD]: { title: 'Load Image', instruction: 'Upload a planiform image to begin', color: '#888' },
    [STAGES.ROI]: { title: 'Select ROI', instruction: 'Click and drag to select the region of interest', color: '#00aa66' },
    [STAGES.MIDLINE]: { title: 'Set Midline', instruction: 'Drag the handle at bottom to position midline', color: '#cc4444' },
    [STAGES.SCALE]: { title: 'Adjust Scale', instruction: 'Drag scale bar to a known reference length', color: '#aa8800' },
    [STAGES.ANNOTATE]: { title: 'Annotate Joints', instruction: `Click to place: ${currentJoint?.name || 'Complete!'}`, color: '#4488cc' },
    [STAGES.REVIEW]: { title: 'Review & Export', instruction: 'Drag joints to adjust, then export', color: '#8866aa' },
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
            <span style={{ fontSize: '24px' }}>🐿️</span> Planiform Analyzer
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
            Space + drag to pan
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
            📁 Load Image
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
                    width: '60px',
                    padding: '6px 8px',
                    background: '#21262d',
                    border: '1px solid #30363d',
                    borderRadius: '4px',
                    color: '#e6edf3',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                  }}
                />
                <input
                  type="text"
                  value={scaleBar.unit}
                  onChange={(e) => setScaleBar(prev => ({ ...prev, unit: e.target.value }))}
                  style={{
                    width: '50px',
                    padding: '6px 8px',
                    background: '#21262d',
                    border: '1px solid #30363d',
                    borderRadius: '4px',
                    color: '#e6edf3',
                    fontFamily: 'inherit',
                    fontSize: '12px',
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
                type="range"
                min="0.5"
                max="2"
                step="0.1"
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
                    flex: 1,
                    padding: '8px',
                    background: darkAnnotations ? '#21262d' : 'transparent',
                    border: darkAnnotations ? '1px solid #58a6ff' : '1px solid #30363d',
                    borderRadius: '4px',
                    color: darkAnnotations ? '#58a6ff' : '#8b949e',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '11px',
                  }}
                >
                  Dark (light bg)
                </button>
                <button
                  onClick={() => setDarkAnnotations(false)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: !darkAnnotations ? '#21262d' : 'transparent',
                    border: !darkAnnotations ? '1px solid #58a6ff' : '1px solid #30363d',
                    borderRadius: '4px',
                    color: !darkAnnotations ? '#58a6ff' : '#8b949e',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '11px',
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
                Joints ({Object.keys(joints).length}/{sortedJoints.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '180px', overflowY: 'auto' }}>
                {sortedJoints.map((j, i) => (
                  <button
                    key={j.id}
                    onClick={() => setCurrentJointIndex(i)}
                    style={{
                      padding: '6px 10px',
                      background: joints[j.id] ? 'rgba(46, 160, 67, 0.15)' : 'transparent',
                      border: currentJointIndex === i ? '1px solid #58a6ff' : '1px solid transparent',
                      borderRadius: '4px',
                      color: joints[j.id] ? '#3fb950' : '#8b949e',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: '11px',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{j.name}</span>
                    <span>{joints[j.id] ? '✓' : '○'}</span>
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
                  type="checkbox"
                  checked={showMirrored}
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
                  type="checkbox"
                  checked={exportWithImage}
                  onChange={(e) => setExportWithImage(e.target.checked)}
                  style={{ accentColor: '#58a6ff' }}
                />
                Include annotated ROI image
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={exportJSON} style={{
                  flex: 1, padding: '8px', background: '#21262d', border: '1px solid #30363d',
                  borderRadius: '4px', color: '#e6edf3', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px',
                }}>
                  📄 JSON
                </button>
                <button onClick={exportCSV} style={{
                  flex: 1, padding: '8px', background: '#21262d', border: '1px solid #30363d',
                  borderRadius: '4px', color: '#e6edf3', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px',
                }}>
                  📊 CSV
                </button>
              </div>
            </section>
          )}
        </aside>

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
              <div style={{ fontSize: '72px', marginBottom: '16px', opacity: 0.5 }}>🐿️</div>
              <p style={{ fontSize: '14px' }}>Load a planiform image to begin analysis</p>
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
                onClick={() => setViewTransform(v => ({ ...v, scale: Math.max(0.1, v.scale * 0.8) }))}
                style={{
                  width: '32px', height: '32px', background: 'transparent', border: 'none',
                  borderRadius: '4px', color: '#e6edf3', cursor: 'pointer', fontSize: '16px',
                }}
              >−</button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '11px', color: '#8b949e' }}>
                {(viewTransform.scale * 100).toFixed(0)}%
              </span>
              <button
                onClick={() => setViewTransform(v => ({ ...v, scale: Math.min(5, v.scale * 1.25) }))}
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
                  {calculateMeasurements().bones.filter(b => b.length).map(bone => (
                    <div key={bone.id} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '4px 0', borderBottom: '1px solid #21262d', fontSize: '11px',
                    }}>
                      <span style={{ color: '#8b949e' }}>{bone.name}</span>
                      <span style={{ color: '#3fb950', fontWeight: 500 }}>
                        {bone.length?.toFixed(2)} {scaleBar.unit}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div>
                  <h4 style={{ margin: '0 0 8px', fontSize: '12px', color: '#d29922' }}>Joint Angles</h4>
                  {calculateMeasurements().angles.map((angle, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '4px 0', borderBottom: '1px solid #21262d', fontSize: '11px',
                    }}>
                      <span style={{ color: '#8b949e' }}>{angle.joint.replace('_r', '').replace(/_/g, ' ')}</span>
                      <span style={{ color: '#d29922', fontWeight: 500 }}>{angle.angle}°</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: '#8b949e', fontSize: '12px' }}>Place joints to see measurements</p>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};

export default PlaniformAnalyzer;