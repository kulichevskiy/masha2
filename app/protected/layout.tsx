import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Protected",
    template: "%s | Maria Chevskaya",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}

