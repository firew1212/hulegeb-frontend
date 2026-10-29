import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

export default function Home() {
  return (
    <main>
      <section className="section">
        <Container>
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-accent">Hulegeb</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              A marketplace for Injibara, built with care.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Hulegeb is an early-stage bilingual marketplace connecting buyers
              and sellers in Injibara, Amhara, Ethiopia, in both Amharic and
              English. The platform is under active development.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button href="/#about" size="lg">
                Learn more
              </Button>
              <Button href="/#approach" variant="ghost" size="lg">
                Our approach
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <section id="about" className="section border-t border-border bg-muted">
        <Container>
          <SectionHeading
            eyebrow="About"
            title="A calm, considered foundation"
            description="Hulegeb is being shaped around clarity, accessibility, and the practical needs of a local marketplace. No inventory or transactions are live yet."
          />
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="text-base font-semibold">Bilingual by design</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Content will be available in Amharic and English, with layouts
                that respect both scripts.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold">Local first</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Built for the community in Injibara, with Ethiopian birr as the
                currency.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold">Premium and practical</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                A restrained visual language that keeps attention on products and
                people, not decoration.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section id="approach" className="section border-t border-border">
        <Container>
          <SectionHeading
            eyebrow="Approach"
            title="Design that serves the marketplace"
            description="Hulegeb follows an Apple-inspired design direction: strong hierarchy, confident typography, generous spacing, and restrained color. The principles are adapted to a real, bilingual, local marketplace rather than copied."
          />
          <div className="mt-8 max-w-3xl space-y-4 text-base leading-relaxed text-muted-foreground">
            <p>
              Every interface element is chosen for clarity and usability. Visual
              decoration is kept to a minimum so products, sellers, and buyers
              remain the focus.
            </p>
            <p>
              The design system is built to support both Amharic and English
              content, with appropriate font fallbacks and responsive layouts for
              mobile, tablet, and desktop.
            </p>
          </div>
        </Container>
      </section>
    </main>
  );
}
