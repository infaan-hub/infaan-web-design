import bcrypt from "bcryptjs";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

// Django passwords: pbkdf2_sha256$iterations$salt$hash (existing rows keep working,
// rehashed to bcrypt on first successful login). Unusable passwords start with "!".

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

function verifyDjangoPbkdf2(password: string, encoded: string): boolean {
  const parts = encoded.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") return false;
  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expected = Buffer.from(parts[3], "base64");
  if (!Number.isInteger(iterations) || iterations < 1 || !salt) return false;
  const actual = pbkdf2Sync(password, salt, iterations, expected.length, "sha256");
  return timingSafeEqual(actual, expected);
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!stored || stored.startsWith("!")) return { valid: false, needsRehash: false };
  if (stored.startsWith("pbkdf2_sha256$")) {
    const valid = verifyDjangoPbkdf2(password, stored);
    return { valid, needsRehash: valid };
  }
  if (stored.startsWith("$2")) {
    const valid = await bcrypt.compare(password, stored);
    return { valid, needsRehash: false };
  }
  return { valid: false, needsRehash: false };
}

/** Django User.set_unusable_password(): unusable hash that never verifies. */
export function unusablePassword(): string {
  return `!${randomBytes(20).toString("hex")}`;
}
