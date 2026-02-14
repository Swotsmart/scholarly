'use client';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '600px', margin: '2rem auto' }}>
      <h2>Auth Error</h2>
      <pre style={{
        background: '#fff0f0',
        padding: '1rem',
        borderRadius: '8px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
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
    </div>
  );
}
