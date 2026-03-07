const DEFAULT_BASE_BUILDER_CODE = "bc_rn2l4vb0";
const ERC8021_SENTINEL_HEX = "8021".repeat(8);

function toHexByte(value: number): string {
  return value.toString(16).padStart(2, "0");
}

function asciiToHex(value: string): string {
  let hex = "";
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code > 0x7f) {
      throw new Error("Builder code must be ASCII");
    }
    hex += toHexByte(code);
  }
  return hex;
}

function getConfiguredBuilderCode(): string | null {
  const raw = process.env.NEXT_PUBLIC_BASE_BUILDER_CODE?.trim() || DEFAULT_BASE_BUILDER_CODE;
  if (!raw) return null;
  if (raw.length > 255) {
    console.warn("Invalid NEXT_PUBLIC_BASE_BUILDER_CODE: too long");
    return null;
  }
  if (!/^[A-Za-z0-9_]+$/.test(raw)) {
    console.warn("Invalid NEXT_PUBLIC_BASE_BUILDER_CODE:", raw);
    return null;
  }
  return raw;
}

export function getBuilderCodeDataSuffix(): `0x${string}` | null {
  const builderCode = getConfiguredBuilderCode();
  if (!builderCode) return null;
  const lengthHex = toHexByte(builderCode.length);
  const builderHex = asciiToHex(builderCode);
  return `0x${lengthHex}${builderHex}00${ERC8021_SENTINEL_HEX}` as `0x${string}`;
}

export function appendDataSuffix(
  data: `0x${string}` | undefined,
  dataSuffix: `0x${string}` | null,
): `0x${string}` | undefined {
  if (!data || !dataSuffix) return data;
  if (data.toLowerCase().endsWith(dataSuffix.slice(2).toLowerCase())) {
    return data;
  }
  return `${data}${dataSuffix.slice(2)}` as `0x${string}`;
}
