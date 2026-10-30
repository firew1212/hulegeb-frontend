import { Suspense } from "react";

import { Container } from "@/components/ui/container";
import CatalogClient from "./catalog-client";

export const instant = false;

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="section"><Container>Loading…</Container></div>}>
      <CatalogClient />
    </Suspense>
  );
}
