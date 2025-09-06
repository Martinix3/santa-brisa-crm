
import { redirect } from 'next/navigation';

// The root page is not used, so we redirect to the dashboard.
export default function HomePage() {
  redirect('/dashboard');
  return null;
}

    