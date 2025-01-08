/**
 * CLOUDFLARE UniFi Dynamic Domain Name System (DDNS)
 */

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Debug
		console.debug(`Request: ${JSON.stringify(request)}`);
		console.debug(`Environment: ${JSON.stringify(env)}`);
		console.debug(`Context: ${JSON.stringify(ctx)}`);

		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;
