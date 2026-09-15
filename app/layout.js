export const metadata = {
  title: "DECRETUM: Salus Populi Suprema Lex",
  description: "Decretum — a political card game. Salus Populi Suprema Lex.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
