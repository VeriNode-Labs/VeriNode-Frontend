import re
import os

base_dir = r"C:\Users\DELL\Desktop\b-191\VeriNode-Frontend"

def read_file(path):
    with open(path, "r", encoding="utf8") as f:
        return f.read()

def write_file(path, content):
    with open(path, "w", encoding="utf8") as f:
        f.write(content)

def fix_all():
    # 1. secretRotation.spec.ts
    path = os.path.join(base_dir, r"e2e\wallet-tests\secretRotation.spec.ts")
    if os.path.exists(path):
        c = read_file(path)
        c = c.replace('.ts"', '"').replace(".ts'", "'")
        write_file(path, c)

    # 2. exitMessageBuilder.test.ts
    path = os.path.join(base_dir, r"src\__tests__\exitMessageBuilder.test.ts")
    if os.path.exists(path):
        c = read_file(path)
        c = re.sub(r'(\d+)n', r'BigInt("\1")', c)
        write_file(path, c)

    # 3. governance.test.ts
    path = os.path.join(base_dir, r"src\__tests__\governance.test.ts")
    if os.path.exists(path):
        c = read_file(path)
        c = c.replace('category: \'general\',', 'category: \'general\', topVoters: [],')
        c = c.replace('category: \'treasury\',', 'category: \'treasury\', topVoters: [],')
        # handle duplicate properties by just letting it be or removing
        c = re.sub(r'deposit: 500, type: "token-weighted", proposer: "user1",\s*deposit: 500, type: "token-weighted", proposer: "user1",', 'deposit: 500, type: "token-weighted", proposer: "user1",', c)
        c = re.sub(r'deposit: 500, type: "token-weighted", proposer: "user1",\s*type: "token-weighted", proposer: "user1",', 'deposit: 500, type: "token-weighted", proposer: "user1",', c)
        
        c = c.replace('deposit: 500,\n', 'deposit: 500, type: "token-weighted", proposer: "user1",\n')
        c = re.sub(r'gasCost:\s*([\d\.]+),', r"gasCost: '\1',", c)
        write_file(path, c)

    # 4. hexDecoder.test.ts
    path = os.path.join(base_dir, r"src\__tests__\hexDecoder.test.ts")
    if os.path.exists(path):
        c = read_file(path)
        c = c.replace("type: 'scvMap'", "type: 'map' as any")
        write_file(path, c)

    # 5. DelegateManager
    path = os.path.join(base_dir, r"src\components\governance\DelegateManager.tsx")
    c = read_file(path)
    c = c.replace('profile?.delegatorsCount', 'profile?.delegatorCount')
    write_file(path, c)

    # 6. GovernanceDashboard
    path = os.path.join(base_dir, r"src\components\governance\GovernanceDashboard.tsx")
    c = read_file(path)
    c = c.replace('onCancel={() => setCreatingProposal(false)}', '')
    write_file(path, c)

    # 7. ProposalCard
    path = os.path.join(base_dir, r"src\components\governance\ProposalCard.tsx")
    c = read_file(path)
    c = c.replace("case 'canceled':", "case 'cancelled':")
    write_file(path, c)

    # 8. ProposalCreator
    path = os.path.join(base_dir, r"src\components\governance\ProposalCreator.tsx")
    c = read_file(path)
    c = c.replace("parameters: ''", "parameters: {}")
    c = c.replace('a.target ?? "" &&', '(a.target ?? "") &&')
    write_file(path, c)

    # 9. ProposalDetail
    path = os.path.join(base_dir, r"src\components\governance\ProposalDetail.tsx")
    c = read_file(path)
    c = c.replace('new Date(proposal.startBlock ?? 0)', '(proposal.startBlock ? new Date(proposal.startBlock) : new Date(0))')
    c = c.replace('new Date(proposal.endBlock ?? 0)', '(proposal.endBlock ? new Date(proposal.endBlock) : new Date(0))')
    write_file(path, c)

    # 10. VoteDistributionChart
    path = os.path.join(base_dir, r"src\components\governance\VoteDistributionChart.tsx")
    c = read_file(path)
    c = c.replace('forTokens: forTokens ?? 0', 'forTokens: props.forTokens ?? 0')
    c = c.replace('againstTokens: againstTokens ?? 0', 'againstTokens: props.againstTokens ?? 0')
    c = c.replace('abstainTokens: abstainTokens ?? 0', 'abstainTokens: props.abstainTokens ?? 0')
    write_file(path, c)

    # 11. TierTreeView
    path = os.path.join(base_dir, r"src\components\supplychain\TierTreeView.tsx")
    c = read_file(path)
    c = c.replace('attachIndex(el, index)', 'attachIndex?.(el, index)')
    write_file(path, c)

    # 12. governanceProposalService
    path = os.path.join(base_dir, r"src\services\governanceProposalService.ts")
    c = read_file(path)
    c = c.replace('target.delegatorsCount', 'target.delegatorCount')
    write_file(path, c)

    # 13. governanceStore
    path = os.path.join(base_dir, r"src\store\governanceStore.ts")
    c = read_file(path)
    c = re.sub(r'gasCost:\s*([\d\.]+),', r"gasCost: '\1',", c)
    write_file(path, c)

fix_all()
