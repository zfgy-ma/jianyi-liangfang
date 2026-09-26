import { useMemo } from 'react';
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
}

export function PlanShapes({
  project,
  viewport,
  activePointId,
  selectedWallId,
  draftWallIds,
}: PlanShapesProps) {
  const draftIds = useMemo(() => new Set(draftWallIds), [draftWallIds]);
  const bodies = useMemo(() => buildWallBodies(project), [project]);
  const conflicts = useMemo(
    () => new Set(findWallConflicts(project).map((item) => item.wallId)),
    [project],
  );

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
      {bodies.map((body) => (
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
      ))}

      <PlanOpenings
        project={project}
        viewport={viewport}
        selectedWallId={selectedWallId}
        draftIds={draftIds}
        conflictIds={conflicts}
        labelHeight={labelHeight}
      />

      {Object.values(project.points).map((point) => {
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
