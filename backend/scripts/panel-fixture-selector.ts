const fixtureEmail = /^(admin-browser-[0-9]+-[a-z0-9]+)-(admin|staff|customer)@example\.test$/;
const counterFixtureEmail = /^counter-browser-[0-9]+-[a-z0-9_-]{5}@example\.test$/;
export const fixturePrefix = /^admin-browser-[0-9]+-[a-z0-9]+$/;

/** Match the generated identity, exact name and temporary role together. */
export function isPrivilegedPanelFixture(user: {email: string; name: string; role: string}, prefix?: string): boolean {
 if(prefix===undefined){
  const counter=counterFixtureEmail.exec(user.email);
  if(counter&&counter[0]===user.email)return user.name==='Atendente Teste'&&user.role==='STAFF';
 }
 const match = fixtureEmail.exec(user.email);
 if (!match || match[0] !== user.email || (prefix !== undefined && (!fixturePrefix.test(prefix) || match[1] !== prefix))) return false;
 if (match[2] === 'admin') return user.name === 'Administradora de teste' && user.role === 'ADMIN';
 if (match[2] === 'staff') return user.name === 'Funcionário de teste' && user.role === 'STAFF';
 // The browser exercises granting/revoking this customer's staff access.
 return user.name === 'Cliente de teste' && user.role === 'STAFF';
}
