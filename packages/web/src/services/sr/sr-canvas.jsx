import { useState, useCallback, useRef, useEffect } from "react";
import { Play, Square, Pause, RotateCcw, ChevronRight, ChevronDown, X, Zap, Database, Filter, BarChart3, Brain, GraduationCap, Workflow, Loader2, Check, AlertCircle, Clock, MousePointer2, Trash2, FileDown } from "lucide-react";

// ── Node Type Registry (mirrors sr-workflow-engine.ts §5) ──────────────
const NODE_CATEGORIES = {
  SOURCE: { label: "Source", icon: Database, color: "#2E75B6", bg: "#E8F0FE" },
  TRANSFORM: { label: "Transform", icon: Filter, color: "#2E8B57", bg: "#E8F5E8" },
  VISUALISE: { label: "Visualise", icon: BarChart3, color: "#9B59B6", bg: "#F3E8FD" },
  MODEL: { label: "Model", icon: Brain, color: "#D4790E", bg: "#FFF3E0" },
  ACTION: { label: "Action", icon: Zap, color: "#C42B1C", bg: "#FDE8E8" },
  EDUCATION: { label: "Education", icon: GraduationCap, color: "#1B7A6E", bg: "#E0F7F4" },
};

const PORT_COLORS = {
  table: "#2E75B6",
  record: "#2E8B57",
  scalar: "#D4790E",
  signal: "#9B59B6",
  binary: "#C42B1C",
  any: "#888",
};

const NODE_TYPES = [
  // SOURCE
  { typeId: "sr:source:platform-export", label: "Platform Source", category: "SOURCE", desc: "Extract content from external platform",
    inputs: [], outputs: [{ portId: "content", label: "Content", dataType: "table" }, { portId: "inventory", label: "Inventory", dataType: "record" }] },
  { typeId: "sr:source:cdc-extract", label: "CDC Extract", category: "SOURCE", desc: "Write items to Data Lake Bronze zone",
    inputs: [{ portId: "items", label: "Items", dataType: "table" }], outputs: [{ portId: "etlRun", label: "ETL Run", dataType: "record" }] },
  { typeId: "sr:source:health-monitor", label: "Health Monitor", category: "SOURCE", desc: "Run endpoint health checks",
    inputs: [{ portId: "trigger", label: "Trigger", dataType: "any" }], outputs: [{ portId: "healthResult", label: "Health", dataType: "record" }] },
  { typeId: "sr:source:data-lake-read", label: "Data Lake Read", category: "SOURCE", desc: "Read from Data Lake staging table",
    inputs: [], outputs: [{ portId: "rows", label: "Rows", dataType: "table" }] },
  { typeId: "sr:source:api-read", label: "API Source", category: "SOURCE", desc: "Read from external REST API",
    inputs: [], outputs: [{ portId: "response", label: "Response", dataType: "table" }] },
  // TRANSFORM
  { typeId: "sr:transform:content-transform", label: "Content Transform", category: "TRANSFORM", desc: "Transform content to Scholarly format",
    inputs: [{ portId: "etlRun", label: "ETL Run", dataType: "record" }], outputs: [{ portId: "summary", label: "Summary", dataType: "record" }, { portId: "etlRun", label: "ETL Run", dataType: "record" }] },
  { typeId: "sr:transform:quality-audit", label: "Quality Audit", category: "TRANSFORM", desc: "Run Data Lake quality checks",
    inputs: [{ portId: "trigger", label: "Trigger", dataType: "any" }], outputs: [{ portId: "qualityReport", label: "Report", dataType: "record" }] },
  { typeId: "sr:transform:filter", label: "Filter", category: "TRANSFORM", desc: "Filter rows by expression",
    inputs: [{ portId: "input", label: "Input", dataType: "table" }], outputs: [{ portId: "passed", label: "Passed", dataType: "table" }, { portId: "rejected", label: "Rejected", dataType: "table" }] },
  { typeId: "sr:transform:aggregate", label: "Aggregate", category: "TRANSFORM", desc: "Group and aggregate data",
    inputs: [{ portId: "input", label: "Input", dataType: "table" }], outputs: [{ portId: "result", label: "Result", dataType: "table" }] },
  // VISUALISE
  { typeId: "sr:vis:chart", label: "Chart", category: "VISUALISE", desc: "Interactive chart visualisation",
    inputs: [{ portId: "data", label: "Data", dataType: "table" }], outputs: [] },
  { typeId: "sr:vis:table", label: "Data Table", category: "VISUALISE", desc: "Interactive data table",
    inputs: [{ portId: "data", label: "Data", dataType: "table" }], outputs: [] },
  { typeId: "sr:vis:heatmap", label: "Mastery Heatmap", category: "VISUALISE", desc: "BKT mastery heatmap",
    inputs: [{ portId: "data", label: "Data", dataType: "table" }], outputs: [] },
  // MODEL
  { typeId: "sr:model:train", label: "Train Classifier", category: "MODEL", desc: "Train ML model via Auto-ML pipeline",
    inputs: [{ portId: "training", label: "Training Data", dataType: "table" }], outputs: [{ portId: "model", label: "Model", dataType: "record" }] },
  { typeId: "sr:model:predict", label: "Predict", category: "MODEL", desc: "Run predictions with trained model",
    inputs: [{ portId: "data", label: "Data", dataType: "table" }, { portId: "model", label: "Model", dataType: "record" }], outputs: [{ portId: "predictions", label: "Predictions", dataType: "table" }] },
  // ACTION
  { typeId: "sr:action:human-review", label: "Human Review", category: "ACTION", desc: "Pause for human approval", pauses: true,
    inputs: [{ portId: "items", label: "Items", dataType: "any" }], outputs: [{ portId: "approved", label: "Approved", dataType: "table" }, { portId: "reviewStats", label: "Stats", dataType: "record" }] },
  { typeId: "sr:action:service-import", label: "Service Import", category: "ACTION", desc: "Import to Scholarly services",
    inputs: [{ portId: "approved", label: "Approved", dataType: "table" }, { portId: "reviewStats", label: "Stats", dataType: "record" }], outputs: [{ portId: "importResult", label: "Result", dataType: "record" }, { portId: "etlRun", label: "ETL Run", dataType: "record" }] },
  { typeId: "sr:action:infrastructure-cutover", label: "Cutover", category: "ACTION", desc: "DNS/SSL infrastructure cutover", pauses: true,
    inputs: [{ portId: "importResult", label: "Import Result", dataType: "record" }], outputs: [{ portId: "cutoverResult", label: "Result", dataType: "record" }] },
  { typeId: "sr:action:webhook", label: "Webhook", category: "ACTION", desc: "Send webhook notification",
    inputs: [{ portId: "data", label: "Data", dataType: "any" }], outputs: [{ portId: "response", label: "Response", dataType: "record" }] },
  // EDUCATION
  { typeId: "sr:edu:bkt-update", label: "BKT Update", category: "EDUCATION", desc: "Update Bayesian Knowledge Tracing",
    inputs: [{ portId: "responses", label: "Responses", dataType: "table" }], outputs: [{ portId: "mastery", label: "Mastery", dataType: "table" }] },
  { typeId: "sr:edu:at-risk", label: "At-Risk Detection", category: "EDUCATION", desc: "Identify at-risk learners",
    inputs: [{ portId: "mastery", label: "Mastery", dataType: "table" }], outputs: [{ portId: "alerts", label: "Alerts", dataType: "table" }] },
];

// ── Migration Starter Template ─────────────────────────────────────────
const MIGRATION_TEMPLATE = {
  name: "Platform Migration",
  nodes: [
    { id: "source", typeId: "sr:source:platform-export", x: 60, y: 220 },
    { id: "cdc", typeId: "sr:source:cdc-extract", x: 300, y: 220 },
    { id: "transform", typeId: "sr:transform:content-transform", x: 540, y: 220 },
    { id: "review", typeId: "sr:action:human-review", x: 780, y: 220 },
    { id: "import", typeId: "sr:action:service-import", x: 1020, y: 220 },
    { id: "cutover", typeId: "sr:action:infrastructure-cutover", x: 1260, y: 220 },
    { id: "health", typeId: "sr:source:health-monitor", x: 1500, y: 220 },
  ],
  edges: [
    { id: "e1", src: "source", srcPort: "content", tgt: "cdc", tgtPort: "items" },
    { id: "e2", src: "cdc", srcPort: "etlRun", tgt: "transform", tgtPort: "etlRun" },
    { id: "e3", src: "transform", srcPort: "summary", tgt: "review", tgtPort: "items" },
    { id: "e4", src: "review", srcPort: "approved", tgt: "import", tgtPort: "approved" },
    { id: "e5", src: "review", srcPort: "reviewStats", tgt: "import", tgtPort: "reviewStats" },
    { id: "e6", src: "import", srcPort: "importResult", tgt: "cutover", tgtPort: "importResult" },
    { id: "e7", src: "cutover", srcPort: "cutoverResult", tgt: "health", tgtPort: "trigger" },
  ],
};

// ── Geometry Helpers ────────────────────────────────────────────────────
const NODE_W = 200;
const NODE_HEADER = 36;
const PORT_H = 22;
const PORT_R = 6;
const nodeHeight = (n) => {
  const type = NODE_TYPES.find(t => t.typeId === n.typeId);
  if (!type) return 60;
  const ports = Math.max(type.inputs.length, type.outputs.length);
  return NODE_HEADER + Math.max(ports, 1) * PORT_H + 12;
};

const portPos = (node, portId, side) => {
  const type = NODE_TYPES.find(t => t.typeId === node.typeId);
  if (!type) return { x: node.x, y: node.y };
  const ports = side === "output" ? type.outputs : type.inputs;
  const idx = ports.findIndex(p => p.portId === portId);
  const y = node.y + NODE_HEADER + (idx + 0.5) * PORT_H;
  const x = side === "output" ? node.x + NODE_W : node.x;
  return { x, y };
};

const typesCompatible = (srcType, tgtType) =>
  srcType === tgtType || srcType === "any" || tgtType === "any";

// ── Edge Path (cubic bezier) ───────────────────────────────────────────
const edgePath = (x1, y1, x2, y2) => {
  const dx = Math.abs(x2 - x1) * 0.5;
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
};

// ── Main Component ─────────────────────────────────────────────────────
export default function SRCanvas() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [expandedCats, setExpandedCats] = useState({ SOURCE: true, TRANSFORM: true, ACTION: true });
  const [runState, setRunState] = useState(null); // null | { status, nodeStates: { [nodeId]: status } }
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const svgRef = useRef(null);

  // Load migration template
  const loadTemplate = useCallback(() => {
    const tplNodes = MIGRATION_TEMPLATE.nodes.map(n => ({ ...n, config: {} }));
    setNodes(tplNodes);
    setEdges(MIGRATION_TEMPLATE.edges.map(e => ({ ...e })));
    setSelectedNode(null);
    setRunState(null);
  }, []);

  // Add node from palette
  const addNode = useCallback((typeId) => {
    const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const cx = (-pan.x + 400) + Math.random() * 200;
    const cy = (-pan.y + 200) + Math.random() * 100;
    setNodes(prev => [...prev, { id, typeId, x: cx, y: cy, config: {} }]);
  }, [pan]);

  // Delete selected node
  const deleteSelected = useCallback(() => {
    if (!selectedNode) return;
    setEdges(prev => prev.filter(e => e.src !== selectedNode && e.tgt !== selectedNode));
    setNodes(prev => prev.filter(n => n.id !== selectedNode));
    setSelectedNode(null);
  }, [selectedNode]);

  // Mouse handlers for node dragging
  const onNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation();
    setSelectedNode(nodeId);
    const svg = svgRef.current.getBoundingClientRect();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDragging({ nodeId, offsetX: e.clientX - svg.left - pan.x - node.x, offsetY: e.clientY - svg.top - pan.y - node.y });
  }, [nodes, pan]);

  // Port connection start
  const onPortMouseDown = useCallback((e, nodeId, portId, side, dataType) => {
    e.stopPropagation();
    if (side === "output") {
      const node = nodes.find(n => n.id === nodeId);
      const pos = portPos(node, portId, "output");
      setConnecting({ srcNode: nodeId, srcPort: portId, srcType: dataType, startX: pos.x, startY: pos.y });
    }
  }, [nodes]);

  // Port connection complete
  const onPortMouseUp = useCallback((e, nodeId, portId, side, dataType) => {
    e.stopPropagation();
    if (connecting && side === "input" && nodeId !== connecting.srcNode) {
      if (typesCompatible(connecting.srcType, dataType)) {
        const edgeExists = edges.some(edge =>
          edge.src === connecting.srcNode && edge.srcPort === connecting.srcPort &&
          edge.tgt === nodeId && edge.tgtPort === portId
        );
        if (!edgeExists) {
          setEdges(prev => [...prev, {
            id: `e_${Date.now()}`,
            src: connecting.srcNode, srcPort: connecting.srcPort,
            tgt: nodeId, tgtPort: portId,
          }]);
        }
      }
    }
    setConnecting(null);
  }, [connecting, edges]);

  // SVG mouse events
  const onSvgMouseMove = useCallback((e) => {
    const svg = svgRef.current?.getBoundingClientRect();
    if (!svg) return;
    const mx = e.clientX - svg.left;
    const my = e.clientY - svg.top;
    setMousePos({ x: mx - pan.x, y: my - pan.y });

    if (dragging) {
      setNodes(prev => prev.map(n =>
        n.id === dragging.nodeId
          ? { ...n, x: mx - pan.x - dragging.offsetX, y: my - pan.y - dragging.offsetY }
          : n
      ));
    }
    if (isPanning && panStart) {
      setPan({ x: mx - panStart.x, y: my - panStart.y });
    }
  }, [dragging, isPanning, panStart, pan]);

  const onSvgMouseUp = useCallback(() => {
    setDragging(null);
    setConnecting(null);
    setIsPanning(false);
    setPanStart(null);
  }, []);

  const onSvgMouseDown = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === "rect" && e.target.dataset.bg) {
      setSelectedNode(null);
      const svg = svgRef.current.getBoundingClientRect();
      setIsPanning(true);
      setPanStart({ x: e.clientX - svg.left - pan.x, y: e.clientY - svg.top - pan.y });
    }
  }, [pan]);

  // Simulate workflow execution
  const simulateRun = useCallback(() => {
    if (nodes.length === 0) return;
    const nodeStates = {};
    nodes.forEach(n => { nodeStates[n.id] = "pending"; });
    setRunState({ status: "running", nodeStates: { ...nodeStates } });

    // Topological sort (simplified)
    const inDeg = {};
    const adj = {};
    nodes.forEach(n => { inDeg[n.id] = 0; adj[n.id] = []; });
    edges.forEach(e => { adj[e.src]?.push(e.tgt); inDeg[e.tgt] = (inDeg[e.tgt] || 0) + 1; });
    const queue = Object.keys(inDeg).filter(id => inDeg[id] === 0);
    const order = [];
    while (queue.length > 0) {
      const cur = queue.shift();
      order.push(cur);
      (adj[cur] || []).forEach(nb => { inDeg[nb]--; if (inDeg[nb] === 0) queue.push(nb); });
    }

    let i = 0;
    const tick = () => {
      if (i >= order.length) {
        setRunState(prev => ({ ...prev, status: "completed" }));
        return;
      }
      const nodeId = order[i];
      const type = NODE_TYPES.find(t => t.typeId === nodes.find(n => n.id === nodeId)?.typeId);
      setRunState(prev => ({
        ...prev,
        nodeStates: { ...prev.nodeStates, [nodeId]: "running" },
      }));

      setTimeout(() => {
        const isPauseNode = type?.pauses;
        setRunState(prev => ({
          ...prev,
          status: isPauseNode ? "paused" : prev.status,
          nodeStates: { ...prev.nodeStates, [nodeId]: isPauseNode ? "paused" : "completed" },
        }));
        if (isPauseNode) {
          // Auto-resume after 1.5s for demo
          setTimeout(() => {
            setRunState(prev => ({
              ...prev,
              status: "running",
              nodeStates: { ...prev.nodeStates, [nodeId]: "completed" },
            }));
            i++;
            tick();
          }, 1500);
        } else {
          i++;
          tick();
        }
      }, 600);
    };
    tick();
  }, [nodes, edges]);

  const clearCanvas = useCallback(() => {
    setNodes([]); setEdges([]); setSelectedNode(null); setRunState(null);
  }, []);

  // Key handler
  useEffect(() => {
    const handler = (e) => { if ((e.key === "Delete" || e.key === "Backspace") && selectedNode) deleteSelected(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedNode, deleteSelected]);

  const selectedNodeData = nodes.find(n => n.id === selectedNode);
  const selectedType = selectedNodeData ? NODE_TYPES.find(t => t.typeId === selectedNodeData.typeId) : null;
  const selectedCat = selectedType ? NODE_CATEGORIES[selectedType.category] : null;

  const runStatus = runState?.status;
  const nodeState = (id) => runState?.nodeStates?.[id] || null;

  const statusColor = (s) => {
    if (s === "running") return "#D4790E";
    if (s === "completed") return "#2E8B57";
    if (s === "failed") return "#C42B1C";
    if (s === "paused") return "#9B59B6";
    return "#ccc";
  };

  const StatusIcon = ({ s }) => {
    if (s === "running") return <Loader2 size={14} className="animate-spin" />;
    if (s === "completed") return <Check size={14} />;
    if (s === "failed") return <AlertCircle size={14} />;
    if (s === "paused") return <Pause size={14} />;
    if (s === "pending") return <Clock size={14} />;
    return null;
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif", background: "#0F1923", color: "#E8ECF0", overflow: "hidden" }}>
      {/* ── Left Palette ─────────────────────────────────────── */}
      <div style={{
        width: paletteOpen ? 240 : 44, transition: "width 0.2s",
        background: "#162230", borderRight: "1px solid #253545",
        display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden",
      }}>
        <div style={{ padding: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #253545" }}>
          {paletteOpen && <span style={{ fontWeight: 600, fontSize: 13, color: "#8BA4B8", textTransform: "uppercase", letterSpacing: 1 }}>Nodes</span>}
          <button onClick={() => setPaletteOpen(p => !p)} style={{ background: "none", border: "none", color: "#8BA4B8", cursor: "pointer", padding: 4 }}>
            {paletteOpen ? <ChevronRight size={16} /> : <Workflow size={16} />}
          </button>
        </div>

        {paletteOpen && (
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {Object.entries(NODE_CATEGORIES).map(([catKey, cat]) => {
              const Icon = cat.icon;
              const catNodes = NODE_TYPES.filter(n => n.category === catKey);
              const isOpen = expandedCats[catKey];
              return (
                <div key={catKey} style={{ marginBottom: 4 }}>
                  <button
                    onClick={() => setExpandedCats(prev => ({ ...prev, [catKey]: !prev[catKey] }))}
                    style={{
                      background: "none", border: "none", color: cat.color, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6, padding: "6px 4px",
                      width: "100%", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
                    }}
                  >
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <Icon size={14} />
                    {cat.label} ({catNodes.length})
                  </button>
                  {isOpen && catNodes.map(nt => (
                    <button
                      key={nt.typeId}
                      onClick={() => addNode(nt.typeId)}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        background: "#1A2D3F", border: "1px solid #253545", borderRadius: 6,
                        padding: "8px 10px", marginBottom: 3, cursor: "pointer",
                        color: "#D0D8E0", fontSize: 12, transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#223A50"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "#1A2D3F"}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{nt.label}</div>
                      <div style={{ fontSize: 10, color: "#7A8FA0" }}>{nt.desc}</div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Main Area ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Toolbar */}
        <div style={{
          height: 48, background: "#162230", borderBottom: "1px solid #253545",
          display: "flex", alignItems: "center", padding: "0 16px", gap: 8,
        }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#2E75B6", marginRight: 8 }}>S&R Canvas</span>
          <div style={{ width: 1, height: 24, background: "#253545" }} />
          <ToolBtn label="Migration Template" icon={FileDown} onClick={loadTemplate} />
          <ToolBtn label="Clear" icon={RotateCcw} onClick={clearCanvas} />
          {selectedNode && <ToolBtn label="Delete" icon={Trash2} onClick={deleteSelected} accent="#C42B1C" />}
          <div style={{ flex: 1 }} />

          {/* Run controls */}
          {runStatus && (
            <span style={{
              fontSize: 12, fontWeight: 600, color: statusColor(runStatus),
              display: "flex", alignItems: "center", gap: 4, marginRight: 8,
              textTransform: "uppercase", letterSpacing: 0.5,
            }}>
              <StatusIcon s={runStatus} /> {runStatus}
            </span>
          )}
          <ToolBtn label="Execute" icon={Play} onClick={simulateRun} accent="#2E8B57"
            disabled={nodes.length === 0 || runStatus === "running"} />
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <svg
            ref={svgRef}
            width="100%" height="100%"
            onMouseMove={onSvgMouseMove}
            onMouseUp={onSvgMouseUp}
            onMouseDown={onSvgMouseDown}
            onMouseLeave={onSvgMouseUp}
            style={{ cursor: isPanning ? "grabbing" : dragging ? "move" : "default" }}
          >
            {/* Grid background */}
            <defs>
              <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"
                patternTransform={`translate(${pan.x % 24},${pan.y % 24})`}>
                <circle cx="12" cy="12" r="0.8" fill="#1E3040" />
              </pattern>
            </defs>
            <rect data-bg="1" width="100%" height="100%" fill="url(#grid)" />

            <g transform={`translate(${pan.x},${pan.y})`}>
              {/* Edges */}
              {edges.map(edge => {
                const srcNode = nodes.find(n => n.id === edge.src);
                const tgtNode = nodes.find(n => n.id === edge.tgt);
                if (!srcNode || !tgtNode) return null;
                const p1 = portPos(srcNode, edge.srcPort, "output");
                const p2 = portPos(tgtNode, edge.tgtPort, "input");
                const srcType = NODE_TYPES.find(t => t.typeId === srcNode.typeId)?.outputs.find(p => p.portId === edge.srcPort);
                const color = PORT_COLORS[srcType?.dataType] || "#555";

                const srcState = nodeState(edge.src);
                const animated = srcState === "completed";

                return (
                  <g key={edge.id}>
                    <path d={edgePath(p1.x, p1.y, p2.x, p2.y)}
                      stroke={color} strokeWidth={2} fill="none" opacity={0.3} />
                    {animated && (
                      <path d={edgePath(p1.x, p1.y, p2.x, p2.y)}
                        stroke={color} strokeWidth={2.5} fill="none"
                        strokeDasharray="6 4" opacity={0.8}>
                        <animate attributeName="stroke-dashoffset" from="10" to="0" dur="0.6s" repeatCount="indefinite" />
                      </path>
                    )}
                    {!animated && (
                      <path d={edgePath(p1.x, p1.y, p2.x, p2.y)}
                        stroke={color} strokeWidth={2} fill="none" opacity={0.7} />
                    )}
                  </g>
                );
              })}

              {/* Connection in progress */}
              {connecting && (
                <path
                  d={edgePath(connecting.startX, connecting.startY, mousePos.x, mousePos.y)}
                  stroke={PORT_COLORS[connecting.srcType] || "#888"}
                  strokeWidth={2} fill="none" strokeDasharray="4 3" opacity={0.6}
                />
              )}

              {/* Nodes */}
              {nodes.map(node => {
                const type = NODE_TYPES.find(t => t.typeId === node.typeId);
                if (!type) return null;
                const cat = NODE_CATEGORIES[type.category];
                const h = nodeHeight(node);
                const isSelected = selectedNode === node.id;
                const ns = nodeState(node.id);

                return (
                  <g key={node.id} onMouseDown={(e) => onNodeMouseDown(e, node.id)}>
                    {/* Glow */}
                    {ns === "running" && (
                      <rect x={node.x - 4} y={node.y - 4} width={NODE_W + 8} height={h + 8}
                        rx={10} fill="none" stroke="#D4790E" strokeWidth={2} opacity={0.5}>
                        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.2s" repeatCount="indefinite" />
                      </rect>
                    )}
                    {ns === "paused" && (
                      <rect x={node.x - 4} y={node.y - 4} width={NODE_W + 8} height={h + 8}
                        rx={10} fill="none" stroke="#9B59B6" strokeWidth={2} opacity={0.5}>
                        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.5s" repeatCount="indefinite" />
                      </rect>
                    )}

                    {/* Body */}
                    <rect x={node.x} y={node.y} width={NODE_W} height={h}
                      rx={8} fill="#1A2D3F"
                      stroke={isSelected ? "#5BA3D9" : ns ? statusColor(ns) : "#2A3F52"}
                      strokeWidth={isSelected ? 2 : 1.5} />

                    {/* Header bar */}
                    <rect x={node.x} y={node.y} width={NODE_W} height={NODE_HEADER}
                      rx={8} fill={cat.color} />
                    <rect x={node.x} y={node.y + NODE_HEADER - 8} width={NODE_W} height={8}
                      fill={cat.color} />

                    {/* Label */}
                    <text x={node.x + 10} y={node.y + 23} fontSize={12} fontWeight={600}
                      fill="white" fontFamily="'IBM Plex Sans', sans-serif">{type.label}</text>

                    {/* Status badge */}
                    {ns && (
                      <circle cx={node.x + NODE_W - 14} cy={node.y + 18}
                        r={5} fill={statusColor(ns)} />
                    )}

                    {/* Pause icon */}
                    {type.pauses && !ns && (
                      <text x={node.x + NODE_W - 18} y={node.y + 22} fontSize={10} fill="rgba(255,255,255,0.5)">⏸</text>
                    )}

                    {/* Input ports */}
                    {type.inputs.map((port, pi) => {
                      const py = node.y + NODE_HEADER + (pi + 0.5) * PORT_H;
                      return (
                        <g key={`in-${port.portId}`}
                          onMouseUp={(e) => onPortMouseUp(e, node.id, port.portId, "input", port.dataType)}
                          style={{ cursor: "crosshair" }}>
                          <circle cx={node.x} cy={py} r={PORT_R}
                            fill="#1A2D3F" stroke={PORT_COLORS[port.dataType] || "#888"} strokeWidth={2} />
                          <text x={node.x + 14} y={py + 4} fontSize={10} fill="#8BA4B8"
                            fontFamily="'IBM Plex Sans', sans-serif">{port.label}</text>
                        </g>
                      );
                    })}

                    {/* Output ports */}
                    {type.outputs.map((port, pi) => {
                      const py = node.y + NODE_HEADER + (pi + 0.5) * PORT_H;
                      return (
                        <g key={`out-${port.portId}`}
                          onMouseDown={(e) => onPortMouseDown(e, node.id, port.portId, "output", port.dataType)}
                          style={{ cursor: "crosshair" }}>
                          <circle cx={node.x + NODE_W} cy={py} r={PORT_R}
                            fill={PORT_COLORS[port.dataType] || "#888"} stroke="#1A2D3F" strokeWidth={2} />
                          <text x={node.x + NODE_W - 14} y={py + 4} fontSize={10} fill="#8BA4B8"
                            textAnchor="end" fontFamily="'IBM Plex Sans', sans-serif">{port.label}</text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Empty state */}
          {nodes.length === 0 && (
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              textAlign: "center", color: "#4A6275", pointerEvents: "none",
            }}>
              <Workflow size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No workflow loaded</div>
              <div style={{ fontSize: 13 }}>Click nodes in the palette to add them, or load the <b>Migration Template</b></div>
            </div>
          )}

          {/* Mini info panel bottom-left */}
          <div style={{
            position: "absolute", bottom: 12, left: 12,
            background: "rgba(22,34,48,0.85)", borderRadius: 8, padding: "8px 12px",
            fontSize: 11, color: "#6A8498", backdropFilter: "blur(4px)",
            border: "1px solid #253545",
          }}>
            {nodes.length} nodes · {edges.length} edges · Pan: drag background · Connect: drag output→input
          </div>
        </div>
      </div>

      {/* ── Right Panel (Node Config) ────────────────────────── */}
      {selectedNodeData && selectedType && (
        <div style={{
          width: 280, background: "#162230", borderLeft: "1px solid #253545",
          display: "flex", flexDirection: "column", flexShrink: 0,
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid #253545",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: selectedCat.color }}>{selectedType.label}</span>
            <button onClick={() => setSelectedNode(null)}
              style={{ background: "none", border: "none", color: "#6A8498", cursor: "pointer" }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: 16, flex: 1, overflowY: "auto" }}>
            <div style={{ fontSize: 12, color: "#7A8FA0", marginBottom: 12 }}>{selectedType.desc}</div>

            <div style={{ fontSize: 11, fontWeight: 600, color: "#5A7A90", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Category</div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: selectedCat.bg + "22", padding: "4px 10px", borderRadius: 12,
              fontSize: 12, color: selectedCat.color, fontWeight: 600, marginBottom: 16,
            }}>
              <selectedCat.icon size={12} /> {selectedCat.label}
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, color: "#5A7A90", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Type ID</div>
            <div style={{
              fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#8BA4B8",
              background: "#0F1923", padding: "6px 10px", borderRadius: 6, marginBottom: 16,
            }}>{selectedType.typeId}</div>

            {selectedType.inputs.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#5A7A90", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Inputs</div>
                {selectedType.inputs.map(p => (
                  <div key={p.portId} style={{
                    display: "flex", alignItems: "center", gap: 6, marginBottom: 4,
                    fontSize: 12, color: "#8BA4B8",
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: PORT_COLORS[p.dataType] }} />
                    {p.label} <span style={{ fontSize: 10, color: "#5A7A90" }}>({p.dataType})</span>
                  </div>
                ))}
                <div style={{ marginBottom: 16 }} />
              </>
            )}

            {selectedType.outputs.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#5A7A90", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Outputs</div>
                {selectedType.outputs.map(p => (
                  <div key={p.portId} style={{
                    display: "flex", alignItems: "center", gap: 6, marginBottom: 4,
                    fontSize: 12, color: "#8BA4B8",
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: PORT_COLORS[p.dataType] }} />
                    {p.label} <span style={{ fontSize: 10, color: "#5A7A90" }}>({p.dataType})</span>
                  </div>
                ))}
              </>
            )}

            {selectedType.pauses && (
              <div style={{
                marginTop: 16, padding: "8px 12px", borderRadius: 8,
                background: "rgba(155,89,182,0.1)", border: "1px solid rgba(155,89,182,0.3)",
                fontSize: 12, color: "#BB86D6",
              }}>
                ⏸ This node pauses the workflow for human input
              </div>
            )}

            {nodeState(selectedNode) && (
              <div style={{
                marginTop: 16, padding: "8px 12px", borderRadius: 8,
                background: statusColor(nodeState(selectedNode)) + "15",
                border: `1px solid ${statusColor(nodeState(selectedNode))}44`,
                fontSize: 12, color: statusColor(nodeState(selectedNode)),
                display: "flex", alignItems: "center", gap: 6, fontWeight: 600,
              }}>
                <StatusIcon s={nodeState(selectedNode)} /> {nodeState(selectedNode)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ToolBtn({ label, icon: Icon, onClick, accent, disabled }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      title={label}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        background: accent ? accent + "22" : "#1A2D3F",
        border: `1px solid ${accent || "#253545"}`,
        borderRadius: 6, padding: "5px 10px", cursor: disabled ? "not-allowed" : "pointer",
        color: disabled ? "#4A6275" : (accent || "#8BA4B8"),
        fontSize: 12, fontWeight: 500, opacity: disabled ? 0.5 : 1,
        transition: "background 0.15s",
      }}
    >
      <Icon size={14} /> {label}
    </button>
  );
}
