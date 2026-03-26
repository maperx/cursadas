import { PublicHeader } from "@/components/public/public-header";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 py-6 px-3 sm:px-4 lg:px-6">{children}</main>
    </div>
  );
}
