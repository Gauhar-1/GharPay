import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="kpi-card max-w-md w-full flex flex-col items-center text-center space-y-4 shadow-xl border-destructive/20"
          >
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
              <AlertTriangle className="text-destructive w-6 h-6" />
            </div>
            
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground mb-1">
                Well, this is unexpected!
              </h2>
              <p className="text-sm text-muted-foreground">
                Our team has been notified. We apologize for the hiccup.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="w-full bg-secondary/50 rounded-md p-3 text-left overflow-auto mt-2 max-h-32 border border-border">
                <p className="font-mono text-[10px] text-destructive break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="w-full pt-2">
              <Button onClick={this.handleReload} className="w-full gap-2" variant="default">
                <RefreshCcw size={14} />
                Try Reloading Page
              </Button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
