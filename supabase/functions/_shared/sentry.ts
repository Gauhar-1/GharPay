import * as Sentry from "https://esm.sh/@sentry/deno@8.5.0";

// Sentry automatically looks up SENTRY_DSN from Deno.env
Sentry.init({
  dsn: Deno.env.get("SENTRY_DSN") || "",
  tracesSampleRate: 1.0,
});

export function withSentry(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error: any) {
      console.error("Uncaught Edge Function Error:", error);
      
      // Capture to Sentry asynchronously
      Sentry.captureException(error, {
         extra: {
            url: req.url,
            method: req.method
         }
      });
      
      // Attempt to flush before termination to ensure delivery
      await Sentry.flush(2000);

      return new Response(
        JSON.stringify({ error: "Internal Server Error", message: error.message }),
        { 
          status: 500, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          } 
        }
      );
    }
  };
}
