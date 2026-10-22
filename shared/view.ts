/** View angles never grant position/speed authority; only normalized movement is sent. */
export function lookDelta(
  yaw: number,
  pitch: number,
  dx: number,
  dy: number,
  sensitivity = 0.0025,
) {
  return {
    yaw: yaw - dx * sensitivity,
    pitch: Math.max(-1.35, Math.min(1.35, pitch - dy * sensitivity)),
  };
}
export function viewDirection(yaw: number, x: number, z: number) {
  return {
    x: Math.cos(yaw) * x + Math.sin(yaw) * z,
    z: -Math.sin(yaw) * x + Math.cos(yaw) * z,
  };
}
