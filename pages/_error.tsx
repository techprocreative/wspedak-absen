import { NextPageContext } from 'next'

interface ErrorProps {
  statusCode?: number
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f172a',
      padding: '1rem',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '6rem', fontWeight: 'bold', color: '#64748b', margin: 0 }}>
          {statusCode || 'Error'}
        </h1>
        <h2 style={{ marginTop: '1rem', fontSize: '1.875rem', fontWeight: '600' }}>
          {statusCode === 404
            ? 'Page Not Found'
            : statusCode
            ? `An error ${statusCode} occurred`
            : 'An error occurred'}
        </h2>
        <p style={{ marginTop: '0.5rem', color: '#94a3b8' }}>
          {statusCode === 404
            ? "The page you're looking for doesn't exist."
            : 'An error occurred while processing your request.'}
        </p>
        <div style={{ marginTop: '2rem' }}>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.5rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '0.375rem',
              textDecoration: 'none',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
