/**
 * Marquee strip of sample builder logos. Each "logo" is a styled wordmark
 * built from a small icon + the builder's name, so the section reads as a
 * real client roster without needing image assets.
 *
 * Sample names; replace with real logos once approved.
 */
import {
  Building2,
  Castle,
  Compass,
  Hexagon,
  Landmark,
  Mountain,
  TreePine,
  Waves,
} from 'lucide-react';

const CLIENTS = [
  { name: 'Sterling Estates', icon: Building2 },
  { name: 'Aurum Realty', icon: Landmark },
  { name: 'Northbridge Developers', icon: Compass },
  { name: 'Vastu Habitat', icon: Hexagon },
  { name: 'Greenfield Township', icon: TreePine },
  { name: 'Royal Heritage Group', icon: Castle },
  { name: 'Lakeshore Realtors', icon: Waves },
  { name: 'Summit Infra', icon: Mountain },
] as const;

export function ClientStrip() {
  // Duplicate so the marquee loops seamlessly.
  const items = [...CLIENTS, ...CLIENTS];

  return (
    <section
      id="clients-strip"
      className="relative border-y border-slate-200 bg-white py-8 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8 mb-6">
        <p className="text-center text-xs uppercase tracking-[0.22em] text-slate-500">
          Trusted by leading developers across India
        </p>
      </div>

      {/* Fade-edge mask */}
      <div
        className="relative"
        style={{
          maskImage:
            'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)',
        }}
      >
        <div className="animate-rest-marquee flex gap-14 whitespace-nowrap w-max items-center">
          {items.map(({ name, icon: Icon }, i) => (
            <div
              key={`${name}-${i}`}
              className="flex items-center gap-2.5 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <Icon className="w-5 h-5" />
              <span className="font-semibold tracking-tight text-[15px]">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
