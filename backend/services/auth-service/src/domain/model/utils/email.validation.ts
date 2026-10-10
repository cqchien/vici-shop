// local part ≤ 64 octets, forward path ≤ 256 including `<>` → 254 usable.
const MAX_LOCAL_LENGTH = 64;
const MAX_LENGTH = 254;
const MAX_LABEL_LENGTH = 63; // RFC 1035

const LOCAL_PART = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const ALL_DIGITS = /^\d+$/;

/** Expects a value already passed through `normaliseEmail`. */
export function isValidEmail(address: string): boolean {
  if (address.length > MAX_LENGTH) {
    return false;
  }
  const at = address.indexOf('@');
  if (at < 0 || at !== address.lastIndexOf('@')) {
    return false;
  }
  return isValidLocalPart(address.slice(0, at)) && isValidDomain(address.slice(at + 1));
}

function isValidLocalPart(local: string): boolean {
  return local.length <= MAX_LOCAL_LENGTH && LOCAL_PART.test(local);
}

function isValidDomain(domain: string): boolean {
  const labels = domain.split('.');
  if (labels.length < 2) {
    return false;
  }
  if (!labels.every((label) => label.length <= MAX_LABEL_LENGTH && DOMAIN_LABEL.test(label))) {
    return false;
  }
  // No real TLD is one character or all digits (RFC 3696 §2) — catches typos like `a@b.c`.
  const tld = labels.at(-1) ?? '';
  return tld.length >= 2 && !ALL_DIGITS.test(tld);
}
