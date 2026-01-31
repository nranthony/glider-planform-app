import { useState, useCallback, useEffect } from 'react';

export const usePanZoom = (canvasRef, containerRef) => {
  const [viewTransform, setViewTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [lastPanOffset, setLastPanOffset] = useState({ x: 0, y: 0 });

  const screenToImage = useCallback((screenX, screenY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    const imageX = (canvasX - viewTransform.offsetX) / viewTransform.scale;
    const imageY = (canvasY - viewTransform.offsetY) / viewTransform.scale;

    return { x: imageX, y: imageY };
  }, [viewTransform, canvasRef]);

  const imageToScreen = useCallback((imageX, imageY) => {
    return {
      x: imageX * viewTransform.scale + viewTransform.offsetX,
      y: imageY * viewTransform.scale + viewTransform.offsetY
    };
  }, [viewTransform]);

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

  const zoomAtPoint = useCallback((factor, canvasX, canvasY) => {
    setViewTransform(prev => {
      const newScale = Math.min(5, Math.max(0.1, prev.scale * factor));
      const ratio = newScale / prev.scale;
      return {
        scale: newScale,
        offsetX: canvasX - (canvasX - prev.offsetX) * ratio,
        offsetY: canvasY - (canvasY - prev.offsetY) * ratio,
      };
    });
  }, []);

  const zoomAtCenter = useCallback((factor) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    zoomAtPoint(factor, cx, cy);
  }, [canvasRef, zoomAtPoint]);

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
    zoomAtPoint, zoomAtCenter,
  };
};
