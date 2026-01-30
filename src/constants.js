export const TOPOLOGY = {
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

export const STAGES = {
  LOAD: 'load',
  ROI: 'roi',
  MIDLINE: 'midline',
  SCALE: 'scale',
  ANNOTATE: 'annotate',
  REVIEW: 'review'
};

export const SORTED_JOINTS = [...TOPOLOGY.joints].sort((a, b) => a.order - b.order);

export const STAGE_CONFIG = {
  [STAGES.LOAD]: { title: 'Load Image', instruction: 'Upload a planiform image to begin', color: '#888' },
  [STAGES.ROI]: { title: 'Select ROI', instruction: 'Click and drag to select the region of interest', color: '#00aa66' },
  [STAGES.MIDLINE]: { title: 'Set Midline', instruction: 'Drag the handle at bottom to position midline', color: '#cc4444' },
  [STAGES.SCALE]: { title: 'Adjust Scale', instruction: 'Drag scale bar to a known reference length', color: '#aa8800' },
  [STAGES.ANNOTATE]: { title: 'Annotate Joints', color: '#4488cc' },
  [STAGES.REVIEW]: { title: 'Review & Export', instruction: 'Drag joints to adjust, then export', color: '#8866aa' },
};

export const DARK_COLORS = {
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
};

export const LIGHT_COLORS = {
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
