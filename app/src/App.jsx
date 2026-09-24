import React, { useEffect, useState } from "react";
import Landing from "./Landing.jsx";
import Dashboard from "./Dashboard.jsx";

const route = () => (window.location.pathname.replace(/\/+$/, "") === "/app" ? "app" : "landing");

export default function App() {
  const [page, setPage] = useState(route());

  useEffect(() => {
    const onPop = () => setPage(route());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return page === "app" ? <Dashboard /> : <Landing />;
}
