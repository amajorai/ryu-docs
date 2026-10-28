import { expect, test } from "bun:test";

const docsRoot = new URL("../../content/docs/", import.meta.url);

async function readDoc(path: string): Promise<string> {
  return Bun.file(new URL(path, docsRoot)).text();
}

test("login approval docs describe the shared website-centered flow", async () => {
  const [account, mfa, devices] = await Promise.all([
    readDoc("security/authentication-account.mdx"),
    readDoc("security/authentication-account-mfa.mdx"),
    readDoc("security/authentication-devices.mdx"),
  ]);

  expect(account).toContain("Approve on another device");
  expect(account).toMatch(/CLI do not ask for your email/);
  expect(devices).toContain("HttpOnly");
  expect(mfa).toContain("## Enable two-factor authentication");
  expect(mfa).toMatch(/Console\s+and Account Settings pages/);
  expect(mfa).toContain("for that account in the current browser");
  expect(mfa).toContain("until you complete setup");
  expect(devices).toContain(
    "Website-centered approval for every client surface",
  );
  expect(devices).toContain("foreground");
  expect(devices).toContain("mobile session receives");
  expect(devices).toContain("one-time");
});
