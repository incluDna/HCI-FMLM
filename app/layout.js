import "./globals.css";

export const metadata = {
  title: "Bangkok FMLM Transit Accessibility Study",
  description: "Within-subjects route-planning experiment for Bangkok first and last mile transit accessibility."
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
