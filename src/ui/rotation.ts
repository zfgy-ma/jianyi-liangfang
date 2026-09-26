/** 自适应取景时的典型缩放，作为转速基准 */
const BASE_SCALE = 0.05;
/** 基准缩放下拖动每像素转多少度 */
const DEGREE_PER_PIXEL = 0.4;
const MIN_PITCH = 5;

/**
 * 缩放越大转速越慢：放大 10 倍，拖同样的距离只转 1/10 的角度，
 * 否则放大后一拖就飞出画面。缩得比基准还远时保持基准速度，不再加速。
 */
export function rotationSpeed(scale: number): number {
  const factor = Math.min(1, Math.max(0.02, BASE_SCALE / Math.max(scale, 1e-6)));
  return DEGREE_PER_PIXEL * factor;
}

/**
 * 中键/单指拖动 → 相机角度。
 * 往右拖，画面跟着手往右转（yaw 减小）；往下拖抬高视线看屋顶（pitch 增大）。
 */
export function rotateCamera(
  camera: { yaw: number; pitch: number },
  deltaX: number,
  deltaY: number,
  options: { lockYaw?: boolean; scale?: number } = {},
): { yaw: number; pitch: number } {
  const speed = rotationSpeed(options.scale ?? BASE_SCALE);
  return {
    yaw: options.lockYaw ? camera.yaw : camera.yaw - deltaX * speed,
    // 往上拖 = 抬高视线看房顶，与常见三维软件的方向一致
    pitch: Math.max(MIN_PITCH, Math.min(90, camera.pitch - deltaY * speed)),
  };
}
