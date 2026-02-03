import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to the static landing page
  redirect('/site');
}
