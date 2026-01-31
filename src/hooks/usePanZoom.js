import { useState, useCallback, useEffect } from 'react';

export const usePanZoom = (canvasRef, containerRef, { imageRotation = 0, rotationCenter = null } = {}) => {
  const [viewTransform, setViewTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [lastPanOffset, setLastPanOffset] = useState({ x: 0, y: 0 });

  const rad = imageRotation * Math.PI / 180;
  const cx = rotationCenter?.x || 0;
  const cy = rotationCenter?.y || 0;

  const screenToImage = useCallback((screenX, screenY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    // Undo pan+scale
    let imageX = (canvasX - viewTransform.offsetX) / viewTransform.scale;
    let imageY = (canvasY - viewTransform.offsetY) / viewTransform.scale;

    // Undo rotation around rotationCenter
    if (rad !== 0) {
      const dx = imageX - cx;
      const dy = imageY - cy;
      const cosR = Math.cos(-rad);
      const sinR = Math.sin(-rad);
      imageX = cx + dx * cosR - dy * sinR;
      imageY = cy + dx * sinR + dy * cosR;
    }

    return { x: imageX, y: imageY };
  }, [viewTransform, canvasRef, rad, cx, cy]);

  const imageToScreen = useCallback((imageX, imageY) => {
    let x = imageX;
    let y = imageY;

    // Apply rotation around rotationCenter
    if (rad !== 0) {
      const dx = x - cx;
      const dy = y - cy;
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);
      x = cx + dx * cosR - dy * sinR;
      y = cy + dx * sinR + dy * cosR;
    }

    return {
      x: x * viewTransform.scale + viewTransform.offsetX,
      y: y * viewTransform.scale + viewTransform.offsetY
    };
  }, [viewTransform, rad, cx, cy]);

  const zoomToROI = useCallback((roiRect) => {
    if (!containerRef.current || !roiRect) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const padding = 0.1;
    const roiWidthWithPadding = roiRect.width * (1 + 2 * padding);
    const roiHeightWithPadding = roiRect.height * (1 + 2 * padding);

    const scaleX = containerWidth / roiWidthWithPadding;
    const scaleY = containerHeight / roiHeightWithPadding;
    const newScale = Math.min(scaleX, scaleY, 3);

    const roiCenterX = roiRect.x + roiRect.width / 2;
    const roiCenterY = roiRect.y + roiRect.height / 2;

    const offsetX = containerWidth / 2 - roiCenterX * newScale;
    const offsetY = containerHeight / 2 - roiCenterY * newScale;

    setViewTransform({ scale: newScale, offsetX, offsetY });
  }, [containerRef]);

  const startPan = useCallback((screenX, screenY) => {
    setIsPanning(true);
    setPanStart({ x: screenX, y: screenY });
    setLastPanOffset({ x: viewTransform.offsetX, y: viewTransform.offsetY });
  }, [viewTransform]);

  const updatePan = useCallback((screenX, screenY) => {
    if (!isPanning || !panStart) return false;
    const dx = screenX - panStart.x;
    const dy = screenY - panStart.y;
    setViewTransform(prev => ({
      ...prev,
      offsetX: lastPanOffset.x + dx,
      offsetY: lastPanOffset.y + dy
    }));
    return true;
  }, [isPanning, panStart, lastPanOffset]);

  const endPan = useCallback(() => {
    setIsPanning(false);
    setPanStart(null);
  }, []);

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

  return {
    viewTransform, setViewTransform,
    isPanning, spacePressed,
    screenToImage, imageToScreen, zoomToROI,
    startPan, updatePan, endPan,
  };
};
