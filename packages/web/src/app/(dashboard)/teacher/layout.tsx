'use client';

import { AskIssyFab } from '@/components/teacher/ask-issy-fab';

/**
 * Teacher Layout — wraps all /teacher/* pages.
 *
 * Adds the persistent Ask Issy floating action button so AI assistance
 * is always one tap away, regardless of which teacher page the user is on.
 */
export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <AskIssyFab />
    </>
  );
}
