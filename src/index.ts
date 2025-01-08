/**
 * CLOUDFLARE UniFi Dynamic Domain Name System (DDNS)
 */

import { Context, Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";


const application = new Hono();

/**
 * HTTP Error
 * @extends Error
 */
class HttpError extends Error {
  constructor(
    public statusCode: ContentfulStatusCode,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

// Default Route
application.get("/", async (context: Context) => {
  console.debug(`Request: ${JSON.stringify(context.req)}`);
  console.debug(`Environment: ${JSON.stringify(context.env)}`);

  try {

  } catch (error) {
    console.error(`Error: ${error}`);

    // Handle HTTP Error
    if (error instanceof HttpError) {
      return context.body(
        error.message,
        error.statusCode as ContentfulStatusCode,
      );
    } else {
      return context.body(
        "Internal Server Error",
        500,
      );
    }
  }
});

export default application;
