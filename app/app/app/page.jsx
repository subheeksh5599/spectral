import Dashboard from "../../components/Dashboard.jsx";
import TokenMarket from "../../components/TokenMarket.jsx";

export const metadata = { title: "Spectral — the venue" };

/* The venue's own numbers are read in the browser, because signing happens there. The token
   market below them is read on the server and re-rendered at most every 15 seconds, so its
   numbers are in the HTML and nothing about it needs JavaScript. */
export const revalidate = 15;

export default function Venue() {
  return (
    <>
      <Dashboard />
      <TokenMarket />
    </>
  );
}
