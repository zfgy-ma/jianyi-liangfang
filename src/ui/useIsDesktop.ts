import { useEffect, useState } from 'react';

const DESKTOP_QUERY = '(min-width: 900px)';

/** 桌面端与手机端用两套布局，不是简单缩放同一套界面 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' || !window.matchMedia
      ? false
      : window.matchMedia(DESKTOP_QUERY).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const handleChange = () => setIsDesktop(query.matches);
    handleChange();
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return isDesktop;
}
