import "./globals.css";

export const metadata = {
  title: "Spectral — unfinished work, still payable",
  description:
    "Work that was never finished becomes a counted obligation: whoever counted a unit is paid for it, and whatever was left is listed for anyone else to finish against a bond.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
