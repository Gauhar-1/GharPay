export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
  timestamp: string;
  request_id?: string;
  edge_region?: string;
}

/**
 * Structured JSON Logger for Deno Edge Functions
 * Allows querying logs via Kibana/Datadog or Supabase Log Explorer seamlessly.
 */
class Logger {
  private baseMetadata: Record<string, any> = {};

  constructor(defaultMetadata: Record<string, any> = {}) {
    this.baseMetadata = {
      ...defaultMetadata,
      edge_region: Deno.env.get("DENO_REGION") || "local",
    };
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>) {
    const payload: LogPayload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.baseMetadata,
      metadata: metadata ? { ...metadata } : undefined,
    };

    // Output single-line JSON strictly
    const serialized = JSON.stringify(payload);
    
    switch (level) {
      case 'info':
      case 'debug':
        console.log(serialized);
        break;
      case 'warn':
        console.warn(serialized);
        break;
      case 'error':
        console.error(serialized);
        break;
    }
  }

  public info(message: string, metadata?: Record<string, any>) {
    this.log('info', message, metadata);
  }

  public warn(message: string, metadata?: Record<string, any>) {
    this.log('warn', message, metadata);
  }

  public error(message: string, metadata?: Record<string, any>) {
    this.log('error', message, metadata);
  }
}

export const logger = new Logger();
