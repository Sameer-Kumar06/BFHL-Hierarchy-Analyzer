import { useState, useMemo, useEffect, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";

/* ── Recursive tree renderer ───────────────────────────────────────── */
function TreeView({ data, level = 0 }) {
  const keys = Object.keys(data);
  if (keys.length === 0) return null;
  return (
    <ul
      className={`space-y-1 ${level > 0 ? "ml-5 border-l border-slate-200 pl-4" : ""}`}
    >
      {keys.map((key) => (
        <li
          key={key}
          className="animate-fade-in"
          style={{ animationDelay: `${level * 60}ms` }}
        >
          <span className="inline-flex items-center gap-2">
            <span className="w-7 h-7 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700">
              {key}
            </span>
            {Object.keys(data[key]).length > 0 && (
              <span className="text-xs text-slate-400">→</span>
            )}
          </span>
          <TreeView data={data[key]} level={level + 1} />
        </li>
      ))}
    </ul>
  );
}

/* ── Stat card component ───────────────────────────────────────────── */
function StatCard({ label, value, color = "slate" }) {
  const colorMap = {
    slate: "bg-white border-slate-200 text-slate-800",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-800",
    amber: "bg-amber-50 border-amber-100 text-amber-800",
    rose: "bg-rose-50 border-rose-100 text-rose-800",
  };
  return (
    <div
      className={`prof-card prof-card-hover p-5 flex flex-col gap-1 ${colorMap[color]}`}
    >
      <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">
        {label}
      </span>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}

/* ── Hierarchy card ────────────────────────────────────────────────── */
function HierarchyCard({ hierarchy, index }) {
  const isCycle = hierarchy.has_cycle === true;
  return (
    <div
      className={`prof-card p-6 animate-fade-in ${
        isCycle ? "border-rose-200 bg-rose-50/30" : "border-slate-200 bg-white"
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded flex items-center justify-center text-lg font-bold border ${
              isCycle
                ? "bg-rose-100 text-rose-700 border-rose-200"
                : "bg-slate-100 text-slate-800 border-slate-200"
            }`}
          >
            {hierarchy.root}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              Root: {hierarchy.root}
            </h3>
            {isCycle ? (
              <span className="text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 mt-1 inline-block font-medium">
                Cycle Detected
              </span>
            ) : (
              <span className="text-xs text-slate-500">
                Depth:{" "}
                <span className="text-slate-800 font-semibold">
                  {hierarchy.depth}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {isCycle ? (
        <div className="flex items-center gap-2 p-4 rounded bg-rose-50 border border-rose-100 text-rose-700 text-sm">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          This group contains a cycle — tree structure cannot be built.
        </div>
      ) : (
        <div className="bg-slate-50 rounded p-4 border border-slate-100">
          <TreeView data={hierarchy.tree} />
        </div>
      )}
    </div>
  );
}

/* ── Badge list for invalid / duplicate entries ────────────────────── */
function BadgeList({ items, color }) {
  if (!items || items.length === 0)
    return <span className="text-sm text-slate-500 italic">None</span>;
  const colorMap = {
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span
          key={i}
          className={`px-2 py-1 rounded text-xs border font-mono font-medium ${colorMap[color]}`}
        >
          {item || '""'}
        </span>
      ))}
    </div>
  );
}

/* ── Graph Visualization Component ─────────────────────────────────── */
function GraphVisualization({ inputRaw }) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: 400,
      });
    }
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 400,
        });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const graphData = useMemo(() => {
    let parsed = [];
    try {
      parsed = JSON.parse(inputRaw);
    } catch {
      parsed = inputRaw
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""));
    }

    if (!Array.isArray(parsed)) return { nodes: [], links: [] };

    const links = [];
    const nodeSet = new Set();
    parsed.forEach((rawEdge) => {
      const edge = rawEdge.trim();
      if (/^[A-Z]->[A-Z]$/.test(edge)) {
        const [u, v] = edge.split("->");
        links.push({ source: u, target: v });
        nodeSet.add(u);
        nodeSet.add(v);
      }
    });

    const nodes = Array.from(nodeSet).map((id) => ({ id }));
    return { nodes, links };
  }, [inputRaw]);

  if (graphData.nodes.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-slate-400 bg-slate-50 border border-slate-200 rounded">
        No valid format edges to visualize.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="prof-card overflow-hidden w-full bg-slate-50 border-slate-200 relative"
      style={{ height: "400px" }}
    >
      <ForceGraph2D
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeLabel="id"
        nodeRelSize={6}
        nodeColor={() => "#334155"}
        linkColor={() => "#94a3b8"}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.id;
          const fontSize = 14 / globalScale;
          ctx.font = `${fontSize}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // Draw circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#334155";
          ctx.stroke();

          // Draw text
          ctx.fillStyle = "#0f172a";
          ctx.fillText(label, node.x, node.y + 12);
        }}
      />
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded text-xs text-slate-600 font-medium border border-slate-200/50 shadow-sm pointer-events-none">
        Interactive Force Graph (Scroll to zoom, Drag to pan)
      </div>
    </div>
  );
}

/* ── Main App ──────────────────────────────────────────────────────── */
export default function App() {
  const [input, setInput] = useState(
    '["A->B", "A->C", "B->D", "C->E", "E->F", "X->Y", "Y->Z", "Z->X", "P->Q", "Q->R", "G->H", "G->H", "G->I", "hello", "1->2", "A->"]',
  );
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Store the raw input that was successfully analyzed to render the graph
  const [analyzedInput, setAnalyzedInput] = useState(null);

  async function handleSubmit() {
    setError(null);
    setResult(null);
    setAnalyzedInput(null);
    setLoading(true);

    try {
      let parsed;
      try {
        parsed = JSON.parse(input);
      } catch {
        parsed = input
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""));
      }

      if (!Array.isArray(parsed)) {
        throw new Error(
          "Input must be a JSON array or comma-separated list of edges.",
        );
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/bfhl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: parsed }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Server returned ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      setAnalyzedInput(input);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 py-6 px-4 md:px-8 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-slate-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                />
              </svg>
              BFHL Hierarchy Analyzer
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Process network relationships, build trees, and handle nested
              structures.
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            Enterprise Edition
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <section className="prof-card p-6">
            <label
              className="block text-sm font-semibold text-slate-800 mb-2"
              htmlFor="nodeInput"
            >
              Node Relationships Data
            </label>
            <p className="text-xs text-slate-500 mb-4">
              Enter edges as a JSON array or comma-separated list (e.g.,
              A-&gt;B).
            </p>
            <textarea
              id="nodeInput"
              rows={8}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full rounded bg-slate-50 border border-slate-200 text-slate-800 p-3 font-mono text-sm focus:outline-none focus:border-slate-400 focus:bg-white transition-all resize-y placeholder-slate-400"
              placeholder='["A->B", "A->C", "B->D"]'
            />
            <button
              id="submitBtn"
              onClick={handleSubmit}
              disabled={loading}
              className={`prof-btn mt-4 w-full py-2.5 px-4 text-sm flex items-center justify-center gap-2 ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Processing…
                </>
              ) : (
                <>Analyze Data</>
              )}
            </button>
          </section>

          {/* Identity Widget */}
          {result && (
            <section className="prof-card flex flex-col animate-fade-in divide-y divide-slate-100">
              <div className="p-4 bg-slate-50 rounded-t flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  User Identity
                </h2>
              </div>
              <div className="p-4 flex flex-col gap-3">
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-medium">
                    User ID
                  </span>
                  <span className="text-sm font-mono font-medium text-slate-800">
                    {result.user_id}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-medium">
                    Email
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    {result.email_id}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-medium">
                    Roll Number
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    {result.college_roll_number}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Invalid & Duplicate Widgets */}
          {result && (
            <div className="flex flex-col gap-4">
              <section className="prof-card p-4 border-rose-200">
                <h3 className="text-xs font-semibold text-rose-700 uppercase mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  Invalid Entries ({result.invalid_entries.length})
                </h3>
                <BadgeList items={result.invalid_entries} color="rose" />
              </section>
              <section className="prof-card p-4 border-amber-200">
                <h3 className="text-xs font-semibold text-amber-700 uppercase mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Duplicate Edges ({result.duplicate_edges.length})
                </h3>
                <BadgeList items={result.duplicate_edges} color="amber" />
              </section>
            </div>
          )}
        </div>

        {/* Right Column: Visualization Panel */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {error && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 animate-fade-in shadow-sm">
              <svg
                className="w-5 h-5 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="font-semibold text-sm">Request Failed</p>
                <p className="text-xs mt-1 text-rose-600">{error}</p>
              </div>
            </div>
          )}

          {!result && !error && (
            <div className="h-full min-h-[400px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 text-sm">
              Enter data and run analysis to view the network graph and
              structures.
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-fade-in">
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Trees"
                  value={result.summary.total_trees}
                  color="emerald"
                />
                <StatCard
                  label="Total Cycles"
                  value={result.summary.total_cycles}
                  color="rose"
                />
                <StatCard
                  label="Largest Root"
                  value={result.summary.largest_tree_root || "—"}
                  color="slate"
                />
                <StatCard
                  label="Hierarchies"
                  value={result.hierarchies.length}
                  color="slate"
                />
              </div>

              {/* Graphical Visualization Component */}
              <section>
                <h2 className="text-sm font-semibold text-slate-700 mb-3 ml-1">
                  Network Visualization
                </h2>
                <GraphVisualization inputRaw={analyzedInput} />
              </section>

              {/* Text / Tree Structure View */}
              <section>
                <h2 className="text-sm font-semibold text-slate-700 mb-3 ml-1 mt-8">
                  Hierarchical Structures
                </h2>
                <div className="grid gap-4">
                  {result.hierarchies.map((h, i) => (
                    <HierarchyCard key={i} hierarchy={h} index={i} />
                  ))}
                </div>
              </section>

              {/* JSON Dropdown */}
              <details className="prof-card p-4 mt-6">
                <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors select-none">
                  Inspect Raw JSON Output
                </summary>
                <div className="mt-4 p-4 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-96">
                  <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
              </details>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
