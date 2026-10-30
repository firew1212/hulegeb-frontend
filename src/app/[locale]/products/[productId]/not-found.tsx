import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { cookies } from "next/headers";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function NotFound() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("locale")?.value ?? "en";
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  return (
    <main>
      <section className="section">
        <Container>
          <h1 className="text-3xl font-semibold tracking-tight">
            {dict.product.notFoundTitle}
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            {dict.product.notFoundDescription}
          </p>
          <div className="mt-6">
            <Button href={`/${locale}/catalog`} size="md">
              {dict.common.backToCatalog}
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
