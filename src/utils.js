export const getMirroredId = (id) => {
  if (id.endsWith('_r')) return id.replace('_r', '_l');
  if (id.endsWith('_l')) return id.replace('_l', '_r');
  return null;
};

export const distance = (p1, p2) => {
  if (!p1 || !p2) return null;
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const calculateAngle = (p1, pJoint, p2) => {
  if (!p1 || !pJoint || !p2) return null;
  const v1 = { x: p1.x - pJoint.x, y: p1.y - pJoint.y };
  const v2 = { x: p2.x - pJoint.x, y: p2.y - pJoint.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const cross = v1.x * v2.y - v1.y * v2.x;
  return Math.abs(Math.atan2(cross, dot) * (180 / Math.PI));
};
