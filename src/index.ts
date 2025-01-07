/**
 * CLOUDFLARE UniFi Dynamic Domain Name System (DDNS)
 */

export default {
	async fetch(request, env, ctx): Promise<Response> {
		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;
