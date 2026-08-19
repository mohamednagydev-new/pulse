import { Navigate } from 'react-router-dom';

/**
 * The workout hub was merged into the single "Train" screen at /programs —
 * they overlapped almost entirely (both rendered the muscle grid). The route
 * stays registered in App.tsx and this stub keeps every old link, bookmark
 * and push-notification URL working.
 */
export default function WorkoutHub() {
  return <Navigate to="/programs" replace />;
}
