import "./globals.css";

export const metadata = {
  title: "NICs exemption for recently-inactive employees | PolicyEngine",
  description:
    "Interactive dashboard estimating the cost and employment effects of exempting employers from NICs on recently-inactive employees using PolicyEngine UK microsimulation.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
