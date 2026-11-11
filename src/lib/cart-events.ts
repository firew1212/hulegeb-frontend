export const CART_UPDATED_EVENT = "hulegeb:cart-updated";

export function notifyCartUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  }
}
