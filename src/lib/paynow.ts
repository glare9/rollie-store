// Builds an SGQR / PayNow payload (EMVCo merchant-presented QR) with the amount
// and order reference filled in, so customers don't have to type either.

const tlv = (id: string, value: string) => id + value.length.toString().padStart(2, "0") + value;

function crc16(input: string) {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// A Singapore mobile number (8 digits starting 8 or 9, optional +65) is PayNow
// proxy type 0; anything else is treated as a UEN (proxy type 2).
export function paynowProxy(raw: string): { type: "0" | "2"; value: string } {
  const compact = raw.replace(/[\s-]/g, "");
  const mobile = compact.match(/^(?:\+?65)?([89]\d{7})$/);
  if (mobile) return { type: "0", value: `+65${mobile[1]}` };
  return { type: "2", value: compact.toUpperCase() };
}

export function paynowPayload(opts: {
  proxy: string;
  amountCents: number;
  reference: string;
  merchantName: string;
}) {
  const { type, value } = paynowProxy(opts.proxy);
  const account =
    tlv("00", "SG.PAYNOW") +
    tlv("01", type) +
    tlv("02", value) +
    tlv("03", "0"); // amount not editable
  const body =
    tlv("00", "01") +
    tlv("01", "12") + // dynamic QR (has an amount)
    tlv("26", account) +
    tlv("52", "0000") +
    tlv("53", "702") + // SGD
    tlv("54", (opts.amountCents / 100).toFixed(2)) +
    tlv("58", "SG") +
    tlv("59", opts.merchantName.slice(0, 25)) +
    tlv("60", "Singapore") +
    tlv("62", tlv("01", opts.reference.slice(0, 25))) +
    "6304";
  return body + crc16(body);
}
