export const metadata = {
  title: "Politics Game",
  description: "Politics Game",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
