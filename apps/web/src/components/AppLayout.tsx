import { Outlet } from 'react-router-dom';

/** Padding wrapper for the 5 tab pages; the tab bar itself lives at App level
 * so it stays static while pages slide beneath it. */
export default function AppLayout() {
  return (
    <div className="safe-bottom min-h-screen">
      <Outlet />
    </div>
  );
}
