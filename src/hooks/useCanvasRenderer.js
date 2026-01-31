import { useEffect } from 'react';
import { TOPOLOGY, STAGES } from '../constants';

export const useCanvasRenderer = ({
  canvasRef, containerRef, imageRef,
  image, imageDimensions, viewTransform,
  roi, roiDrag, midlineX, draggingMidline,
  scaleBar, joints, currentJoint, draggingJoint,
  annotationScale, stage, showMirrored, spacePressed, isPanning,
  colors, darkAnnotations,
  getAllJoints, imageToScreen, mirrorPoint, getMidlineHandleY,
  imageRotation, rotationCenter,
}) => {
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

    // Apply rotation around the rotation center
    const rad = (imageRotation || 0) * Math.PI / 180;
    if (rad !== 0 && rotationCenter) {
      ctx.translate(rotationCenter.x, rotationCenter.y);
      ctx.rotate(rad);
      ctx.translate(-rotationCenter.x, -rotationCenter.y);
    }

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

    // Draw midline
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

      const handleY = getMidlineHandleY();
      ctx.fillStyle = draggingMidline ? colors.midlineHandleActive : colors.midlineHandle;
      ctx.beginPath();
      ctx.arc(screenMidline.x, handleY, 10 * uiScale, 0, Math.PI * 2);
      ctx.fill();

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

        const labelYOffset = jointDef?.midline ? -radius - 2 * uiScale : radius + 12 * uiScale;
        ctx.font = `${11 * uiScale}px monospace`;
        ctx.textAlign = 'left';
        ctx.fillStyle = colors.labelShadow;
        ctx.fillText(jointDef?.name || id, screenPos.x + radius + 4 * uiScale + 1, screenPos.y + labelYOffset + 1);
        ctx.fillStyle = colors.labelText;
        ctx.fillText(jointDef?.name || id, screenPos.x + radius + 4 * uiScale, screenPos.y + labelYOffset);

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

  }, [canvasRef, containerRef, imageRef,
      image, imageDimensions, viewTransform, roi, roiDrag, midlineX, draggingMidline,
      scaleBar, joints, currentJoint, draggingJoint, annotationScale, stage,
      getAllJoints, imageToScreen, mirrorPoint, showMirrored, spacePressed, isPanning,
      colors, darkAnnotations, getMidlineHandleY, imageRotation, rotationCenter]);
};
