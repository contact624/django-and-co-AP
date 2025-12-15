import React, { Component, ErrorInfo, ReactNode } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <GlassCard className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Une erreur est survenue
            </h2>
            <p className="text-muted-foreground mb-6">
              L'application a rencontré un problème inattendu. Veuillez rafraîchir la page.
            </p>
            {this.state.error && (
              <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
                <p className="text-xs text-destructive font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <GlassButton variant="primary" onClick={this.handleReset}>
              <RefreshCcw className="w-4 h-4" />
              Rafraîchir la page
            </GlassButton>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;