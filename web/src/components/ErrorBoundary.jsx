import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          backgroundColor: "#0a0a0c",
          color: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "Inter, sans-serif"
        }}>
          <div style={{
            maxWidth: 600,
            width: "100%",
            background: "#18181b",
            border: "1px solid #ef4444",
            borderRadius: 12,
            padding: 28,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)"
          }}>
            <h2 style={{ color: "#ef4444", marginTop: 0, fontSize: 20 }}>Application Runtime Error</h2>
            <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>
              A client-side error occurred. Below is the diagnostic error message:
            </p>
            <pre style={{
              background: "#09090b",
              border: "1px solid #27272a",
              color: "#fca5a5",
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
              overflowX: "auto",
              whiteSpace: "pre-wrap"
            }}>
              {this.state.error?.toString()}
              {"\n\n"}
              {this.state.error?.stack}
            </pre>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  padding: "10px 16px",
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  background: "#3f3f46",
                  color: "#fff",
                  border: "none",
                  padding: "10px 16px",
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Clear Data &amp; Reset to Login
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
export default ErrorBoundary;
