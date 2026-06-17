/**
 * Script to generate test Stellar keypairs
 * Run with: node scripts/generateTestAccounts.js
 */

const { Keypair } = require('@stellar/stellar-sdk');

const accountNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];

console.log('Generating test accounts...\n');

const accounts = accountNames.map(name => {
  const keypair = Keypair.random();
  return {
    displayName: name,
    publicKey: keypair.publicKey(),
    secret: keypair.secret(),
  };
});

console.log('// Generated Test Accounts');
console.log('// DO NOT USE THESE KEYS FOR REAL FUNDS\n');
console.log('export const TEST_ACCOUNTS: TestAccount[] = [');

accounts.forEach((account, index) => {
  console.log('  {');
  console.log(`    displayName: '${account.displayName}',`);
  console.log(`    publicKey: '${account.publicKey}',`);
  console.log(`    secret: '${account.secret}',`);
  console.log('  }' + (index < accounts.length - 1 ? ',' : ''));
});

console.log('];');

console.log('\n✅ Generated', accounts.length, 'test accounts');
console.log('⚠️  These are test-only keys. Never use for real funds.\n');
