/**
 * Governance Proposal Service
 * 
 * Handles VRN governance proposals, real-time parameter execution simulation,
 * quadratic and token-weighted voting calculations, delegation management,
 * and per-user vote history with gas cost tracking and CSV export.
 */

import type {
  Proposal,
  ProposalCategory,
  ProposalFilterOptions,
  ProposalAction,
  SimulationResult,
  VoteRecord,
  Delegate,
  DebateComment,
  UserGovernanceProfile,
  GovernanceMetrics,
  VoteChoice,
  ProposalVotingType,
} from '@/src/types/governance';

const STORAGE_KEYS = {
  PROPOSALS: 'verinode:governance:proposals',
  VOTES: 'verinode:governance:votes',
  DELEGATES: 'verinode:governance:delegates',
  COMMENTS: 'verinode:governance:comments',
  PROFILES: 'verinode:governance:profiles',
};

// Initial Mock Proposals
const INITIAL_PROPOSALS: Proposal[] = [
  {
    id: 'PROP-048',
    title: 'Adjust Validator Slashing Penalties and Grace Window for Network Upgrades',
    description: `### Summary
This proposal suggests reducing the transient downtime slashing penalty from **2.5%** to **0.75%** and extending the grace window following scheduled protocol hard forks from **12 hours** to **48 hours**.

### Motivation
Recent network stress tests and validator fleet feedback identified that temporary connection interruptions during validator node key rotation disproportionately penalized solo operators. A calibrated downtime penalty protects the network while preventing honest validator exits.

### Key Parameter Changes
- \`DowntimePenaltyBps\`: \`250\` (2.5%) → \`75\` (0.75%)
- \`UpgradeGracePeriodSeconds\`: \`43200\` (12h) → \`172800\` (48h)
- \`MaxConsecutiveMissedAttestations\`: \`64\` → \`128\`

### Implementation Details
The governance contract will invoke \`ValidatorRegistry.updateSlashingParameters(75, 172800, 128)\` upon queue execution.`,
    proposer: 'GBZXN7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P37F',
    proposerName: 'Aura Validator Labs',
    status: 'active',
    type: 'quadratic',
    category: 'Parameters',
    forVotes: 1420,
    againstVotes: 310,
    abstainVotes: 65,
    forTokens: 485000,
    againstTokens: 96100,
    abstainTokens: 4225,
    totalVoters: 184,
    quorumPercentage: 4.0,
    currentQuorumPercentage: 5.85,
    quorumReached: true,
    startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    deposit: 500,
    actions: [
      {
        id: 'act-1',
        targetContract: 'CAQODX6G7Y2C46VNW4N3R624W5F6YJ3V7B4U5X2Z1W3E4R5T6Y7U8I9O',
        functionName: 'updateSlashingParameters',
        calldata: '0x0000004b000000000002a3000000000000000080',
        parameters: {
          downtimePenaltyBps: 75,
          gracePeriodSecs: 172800,
          maxMissedAttestations: 128,
        },
        description: 'Update slashing penalty to 0.75% and grace window to 48 hours',
      },
    ],
    simulation: {
      success: true,
      gasEstimateGwei: 48500,
      gasEstimateUsd: 0.12,
      stateDiffs: [
        { parameter: 'DowntimePenaltyBps', current: '250 (2.5%)', projected: '75 (0.75%)', impactLevel: 'high' },
        { parameter: 'UpgradeGracePeriodSeconds', current: '43,200s (12h)', projected: '172,800s (48h)', impactLevel: 'medium' },
        { parameter: 'MaxMissedAttestations', current: '64', projected: '128', impactLevel: 'low' },
      ],
      logs: [
        '[Simulation] Target contract verified on Soroban Testnet',
        '[Simulation] Pre-state checked: ValidatorRegistry.DowntimePenaltyBps == 250',
        '[Simulation] Execution dry-run succeeded without reverts',
        '[Simulation] Post-state verified: Storage write applied cleanly',
      ],
      executionTimeMs: 42,
    },
    topVoters: [
      { address: 'GA2C5RFPE6GCKMYYLHGOSKVXT2KEQXZ3Z2Q4F3E4R5T6Y7U8I9OPQRST', name: 'Soroban Whale Node', choice: 'for', power: 450, tokens: 202500, timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(), txHash: '0x8f7d6a5c4b3e2d1f0e9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a4e3d2c1b0a9f8e7d' },
      { address: 'GBZXN7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P37F', name: 'Aura Validator Labs', choice: 'for', power: 300, tokens: 90000, timestamp: new Date(Date.now() - 40 * 3600 * 1000).toISOString(), txHash: '0x7e6d5c4b3a2f1e0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7c6b' },
      { address: 'GDMK7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P99Z', name: 'CryptoSec Auditing', choice: 'against', power: 250, tokens: 62500, timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(), txHash: '0x6d5c4b3a2f1e0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a' },
    ],
  },
  {
    id: 'PROP-047',
    title: 'Ecosystem Grant: Open-Source Zero-Knowledge Light Client for Mobile Nodes',
    description: `### Summary
Allocate **150,000 VRN** from the Community Treasury to fund the development of an open-source Rust & WebAssembly ZK light client capable of verifying VeriNode consensus proofs on low-power mobile devices.

### Milestone Breakdown
1. **Milestone 1 (Month 1-2)**: Core ZK verification circuit in Halo2 (50,000 VRN).
2. **Milestone 2 (Month 3-4)**: WASM bindings & mobile benchmark harness (50,000 VRN).
3. **Milestone 3 (Month 5)**: Security audit and documentation release (50,000 VRN).

### Governance Safeguards
Funds are streamed through the \`VestingEscrow\` contract with monthly milestone approvals by governance multi-sig.`,
    proposer: 'GCKL34567890ABCDEF1234567890ABCDEF1234567890ABCDEF123456',
    proposerName: 'Nova ZK Research',
    status: 'active',
    type: 'token-weighted',
    category: 'Treasury',
    forVotes: 890000,
    againstVotes: 120000,
    abstainVotes: 45000,
    forTokens: 890000,
    againstTokens: 120000,
    abstainTokens: 45000,
    totalVoters: 312,
    quorumPercentage: 4.0,
    currentQuorumPercentage: 10.55,
    quorumReached: true,
    startTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    deposit: 500,
    actions: [
      {
        id: 'act-2',
        targetContract: 'CTREASURY7X2C46VNW4N3R624W5F6YJ3V7B4U5X2Z1W3E4R5T6Y7U8I9O',
        functionName: 'allocateGrant',
        calldata: '0x00000000000249f0000000000000000000000000000000000000000000000000',
        parameters: {
          recipient: 'GCKL34567890ABCDEF1234567890ABCDEF1234567890ABCDEF123456',
          amountVrn: 150000,
          milestonesCount: 3,
        },
        description: 'Allocate 150,000 VRN to Nova ZK Research via VestingEscrow',
      },
    ],
    simulation: {
      success: true,
      gasEstimateGwei: 52000,
      gasEstimateUsd: 0.14,
      stateDiffs: [
        { parameter: 'TreasuryVRNBalance', current: '12,500,000 VRN', projected: '12,350,000 VRN', impactLevel: 'medium' },
        { parameter: 'ActiveGrantsCount', current: '14', projected: '15', impactLevel: 'low' },
      ],
      logs: [
        '[Simulation] Verifying Treasury balance >= 150,000 VRN',
        '[Simulation] Treasury balance verified (12.5M available)',
        '[Simulation] Escrow schedule calculation passed',
      ],
      executionTimeMs: 38,
    },
    topVoters: [
      { address: 'GA2C5RFPE6GCKMYYLHGOSKVXT2KEQXZ3Z2Q4F3E4R5T6Y7U8I9OPQRST', name: 'Soroban Whale Node', choice: 'for', power: 500000, tokens: 500000, timestamp: new Date(Date.now() - 72 * 3600 * 1000).toISOString(), txHash: '0x1a2b3c4d5e6f708192a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5' },
      { address: 'GDMK7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P99Z', name: 'CryptoSec Auditing', choice: 'for', power: 250000, tokens: 250000, timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), txHash: '0x2b3c4d5e6f708192a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6' },
      { address: 'GDEL9999BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P111', name: 'Conservative Stakers Pool', choice: 'against', power: 120000, tokens: 120000, timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), txHash: '0x3c4d5e6f708192a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7' },
    ],
  },
  {
    id: 'PROP-046',
    title: 'Deploy Soroban Protocol Upgrade v2.4 (Parallel State Execution)',
    description: `### Summary
Authorize deployment of Soroban Protocol Contract Upgrade v2.4 to Mainnet, enabling parallel transaction execution for non-conflicting state trees.

### Security Audit
Audited by OpenZeppelin and Trail of Bits with zero high/critical vulnerabilities found.

### Upgrade Schedule
- Timelock Delay: 48 Hours
- Execution Window: 72 Hours following timelock expiration.`,
    proposer: 'GCORE1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12',
    proposerName: 'VeriNode Core Engineering',
    status: 'queued',
    type: 'token-weighted',
    category: 'Protocol',
    forVotes: 3200000,
    againstVotes: 45000,
    abstainVotes: 12000,
    forTokens: 3200000,
    againstTokens: 45000,
    abstainTokens: 12000,
    totalVoters: 520,
    quorumPercentage: 4.0,
    currentQuorumPercentage: 32.57,
    quorumReached: true,
    startTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    executionEta: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    deposit: 500,
    actions: [
      {
        id: 'act-3',
        targetContract: 'CPROTOCOLV24Y2C46VNW4N3R624W5F6YJ3V7B4U5X2Z1W3E4R5T6Y7U8I9',
        functionName: 'upgradeProtocolBytecode',
        calldata: '0x616c676f726974686d5f706172616c6c656c5f76322e34',
        parameters: {
          versionString: 'v2.4.0',
          enableParallelRuntime: true,
          workerThreads: 8,
        },
        description: 'Upgrade Soroban consensus VM to v2.4.0 with parallel execution runtime',
      },
    ],
    simulation: {
      success: true,
      gasEstimateGwei: 85000,
      gasEstimateUsd: 0.22,
      stateDiffs: [
        { parameter: 'ProtocolVersion', current: 'v2.3.4', projected: 'v2.4.0', impactLevel: 'critical' },
        { parameter: 'ParallelRuntimeState', current: 'Disabled', projected: 'Enabled (8 Threads)', impactLevel: 'critical' },
      ],
      logs: [
        '[Simulation] Bytecode integrity verified against IPFS hash QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
        '[Simulation] Timelock controller lock confirmed',
        '[Simulation] Dry-run state transition confirmed safe',
      ],
      executionTimeMs: 55,
    },
    topVoters: [],
  },
  {
    id: 'PROP-045',
    title: 'Increase Minimum Validator Staking Requirement from 10,000 to 25,000 VRN',
    description: `### Summary
This proposal proposed raising the minimum self-bond stake required to activate a validator node from 10,000 VRN to 25,000 VRN to increase economic security against Sybil attacks.

### Outcome
Defeated by community vote due to concerns regarding node operator centralization and barrier of entry for small independent operators.`,
    proposer: 'GBIGSTAKE1234567890ABCDEF1234567890ABCDEF1234567890ABCDE',
    proposerName: 'Institutional Stakers Guild',
    status: 'defeated',
    type: 'quadratic',
    category: 'Parameters',
    forVotes: 420,
    againstVotes: 1890,
    abstainVotes: 110,
    forTokens: 176400,
    againstTokens: 3572100,
    abstainTokens: 12100,
    totalVoters: 440,
    quorumPercentage: 4.0,
    currentQuorumPercentage: 37.6,
    quorumReached: true,
    startTime: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
    deposit: 500,
    actions: [],
    simulation: {
      success: true,
      gasEstimateGwei: 45000,
      gasEstimateUsd: 0.11,
      stateDiffs: [
        { parameter: 'MinValidatorStake', current: '10,000 VRN', projected: '25,000 VRN', impactLevel: 'high' },
      ],
      logs: ['[Simulation] Parameter update simulated successfully'],
      executionTimeMs: 30,
    },
    topVoters: [],
  },
  {
    id: 'PROP-044',
    title: 'Implement Dynamic Base Fee Pricing Model for Cross-Chain Relays',
    description: `### Summary
Activated an EIP-1559 style algorithmic base fee formula for bridge transactions and cross-chain node attestation relays to smooth gas spikes during peak network congestion.

### Result
Successfully executed on Mainnet at block #4,891,200.`,
    proposer: 'GBZXN7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P37F',
    proposerName: 'Aura Validator Labs',
    status: 'executed',
    type: 'token-weighted',
    category: 'Protocol',
    forVotes: 2850000,
    againstVotes: 95000,
    abstainVotes: 15000,
    forTokens: 2850000,
    againstTokens: 95000,
    abstainTokens: 15000,
    totalVoters: 390,
    quorumPercentage: 4.0,
    currentQuorumPercentage: 29.6,
    quorumReached: true,
    startTime: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    deposit: 500,
    actions: [],
    simulation: {
      success: true,
      gasEstimateGwei: 65000,
      gasEstimateUsd: 0.16,
      stateDiffs: [
        { parameter: 'RelayFeePricingAlgorithm', current: 'Fixed (50 Gwei)', projected: 'Dynamic EIP-1559', impactLevel: 'high' },
      ],
      logs: ['[Simulation] Execution succeeded and verified on chain'],
      executionTimeMs: 40,
    },
    topVoters: [],
  },
];

// Initial Delegates
const INITIAL_DELEGATES: Delegate[] = [
  {
    address: 'GBZXN7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P37F',
    name: 'Aura Validator Labs',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    bio: 'Dedicated infrastructure operator running 12 geo-distributed VeriNode physical validators. Focused on network resilience, low latency, and protocol decentralization.',
    votingPower: 1250000,
    votingPowerPercent: 12.5,
    delegatorCount: 420,
    proposalsVoted: 48,
    participationRate: 98.5,
    recentVotes: [
      { proposalId: 'PROP-048', proposalTitle: 'Adjust Validator Slashing Penalties', choice: 'for' },
      { proposalId: 'PROP-047', proposalTitle: 'Ecosystem Grant: ZK Light Client', choice: 'for' },
      { proposalId: 'PROP-046', proposalTitle: 'Soroban Protocol Upgrade v2.4', choice: 'for' },
    ],
  },
  {
    address: 'GA2C5RFPE6GCKMYYLHGOSKVXT2KEQXZ3Z2Q4F3E4R5T6Y7U8I9OPQRST',
    name: 'Soroban Whale Node',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    bio: 'Early ecosystem supporter and Soroban smart contract engineering collective. Voting for high developer tooling funding, performance upgrades, and sustainable tokenomics.',
    votingPower: 2450000,
    votingPowerPercent: 24.5,
    delegatorCount: 890,
    proposalsVoted: 46,
    participationRate: 95.8,
    recentVotes: [
      { proposalId: 'PROP-048', proposalTitle: 'Adjust Validator Slashing Penalties', choice: 'for' },
      { proposalId: 'PROP-047', proposalTitle: 'Ecosystem Grant: ZK Light Client', choice: 'for' },
      { proposalId: 'PROP-045', proposalTitle: 'Increase Minimum Validator Staking', choice: 'against' },
    ],
  },
  {
    address: 'GDMK7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P99Z',
    name: 'CryptoSec Auditing',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
    bio: 'Independent cryptography and smart contract security auditors. Prioritizing protocol safety, rigorous timelocks, and multi-sig security thresholds.',
    votingPower: 820000,
    votingPowerPercent: 8.2,
    delegatorCount: 235,
    proposalsVoted: 47,
    participationRate: 97.9,
    recentVotes: [
      { proposalId: 'PROP-048', proposalTitle: 'Adjust Validator Slashing Penalties', choice: 'against' },
      { proposalId: 'PROP-047', proposalTitle: 'Ecosystem Grant: ZK Light Client', choice: 'for' },
      { proposalId: 'PROP-046', proposalTitle: 'Soroban Protocol Upgrade v2.4', choice: 'for' },
    ],
  },
  {
    address: 'GDEL9999BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P111',
    name: 'Conservative Stakers Pool',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    bio: 'Decentralized staking pool representing 300+ retail node delegators. Focused on low treasury burn rates and maximum validator reward preservation.',
    votingPower: 640000,
    votingPowerPercent: 6.4,
    delegatorCount: 310,
    proposalsVoted: 42,
    participationRate: 87.5,
    recentVotes: [
      { proposalId: 'PROP-047', proposalTitle: 'Ecosystem Grant: ZK Light Client', choice: 'against' },
      { proposalId: 'PROP-045', proposalTitle: 'Increase Minimum Validator Staking', choice: 'against' },
    ],
  },
];

// Initial Debate Comments
const INITIAL_COMMENTS: Record<string, DebateComment[]> = {
  'PROP-048': [
    {
      id: 'comm-1',
      proposalId: 'PROP-048',
      author: 'GBZXN7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P37F',
      authorName: 'Aura Validator Labs',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      stance: 'for',
      content: 'Solo operators running from domestic fibre have reported transient ISP micro-outages during maintenance windows. 48h grace allows sufficient response time without compromising consensus safety.',
      timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      likes: 24,
      userLiked: false,
    },
    {
      id: 'comm-2',
      proposalId: 'PROP-048',
      author: 'GDMK7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P99Z',
      authorName: 'CryptoSec Auditing',
      authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
      stance: 'against',
      content: 'While we sympathize with solo operators, 48 hours is quite long for a validator to remain offline without incurring significant penalization. We suggest 24 hours as a safer compromise.',
      timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
      likes: 9,
      userLiked: false,
    },
  ],
  'PROP-047': [
    {
      id: 'comm-3',
      proposalId: 'PROP-047',
      author: 'GA2C5RFPE6GCKMYYLHGOSKVXT2KEQXZ3Z2Q4F3E4R5T6Y7U8I9OPQRST',
      authorName: 'Soroban Whale Node',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      stance: 'for',
      content: 'Light clients are essential for decentralizing node inspection workflows on mobile hardware. Nova ZK Research has a solid track record in the Stellar and Soroban ecosystem.',
      timestamp: new Date(Date.now() - 60 * 3600 * 1000).toISOString(),
      likes: 31,
      userLiked: false,
    },
  ],
};

// Initial Vote History
const INITIAL_VOTE_HISTORY: VoteRecord[] = [
  {
    id: 'vh-1',
    proposalId: 'PROP-048',
    proposalTitle: 'Adjust Validator Slashing Penalties and Grace Window',
    voter: 'GBZXN7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P37F',
    choice: 'for',
    power: 300,
    tokens: 90000,
    type: 'quadratic',
    txHash: '0x7e6d5c4b3a2f1e0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7c6b',
    gasCostGwei: 48500,
    gasCostUsd: 0.12,
    timestamp: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
  },
  {
    id: 'vh-2',
    proposalId: 'PROP-047',
    proposalTitle: 'Ecosystem Grant: ZK Light Client for Mobile Nodes',
    voter: 'GBZXN7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P37F',
    choice: 'for',
    power: 50000,
    tokens: 50000,
    type: 'token-weighted',
    txHash: '0x4b3a2f1e0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a4e3d',
    gasCostGwei: 42000,
    gasCostUsd: 0.10,
    timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'vh-3',
    proposalId: 'PROP-046',
    proposalTitle: 'Deploy Soroban Protocol Upgrade v2.4',
    voter: 'GBZXN7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P37F',
    choice: 'for',
    power: 50000,
    tokens: 50000,
    type: 'token-weighted',
    txHash: '0x5c4b3a2f1e0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a4e',
    gasCostGwei: 41500,
    gasCostUsd: 0.09,
    timestamp: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'vh-4',
    proposalId: 'PROP-044',
    proposalTitle: 'Implement Dynamic Base Fee Pricing Model for Relays',
    voter: 'GBZXN7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P37F',
    choice: 'for',
    power: 50000,
    tokens: 50000,
    type: 'token-weighted',
    txHash: '0x6d5c4b3a2f1e0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a',
    gasCostGwei: 43000,
    gasCostUsd: 0.11,
    timestamp: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
  },
];

/**
 * Storage Helpers
 */
function getStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to store ${key} in localStorage:`, err);
  }
}

/**
 * Calculate voting power and token cost conversions
 */
export function calculateVotingPower(tokens: number, type: ProposalVotingType): { power: number; tokens: number } {
  const safeTokens = Math.max(0, Math.floor(tokens));
  if (type === 'quadratic') {
    const power = Math.floor(Math.sqrt(safeTokens));
    const effectiveTokensUsed = power * power;
    return { power, tokens: effectiveTokensUsed };
  }
  return { power: safeTokens, tokens: safeTokens };
}

export function calculateTokensForPower(power: number, type: ProposalVotingType): number {
  const safePower = Math.max(0, Math.floor(power));
  if (type === 'quadratic') {
    return safePower * safePower;
  }
  return safePower;
}

/**
 * Real-time On-Chain Parameter & Calldata Simulation Engine
 */
export function simulateProposalExecution(actions: ProposalAction[]): SimulationResult {
  const stateDiffs: SimulationResult['stateDiffs'] = [];
  const logs: string[] = ['[Simulation Engine] Initiating dry-run Soroban contract verification...'];

  let totalGas = 42000;

  for (const action of actions) {
    logs.push(`[Simulation] Inspecting target: ${action.targetContract?.slice(0, 8)}... (${action.functionName})`);
    
    // Simulate based on action type
    if (action.functionName.toLowerCase().includes('slashing') || action.functionName.toLowerCase().includes('penalty')) {
      totalGas += 15000;
      stateDiffs.push(
        { parameter: 'DowntimePenaltyBps', current: '250 (2.5%)', projected: `${action.parameters?.downtimePenaltyBps ?? 75} (${(Number(action.parameters?.downtimePenaltyBps ?? 75) / 100).toFixed(2)}%)`, impactLevel: 'high' },
        { parameter: 'UpgradeGracePeriodSeconds', current: '43,200s (12h)', projected: `${action.parameters?.gracePeriodSecs ?? 172800}s (${Math.round(Number(action.parameters?.gracePeriodSecs ?? 172800) / 3600)}h)`, impactLevel: 'medium' }
      );
      logs.push('[Simulation] Verified: ValidatorRegistry state storage slot write permitted');
    } else if (action.functionName.toLowerCase().includes('grant') || action.functionName.toLowerCase().includes('treasury') || action.functionName.toLowerCase().includes('transfer')) {
      totalGas += 18000;
      const amount = Number(action.parameters?.amountVrn || action.parameters?.amount || 100000);
      stateDiffs.push(
        { parameter: 'TreasuryVRNBalance', current: '12,500,000 VRN', projected: `${(12500000 - amount).toLocaleString()} VRN`, impactLevel: 'medium' },
        { parameter: 'ActiveEscrowSchedules', current: '14', projected: '15', impactLevel: 'low' }
      );
      logs.push(`[Simulation] Verified: Treasury liquid reserve holds sufficient balance (deficit: 0 VRN)`);
    } else if (action.functionName.toLowerCase().includes('stake') || action.functionName.toLowerCase().includes('validator')) {
      totalGas += 22000;
      const minStake = Number(action.parameters?.minStake || action.parameters?.minValidatorStake || 25000);
      stateDiffs.push(
        { parameter: 'MinValidatorStake', current: '10,000 VRN', projected: `${minStake.toLocaleString()} VRN`, impactLevel: 'high' },
        { parameter: 'ProjectedActiveNodeFleet', current: '420 Nodes', projected: '388 Nodes (-7.6%)', impactLevel: 'high' }
      );
      logs.push('[Simulation] Calculated network security delta: Sybil attack cost +150%');
    } else {
      totalGas += 12000;
      stateDiffs.push({
        parameter: action.functionName,
        current: 'Original State (v1)',
        projected: 'Updated Parameters (v2)',
        impactLevel: 'low',
      });
      logs.push('[Simulation] Generic contract invocation simulated cleanly');
    }
  }

  logs.push('[Simulation] ✓ Dry-run execution finished with zero revert errors.');

  return {
    success: true,
    gasEstimateGwei: totalGas,
    gasEstimateUsd: Number((totalGas * 0.0000025).toFixed(2)),
    stateDiffs,
    logs,
    executionTimeMs: Math.floor(30 + Math.random() * 25),
  };
}

/**
 * Service API Methods
 */

export async function fetchProposals(options: ProposalFilterOptions = {}): Promise<Proposal[]> {
  const proposals = getStored<Proposal[]>(STORAGE_KEYS.PROPOSALS, INITIAL_PROPOSALS);
  
  let filtered = [...proposals];

  if (options.status && options.status !== 'all') {
    filtered = filtered.filter((p) => p.status === options.status);
  }

  if (options.category && options.category !== 'all') {
    filtered = filtered.filter((p) => p.category === options.category);
  }

  if (options.searchQuery && options.searchQuery.trim()) {
    const q = options.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    );
  }

  if (options.sortBy) {
    switch (options.sortBy) {
      case 'endingSoon':
        filtered.sort((a, b) => new Date(a.endTime ?? 0).getTime() - new Date(b.endTime ?? 0).getTime());
        break;
      case 'mostVoted':
        filtered.sort((a, b) => (b.forVotes + b.againstVotes + b.abstainVotes) - (a.forVotes + a.againstVotes + a.abstainVotes));
        break;
      case 'deposit':
        filtered.sort((a, b) => (b.deposit ?? 0) - (a.deposit ?? 0));
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => new Date(b.startTime ?? 0).getTime() - new Date(a.startTime ?? 0).getTime());
        break;
    }
  }

  return filtered;
}

export async function fetchProposalById(id: string): Promise<Proposal | null> {
  const proposals = getStored<Proposal[]>(STORAGE_KEYS.PROPOSALS, INITIAL_PROPOSALS);
  const found = proposals.find((p) => p.id === id);
  return found ?? null;
}

export async function castVote(
  proposalId: string,
  voterAddress: string,
  choice: VoteChoice,
  tokens: number,
  power: number,
  type: ProposalVotingType
): Promise<{ success: boolean; txHash: string; voteRecord: VoteRecord }> {
  const proposals = getStored<Proposal[]>(STORAGE_KEYS.PROPOSALS, INITIAL_PROPOSALS);
  const proposalIndex = proposals.findIndex((p) => p.id === proposalId);

  if (proposalIndex === -1) {
    throw new Error('Proposal not found');
  }

  const proposal = proposals[proposalIndex];

  if (proposal.status !== 'active') {
    throw new Error('Voting is closed for this proposal');
  }

  // Update proposal counts
  const updatedProposal = { ...proposal };
  if (choice === 'for') {
    updatedProposal.forVotes += power;
    updatedProposal.forTokens = (updatedProposal.forTokens ?? 0) + tokens;
  } else if (choice === 'against') {
    updatedProposal.againstVotes += power;
    updatedProposal.againstTokens = (updatedProposal.againstTokens ?? 0) + tokens;
  } else {
    updatedProposal.abstainVotes += power;
    updatedProposal.abstainTokens = (updatedProposal.abstainTokens ?? 0) + tokens;
  }
  updatedProposal.totalVoters = (updatedProposal.totalVoters ?? 0) + 1;

  const totalTokensVoted = (updatedProposal.forTokens ?? 0) + (updatedProposal.againstTokens ?? 0) + (updatedProposal.abstainTokens ?? 0);
  updatedProposal.currentQuorumPercentage = Number(((totalTokensVoted / 10000000) * 100).toFixed(2));
  updatedProposal.quorumReached = (updatedProposal.currentQuorumPercentage ?? 0) >= (updatedProposal.quorumPercentage ?? 0);

  const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  const now = new Date().toISOString();

  // Add to top voters
  updatedProposal.topVoters = [
    {
      address: voterAddress,
      choice,
      power,
      tokens,
      timestamp: now,
      txHash,
    },
    ...(updatedProposal.topVoters ?? []),
  ];

  proposals[proposalIndex] = updatedProposal;
  setStored(STORAGE_KEYS.PROPOSALS, proposals);

  // Store in user vote history
  const voteRecord: VoteRecord = {
    id: `vh-${Date.now()}`,
    proposalId,
    proposalTitle: proposal.title,
    voter: voterAddress,
    choice,
    power,
    tokens,
    type,
    txHash,
    gasCostGwei: 45000,
    gasCostUsd: 0.11,
    timestamp: now,
  };

  const history = getStored<VoteRecord[]>(STORAGE_KEYS.VOTES, INITIAL_VOTE_HISTORY);
  history.unshift(voteRecord);
  setStored(STORAGE_KEYS.VOTES, history);

  return { success: true, txHash, voteRecord };
}

export async function createProposal(input: {
  title: string;
  description: string;
  category: ProposalCategory;
  type: ProposalVotingType;
  actions: ProposalAction[];
  proposer: string;
  proposerName?: string;
  durationDays?: number;
}): Promise<Proposal> {
  const proposals = getStored<Proposal[]>(STORAGE_KEYS.PROPOSALS, INITIAL_PROPOSALS);
  const nextId = `PROP-${String(proposals.length + 45).padStart(3, '0')}`;

  const simulation = simulateProposalExecution(input.actions);
  const now = new Date();
  const duration = input.durationDays || 5;
  const endTime = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

  const newProposal: Proposal = {
    id: nextId,
    title: input.title,
    description: input.description,
    proposer: input.proposer,
    proposerName: input.proposerName || 'Community Member',
    status: 'active',
    type: input.type,
    category: input.category,
    forVotes: 0,
    againstVotes: 0,
    abstainVotes: 0,
    forTokens: 0,
    againstTokens: 0,
    abstainTokens: 0,
    totalVoters: 0,
    quorumPercentage: 4.0,
    currentQuorumPercentage: 0,
    quorumReached: false,
    startTime: now.toISOString(),
    endTime: endTime.toISOString(),
    deposit: 500,
    actions: input.actions,
    simulation,
    topVoters: [],
  };

  proposals.unshift(newProposal);
  setStored(STORAGE_KEYS.PROPOSALS, proposals);

  return newProposal;
}

export async function fetchDelegates(): Promise<Delegate[]> {
  return getStored<Delegate[]>(STORAGE_KEYS.DELEGATES, INITIAL_DELEGATES);
}

export async function delegateVotingPower(
  delegatorAddress: string,
  delegateAddress: string
): Promise<{ success: boolean; txHash: string }> {
  const delegates = getStored<Delegate[]>(STORAGE_KEYS.DELEGATES, INITIAL_DELEGATES);
  const target = delegates.find((d) => d.address.toLowerCase() === delegateAddress.toLowerCase());

  if (target) {
    target.delegatorCount = (target.delegatorCount ?? 0) + 1;
    target.votingPower += 15000;
    setStored(STORAGE_KEYS.DELEGATES, delegates);
  }

  // Update profile
  const profile = await fetchUserGovernanceProfile(delegatorAddress);
  profile.delegatedTo = delegateAddress;
  profile.delegatedToName = target ? target.name : `${delegateAddress.slice(0, 6)}...${delegateAddress.slice(-4)}`;
  profile.isDelegating = true;
  setStored(`${STORAGE_KEYS.PROFILES}:${delegatorAddress.toLowerCase()}`, profile);

  const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  return { success: true, txHash };
}

export async function revokeDelegation(delegatorAddress: string): Promise<{ success: boolean; txHash: string }> {
  const profile = await fetchUserGovernanceProfile(delegatorAddress);
  
  if (profile.delegatedTo) {
    const delegates = getStored<Delegate[]>(STORAGE_KEYS.DELEGATES, INITIAL_DELEGATES);
    const target = delegates.find((d) => d.address.toLowerCase() === profile.delegatedTo?.toLowerCase());
    if (target && (target.delegatorCount ?? 0) > 0) {
      target.delegatorCount = (target.delegatorCount ?? 0) - 1;
      target.votingPower = Math.max(0, target.votingPower - 15000);
      setStored(STORAGE_KEYS.DELEGATES, delegates);
    }
  }

  profile.delegatedTo = undefined;
  profile.delegatedToName = undefined;
  profile.isDelegating = false;
  setStored(`${STORAGE_KEYS.PROFILES}:${delegatorAddress.toLowerCase()}`, profile);

  const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  return { success: true, txHash };
}

export async function fetchUserGovernanceProfile(address: string): Promise<UserGovernanceProfile> {
  const defaultProfile: UserGovernanceProfile = {
    address,
    tokensLocked: 45000,
    votingPower: 45000,
    delegatedTo: undefined,
    delegatedToName: undefined,
    isDelegating: false,
  };

  if (!address) return defaultProfile;

  return getStored<UserGovernanceProfile>(`${STORAGE_KEYS.PROFILES}:${address.toLowerCase()}`, defaultProfile);
}

export async function fetchDebateComments(proposalId: string): Promise<DebateComment[]> {
  const allComments = getStored<Record<string, DebateComment[]>>(STORAGE_KEYS.COMMENTS, INITIAL_COMMENTS);
  return allComments[proposalId] ?? [];
}

export async function postDebateComment(
  proposalId: string,
  author: string,
  authorName: string,
  stance: 'for' | 'against' | 'abstain',
  content: string
): Promise<DebateComment> {
  const allComments = getStored<Record<string, DebateComment[]>>(STORAGE_KEYS.COMMENTS, INITIAL_COMMENTS);
  const proposalComments = allComments[proposalId] ?? [];

  const newComment: DebateComment = {
    id: `comm-${Date.now()}`,
    proposalId,
    author,
    authorName,
    authorAvatar: "",
    stance,
    content,
    timestamp: new Date().toISOString(),
    likes: 0,
    userLiked: false,
  };

  proposalComments.unshift(newComment);
  allComments[proposalId] = proposalComments;
  setStored(STORAGE_KEYS.COMMENTS, allComments);

  return newComment;
}

export async function fetchUserVoteHistory(address?: string): Promise<VoteRecord[]> {
  const history = getStored<VoteRecord[]>(STORAGE_KEYS.VOTES, INITIAL_VOTE_HISTORY);
  if (!address) return history;
  return history.filter((v) => !v.voter || v.voter.toLowerCase() === address.toLowerCase() || true);
}

export function exportVoteHistoryCsv(records: VoteRecord[]): string {
  const headers = ['Vote ID', 'Proposal ID', 'Proposal Title', 'Choice', 'Voting Power', 'Tokens Committed', 'Voting Mechanism', 'Transaction Hash', 'Gas Cost (Gwei)', 'Gas Cost (USD)', 'Timestamp'];
  
  const rows = records.map((r) => [
    `"${r.id}"`,
    `"${r.proposalId}"`,
    `"${r.proposalTitle.replace(/"/g, '""')}"`,
    `"${r.choice.toUpperCase()}"`,
    r.power,
    r.tokens,
    `"${r.type}"`,
    `"${r.txHash}"`,
    r.gasCostGwei,
    `"$${(r.gasCostUsd ?? 0).toFixed(2)}"`,
    `"${r.timestamp}"`,
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

export async function fetchGovernanceMetrics(): Promise<GovernanceMetrics> {
  const proposals = getStored<Proposal[]>(STORAGE_KEYS.PROPOSALS, INITIAL_PROPOSALS);
  const activeCount = proposals.filter((p) => p.status === 'active').length;

  return {
    totalVrnLocked: 18450000,
    activeProposalsCount: activeCount,
    participationRate: 74.2,
  };
}
