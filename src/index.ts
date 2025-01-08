/**
 * CLOUDFLARE UniFi Dynamic Domain Name System (DDNS)
 */

import {
	Context,
	Hono,
} from "hono";

const application = new Hono();

application.get("/", async (context: Context) => {
	console.debug(`Request: ${JSON.stringify(context.req)}`);
	console.debug(`Environment: ${JSON.stringify(context.env)}`);

	return context.body(
		// Data
		"Hello World!",
		// Status
		200,
		// Header
		{
			"Content-Type": "text/plain",
		}
	)
});

// export default {
// 	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
// 		// Debug
// 		console.debug(`Request: ${JSON.stringify(request)}`);
// 		console.debug(`Environment: ${JSON.stringify(env)}`);
// 		console.debug(`Context: ${JSON.stringify(ctx)}`);

// 		return new Response('Hello World!');
// 	},
// } satisfies ExportedHandler<Env>;

export default application;
