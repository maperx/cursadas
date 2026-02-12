import { PublicHeader } from "@/components/public/public-header";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col mx-4">
      <PublicHeader />
      <main className="flex-1 container py-6">{children}</main>
    </div>
  );
}
