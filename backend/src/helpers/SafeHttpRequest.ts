// BigInt shifts are needed to compare IP addresses with subnet prefixes.
/* eslint-disable no-bitwise */
import { isIP } from "net";
import { lookup as dnsLookup, LookupAddress } from "dns";
import http from "http";
import https from "https";

// Addresses a company-provided URL must never reach: the server itself, the
// internal Docker network, cloud metadata endpoints and similar.
const BLOCKED_V4: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3]
];

const BLOCKED_V6: Array<[string, number]> = [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8]
];

const ipv4ToBigInt = (address: string): bigint =>
  address
    .split(".")
    .reduce(
      (acc, part) => (acc << BigInt(8)) + BigInt(Number(part)),
      BigInt(0)
    );

const ipv6ToBigInt = (address: string): bigint => {
  const [head, tail = ""] = address.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  const missing = 8 - headParts.length - tailParts.length;
  const groups = address.includes("::")
    ? [...headParts, ...Array(missing).fill("0"), ...tailParts]
    : headParts;
  return groups.reduce(
    (acc, group) => (acc << BigInt(16)) + BigInt(parseInt(group || "0", 16)),
    BigInt(0)
  );
};

const inSubnet = (
  value: bigint,
  base: bigint,
  prefix: number,
  bits: number
): boolean => {
  const shift = BigInt(bits - prefix);
  return value >> shift === base >> shift;
};

const allowPrivate = (): boolean =>
  process.env.WEBHOOK_ALLOW_PRIVATE_URLS === "true";

export const isBlockedAddress = (address: string): boolean => {
  const family = isIP(address);
  if (family === 0) return true;
  if (family === 6) {
    // IPv4 written as IPv6 (::ffff:10.0.0.1)
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
    if (mapped) return isBlockedAddress(mapped[1]);
    const value = ipv6ToBigInt(address.toLowerCase());
    return BLOCKED_V6.some(([base, prefix]) =>
      inSubnet(value, ipv6ToBigInt(base), prefix, 128)
    );
  }
  const value = ipv4ToBigInt(address);
  return BLOCKED_V4.some(([base, prefix]) =>
    inSubnet(value, ipv4ToBigInt(base), prefix, 32)
  );
};

export const isAllowedUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
};

// DNS lookup that refuses blocked addresses. Used at connection time, so a
// hostname cannot pass validation and later resolve to an internal address.
const safeLookup = (
  hostname: string,
  options: { all?: boolean },
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | LookupAddress[],
    family?: number
  ) => void
): void => {
  dnsLookup(hostname, { all: true }, (err, addresses) => {
    if (err) {
      callback(err, "");
      return;
    }
    const list = addresses as LookupAddress[];
    const bad = list.find(item => isBlockedAddress(item.address));
    if (bad && !allowPrivate()) {
      callback(new Error("ERR_WEBHOOK_BLOCKED_ADDRESS"), "");
      return;
    }
    if (options.all) {
      callback(null, list);
    } else {
      callback(null, list[0].address, list[0].family);
    }
  });
};

export interface SafeResponse {
  status: number;
}

const MAX_RESPONSE_BYTES = 64 * 1024;

export const safePost = (
  url: string,
  body: string,
  headers: Record<string, string>,
  timeoutMs = 5000
): Promise<SafeResponse> =>
  new Promise((resolve, reject) => {
    if (!isAllowedUrl(url)) {
      reject(new Error("ERR_WEBHOOK_INVALID_URL"));
      return;
    }

    const target = new URL(url);
    if (isIP(target.hostname.replace(/^\[|\]$/g, "")) && !allowPrivate()) {
      if (isBlockedAddress(target.hostname.replace(/^\[|\]$/g, ""))) {
        reject(new Error("ERR_WEBHOOK_BLOCKED_ADDRESS"));
        return;
      }
    }

    const client = target.protocol === "https:" ? https : http;
    const request = client.request(
      target,
      {
        method: "POST",
        headers: { ...headers, "Content-Length": Buffer.byteLength(body) },
        lookup: safeLookup as never,
        timeout: timeoutMs
      },
      response => {
        let received = 0;
        response.on("data", chunk => {
          received += chunk.length;
          if (received > MAX_RESPONSE_BYTES) response.destroy();
        });
        response.on("end", () => resolve({ status: response.statusCode || 0 }));
        response.on("close", () =>
          resolve({ status: response.statusCode || 0 })
        );
      }
    );

    request.on("timeout", () =>
      request.destroy(new Error("ERR_WEBHOOK_TIMEOUT"))
    );
    request.on("error", reject);
    request.end(body);
  });
