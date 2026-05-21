import { cookies } from 'next/headers';
import { Nav } from './_components/Nav';
import { Hero } from './_components/Hero';
import { ClientStrip } from './_components/ClientStrip';
import { Solutions } from './_components/Solutions';
import { AISection } from './_components/AISection';
import { Stats } from './_components/Stats';
import { Process } from './_components/Process';
import { Testimonials } from './_components/Testimonials';
import { Comparison } from './_components/Comparison';
import { DemoCTA } from './_components/DemoCTA';
import { Footer } from './_components/Footer';

/**
 * Marketing landing page at `/`. Public — does not require auth.
 *
 * If the visitor happens to be signed in, we pass a flag down so the Nav
 * shows an "Open console" CTA instead of "Sign in"/"Book a demo".
 */
export default async function MarketingPage() {
  const jar = await cookies();
  const isAuthed = Boolean(jar.get('rest_access')?.value);

  return (
    <>
      <Nav isAuthed={isAuthed} />
      <main>
        <Hero isAuthed={isAuthed} />
        <ClientStrip />
        <Solutions />
        <AISection />
        <Stats />
        <Process />
        <Testimonials />
        <Comparison />
        <DemoCTA />
      </main>
      <Footer />
    </>
  );
}
