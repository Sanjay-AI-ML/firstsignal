"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export type ErrorBoundaryProps = {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled client component error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            padding: "20px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            margin: "12px 0",
            color: "#991b1b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <AlertTriangle size={18} aria-hidden="true" />
            <strong style={{ fontSize: "0.9375rem" }}>
              {this.props.fallbackTitle || "This interactive component encountered an issue."}
            </strong>
          </div>
          <p style={{ margin: "0 0 12px 0", fontSize: "0.8125rem", color: "#7f1d1d", lineHeight: 1.45 }}>
            {this.props.fallbackMessage ||
              "Try loading this section again, or continue using the rest of the workspace. You may need to enter unsaved values again."}
          </p>
          <button
            type="button"
            className="outline-button"
            onClick={this.handleReset}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem" }}
          >
            <RefreshCw size={13} aria-hidden="true" />
            <span>Try again</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
