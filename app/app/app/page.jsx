import Dashboard from "../../components/Dashboard.jsx";
import TokenMarket from "../../components/TokenMarket.jsx";

export const metadata = { title: "Spectral — the venue" };

/* The venue's own numbers are read in the browser, because signing happens there. The token
   market below them is read on the server and re-rendered every 5 seconds, so its numbers are
   in the HTML and nothing about it needs JavaScript to be seen — while a take signed on the
   page refreshes the same markup within seconds rather than on the next visit. */
export const revalidate = 5;

export default function Venue() {
  return (
    <>
      <Dashboard />
      <TokenMarket />
    </>
  );
}
