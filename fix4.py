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
    # 1. src/types/governance.ts
    path = os.path.join(base_dir, r"src\types\governance.ts")
    if os.path.exists(path):
        c = read_file(path)
        c = c.replace('delegatedToName?: string', 'delegatedToName?: string\n  delegatorCount?: number\n  delegatorsCount?: number')
        c = c.replace('executionEta?: string', 'executionEta?: string | number')
        c = c.replace('timestamp: string', 'timestamp: string | number')
        write_file(path, c)

    # 2. src/components/governance/GovernanceDashboard.tsx
    path = os.path.join(base_dir, r"src\components\governance\GovernanceDashboard.tsx")
    if os.path.exists(path):
        c = read_file(path)
        c = re.sub(r'onCancel=\{.*?\}', '', c)
        write_file(path, c)

    # 3. src/components/governance/ProposalCreator.tsx
    path = os.path.join(base_dir, r"src\components\governance\ProposalCreator.tsx")
    if os.path.exists(path):
        c = read_file(path)
        c = re.sub(r'a\.target\s*\?\?\s*(["\']{2})\s*&&', r'(a.target ?? \1) &&', c)
        write_file(path, c)

    # 4. src/services/governanceProposalService.ts
    path = os.path.join(base_dir, r"src\services\governanceProposalService.ts")
    if os.path.exists(path):
        c = read_file(path)
        c = c.replace('target.delegatorsCount', 'target.delegatorCount')
        write_file(path, c)

fix_all()
