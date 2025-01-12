/**
 * CLOUDFLARE UniFi Dynamic Domain Name System (DDNS) Test
 */

import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Function
const mockVerify = vi.fn();
const mockListZones = vi.fn();
const mockListRecords = vi.fn();
const mockUpdateRecord = vi.fn();

vi.mock("cloudflare", () => {
  return {
    Cloudflare: vi.fn().mockImplementation(() => ({
      user: {
        tokens: {
          verify: mockVerify,
        },
      },
      zones: {
        list: mockListZones,
      },
      dns: {
        records: {
          list: mockListRecords,
          update: mockUpdateRecord,
        },
      },
    })),
  };
});

describe("CLOUDFLARE UniFi Worker", () => {
  beforeEach(() => {
    // Clear all mocks before each test to prevent state leakage
    vi.clearAllMocks();
  });

  it("responds with 401 when the token is missing", async () => {
    const response = await SELF.fetch("http://example.com/update?ip=192.0.2.1&hostname=home.example.com");
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Error: Missing token.");
  });

  it("responds with 401 when the token is invalid", async () => {
    const response = await SELF.fetch("http://example.com/update?ip=192.0.2.1&hostname=home.example.com", {
      headers: {
        // CodeQL [js/hardcoded-credentials] Suppressing hardcoded credential warning for test
        Authorization: "Basic invalidtoken",
      },
    });
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Error: Invalid token.");
  });

  it("responds with 401 when the token status is not active", async () => {
    mockVerify.mockResolvedValueOnce({ status: "inactive" });

    const response = await SELF.fetch("http://example.com/update?ip=192.0.2.1&hostname=home.example.com", {
      headers: {
        Authorization: "Basic " + btoa("email@example.com:validtoken"),
      },
    });

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Error: Invalid token status, inactive");
  });

  it("responds with 422 when the IP is invalid", async () => {
    mockVerify.mockResolvedValueOnce({ status: "active" });
    const response = await SELF.fetch("http://example.com/update?hostname=home.example.com", {
      headers: {
        Authorization: "Basic " + btoa("email@example.com:validtoken"),
      },
    });
    expect(response.status).toBe(422);
    expect(await response.text()).toBe("Error: Invalid IP.");
  });

  it("responds with 422 when the hostname is invalid", async () => {
    mockVerify.mockResolvedValueOnce({ status: "active" });
    const response = await SELF.fetch("http://example.com/update?ip=192.0.2.1", {
      headers: {
        Authorization: "Basic " + btoa("email@example.com:validtoken"),
      },
    });
    expect(response.status).toBe(422);
    expect(await response.text()).toBe("Error: Invalid hostname.");
  });

  it("responds with 200 on valid update", async () => {
    mockVerify.mockResolvedValueOnce({ status: "active" });
    mockListZones.mockResolvedValueOnce({ result: [{ id: "zone-id" }] });
    mockListRecords.mockResolvedValueOnce({ result: [{ id: "record-id", name: "home.example.com", type: "A" }] });
    mockUpdateRecord.mockResolvedValueOnce({});

    const response = await SELF.fetch("http://example.com/update?ip=192.0.2.1&hostname=home.example.com", {
      headers: {
        Authorization: "Basic " + btoa("email@example.com:validtoken"),
      },
    });
    expect(response.status).toBe(200);
  });

  it("responds with 400 when multiple zones are found", async () => {
    mockVerify.mockResolvedValueOnce({ status: "active" });
    mockListZones.mockResolvedValueOnce({ result: [{ id: "zone-id1" }, { id: "zone-id2" }] });

    const response = await SELF.fetch("http://example.com/update?ip=192.0.2.1&hostname=home.example.com", {
      headers: {
        Authorization: "Basic " + btoa("email@example.com:validtoken"),
      },
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Error: More than one zone was found! The token should scope to one (1) zone.");
  });

  it("responds with 400 when no zones are found", async () => {
    mockVerify.mockResolvedValueOnce({ status: "active" });
    mockListZones.mockResolvedValueOnce({ result: [] });

    const response = await SELF.fetch("http://example.com/update?ip=192.0.2.1&hostname=home.example.com", {
      headers: {
        Authorization: "Basic " + btoa("email@example.com:validtoken"),
      },
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Error: No zone was found! The token should scope to one (1) zone.");
  });

  it("responds with 400 when multiple records are found", async () => {
    mockVerify.mockResolvedValueOnce({ status: "active" });
    mockListZones.mockResolvedValueOnce({ result: [{ id: "zone-id" }] });
    mockListRecords.mockResolvedValueOnce({
      result: [
        { id: "record-id1", name: "home.example.com", type: "A" },
        { id: "record-id2", name: "home.example.com", type: "A" },
      ],
    });

    const response = await SELF.fetch("http://example.com/update?ip=192.0.2.1&hostname=home.example.com", {
      headers: {
        Authorization: "Basic " + btoa("email@example.com:validtoken"),
      },
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Error: More than one record was found!');
  });

  it("responds with 400 when no records are found", async () => {
    mockVerify.mockResolvedValueOnce({ status: "active" });
    mockListZones.mockResolvedValueOnce({ result: [{ id: "zone-id" }] });
    mockListRecords.mockResolvedValueOnce({ result: [] });

    const response = await SELF.fetch("http://example.com/update?ip=192.0.2.1&hostname=home.example.com", {
      headers: {
        Authorization: "Basic " + btoa("email@example.com:validtoken"),
      },
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Error: No record was found! Must manually create the record first.");
  });

  it("responds with 500 for an unforeseen internal server error", async () => {
    mockVerify.mockImplementationOnce(() => {
      throw new Error("Unexpected Error");
    });

    const response = await SELF.fetch("http://example.com/update?ip=192.0.2.1&hostname=home.example.com", {
      headers: {
        Authorization: "Basic " + btoa("email@example.com:validtoken"),
      },
    });

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Internal Server Error");
  });

  it("responds with 200 on valid IPv6 update", async () => {
    mockVerify.mockResolvedValueOnce({ status: "active" });
    mockListZones.mockResolvedValueOnce({ result: [{ id: "zone-id" }] });
    mockListRecords.mockResolvedValueOnce({ result: [{ id: "record-id", name: "home.example.com", type: "AAAA" }] });
    mockUpdateRecord.mockResolvedValueOnce({});

    const response = await SELF.fetch("http://example.com/update?ip=2001:0db8:85a3:0000:0000:8a2e:0370:7334&hostname=home.example.com", {
      headers: {
        Authorization: "Basic " + btoa("email@example.com:validtoken"),
      },
    });
    expect(response.status).toBe(200);
  });
});
