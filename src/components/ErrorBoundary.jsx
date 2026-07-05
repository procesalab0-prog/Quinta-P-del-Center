import { Component } from 'react'

// Si una pantalla truena, muestra un aviso con botón de recuperación
// en lugar de dejar toda la app en blanco.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 30 }}>🎾</div>
          <div style={{ color: 'var(--white)', fontWeight: 600, fontSize: 15 }}>Algo salió mal en esta pantalla</div>
          <div style={{ color: 'var(--muted)', fontSize: 12, maxWidth: 340 }}>{String(this.state.error?.message || this.state.error)}</div>
          <button className="btn-lime" style={{ width: 'auto', padding: '10px 20px', borderRadius: 9 }}
            onClick={() => this.setState({ error: null })}>Reintentar</button>
        </div>
      )
    }
    return this.props.children
  }
}
