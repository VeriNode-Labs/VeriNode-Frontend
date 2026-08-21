import os

base_dir = r"C:\Users\DELL\Desktop\b-191\VeriNode-Frontend"

def fix_detail():
    path = os.path.join(base_dir, r"src\components\governance\ProposalDetail.tsx")
    with open(path, 'r', encoding='utf8') as f:
        c = f.read()
    c = c.replace("{proposal.startBlock ? new Date(proposal.startBlock).toLocaleString() : 'N/A'} votes", "{(proposal.quorum ?? 0).toLocaleString()} votes")
    c = c.replace("{JSON.stringify(act.parameters)}", "{act.target}")
    with open(path, 'w', encoding='utf8') as f:
        f.write(c)

fix_detail()
