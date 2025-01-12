/**
 * CLOUDFLARE UniFi Dynamic Domain Name System (DDNS)
 */

import { ClientOptions } from "cloudflare";
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

/**
 * Get Client Option
 */
const getClientOption = (request: Request): ClientOptions => {
  console.debug(`Request: ${JSON.stringify(request)}`);

  const authorization = request.headers.get("Authorization");

  if (!authorization) {
    throw new HttpError(401, "Unauthorized: Invalid Token");
  }

  const [, data] = authorization.split(" ");
  const decodedData = atob(data);
  const index = decodedData.indexOf(":");

  if (index === -1 || /[\0-\x1F\x7F]/.test(decodedData)) {
    throw new HttpError(401, "Unauthorized: Invalid Token");
  }

  return {
    apiEmail: decodedData.substring(0, index),
    apiToken: decodedData.substring(index + 1),
  };
};

// Default Route
application.get("/", async (context: Context) => {
  console.debug(`Request: ${JSON.stringify(context.req)}`);
  console.debug(`Environment: ${JSON.stringify(context.env)}`);

  try {
    // Get client option and DNS record
    const clientOption = getClientOption(context.req.raw);
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
