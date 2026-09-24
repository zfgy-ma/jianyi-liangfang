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
  onPickPoint: (pointId: string) => void;
  onPickWall: (wallId: string) => void;
}

export function PlanShapes({
  project,
  viewport,
  activePointId,
  selectedWallId,
  draftWallIds,
  onPickPoint,
  onPickWall,
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

  return (
    <g>
      {bodies.map((body) => (
        <polygon
          key={`body-${body.wallId}`}
          className={
            conflicts.has(body.wallId) ? 'wall-body wall-body-conflict' : 'wall-body'
          }
          points={body.polygon
            .map((position) => {
              const screen = toScreen(viewport, position);
              return `${screen.x},${screen.y}`;
            })
            .join(' ')}
          onClick={(event) => {
            event.stopPropagation();
            onPickWall(body.wallId);
          }}
        />
      ))}

      <PlanOpenings
        project={project}
        viewport={viewport}
        selectedWallId={selectedWallId}
        draftIds={draftIds}
        conflictIds={conflicts}
        onPickWall={onPickWall}
      />

      {walls.map(({ wall, start, end, length }) => (
        <text
          key={`length-${wall.id}`}
          className="wall-length"
          x={(start.x + end.x) / 2}
          y={(start.y + end.y) / 2 - 6}
          textAnchor="middle"
        >
          {length}
        </text>
      ))}

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
            onClick={(event) => {
              event.stopPropagation();
              onPickPoint(point.id);
            }}
          />
        );
      })}
    </g>
  );
}
