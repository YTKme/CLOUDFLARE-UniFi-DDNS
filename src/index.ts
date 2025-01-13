/**
 * CLOUDFLARE UniFi Dynamic Domain Name System (DDNS)
 */

import { ClientOptions, Cloudflare } from "cloudflare";
import { AAAARecord, ARecord } from "cloudflare/resources/dns/records.mjs";
import { Context, Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";

type AddressRecordType = AAAARecord | ARecord;

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
 * @param {request} Request
 * @return {ClientOptions}
 */
const getClientOption = (request: Request): ClientOptions => {
  console.debug(`Request: ${JSON.stringify(request)}`);

  const authorization = request.headers.get("Authorization");

  if (!authorization) {
    throw new HttpError(401, "Error: Missing token.");
  }

  const [, data] = authorization.split(" ");
  const decodedData = atob(data);
  const index = decodedData.indexOf(":");

  if (index === -1 || /[\0-\x1F\x7F]/.test(decodedData)) {
    throw new HttpError(401, "Error: Invalid token.");
  }

  return {
    apiEmail: decodedData.substring(0, index),
    apiToken: decodedData.substring(index + 1),
  };
};

/**
 * Get Address Record
 * @param {request} Request
 * @return {AddressRecordType}
 */
const getAddressRecord = (request: Request): AddressRecordType => {
  console.debug(`Request: ${JSON.stringify(request)}`);

  const url = new URL(request.url);
  const parameter = url.searchParams;
  const ip = parameter.get("ip");
  const hostname = parameter.get("hostname");

  if (ip === null || ip === undefined) {
    throw new HttpError(422, "Error: Invalid IP.");
  }

  if (hostname === null || hostname === undefined) {
    throw new HttpError(422, "Error: Invalid hostname.");
  }

  return {
    content: ip,
    name: hostname,
    type: ip.includes(":") ? "AAAA" : "A",
    ttl: 1,
  };
};

/**
 * Update Address Record
 */
const updateAddressRecord = async (
  clientOption: ClientOptions,
  addressRecord: AddressRecordType,
): Promise<Response> => {
  console.debug(`Client Option: ${JSON.stringify(clientOption)}`);
  console.debug(`Address Record: ${JSON.stringify(addressRecord)}`);

  const cloudflare = new Cloudflare(clientOption);

  const tokenStatus = (await cloudflare.user.tokens.verify()).status;
  if (tokenStatus !== "active") {
    throw new HttpError(401, `Error: Invalid token status, ${tokenStatus}`);
  }

  // Get Zone
  const zoneList = (await cloudflare.zones.list()).result;
  // Should be only one (1) zone
  if (zoneList.length > 1) {
    throw new HttpError(400, "Error: More than one zone was found! The token should scope to one (1) zone.");
  } else if (zoneList.length === 0) {
    throw new HttpError(400, "Error: No zone was found! The token should scope to one (1) zone.");
  }

  const zone = zoneList[0];

  // Get Record
  const recordList = (
    await cloudflare.dns.records.list({
      zone_id: zone.id,
      name: addressRecord.name,
      type: addressRecord.type,
    })
  ).result;
  // Should be only one (1) record
  if (recordList.length > 1) {
    throw new HttpError(400, "Error: More than one record was found!");
  } else if (recordList.length === 0) {
    throw new HttpError(400, "Error: No record was found! Must manually create the record first.");
  }

  // Get Current Proxy Status
  const record = recordList[0];
  // Default to `false` if `proxied` is undefined
  const proxyStatus = (record as AddressRecordType).proxied ?? false;

  if (!recordList[0].id) {
    throw new HttpError(400, "Error: Invalid Record ID.");
  }

  await cloudflare.dns.records.update(recordList[0].id, {
    content: addressRecord.content,
    zone_id: zone.id,
    name: addressRecord.name,
    type: addressRecord.type,
    proxied: proxyStatus, // Pass the existing `proxied` status
  });

  return new Response("OK", { status: 200 });
};

// Default Route
application.get("/update", async (context: Context) => {
  console.debug(`Request: ${JSON.stringify(context.req)}`);
  console.debug(`Environment: ${JSON.stringify(context.env)}`);

  try {
    // Get client option and DNS record
    const clientOption = getClientOption(context.req.raw);
    const addressRecord = getAddressRecord(context.req.raw);

    // Update
    return await updateAddressRecord(clientOption, addressRecord);
  } catch (error) {
    console.error(`Error: ${error}`);

    // Handle HTTP Error
    if (error instanceof HttpError) {
      return context.body(
        error.message,
        error.statusCode as ContentfulStatusCode,
      );
    } else {
      return context.body("Internal Server Error", 500);
    }
  }
});

export default application;
