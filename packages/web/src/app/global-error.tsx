'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
        <h1>Something went wrong</h1>
        <pre style={{
          background: '#f5f5f5',
          padding: '1rem',
          borderRadius: '8px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxWidth: '800px'
        }}>
          {error.message}
          {'\n\n'}
          {error.stack}
          {error.digest && `\n\nDigest: ${error.digest}`}
        </pre>
        <button
          onClick={() => reset()}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
