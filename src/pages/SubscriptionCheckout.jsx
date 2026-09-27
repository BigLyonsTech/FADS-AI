import React from "react";
import { Navigate } from "react-router-dom";

// The in-app trial checkout is retired. Subscription checkout is now handled
// via the external FADS store links on the Subscription plans page.
export default function SubscriptionCheckout() {
  return <Navigate to="/subscription" replace />;
}