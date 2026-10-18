import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { transform } from 'esbuild';

// Execute the actual entry-page guards with isolated identities, never a
// real Clerk session. JSX descriptors let us check which auth branch is used.
const env = { FINDIN_ADMIN_USER_ID: 'user_Owner123' };
let currentUser = null;
let signOutOptions;
const owner = { userId: 'clerk:user_Owner123', displayName: 'Owner' };
const member = { userId: 'clerk:user_Member123', displayName: 'Member' };
const jsx = (type, props) => ({ type, props });
const jsxRuntime = { jsx, jsxs: jsx, Fragment: 'fragment' };
const react = { useEffect() {}, useRef: value => ({ current: value }), useState: value => [value, () => {}] };
class Redirect extends Error { constructor(destination) { super(destination); this.destination = destination; } }
const redirect = destination => { throw new Redirect(destination); };
async function load(file, modules) {
  const { code } = await transform(await fs.readFile(file, 'utf8'), { loader: file.endsWith('tsx') ? 'tsx' : 'ts', format: 'cjs', jsx: 'automatic' });
  const context = { module: { exports: {} }, exports: {}, require: id => {
    if (id.endsWith('.css')) return {};
    assert.ok(id in modules, `Unexpected dependency ${id}`);
    return modules[id];
  } };
  vm.runInNewContext(code, context);
  return context.module.exports;
}
const access = await load('lib/admin-access.ts', { 'cloudflare:workers': { env } });
const AdminPortal = () => null, AdminSignInForm = () => null, SignOutButton = () => null;
const common = { 'react/jsx-runtime': jsxRuntime, 'next/navigation': { redirect }, '@/app/auth': { getAppUser: async () => currentUser, clerkPublishableKey: () => 'pk_test_fixture' }, '@/lib/admin-access': access };
const admin = await load('app/admin/page.tsx', { ...common, '@/components/admin-portal': AdminPortal });
const signin = await load('app/admin/signin/page.tsx', { ...common, 'next/link': 'link', 'lucide-react': { ArrowLeft: 'arrow', ShieldCheck: 'shield' }, '@/components/admin-signin-form': AdminSignInForm, '@/components/auth-form': { SignOutButton } });
let checks = 0;
function equal(actual, expected) { assert.equal(actual, expected); checks++; }
async function destination(page) {
  try { await page.default(); return null; }
  catch (error) { if (error instanceof Redirect) return error.destination; throw error; }
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}

equal(await destination(admin), '/admin/signin');
let tree = await signin.default();
equal(nodes(tree).some(node => node.type === AdminSignInForm), true);
currentUser = member;
equal(await destination(admin), '/admin/signin');
tree = await signin.default();
equal(nodes(tree).some(node => node.type === AdminSignInForm), false);
equal(nodes(tree).find(node => node.type === SignOutButton).props.redirectUrl, '/admin/signin');
equal(JSON.stringify(tree).includes('user_Owner123'), false);
currentUser = { ...member, role: 'admin', email: 'owner@example.test' };
equal(await destination(admin), '/admin/signin');
currentUser = owner;
equal(await destination(signin), '/admin');
tree = await admin.default();
equal(tree.type, AdminPortal);
equal(tree.props.owner.id, owner.userId);
env.FINDIN_ADMIN_USER_ID = '';
equal(await destination(admin), '/admin/signin');
env.FINDIN_ADMIN_USER_ID = 'user_Owner123,user_Member123';
equal(await destination(admin), '/admin/signin');

// Check the actual provider component's fixed destination and signup controls.
const SignIn = () => null;
const form = await load('components/admin-signin-form.tsx', { react, 'react/jsx-runtime': jsxRuntime, '@clerk/react': { SignIn, useAuth: () => ({ isLoaded: true }) } });
const provider = nodes(form.default()).find(node => node.type === SignIn);
equal(provider.props.forceRedirectUrl, '/admin');
equal(provider.props.withSignUp, false);
equal(provider.props.transferable, false);

const authForm = await load('components/auth-form.tsx', { react, 'react/jsx-runtime': jsxRuntime, '@clerk/react': { useClerk: () => ({ signOut: async options => { signOutOptions = options; } }) } });
nodes(authForm.SignOutButton({ redirectUrl: '/admin/signin' })).find(node => node.type === 'button').props.onClick();
equal(signOutOptions.redirectUrl, '/admin/signin');
nodes(authForm.SignOutButton()).find(node => node.type === 'button').props.onClick();
equal(signOutOptions.redirectUrl, '/signin?signed_out=1');
console.log(`Passed ${checks} admin entry checks: owner/member/anonymous guards, fixed admin destination, no signup transfer and separate logout return.`);
