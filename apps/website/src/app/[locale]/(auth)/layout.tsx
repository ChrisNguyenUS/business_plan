export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth pages get a minimal layout - no Navbar/Footer
  // They'll render just the centered auth card
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa] px-4 py-12">
      {children}
    </div>
  );
}
