import Link from 'next/link';
import Toolkit from './toolkit';

export default function Page() {
  return (
    <main>
      <header>
        {/* Using Link prevents the full browser reload */}
        <Link href="/">
          PDF Toolkit
        </Link>
        <span>Private file conversion in your browser</span>
      </header>
      <Toolkit />
    </main>
  );
}