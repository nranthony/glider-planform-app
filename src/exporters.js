import { TOPOLOGY } from './constants';
import { distance, calculateAngle, getMirroredId } from './utils';

export const getAllJoints = (joints, mirrorPoint) => {
  const all = { ...joints };
  Object.entries(joints).forEach(([id, pos]) => {
    const mirroredId = getMirroredId(id);
    if (mirroredId && !all[mirroredId]) {
      all[mirroredId] = mirrorPoint(pos);
    }
  });
  return all;
};

export const calculateMeasurements = (allJoints, scaleBar) => {
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
};

export const exportAnnotatedImage = ({
  roi, imageRef, midlineX, scaleBar, joints, colors,
  getAllJointsFn, mirrorPoint, showMirrored, annotationScale,
}) => {
  if (!roi || !imageRef.current) return null;

  const exportCanvas = document.createElement('canvas');
  const ctx = exportCanvas.getContext('2d');
  const img = imageRef.current;

  exportCanvas.width = roi.width;
  exportCanvas.height = roi.height;

  ctx.drawImage(img, roi.x, roi.y, roi.width, roi.height, 0, 0, roi.width, roi.height);

  const uiScale = annotationScale;
  const offsetX = -roi.x;
  const offsetY = -roi.y;

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

  const allJoints = getAllJointsFn();

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
};

export const downloadJSON = ({
  allJoints, measurements, roi, midlineX, scaleBar, imageDimensions,
  exportWithImage, exportAnnotatedImageFn,
}) => {
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
    data.annotatedImage = exportAnnotatedImageFn();
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'planiform_measurements.json';
  a.click();
};

export const downloadCSV = ({
  measurements, scaleBar, exportWithImage, exportAnnotatedImageFn,
}) => {
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

  if (exportWithImage) {
    const imageData = exportAnnotatedImageFn();
    if (imageData) {
      const imgLink = document.createElement('a');
      imgLink.href = imageData;
      imgLink.download = 'planiform_annotated.png';
      imgLink.click();
    }
  }
};
