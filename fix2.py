import re
import os

base_dir = r"C:\Users\DELL\Desktop\b-191\VeriNode-Frontend"

def read_file(path):
    with open(path, "r", encoding="utf8") as f:
        return f.read()

def write_file(path, content):
    with open(path, "w", encoding="utf8") as f:
        f.write(content)

def fix_governance_store():
    path = os.path.join(base_dir, r"src\store\governanceStore.ts")
    c = read_file(path)
    # gasCost: 0.0021 -> gasCost: '0.0021'
    c = re.sub(r'gasCost:\s*([\d\.]+),', r"gasCost: '\1',", c)
    write_file(path, c)

def fix_tests():
    path = os.path.join(base_dir, r"src\__tests__\governance.test.ts")
    if os.path.exists(path):
        c = read_file(path)
        c = re.sub(r'gasCost:\s*([\d\.]+),', r"gasCost: '\1',", c)
        c = re.sub(r"parameters:\s*\'\{.*?\}',", r"parameters: {},", c)
        c = re.sub(r'deposit:\s*\d+,', r'deposit: 500, type: "token-weighted", proposer: "user1",', c)
        write_file(path, c)
        
    path2 = os.path.join(base_dir, r"src\__tests__\hexDecoder.test.ts")
    if os.path.exists(path2):
        c = read_file(path2)
        c = c.replace('type: \'map\'', 'type: \'scvMap\'')
        write_file(path2, c)
        
    path3 = os.path.join(base_dir, r"src\__tests__\secretRotation.benchmark.ts")
    if os.path.exists(path3):
        c = read_file(path3)
        c = c.replace('.ts"', '"').replace(".ts'", "'")
        write_file(path3, c)

def fix_components():
    # DelegateManager
    path = os.path.join(base_dir, r"src\components\governance\DelegateManager.tsx")
    c = read_file(path)
    c = c.replace('d.bio.toLowerCase()', '(d.bio ?? "").toLowerCase()')
    c = c.replace('tokenBalance', 'tokensLocked')
    c = c.replace('profile?.delegatorCount', 'profile?.delegatorsCount')
    c = c.replace('import { useWallet } from \'@/src/hooks/useWallet\';', 'import { useWallet } from \'@/src/hooks/useWallet\';\nconst truncateAddress = (addr: string) => addr.slice(0, 8) + "..." + addr.slice(-4);')
    write_file(path, c)
    
    # GovernanceDashboard
    path = os.path.join(base_dir, r"src\components\governance\GovernanceDashboard.tsx")
    c = read_file(path)
    c = c.replace('totalVrnLockedUsd', 'totalVrnLocked')
    c = c.replace('totalProposalsCount', 'totalProposals')
    c = c.replace('tokenBalance', 'tokensLocked')
    c = c.replace('onCancel={() => {}}', '')
    write_file(path, c)
    
    # ProposalCard
    path = os.path.join(base_dir, r"src\components\governance\ProposalCard.tsx")
    c = read_file(path)
    c = c.replace('new Date(proposal.endTime)', 'new Date(proposal.endTime ?? 0)')
    c = c.replace("case 'cancelled':", "case 'canceled':")
    write_file(path, c)
    
    # ProposalCreator
    path = os.path.join(base_dir, r"src\components\governance\ProposalCreator.tsx")
    c = read_file(path)
    c = c.replace("parameters: ''", "parameters: {}")
    c = c.replace('deposit: 1000,', 'deposit: 1000, type: formData.votingType, proposer: "GA2C5RFPE...",')
    c = c.replace('a.target', 'a.target ?? ""')
    c = c.replace('value={action.parameters}', 'value={JSON.stringify(action.parameters)}')
    write_file(path, c)
    
    # ProposalDetail
    path = os.path.join(base_dir, r"src\components\governance\ProposalDetail.tsx")
    c = read_file(path)
    c = c.replace('proposal.votingType', '(proposal.votingType ?? "token-weighted")')
    c = c.replace('new Date(proposal.startBlock)', 'new Date(proposal.startBlock ?? 0)')
    c = c.replace('proposal.quorum', '(proposal.quorum ?? 0)')
    c = c.replace('{action.parameters}', '{JSON.stringify(action.parameters)}')
    write_file(path, c)
    
    # VoteDistributionChart
    path = os.path.join(base_dir, r"src\components\governance\VoteDistributionChart.tsx")
    c = read_file(path)
    c = c.replace('forTokens:', 'forTokens: forTokens ?? 0,')
    c = c.replace('againstTokens:', 'againstTokens: againstTokens ?? 0,')
    c = c.replace('abstainTokens:', 'abstainTokens: abstainTokens ?? 0,')
    c = c.replace('value={forTokens}', 'value={forTokens ?? 0}')
    c = c.replace('value={againstTokens}', 'value={againstTokens ?? 0}')
    c = c.replace('value={abstainTokens}', 'value={abstainTokens ?? 0}')
    write_file(path, c)
    
    # VoteHistoryTable
    path = os.path.join(base_dir, r"src\components\governance\VoteHistoryTable.tsx")
    c = read_file(path)
    c = c.replace('record.votingPower', '(record.votingPower ?? 0)')
    write_file(path, c)
    
    # VotePanel
    path = os.path.join(base_dir, r"src\components\governance\VotePanel.tsx")
    c = read_file(path)
    c = c.replace('tokenBalance', 'tokensLocked')
    write_file(path, c)
    
    # Service tests
    path = os.path.join(base_dir, r"src\services\tests\governanceProposalService.test.ts")
    if os.path.exists(path):
        c = read_file(path)
        c = c.replace('initialCount', '(initialCount ?? 0)')
        write_file(path, c)

    # Service
    path = os.path.join(base_dir, r"src\services\governanceProposalService.ts")
    c = read_file(path)
    c = c.replace('target.delegatorCount', 'target.delegatorsCount')
    write_file(path, c)


fix_governance_store()
fix_tests()
fix_components()
