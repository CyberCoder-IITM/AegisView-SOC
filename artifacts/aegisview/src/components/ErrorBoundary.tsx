import React from "react";

interface Props { children: React.ReactNode; label?: string }
interface State { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override render() {
    if (this.state.error) {
      return (
        <div
          className="flex flex-col items-center justify-center w-full h-full p-4 gap-2"
          style={{ background: "#0a0e1a", border: "1px solid #ff003340" }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#ff0033" }}>
            ⚠ Component Error{this.props.label ? ` — ${this.props.label}` : ""}
          </span>
          <span className="text-[9px] font-mono text-center max-w-xs" style={{ color: "#666" }}>
            {this.state.error.message}
          </span>
          <button
            className="text-[9px] px-2 py-1 rounded mt-1"
            style={{ background: "#ff003315", color: "#ff6b6b", border: "1px solid #ff003330" }}
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
