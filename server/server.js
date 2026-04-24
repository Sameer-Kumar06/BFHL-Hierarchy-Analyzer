const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


const USER_ID = "SameerKumar_30092006"; // fullname_ddmmyyyy
const EMAIL_ID = "sk9641@srmist.edu.in";
const COLLEGE_ROLL_NUMBER = "RA2311003020700";

// Helper Function

function isValidEntry(raw) {
  const trimmed = raw.trim();
  if (!/^[A-Z]->[A-Z]$/.test(trimmed)) return null;
  const [parent, child] = trimmed.split("->");
  if (parent === child) return null; // self-loop
  return trimmed;
}

// Grouping Nodes into Components

class UnionFind {
  constructor() {
    this.parent = {};
    this.rank = {};
  }
  find(x) {
    if (!(x in this.parent)) {
      this.parent[x] = x;
      this.rank[x] = 0;
    }
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    if (this.rank[ra] < this.rank[rb]) this.parent[ra] = rb;
    else if (this.rank[ra] > this.rank[rb]) this.parent[rb] = ra;
    else {
      this.parent[rb] = ra;
      this.rank[ra]++;
    }
  }
}


// Detect Cycle in Graph
// DFS with coloring (0-> White, 1-> Gray, 2-> Black)

function hasCycle(adj, nodes) {
  const color = {};
  for (const n of nodes) color[n] = 0;

  function dfs(u) {
    color[u] = 1;
    for (const v of adj[u] || []) {
      if (color[v] === 1) return true;
      if (color[v] === 0 && dfs(v)) return true;
    }
    color[u] = 2;
    return false;
  }

  for (const n of nodes) {
    if (color[n] === 0 && dfs(n)) return true;
  }
  return false;
}

/**
 * Build a nested tree object from root downward.
 * Returns { tree, depth }.
 */
function buildTree(root, adj) {
  const tree = {};
  function recurse(node) {
    const children = adj[node] || [];
    const subtree = {};
    let maxChildDepth = 0;
    for (const c of children) {
      const { tree: childTree, depth: childDepth } = recurse(c);
      subtree[c] = childTree;
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    }
    return { tree: subtree, depth: 1 + maxChildDepth };
  }
  const result = recurse(root);
  return { tree: { [root]: result.tree }, depth: result.depth };
}

// ── Main processing ───────────────────────────────────────────────────

function processData(data) {
  const invalidEntries = [];
  const duplicateEdges = [];
  const seenEdges = new Set();
  const validEdges = []; // { parent, child }

  // 1. Validate & dedup
  for (const raw of data) {
    const entry = isValidEntry(raw);
    if (entry === null) {
      invalidEntries.push(raw.trim() || raw);
      continue;
    }
    if (seenEdges.has(entry)) {
      if (!duplicateEdges.includes(entry)) duplicateEdges.push(entry);
      continue;
    }
    seenEdges.add(entry);

    const [parent, child] = entry.split("->");
    validEdges.push({ parent, child });
  }

  // 2. Multi-parent handling: if a child already has a parent, discard later edge
  const childParentMap = {}; // child -> first parent
  const effectiveEdges = [];
  for (const { parent, child } of validEdges) {
    if (child in childParentMap) continue; // discard — multi-parent
    childParentMap[child] = parent;
    effectiveEdges.push({ parent, child });
  }

  // 3. Group into connected components via Union-Find
  const uf = new UnionFind();
  const allNodes = new Set();
  for (const { parent, child } of effectiveEdges) {
    uf.union(parent, child);
    allNodes.add(parent);
    allNodes.add(child);
  }

  const components = {}; // representative -> [nodes]
  for (const n of allNodes) {
    const rep = uf.find(n);
    if (!components[rep]) components[rep] = [];
    components[rep].push(n);
  }

  // 4. Build adjacency list for effective edges
  const adj = {};
  const childSet = new Set();
  for (const { parent, child } of effectiveEdges) {
    if (!adj[parent]) adj[parent] = [];
    adj[parent].push(child);
    childSet.add(child);
  }

  // 5. For each component build hierarchy
  const hierarchies = [];
  let totalTrees = 0;
  let totalCycles = 0;
  let largestTreeRoot = null;
  let largestDepth = -1;

  // Sort component keys for deterministic order
  const compKeys = Object.keys(components).sort();
  for (const key of compKeys) {
    const nodes = components[key].sort();
    const cycleDetected = hasCycle(adj, nodes);

    // Root: node that never appears as a child; for pure cycles, lex smallest
    let root = nodes.find((n) => !childSet.has(n));
    if (!root) root = nodes[0]; // pure cycle — lex smallest (nodes already sorted)

    if (cycleDetected) {
      totalCycles++;
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      const { tree, depth } = buildTree(root, adj);
      totalTrees++;
      hierarchies.push({ root, tree, depth });
      if (
        depth > largestDepth ||
        (depth === largestDepth && root < largestTreeRoot)
      ) {
        largestDepth = depth;
        largestTreeRoot = root;
      }
    }
  }

  // Sort hierarchies: acyclic trees first (sorted by root), then cycles (sorted by root)
  hierarchies.sort((a, b) => {
    if (a.has_cycle && !b.has_cycle) return 1;
    if (!a.has_cycle && b.has_cycle) return -1;
    return a.root.localeCompare(b.root);
  });

  return {
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL_NUMBER,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: totalTrees,
      total_cycles: totalCycles,
      largest_tree_root: largestTreeRoot || "",
    },
  };
}

// ── Routes ────────────────────────────────────────────────────────────

app.post("/bfhl", (req, res) => {
  try {
    const { data } = req.body;
    if (!data || !Array.isArray(data)) {
      return res
        .status(400)
        .json({ error: "Invalid request body. 'data' must be an array of strings." });
    }
    const result = processData(data);
    return res.json(result);
  } catch (err) {
    console.error("Error processing /bfhl:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/bfhl", (_req, res) => {
  res.json({ operation_code: 1 });
});

// ── Start ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`BFHL server running on http://localhost:${PORT}`);
});
