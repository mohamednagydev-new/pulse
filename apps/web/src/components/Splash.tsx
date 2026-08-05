import PulseLoader from './PulseLoader';

export default function Splash() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center fitness-hero text-white">
      <div className="animate-pop text-5xl font-extrabold italic tracking-tight" style={{ animation: 'floatY 2.4s ease-in-out infinite' }}>PULSE</div>
      <div className="mt-2 text-xs uppercase tracking-[0.25em] opacity-80">A Fresh Start To Get Healthy</div>
      <PulseLoader className="mt-6 text-white/90" size={140} />
    </div>
  );
}
