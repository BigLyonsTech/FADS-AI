import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Home, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Catches render errors in its subtree and shows a recoverable fallback
// (with navigation) instead of a blank screen. Used to keep the CRM (and the
// app's normal navigation) reachable if a CRM screen fails to render.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const backTo = this.props.backTo || "/crm";
    const backLabel = this.props.backLabel || "Back to CRM";
    if (this.state.hasError) {
      const message = this.state.error?.message || "An unexpected error occurred.";
      return (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Something went wrong</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This screen couldn&apos;t load. Try again, or go back to continue.
                </p>
              </div>
              <p className="text-xs text-muted-foreground bg-muted rounded-md p-2 text-left break-words">
                {message}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={this.handleReset} className="gap-1">
                  <RefreshCw className="w-4 h-4" /> Try again
                </Button>
                <Button asChild variant="outline" className="gap-1">
                  <Link to={backTo}><ArrowLeft className="w-4 h-4" /> {backLabel}</Link>
                </Button>
                <Button asChild variant="outline" className="gap-1">
                  <Link to="/"><Home className="w-4 h-4" /> Home</Link>
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