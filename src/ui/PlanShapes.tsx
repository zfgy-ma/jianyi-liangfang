import { useMemo } from 'react';
import { effectiveWallHeight } from '../core/facade';
import { lengthBetween } from '../core/geometry';
import type { Project } from '../core/types';
import { findWallConflicts } from '../core/validate';
import { buildWallBodies } from '../core/wallOffset';
import { PlanOpenings } from './PlanOpenings';
import { toScreen, type Viewport } from './viewport';

interface PlanShapesProps {
  project: Project;
  viewport: Viewport;
  activePointId: string | null;
  selectedWallId: string | null;
  draftWallIds: string[];
  /** 是否把墙体挤出高度（三维、等轴测视图） */
  extrude?: boolean;
}

export function PlanShapes({
  project,
  viewport,
  activePointId,
  selectedWallId,
  draftWallIds,
  extrude = false,
}: PlanShapesProps) {
  const draftIds = useMemo(() => new Set(draftWallIds), [draftWallIds]);
  // 俯角小于 12 度时平面已经贴到地平线，只保留挤出后的墙面
  const showPlan = viewport.pitch >= 12;
  // 立面视角：直接画墙面片，不再画立体盒子
  const nearElevation = viewport.pitch < 30;
  const lookingAlongX = Math.abs(Math.cos((viewport.yaw * Math.PI) / 180)) < 0.7;
  const faceWalls = nearElevation
    ? Object.values(project.walls).filter((wall) => {
        if (wall.isHelper) return false;
        const from = project.points[wall.startPointId];
        const to = project.points[wall.endPointId];
        if (!from || !to || from.z !== to.z) return false;
        // 选中了就只看这一面；没选就显示所有正对观察者的墙面
        if (selectedWallId) return wall.id === selectedWallId;
        const runsEastWest = from.y === to.y;
        return runsEastWest !== lookingAlongX;
      })
    : [];
  const yawRad = (viewport.yaw * Math.PI) / 180;
  /** 沿视线方向的进深：值越大越远，按它排序后用实心墙面互相遮挡 */
  const depthOf = (wallId: string): number => {
    const wall = project.walls[wallId];
    const from = wall ? project.points[wall.startPointId] : undefined;
    const to = wall ? project.points[wall.endPointId] : undefined;
    if (!from || !to) return 0;
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    return -midX * Math.sin(yawRad) + midY * Math.cos(yawRad);
  };
  // 远的先画、近的后画，近处的实心墙就把后面的线挡住了
  const orderedFaceWalls = [...faceWalls].sort(
    (left, right) => depthOf(right.id) - depthOf(left.id),
  );
  const bodies = useMemo(() => buildWallBodies(project), [project]);
  const conflicts = useMemo(
    () => new Set(findWallConflicts(project).map((item) => item.wallId)),
    [project],
  );

  /** 按方向给线条/体量分色：东西红、南北绿、上下蓝 */
  const axisOf = (wallId: string): 'ew' | 'ns' | 'ud' => {
    const wall = project.walls[wallId];
    const start = wall ? project.points[wall.startPointId] : undefined;
    const end = wall ? project.points[wall.endPointId] : undefined;
    if (!start || !end) return 'ns';
    if (start.z !== end.z) return 'ud';
    return start.y === end.y ? 'ew' : 'ns';
  };

  const walls = Object.values(project.walls).map((wall) => {
    const startPoint = project.points[wall.startPointId];
    const endPoint = project.points[wall.endPointId];
    return {
      wall,
      start: toScreen(viewport, startPoint),
      end: toScreen(viewport, endPoint),
      length: lengthBetween(startPoint, endPoint),
    };
    });

  // 长度数字的字高按户型尺寸给，缩放时等比变化，和 CAD 一致
  const span = walls.reduce((current, item) => Math.max(current, item.length), 0);
  const labelHeight = Math.max(120, Math.round(span * 0.04));

  return (
    <g>
      {extrude && !nearElevation
        ? bodies.map((body) => {
            const wall = project.walls[body.wallId];
            if (!wall) return null;
            const height = effectiveWallHeight(project, wall);
            const startPoint = project.points[wall.startPointId];
            const endPoint = project.points[wall.endPointId];
            if (!startPoint || !endPoint) return null;
            const wallLength = lengthBetween(startPoint, endPoint);
            const midBase = toScreen(viewport, {
              x: (startPoint.x + endPoint.x) / 2,
              y: (startPoint.y + endPoint.y) / 2,
              z: startPoint.z,
            });
            const labelPx = Math.max(labelHeight * viewport.scale, 14);
            const axis = axisOf(body.wallId);
            // 近立面视角下只标正对着观察者的墙：纵深的墙在立面上是侧着的，标长度会误导
            const nearElevation = viewport.pitch < 30;
            const lookingAlongX =
              Math.abs(Math.cos((viewport.yaw * Math.PI) / 180)) < 0.7;
            const showLength = !nearElevation || (axis === 'ew') !== lookingAlongX;
            const top = body.polygon.map((point) =>
              toScreen(viewport, { ...point, z: height }),
            );
            return (
              <g
                key={`solid-${body.wallId}`}
                className={`wall-solid wall-solid-${axisOf(body.wallId)}`}
              >
                {/* 四个竖直侧面：没有它，平视时只剩几根竖棱，看着就是空的 */}
                {body.polygon.map((point, index) => {
                  const next = body.polygon[(index + 1) % body.polygon.length];
                  const base = toScreen(viewport, point);
                  const baseNext = toScreen(viewport, next);
                  const topNext = toScreen(viewport, { ...next, z: height });
                  const topPoint = toScreen(viewport, { ...point, z: height });
                  return (
                    <polygon
                      key={`${body.wallId}-side-${index}`}
                      className="wall-side"
                      points={[
                        `${base.x},${base.y}`,
                        `${baseNext.x},${baseNext.y}`,
                        `${topNext.x},${topNext.y}`,
                        `${topPoint.x},${topPoint.y}`,
                      ].join(' ')}
                    />
                  );
                })}
                <polygon
                  className="wall-top"
                  data-wall-id={body.wallId}
                  points={top.map((point) => `${point.x},${point.y}`).join(' ')}
                />
                {/* 立面里的尺寸：底部标长度，左上角标墙高 */}
                {showLength ? (
                  <text
                    className={`wall-length wall-length-${axis}`}
                    x={midBase.x}
                    y={midBase.y + labelPx * 1.4}
                    fontSize={labelPx}
                    textAnchor="middle"
                  >
                    {Math.round(wallLength)}
                  </text>
                ) : null}
                {body.polygon.map((point, index) => {
                  const base = toScreen(viewport, point);
                  return (
                    <line
                      key={`${body.wallId}-edge-${index}`}
                      className="wall-edge wall-edge-vertical"
                      x1={base.x}
                      y1={base.y}
                      x2={top[index].x}
                      y2={top[index].y}
                    />
                  );
                })}
              </g>
            );
          })
        : null}
      {/* 立面视角：只画当前墙面的片，左右两条竖线是上下方向的蓝色 */}
      {orderedFaceWalls.map((wall) => {
        const from = project.points[wall.startPointId];
        const to = project.points[wall.endPointId];
        if (!from || !to) return null;
        const height = effectiveWallHeight(project, wall);
        const axis = axisOf(wall.id);
        const labelPx = Math.max(labelHeight * viewport.scale, 14);
        const baseA = toScreen(viewport, from);
        const baseB = toScreen(viewport, to);
        const topA = toScreen(viewport, { ...from, z: from.z + height });
        const topB = toScreen(viewport, { ...to, z: to.z + height });
        const wallLength = lengthBetween(from, to);
        return (
          <g key={`face-${wall.id}`} data-wall-id={wall.id}>
            <polygon
              className="wall-face"
              points={[baseA, baseB, topB, topA]
                .map((point) => `${point.x},${point.y}`)
                .join(' ')}
            />
            {/* 左右两条竖线：上下方向 → 蓝 */}
            <line
              className="wall-line wall-line-vertical"
              x1={baseA.x}
              y1={baseA.y}
              x2={topA.x}
              y2={topA.y}
            />
            <line
              className="wall-line wall-line-vertical"
              x1={baseB.x}
              y1={baseB.y}
              x2={topB.x}
              y2={topB.y}
            />
            {/* 上下两条横线：东西 / 南北 → 红 / 绿 */}
            <line
              className={`wall-line wall-line-${axis}`}
              x1={baseA.x}
              y1={baseA.y}
              x2={baseB.x}
              y2={baseB.y}
            />
            <line
              className={`wall-line wall-line-${axis}`}
              x1={topA.x}
              y1={topA.y}
              x2={topB.x}
              y2={topB.y}
            />
            {Object.values(project.openings)
              .filter((opening) => opening.wallId === wall.id)
              .map((opening) => {
                const leftRatio = opening.distance / Math.max(wallLength, 1);
                const rightRatio =
                  (opening.distance + opening.width) / Math.max(wallLength, 1);
                const x1 = baseA.x + (baseB.x - baseA.x) * leftRatio;
                const x2 = baseA.x + (baseB.x - baseA.x) * rightRatio;
                const yBase = baseA.y + (baseB.y - baseA.y) * leftRatio;
                const scaleY = Math.abs(topA.y - baseA.y) / Math.max(height, 1);
                return (
                  <rect
                    key={opening.id}
                    className={
                      opening.kind === 'window' ? 'elevation-opening' : 'elevation-door'
                    }
                    x={Math.min(x1, x2)}
                    y={yBase - (opening.sillHeight + opening.height) * scaleY}
                    width={Math.abs(x2 - x1)}
                    height={opening.height * scaleY}
                  />
                );
              })}
            <text
              className={`wall-length wall-length-${axis}`}
              x={(baseA.x + baseB.x) / 2}
              y={(baseA.y + baseB.y) / 2 + labelPx * 1.5}
              fontSize={labelPx}
              textAnchor="middle"
            >
              {Math.round(wallLength)}
            </text>
          </g>
        );
      })}

      {showPlan
        ? bodies.map((body) => (
        <polygon
          key={`body-${body.wallId}`}
          className={
            conflicts.has(body.wallId) ? 'wall-body wall-body-conflict' : 'wall-body'
          }
          data-wall-id={body.wallId}
          points={body.polygon
            .map((position) => {
              const screen = toScreen(viewport, position);
              return `${screen.x},${screen.y}`;
            })
            .join(' ')}
          />
          ))
        : null}

      <PlanOpenings
        project={project}
        viewport={viewport}
        selectedWallId={selectedWallId}
        draftIds={draftIds}
        conflictIds={conflicts}
        labelHeight={labelHeight}
        showPlan={showPlan}
      />

      {(showPlan ? Object.values(project.points) : []).map((point) => {
        const screen = toScreen(viewport, point);
        return (
          <circle
            key={point.id}
            className={
              point.id === activePointId ? 'plan-point plan-point-active' : 'plan-point'
            }
            cx={screen.x}
            cy={screen.y}
            r={point.id === activePointId ? 6 : 4}
            data-point-id={point.id}
          />
        );
      })}
    </g>
  );
}
