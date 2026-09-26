/** 拖动每像素转多少度 */
const DEGREE_PER_PIXEL = 0.4;

/**
 * 中键/单指拖动 → 相机角度。
 * 往右拖，画面跟着手往右转（yaw 减小）；往下拖抬高视线看屋顶（pitch 增大）。
 */
export function rotateCamera(
  camera: { yaw: number; pitch: number },
  deltaX: number,
  deltaY: number,
  options: { lockYaw?: boolean } = {},
): { yaw: number; pitch: number } {
  // 最低留一点俯角：完全平视时地平面会塌成一条线，看不出图形
  const MIN_PITCH = 5;
  return {
    yaw: options.lockYaw ? camera.yaw : camera.yaw - deltaX * DEGREE_PER_PIXEL,
    pitch: Math.max(MIN_PITCH, Math.min(90, camera.pitch + deltaY * DEGREE_PER_PIXEL)),
  };
}
