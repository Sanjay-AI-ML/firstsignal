import assert from "node:assert/strict";
const origin = "http://127.0.0.1:5173";
let checks = 0;
async function page(path, cookie) {
  const response = await fetch(origin + path, { redirect: "manual", headers: cookie ? { Cookie: cookie } : {} });
  assert.equal(response.status, 200); checks++;
  return response.text();
}
assert.match(await page("/signin"), /Continue with ChatGPT/); checks++;
const login = await fetch(origin + "/signin-with-chatgpt?return_to=%2F%23saved", { redirect: "manual" });
assert.equal(login.status, 302); assert.equal(login.headers.get("location"), "/#saved"); checks+=2;
const cookie = login.headers.get("set-cookie").split(";")[0];
assert.match(await page("/signin", cookie), /You’re already signed in/); checks++;
// An active session must never be presented as successfully signed out.
assert.doesNotMatch(await page("/signin?signed_out=1", cookie), /You’re signed out of FirstSignal/); checks++;
const logout = await fetch(origin + "/signout-with-chatgpt?return_to=%2Fsignin%3Fsigned_out%3D1", { redirect: "manual", headers: { Cookie: cookie } });
assert.equal(logout.status, 302); assert.equal(logout.headers.get("location"), "/signin?signed_out=1"); assert.match(logout.headers.get("set-cookie"), /Max-Age=0/); assert.match(logout.headers.get("cache-control"), /no-store/); checks+=4;
assert.match(await page("/signin?signed_out=1"), /You’re signed out of FirstSignal/); checks++;
for (const destination of ["https://example.com", "//example.com", "/signin"]) {
  const html = await page("/signin?return_to=" + encodeURIComponent(destination));
  assert.match(html, /href="\/signin-with-chatgpt\?return_to=%2F"/); checks++;
}
const anonymous = await fetch(origin + "/api/workspace").then(r=>r.json());
assert.deepEqual(anonymous.savedIds, []); assert.deepEqual(anonymous.myProfiles, []); assert.deepEqual(anonymous.requests, []); checks+=3;
const rejectedWrite = await fetch(origin + "/api/workspace", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({action:"save", profileId:"tracegrid", saved:true}) });
assert.equal(rejectedWrite.status,401); checks++;
console.log(JSON.stringify({result:"passed",checks,scope:"Loopback mock authentication only: sign-in, sign-out cookie expiry, redirects, private state and signed-out writes"}));
