# CLOUDFLARE Worker Tutorial

## Table of Content

- [Create Worker](#create-worker)
- [Reference](#reference)

## Create Worker

### Use Create CLOUDFLARE CLI (C3) and Wrangler

[C3 (create-cloudflare-cli)](https://github.com/cloudflare/workers-sdk/tree/main/packages/create-cloudflare)
is a command-line tool designed to help you set up and deploy new
applications to Cloudflare.

[Wrangler](https://developers.cloudflare.com/workers/wrangler/) is a
command-line tool for building with Cloudflare developer products.

To create your Worker project, run:

```shell
npm create cloudflare@latest -- cloudflare-worker
```

This will prompt you to install the [create-cloudflare](https://www.npmjs.com/package/create-cloudflare)
package, and lead you through setup.

For setup, select the following options:

- For *What would you like to start with?*, choose `Hello World example`.
- For *Which template would you like to use?*, choose `Worker only`.
- For *Which language do you want to use?*, choose `TypeScript`.
- For *Do you want to use git for version control?*, choose `Yes`.
- For *Do you want to deploy your application?*, choose `No` (we will be making some changes before deploying).

## Development

## Reference

- [CLOUDFLARE Fundamentals](https://developers.cloudflare.com/fundamentals/)
    - [CLOUDFLARE Fundamentals, Cloudflare's API, Create API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
    - [CLOUDFLARE Fundamentals, Cloudflare's API, Account API tokens](https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
    - [Cloudflare Workers, Development & testing](https://developers.cloudflare.com/workers/development-testing/)
- [Build applications with Cloudflare Workers](https://developers.cloudflare.com/learning-paths/workers/concepts/)
