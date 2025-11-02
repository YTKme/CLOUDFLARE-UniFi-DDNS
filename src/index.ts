/**
 * CLOUDFLARE UniFi Dynamic Domain Name System (DDNS)
 */

import { Context, Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";

import { ClientOptions, Cloudflare } from "cloudflare";
import { AAAARecord, ARecord, RecordResponse } from "cloudflare/resources/dns";

// Hono CLOUDflare Binding
type HonoBinding = {
  CLOUDFLARE_ACCOUNT_ID: string;
}

type AddressRecordType = ARecord | AAAARecord;

const application = new Hono<{ Bindings: HonoBinding }>();

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
    this.name = "HttpError";
  }
}

/**
 * Get Client Option
 * @param {request} Request
 * @return {ClientOptions}
 */
function getClientOption({
  request,
}: {
  request: Request;
}): ClientOptions {
  // console.debug("Request:", request);

  const authorization = request.headers.get("Authorization");

  if (!authorization) {
    throw new HttpError(401, "Error: Missing token.");
  }

  const [, data] = authorization.split(" ");

  return {
    apiToken: data,
  };
};

/**
 * Get Resource (Domain Name System, DNS) Record
 * @param {request} Request
 * @return {AddressRecordType[]}
 */
function getResourceRecord({
  request,
}: {
  request: Request;
}): AddressRecordType[] {
  // console.debug("Request:", request);

  const url = new URL(request.url);
  const parameter = url.searchParams;
  const ip = parameter.get("ip");
  const hostList = parameter.get("host");

  if (ip === null || ip === undefined) {
    throw new HttpError(422, "Error: Invalid IP.");
  }

  if (hostList === null || hostList === undefined) {
    throw new HttpError(422, "Error: Invalid hostname.");
  }

  return hostList.split(",").map(host => ({
    name: host.trim(),
    ttl: 1,
    type: ip.includes(":") ? "AAAA" : "A",
    content: ip,
  } as AddressRecordType));
}

/**
 * Update Resource Record
 */
/**
 * Update Resource Record
 */
async function updateResourceRecord({
  clientOption,
  accountId,
  resourceRecordList,
}: {
  clientOption: ClientOptions;
  accountId: string;
  resourceRecordList: AddressRecordType[];
}): Promise<{ zone: string; record: RecordResponse[]; }[]> {
  // console.debug(`Client Option: ${JSON.stringify(clientOption)}`);
  // console.debug(`Resource Record: ${JSON.stringify(resourceRecord)}`);

  const cloudflare = new Cloudflare(clientOption);

  // Verify Token
  const token = await cloudflare.accounts.tokens.verify({
    account_id: accountId,
  });
  // console.debug("Token:", token);
  if (token.status !== "active") {
    throw new HttpError(401, `Error: Invalid token status, ${token.status}`);
  }

  // Parse Resource Record Name
  const recordNameList = new Set(
    resourceRecordList.map(record => record.name)
  );

  // Get CLOUDFLARE Zone List
  // Filter by Resource Record Name
  const zoneList = (await cloudflare.zones.list()).result
    .filter(zone => recordNameList.has(zone.name));
  // console.debug("Zone List:", zoneList);

  if (zoneList.length === 0) {
    throw new HttpError(400, "Error: No zone was found!");
  }

  const resultZoneList = await Promise.all(
    // Iterate Zone List
    zoneList.map(async (zone) => {
      // Get Zone Record List
      const recordList = (await cloudflare.dns.records.list({
        zone_id: zone.id,
      })).result.filter(record =>
        // Filter Zone Record
        (record.type === "A" || record.type === "AAAA")
        && record.name.endsWith(`.${zone.name}`)
        && !record.name.startsWith("*.")
      );
      // console.debug(`Record List for Zone ${zone.name}:`, recordList);
      console.debug(`Record List for Zone ${zone.name}:`, recordList.map(r => r.name));

      if (recordList.length === 0) {
        throw new HttpError(400, `Error: No record was found for zone ${zone.name}!`);
      }

      // Iterate Zone Record List
      const resultRecordList = await Promise.all(
        recordList.map(async (record) => {
          if (!record.id) {
            throw new HttpError(400, "Error: Invalid Record ID.");
          }

          // Update Record
          return await cloudflare.dns.records.edit(record.id, {
            zone_id: zone.id,
            name: record.name,
            ttl: 1,
            type: record.type,
            content: resourceRecordList
              .find(r => r.name === zone.name)
              ?.content || record.content,
          })
          // .then(updateRecord => {
          //   console.debug("Update Zone Record:", updateRecord);
          // })
          .catch(error => {
            console.error("Failed to update Zone Record:", error);
            throw error;
          });
        })
      );

      return {
        zone: zone.name,
        record: resultRecordList,
      }
    })
  )
  // .then((updateRecordList) => {
  //   console.debug("Update Zone Record:", updateRecordList);
  // })
  .catch(error => {
    console.error("Failed to update Zone:", error);
    throw error;
  });

  return resultZoneList;
}

/**
 * Update Route
 *
 * @param {Context} context - The Hono context object of the request.
 */
application.get("/update", async (context: Context) => {
  // console.debug("Request:", context.req);
  // console.debug("Environment:", context.env);

  // Validate Account ID
  const accountId = context.env.CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) {
    console.error("Missing CLOUDFLARE_ACCOUNT_ID environment variable.");
    return context.body("Internal Server Error", 500);
  }

  try {
    // Get Client Option
    const clientOption = getClientOption({ request: context.req.raw });
    // console.debug("Client Option:", clientOption);

    // Get Resource Record
    const resourceRecordList = getResourceRecord({ request: context.req.raw });
    console.debug("Resource Record List:", resourceRecordList);

    // Update
    const result = await updateResourceRecord({
      clientOption: clientOption,
      accountId: accountId,
      resourceRecordList: resourceRecordList,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
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
