import { useEffect } from 'react';
import type { MoveDirection } from '../core/types';
import { useProjectStore } from '../store/useProjectStore';

/**
 * 桌面端物理键盘录入。
 * WASD 对应屏幕上的北、西、南、东（W 在最上面，就是屏幕的北），
 * Q/Z 对应竖直方向的上、下，数字直接输入，回车落线。
 */
const KEY_DIRECTION: Record<string, MoveDirection> = {
  w: 'N',
  a: 'W',
  s: 'S',
  d: 'E',
  q: 'U',
  z: 'D',
};

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.isContentEditable
  );
}

export function useKeyboardInput(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const store = useProjectStore.getState();
      const key = event.key.toLowerCase();

      if (event.ctrlKey || event.metaKey) {
        if (key === 'z') {
          event.preventDefault();
          if (event.shiftKey) store.redo();
          else store.undo();
        } else if (key === 'y') {
          event.preventDefault();
          store.redo();
        }
        return;
      }

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        store.pressDigit(event.key);
        return;
      }
      if (event.key === 'Backspace') {
        event.preventDefault();
        store.pressBackspace();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        store.confirmDraw();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        store.cancelInput();
        return;
      }

      const direction = KEY_DIRECTION[key];
      if (direction) {
        event.preventDefault();
        store.pressDirection(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
