import NotificationsClient from "../../buyer/notifications/client";

export const instant = false;

export default function Page() {
  return <NotificationsClient audience="seller" />;
}
