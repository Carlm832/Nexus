import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Temporary Error Boundary to surface runtime crashes instead of blank page
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('App crashed:', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          fontFamily: 'monospace', padding: '2rem', background: '#0f172a',
          color: '#f87171', minHeight: '100vh', whiteSpace: 'pre-wrap'
        }}>
          <h2 style={{ color: '#fbbf24', marginBottom: '1rem' }}>
            Runtime Error — Check browser console (F12) for full stack trace
          </h2>
          <strong>{this.state.error?.name}: </strong>
          {this.state.error?.message}
          <hr style={{ borderColor: '#374151', margin: '1rem 0' }} />
          <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            {this.state.error?.stack}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

