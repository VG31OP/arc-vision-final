import { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LuTriangleAlert, LuRotateCw } from "react-icons/lu";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error internally without breaking UI rendering
    console.error("ARC VISION UI Error Boundary caught an exception:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex size-full items-center justify-center p-6 bg-background/50">
          <Card className="max-w-md border-rose-500/30 bg-background_alt text-foreground shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-rose-400 flex items-center gap-2">
                <LuTriangleAlert className="size-5 text-rose-400 flex-shrink-0" />
                {this.props.fallbackTitle || "Operational Component Unavailable"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <p className="text-muted-foreground">
                {this.props.fallbackMessage ||
                  "A runtime error occurred in this workspace component. Core surveillance services remain active."}
              </p>
              {this.state.error?.message && (
                <div className="rounded border border-border/40 bg-background/80 p-2 font-mono text-[11px] text-rose-300 overflow-x-auto">
                  {this.state.error.message}
                </div>
              )}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleReset}
                  className="flex items-center gap-1.5"
                >
                  <LuRotateCw className="size-3.5" />
                  Retry Workspace
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Reload Application
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
