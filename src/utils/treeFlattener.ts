// Utility to flatten a recursive SupplyChainTier[] tree into an indexed
// FlatTier[] array suitable for windowed rendering (#43).
//
// Only nodes that are "visible" (i.e. all ancestors are expanded) are included
// in the output. The caller provides an `expandedIds` Set to control which
// parent nodes have their children exposed.

import type { FlatTier, SupplyChainTier } from '@/src/types/supplychain'

/**
 * Flatten a recursive supply-chain tree into a flat array of FlatTier objects.
 *
 * @param nodes       Root-level nodes.
 * @param expandedIds Set of node IDs whose children should be included.
 *                    Pass `new Set()` to render roots only.
 *
 * @returns Ordered flat list of every visible node with depth + parentIndex
 *          metadata pre-computed so the virtualizer never traverses the tree.
 *
 * Memory characteristics:
 *   - O(v) where v = number of visible nodes.
 *   - No recursion on the call stack — uses an explicit stack to avoid stack
 *     overflows on deeply nested (8+) hierarchies.
 */
export function flattenTree(
  nodes: SupplyChainTier[],
  expandedIds: ReadonlySet<string>,
): FlatTier[] {
  const result: FlatTier[] = []

  // Stack entries: [node, depth, parentIndex]
  type StackEntry = [SupplyChainTier, number, number]
  const stack: StackEntry[] = []

  // Push roots in reverse order so the first root is processed first.
  for (let i = nodes.length - 1; i >= 0; i--) {
    stack.push([nodes[i], 0, -1])
  }

  while (stack.length > 0) {
    const [node, depth, parentIndex] = stack.pop()!
    const hasChildren = Array.isArray(node.children) && node.children.length > 0
    const currentIndex = result.length

    result.push({
      id: node.id,
      label: node.label,
      tier: node.tier,
      status: node.status,
      metadata: node.metadata,
      depth,
      parentIndex,
      hasChildren,
      childCount: hasChildren ? node.children!.length : 0,
    })

    // Only expand children if the node is in the expanded set.
    if (hasChildren && expandedIds.has(node.id)) {
      const children = node.children!
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push([children[i], depth + 1, currentIndex])
      }
    }
  }

  return result
}

/**
 * Generate a deterministic supply-chain tree with `totalNodes` leaf+branch
 * nodes spread across `tierDepth` tiers. Used for performance profiling and
 * Storybook demos.
 */
export function generateMockTree(
  totalNodes = 10_000,
  tierDepth = 8,
  branchFactor = 4,
): SupplyChainTier[] {
  const TIER_LABELS = [
    'Producer',
    'Processor',
    'Packager',
    'Distributor',
    'Regional Hub',
    'Local Hub',
    'Retailer',
    'End Point',
  ]

  let idCounter = 0

  function buildNode(depth: number): SupplyChainTier {
    const id = `tier-node-${idCounter++}`
    const isLeaf = depth >= tierDepth - 1 || idCounter >= totalNodes
    return {
      id,
      label: `${TIER_LABELS[depth % TIER_LABELS.length]} #${idCounter}`,
      tier: depth,
      status:
        idCounter % 11 === 0
          ? 'suspended'
          : idCounter % 7 === 0
            ? 'pending'
            : 'active',
      metadata: {
        volume: Math.round(100 + (idCounter * 37) % 9900),
        region: `Region-${(idCounter * 3) % 12}`,
      },
      children: isLeaf
        ? undefined
        : Array.from({ length: branchFactor })
            .map(() => (idCounter < totalNodes ? buildNode(depth + 1) : null))
            .filter((n): n is SupplyChainTier => n !== null),
    }
  }

  const roots: SupplyChainTier[] = []
  while (idCounter < totalNodes) {
    roots.push(buildNode(0))
  }
  return roots
}
