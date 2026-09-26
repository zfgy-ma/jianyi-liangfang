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
      {extrude
        ? bodies.map((body) => {
            const wall = project.walls[body.wallId];
            if (!wall) return null;
            const height = effectiveWallHeight(project, wall);
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
                {body.polygon.map((point, index) => {
                  const base = toScreen(viewport, point);
                  return (
                    <line
                      key={`${body.wallId}-edge-${index}`}
                      className="wall-edge"
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
