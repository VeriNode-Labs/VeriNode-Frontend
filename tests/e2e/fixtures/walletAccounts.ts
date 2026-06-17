/**
 * Test wallet accounts for E2E testing
 * These are deterministic keypairs generated for testing purposes only
 * DO NOT USE THESE KEYS FOR REAL FUNDS
 */

export interface TestAccount {
  publicKey: string;
  secret: string;
  displayName: string;
}

/**
 * Pre-generated test accounts for consistent testing
 * Generated using @stellar/stellar-sdk Keypair.random()
 * DO NOT USE THESE KEYS FOR REAL FUNDS
 */
export const TEST_ACCOUNTS: TestAccount[] = [
  {
    displayName: 'Alice',
    publicKey: 'GDJV7ZUXWHO5YOFFVXRJVO7SYDSH6IUHUURN7CKEIBIUZKGO2XWNV6SN',
    secret: 'SBSZMMIN2UG77YJPEYFDVM23VVUVV34SYKI7WE24J2G5SPIWOGPAQ3BL',
  },
  {
    displayName: 'Bob',
    publicKey: 'GBPHFSE6UK57RLDMNTHA24NLZSA7ZYSURNZ5NRT6VL73EWTF5IFQLNHK',
    secret: 'SAO7NJ7F626NK5JU7IZ3F3W5CATAFKJGAWTCTNYN6CIE3KB3DXY36YUR',
  },
  {
    displayName: 'Charlie',
    publicKey: 'GCZJB5L74RUGUDVHTBL3CVIJYKLKOLYU75NNLXIPVZ5SELYKXDYU74HH',
    secret: 'SDCK3TUPKJXLYIUJTFACFVCSDFZOAXEA7ZVSGGU7IFJZV3OMSZT3EAN2',
  },
  {
    displayName: 'Diana',
    publicKey: 'GDVEVVKK25UYXUQKRC3LR3Z5J2YSGPF5V67HK65UGN5W6YNN4XBHKG22',
    secret: 'SCX4PFSGEFD7WDDCWBRBTL5KRXVCNKFDF5FCIMN33HLTSDWF4PYNWJRA',
  },
  {
    displayName: 'Eve',
    publicKey: 'GDOUHIMXJB3VQ7BHBAXCBLJ6MY7FGYET47ZORYLIFC3YFYIRRVMJNBRN',
    secret: 'SB4SZ3APYOIOUYN6F2CB3RGGBVVON3FZ4EN65MQNDUPDFN6RQYV7KPZX',
  },
];

/**
 * Get a test account by display name
 */
export function getTestAccount(displayName: string): TestAccount | undefined {
  return TEST_ACCOUNTS.find((account) => account.displayName === displayName);
}

/**
 * Get the default test account (Alice)
 */
export function getDefaultTestAccount(): TestAccount {
  return TEST_ACCOUNTS[0];
}
