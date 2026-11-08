import SellerProductFormClient from "../../seller-product-form.client";

export const instant = false;

export default async function Page({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  return <SellerProductFormClient mode="edit" productId={productId} />;
}
