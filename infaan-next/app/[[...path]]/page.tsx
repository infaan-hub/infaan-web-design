"use client";

import dynamic from "next/dynamic";

// The migrated React SPA (custom history router, window/localStorage access)
// runs entirely client-side.
const App = dynamic(() => import("../../frontend/App"), { ssr: false });

export default function SpaPage() {
  return <App />;
}
