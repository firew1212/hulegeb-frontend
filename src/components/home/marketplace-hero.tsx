import { Container } from "@/components/ui/container";
import { HeroSearch } from "@/components/home/hero-search";
import type { Dictionary } from "@/i18n/dictionaries/en";

export function MarketplaceHero({
  content,
}: {
  content: Dictionary["home"];
}) {
  return (
    <section
      aria-labelledby="marketplace-hero-title"
      className="hero-marketplace relative isolate flex min-h-[29rem] items-center overflow-hidden bg-[#241d34] sm:min-h-[32rem] lg:min-h-[35rem]"
    >
      <div
        aria-hidden="true"
        className="hero-marketplace__image hero-marketplace__image--shop"
      />
      <div
        aria-hidden="true"
        className="hero-marketplace__image hero-marketplace__image--produce"
      />
      <div aria-hidden="true" className="hero-marketplace__scrim" />

      <Container className="relative z-10 py-12 sm:py-16 lg:py-20">
        <div className="hero-marketplace__content mx-auto w-full text-center">
          <h1
            id="marketplace-hero-title"
            className="hero-marketplace__title mx-auto max-w-5xl text-4xl font-bold leading-[1.08] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl"
          >
            {content.heroTitle}
          </h1>

          <div className="hero-marketplace__search mx-auto mt-8 w-full max-w-[52rem] sm:mt-10">
            <HeroSearch id="home-search" featured />
          </div>
        </div>
      </Container>
    </section>
  );
}
