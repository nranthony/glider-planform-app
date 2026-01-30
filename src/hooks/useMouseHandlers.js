import { useCallback } from 'react';
import { STAGES, SORTED_JOINTS } from '../constants';
import { distance } from '../utils';

export const useMouseHandlers = ({
  canvasRef, containerRef,
  stage, spacePressed, isPanning,
  screenToImage, imageToScreen, startPan, updatePan, endPan,
  viewTransform, annotationScale,
  // ROI
  roiDrag, setRoiDrag, setRoi, setMidlineX, setScaleBar, zoomToROI,
  // Midline
  midlineX, draggingMidline, setDraggingMidline,
  // Scale
  scaleBar, draggingScale, setDraggingScale,
  // Joints
  joints, setJoints, currentJoint, currentJointIndex, setCurrentJointIndex,
  draggingJoint, setDraggingJoint,
}) => {
  const getMidlineHandleY = useCallback(() => {
    if (!containerRef.current) return 30;
    return containerRef.current.clientHeight - 25;
  }, [containerRef]);

  const handleMouseDown = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const screenX = e.clientX;
    const screenY = e.clientY;
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;
    const imgCoords = screenToImage(screenX, screenY);

    if (spacePressed) {
      startPan(screenX, screenY);
      return;
    }

    if (stage === STAGES.ROI) {
      setRoiDrag({ startX: imgCoords.x, startY: imgCoords.y, currentX: imgCoords.x, currentY: imgCoords.y });
    } else if (stage === STAGES.MIDLINE) {
      const handleY = getMidlineHandleY();
      const screenMidline = midlineX !== null ? imageToScreen(midlineX, 0) : null;

      if (screenMidline && Math.abs(canvasX - screenMidline.x) < 20 && Math.abs(canvasY - handleY) < 20) {
        setDraggingMidline(true);
      } else if (midlineX === null) {
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

      for (const [jointId, pos] of Object.entries(joints)) {
        if (distance(imgCoords, pos) < hitRadius) {
          setDraggingJoint(jointId);
          return;
        }
      }

      const handleY = getMidlineHandleY();
      const screenMidline = midlineX !== null ? imageToScreen(midlineX, 0) : null;
      if (screenMidline && Math.abs(canvasX - screenMidline.x) < 20 && Math.abs(canvasY - handleY) < 20) {
        setDraggingMidline(true);
        return;
      }

      if (stage === STAGES.ANNOTATE && currentJoint) {
        setJoints(prev => ({ ...prev, [currentJoint.id]: imgCoords }));
        if (currentJointIndex < SORTED_JOINTS.length - 1) {
          setCurrentJointIndex(prev => prev + 1);
        }
      }
    }
  }, [canvasRef, screenToImage, imageToScreen, spacePressed, startPan, stage,
      midlineX, scaleBar, annotationScale, viewTransform.scale, joints,
      currentJoint, currentJointIndex, getMidlineHandleY,
      setRoiDrag, setDraggingMidline, setMidlineX, setDraggingScale,
      setDraggingJoint, setJoints, setCurrentJointIndex]);

  const handleMouseMove = useCallback((e) => {
    const screenX = e.clientX;
    const screenY = e.clientY;
    const imgCoords = screenToImage(screenX, screenY);

    if (updatePan(screenX, screenY)) return;

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
  }, [screenToImage, updatePan, stage, roiDrag, draggingMidline, draggingScale, draggingJoint,
      scaleBar.x, setRoiDrag, setMidlineX, setScaleBar, setJoints]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      endPan();
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
        setTimeout(() => zoomToROI(newRoi), 50);
      }
      setRoiDrag(null);
    }

    setDraggingMidline(false);
    setDraggingScale(null);
    setDraggingJoint(null);
  }, [isPanning, endPan, stage, roiDrag, zoomToROI,
      setRoi, setMidlineX, setScaleBar, setRoiDrag,
      setDraggingMidline, setDraggingScale, setDraggingJoint]);

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch = e.touches[0];
      startPan(touch.clientX, touch.clientY);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
    }
  }, [startPan, handleMouseDown]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch = e.touches[0];
      updatePan(touch.clientX, touch.clientY);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
  }, [updatePan, handleMouseMove]);

  return {
    handleMouseDown, handleMouseMove, handleMouseUp,
    handleTouchStart, handleTouchMove, handleTouchEnd: handleMouseUp,
    getMidlineHandleY,
  };
};
