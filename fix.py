import re

def fix_service():
    path = r"C:\Users\DELL\Desktop\b-191\VeriNode-Frontend\src\services\governanceProposalService.ts"
    with open(path, "r", encoding="utf8") as f:
        content = f.read()

    # 1. new Date(a.endTime).getTime() -> new Date(a.endTime ?? 0).getTime()
    content = content.replace('new Date(a.endTime).getTime()', 'new Date(a.endTime ?? 0).getTime()')
    content = content.replace('new Date(b.endTime).getTime()', 'new Date(b.endTime ?? 0).getTime()')
    content = content.replace('new Date(a.startTime).getTime()', 'new Date(a.startTime ?? 0).getTime()')
    content = content.replace('new Date(b.startTime).getTime()', 'new Date(b.startTime ?? 0).getTime()')

    # 2. updatedProposal.forTokens += tokens -> updatedProposal.forTokens = (updatedProposal.forTokens ?? 0) + tokens
    content = content.replace('updatedProposal.forTokens += tokens;', 'updatedProposal.forTokens = (updatedProposal.forTokens ?? 0) + tokens;')
    content = content.replace('updatedProposal.againstTokens += tokens;', 'updatedProposal.againstTokens = (updatedProposal.againstTokens ?? 0) + tokens;')
    content = content.replace('updatedProposal.abstainTokens += tokens;', 'updatedProposal.abstainTokens = (updatedProposal.abstainTokens ?? 0) + tokens;')
    content = content.replace('updatedProposal.totalVoters += 1;', 'updatedProposal.totalVoters = (updatedProposal.totalVoters ?? 0) + 1;')
    
    # 3. totalTokensVoted
    content = content.replace(
        'updatedProposal.forTokens + updatedProposal.againstTokens + updatedProposal.abstainTokens',
        '(updatedProposal.forTokens ?? 0) + (updatedProposal.againstTokens ?? 0) + (updatedProposal.abstainTokens ?? 0)'
    )
    content = content.replace(
        'updatedProposal.currentQuorumPercentage >= updatedProposal.quorumPercentage',
        '(updatedProposal.currentQuorumPercentage ?? 0) >= (updatedProposal.quorumPercentage ?? 0)'
    )

    # 4. target.delegatorCount
    content = content.replace('target.delegatorCount += 1;', 'target.delegatorCount = (target.delegatorCount ?? 0) + 1;')
    content = content.replace('target.delegatorCount -= 1;', 'target.delegatorCount = (target.delegatorCount ?? 0) - 1;')
    content = content.replace('target.delegatorCount > 0', '(target.delegatorCount ?? 0) > 0')

    # 5. tokenBalance -> tokensLocked
    content = content.replace('tokenBalance: 45000', 'tokensLocked: 45000')

    # 6. authorAvatar
    content = content.replace('authorName,\n    stance', 'authorName,\n    authorAvatar: "",\n    stance')

    # 7. actions.parameters possibly undefined
    content = content.replace('action.parameters.downtimePenaltyBps', 'action.parameters?.downtimePenaltyBps')
    content = content.replace('action.parameters.gracePeriodSecs', 'action.parameters?.gracePeriodSecs')
    content = content.replace('action.parameters.amountVrn', 'action.parameters?.amountVrn')
    content = content.replace('action.parameters.amount', 'action.parameters?.amount')
    content = content.replace('action.parameters.minStake', 'action.parameters?.minStake')
    content = content.replace('action.parameters.minValidatorStake', 'action.parameters?.minValidatorStake')

    with open(path, "w", encoding="utf8") as f:
        f.write(content)

def fix_store():
    path = r"C:\Users\DELL\Desktop\b-191\VeriNode-Frontend\src\store\governanceStore.ts"
    with open(path, "r", encoding="utf8") as f:
        content = f.read()

    # quorum ?? 0
    content = content.replace('const quorum = proposal.quorum', 'const quorum = proposal.quorum ?? 0')
    content = content.replace('quorum > 0 && currentVotes >= quorum', '(quorum ?? 0) > 0 && currentVotes >= (quorum ?? 0)')
    content = content.replace('quorum > 0 ?', '(quorum ?? 0) > 0 ?')
    content = content.replace('(currentVotes / quorum)', '(currentVotes / (quorum ?? 1))')
    content = content.replace('return { power, tokens: effectiveTokensUsed }', 'return { power, tokens: effectiveTokensUsed }')
    
    # gasCost as string in INITIAL_VOTE_HISTORY
    content = content.replace("gasCost: '0.0021 XLM',", "gasCost: '0.0021 XLM', gasCostGwei: 0, gasCostUsd: 0,")
    content = content.replace("gasCost: '0.0024 XLM',", "gasCost: '0.0024 XLM', gasCostGwei: 0, gasCostUsd: 0,")
    
    content = content.replace('gasCost,\n      timestamp,', 'gasCost,\n      gasCostGwei: 0,\n      gasCostUsd: 0,\n      timestamp,')

    # string parameters
    content = content.replace('parameters: \'{"recipient": "GBV3...82FA", "amount": "500000", "token": "VN"}\'', 'parameters: {"recipient": "GBV3...82FA", "amount": "500000", "token": "VN"}')
    content = content.replace('parameters: \'{"grant_pool": "100000", "round": "Q3-2026"}\'', 'parameters: {"grant_pool": "100000", "round": "Q3-2026"}')
    content = content.replace('parameters: \'{"penalty_bps": 300}\'', 'parameters: {"penalty_bps": 300}')

    # INITIAL_PROPOSALS missing type & topVoters
    content = content.replace("category: 'treasury',", "type: 'token-weighted', topVoters: [], category: 'treasury',")
    content = content.replace("category: 'general',", "type: 'quadratic', topVoters: [], category: 'general',")
    content = content.replace("category: 'parameter-change',", "type: 'token-weighted', topVoters: [], category: 'parameter-change',")
    content = content.replace("category: 'protocol-upgrade',", "type: 'token-weighted', topVoters: [], category: 'protocol-upgrade',")
    
    # newProposal missing type & topVoters
    content = content.replace('createdAt: Date.now(),', "type: input.type, topVoters: [],\n      createdAt: Date.now(),")

    # calculateEffectiveWeight(tokens, proposal.votingType) -> proposal.votingType ?? proposal.type
    content = content.replace('calculateEffectiveWeight(tokens, proposal.votingType)', 'calculateEffectiveWeight(tokens, proposal.votingType ?? proposal.type)')

    # startBlock possibly undefined
    content = content.replace('proposal.startBlock + Math.floor(Math.random() * 5000)', '(proposal.startBlock ?? 0) + Math.floor(Math.random() * 5000)')

    # delegatedVotes / delegatorsCount possibly undefined
    content = content.replace('d.delegatedVotes + powerToDelegate', '(d.delegatedVotes ?? 0) + powerToDelegate')
    content = content.replace('d.delegatorsCount + 1', '(d.delegatorsCount ?? 0) + 1')
    content = content.replace('d.delegatedVotes - powerToDelegate', '(d.delegatedVotes ?? 0) - powerToDelegate')
    content = content.replace('d.delegatorsCount - 1', '(d.delegatorsCount ?? 0) - 1')
    
    content = content.replace('d.delegatedVotes - delegatedPower', '(d.delegatedVotes ?? 0) - delegatedPower')
    
    content = content.replace('d.delegatedVotes, 0)', '(d.delegatedVotes ?? 0), 0)')

    # GovernanceMetrics returned
    content = content.replace('averageTurnout: 68.5,', 'averageTurnout: 68.5,\n      totalVrnLocked: totalVotingPower,\n      activeProposalsCount: activeProposals,\n      participationRate: 68.5,')

    with open(path, "w", encoding="utf8") as f:
        f.write(content)

fix_service()
fix_store()
