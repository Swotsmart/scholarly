import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Visual Workflow Designer | Scholarly',
  description: 'Visual workflow designer for automation pipelines',
};

export default function CanvasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-[calc(100vh-64px)] -m-6 overflow-hidden">
      {children}
    </div>
  );
}
