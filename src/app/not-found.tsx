import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { defaultLocale, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export const instant = false;

export default async function NotFound() {
  const localeHeader = (await headers()).get("x-hulegeb-locale");
  const locale =
    localeHeader && isLocale(localeHeader) ? localeHeader : defaultLocale;
  const dict = getDictionary(locale);

  return (
    <main>
      <section className="section">
        <Container>
          <h1 className="text-3xl font-semibold tracking-tight">
            {dict.common.pageNotFoundTitle}
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            {dict.common.pageNotFoundDescription}
          </p>
          <div className="mt-6">
            <Button href={`/${locale}`} size="md">
              {dict.common.returnHome}
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
