export default function CanvasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full overflow-hidden bg-[#0F1923]">
      {children}
    </div>
  );
}
