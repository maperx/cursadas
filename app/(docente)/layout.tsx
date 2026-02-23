import { PublicHeader } from "@/components/public/public-header";

export default function DocenteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 container py-6 px-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
