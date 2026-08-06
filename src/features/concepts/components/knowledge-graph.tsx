"use client";

import Link from "next/link";
import * as React from "react";
import {
  Expand,
  LockKeyhole,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Search,
  UnlockKeyhole,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DomainRecord, GradeRecord, SubjectRecord } from "@/domain/curriculum/types";
import type {
  KnowledgeGraph,
  KnowledgeGraphEdge,
  KnowledgeGraphNode,
} from "@/domain/concept/types";
import { traverseConcepts } from "@/domain/concept/rules";

const relationLabels = new Map([
  ["requires", "requires"],
  ["recommended-before", "recommended before"],
  ["unlocks", "unlocks"],
  ["related-to", "related to"],
  ["builds-upon", "builds upon"],
  ["applies-in", "applies in"],
  ["used-by", "used by"],
  ["cross-subject-connection", "cross-subject connection"],
  ["grade-level-extension", "grade-level extension"],
  ["advanced-extension", "advanced extension"],
  ["alternative-explanation", "alternative explanation"],
]);

function nodeColor(node: KnowledgeGraphNode): string {
  return node.subjectSlug === "mathematics"
    ? "hsl(var(--subject-mathematics))"
    : node.subjectSlug === "physics"
      ? "hsl(var(--subject-physics))"
      : node.subjectSlug === "chemistry"
        ? "hsl(var(--subject-chemistry))"
        : node.subjectSlug === "biology"
          ? "hsl(var(--subject-biology))"
          : "hsl(var(--subject-astronomy))";
}

function nodeRadius(node: KnowledgeGraphNode): number {
  return node.locked ? 28 : 25;
}

function edgePoints(edge: KnowledgeGraphEdge, nodes: ReadonlyMap<string, KnowledgeGraphNode>) {
  const source = nodes.get(edge.sourceConceptId);
  const target = nodes.get(edge.targetConceptId);
  if (!source || !target) return null;
  return { source, target };
}

export function KnowledgeGraphView({
  graph,
  subjects,
  domains,
  grades,
}: {
  graph: KnowledgeGraph;
  subjects: readonly SubjectRecord[];
  domains: readonly DomainRecord[];
  grades: readonly GradeRecord[];
}) {
  const [search, setSearch] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("all");
  const [domainId, setDomainId] = React.useState("all");
  const [gradeId, setGradeId] = React.useState("all");
  const [difficulty, setDifficulty] = React.useState("all");
  const [relationshipType, setRelationshipType] = React.useState("all");
  const [masteryState, setMasteryState] = React.useState("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(0.85);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const dragOrigin = React.useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const graphId = React.useId().replaceAll(":", "");

  const filteredNodes = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return graph.nodes.filter((node) => {
      if (
        query &&
        !node.name.toLowerCase().includes(query) &&
        !node.slug.toLowerCase().includes(query)
      )
        return false;
      if (subjectId !== "all" && node.subjectId !== subjectId) return false;
      if (domainId !== "all" && node.domainId !== domainId) return false;
      if (difficulty !== "all" && node.difficulty !== difficulty) return false;
      if (masteryState !== "all" && node.masteryState !== masteryState) return false;
      if (gradeId !== "all") {
        const grade = grades.find((item) => item.id === gradeId);
        const minimum = node.gradeMinId
          ? grades.find((item) => item.id === node.gradeMinId)?.sortOrder
          : undefined;
        const maximum = node.gradeMaxId
          ? grades.find((item) => item.id === node.gradeMaxId)?.sortOrder
          : undefined;
        if (
          !grade ||
          (minimum !== undefined && grade.sortOrder < minimum) ||
          (maximum !== undefined && grade.sortOrder > maximum)
        )
          return false;
      }
      return true;
    });
  }, [difficulty, domainId, gradeId, grades, graph.nodes, masteryState, search, subjectId]);

  const visibleIds = React.useMemo(
    () => new Set(filteredNodes.map((node) => node.id)),
    [filteredNodes],
  );
  const filteredEdges = React.useMemo(
    () =>
      graph.edges.filter(
        (edge) =>
          visibleIds.has(edge.sourceConceptId) &&
          visibleIds.has(edge.targetConceptId) &&
          (relationshipType === "all" || edge.type === relationshipType),
      ),
    [graph.edges, relationshipType, visibleIds],
  );
  const nodesById = React.useMemo(
    () => new Map(filteredNodes.map((node) => [node.id, node])),
    [filteredNodes],
  );
  const highlighted = React.useMemo(() => {
    if (!selectedId) return { nodes: new Set<string>(), edges: new Set<string>() };
    const rawEdges = graph.edges.map((edge) => ({
      id: edge.id,
      sourceConceptId: edge.sourceConceptId,
      targetConceptId: edge.targetConceptId,
      type: edge.type,
      createdAt: edge.createdAt,
      updatedAt: edge.updatedAt,
    }));
    const prerequisiteIds = new Set(
      traverseConcepts(selectedId, rawEdges, "prerequisites", ["requires"]),
    );
    const descendantIds = new Set(
      traverseConcepts(selectedId, rawEdges, "descendants", ["requires"]),
    );
    const nodeIds = new Set([selectedId, ...prerequisiteIds, ...descendantIds]);
    const edgeIds = new Set(
      graph.edges
        .filter((edge) => nodeIds.has(edge.sourceConceptId) && nodeIds.has(edge.targetConceptId))
        .map((edge) => edge.id),
    );
    return { nodes: nodeIds, edges: edgeIds };
  }, [graph.edges, selectedId]);

  const maxX = Math.max(1100, ...filteredNodes.map((node) => node.x + 220));
  const maxY = Math.max(680, ...filteredNodes.map((node) => node.y + 100));
  const selected = selectedId ? graph.nodes.find((node) => node.id === selectedId) : null;

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest('[role="button"]')) return;
    setDragging(true);
    dragOrigin.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setPan({
      x: dragOrigin.current.panX + event.clientX - dragOrigin.current.x,
      y: dragOrigin.current.panY + event.clientY - dragOrigin.current.y,
    });
  }

  function stopDrag() {
    setDragging(false);
  }

  function resetView() {
    setZoom(0.85);
    setPan({ x: 0, y: 0 });
    setSelectedId(null);
  }

  return (
    <section
      className={
        fullscreen
          ? "fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"
          : "space-y-4"
      }
      aria-label="Knowledge graph"
    >
      <p id={`${graphId}-description`} className="sr-only">
        Interactive concept graph. Use the text view below to navigate concepts by keyboard.
      </p>
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 lg:flex-row lg:items-end">
        <div className="min-w-56 flex-1 space-y-2">
          <label
            htmlFor="graph-search"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          >
            Search concepts
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="graph-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or slug"
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
        <FilterSelect id="graph-subject" label="Subject" value={subjectId} onChange={setSubjectId}>
          <option value="all">All subjects</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect id="graph-domain" label="Domain" value={domainId} onChange={setDomainId}>
          <option value="all">All domains</option>
          {domains.map((domain) => (
            <option key={domain.id} value={domain.id}>
              {domain.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect id="graph-grade" label="Grade" value={gradeId} onChange={setGradeId}>
          <option value="all">All grades</option>
          {grades.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {grade.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          id="graph-difficulty"
          label="Difficulty"
          value={difficulty}
          onChange={setDifficulty}
        >
          <option value="all">All levels</option>
          <option value="gentle">Gentle</option>
          <option value="balanced">Balanced</option>
          <option value="challenging">Challenging</option>
        </FilterSelect>
        <FilterSelect
          id="graph-relationship"
          label="Relationship"
          value={relationshipType}
          onChange={setRelationshipType}
        >
          <option value="all">All relationships</option>
          {graph.edges
            .map((edge) => edge.type)
            .filter((type, index, all) => all.indexOf(type) === index)
            .map((type) => (
              <option key={type} value={type}>
                {relationLabels.get(type) ?? type}
              </option>
            ))}
        </FilterSelect>
        <FilterSelect
          id="graph-mastery"
          label="Mastery state"
          value={masteryState}
          onChange={setMasteryState}
        >
          <option value="all">All states</option>
          <option value="unassessed">Unassessed</option>
        </FilterSelect>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Reset graph view"
            onClick={resetView}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={() => setFullscreen((value) => !value)}
          >
            {fullscreen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          Showing <strong className="text-foreground">{filteredNodes.length}</strong> concepts and{" "}
          <strong className="text-foreground">{filteredEdges.length}</strong> relationships. Drag
          the canvas, or use the zoom controls.
        </p>
        <p className="text-xs">
          Mastery is unassessed in Phase 4; thresholds are authored for the later mastery engine.
        </p>
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl border bg-card surface-grid ${fullscreen ? "min-h-0 flex-1" : "h-[680px]"} ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <svg
          className="h-full w-full min-w-full"
          viewBox={`0 0 ${maxX} ${maxY}`}
          role="img"
          aria-label="Interactive concept relationship graph"
          aria-describedby={`${graphId}-description`}
        >
          <defs>
            <marker
              id={`${graphId}-arrow`}
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 z" fill="hsl(var(--muted-foreground))" />
            </marker>
          </defs>
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {filteredEdges.map((edge) => {
              const points = edgePoints(edge, nodesById);
              if (!points) return null;
              const active = highlighted.edges.has(edge.id);
              return (
                <g key={edge.id} opacity={selectedId && !active ? 0.2 : 0.72}>
                  <line
                    x1={points.source.x}
                    y1={points.source.y}
                    x2={points.target.x}
                    y2={points.target.y}
                    stroke={active ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))"}
                    strokeWidth={active ? 3.5 : 1.6}
                    markerEnd={`url(#${graphId}-arrow)`}
                  />
                  <text
                    x={(points.source.x + points.target.x) / 2}
                    y={(points.source.y + points.target.y) / 2 - 8}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px]"
                  >
                    {relationLabels.get(edge.type) ?? edge.type}
                  </text>
                </g>
              );
            })}
            {filteredNodes.map((node) => {
              const active = highlighted.nodes.has(node.id);
              const selectedNode = selectedId === node.id;
              return (
                <g
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.name}, ${node.subjectName}`}
                  aria-pressed={selectedNode}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedId(node.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      setSelectedId(node.id);
                    }
                  }}
                  opacity={selectedId && !active ? 0.3 : 1}
                  className="cursor-pointer"
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={nodeRadius(node) + (selectedNode ? 5 : 0)}
                    fill="hsl(var(--card))"
                    stroke={selectedNode || active ? "hsl(var(--accent))" : nodeColor(node)}
                    strokeWidth={selectedNode ? 5 : 3}
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={nodeRadius(node) - 5}
                    fill={nodeColor(node)}
                    opacity={node.locked ? 0.55 : 0.9}
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    className="fill-white text-[13px] font-bold"
                  >
                    {node.locked ? "·" : "✓"}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + 52}
                    textAnchor="middle"
                    className="fill-foreground text-[13px] font-semibold"
                  >
                    {node.name.length > 24 ? `${node.name.slice(0, 23)}…` : node.name}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + 68}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px]"
                  >
                    {node.subjectName} · {node.masteryState}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-lg border bg-card/90 p-1 shadow-sm backdrop-blur">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Zoom out"
            onClick={() => setZoom((value) => Math.max(0.45, value - 0.1))}
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="min-w-12 text-center text-xs tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Zoom in"
            onClick={() => setZoom((value) => Math.min(1.7, value + 0.1))}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div
          className="absolute right-4 top-4 rounded-lg border bg-card/90 p-2 shadow-sm backdrop-blur"
          aria-label="Graph minimap"
        >
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <Expand className="h-3 w-3" aria-hidden="true" /> Map
          </div>
          <svg width="150" height="78" viewBox={`0 0 ${maxX} ${maxY}`} aria-hidden="true">
            {filteredEdges.map((edge) => {
              const points = edgePoints(edge, nodesById);
              return points ? (
                <line
                  key={edge.id}
                  x1={points.source.x}
                  y1={points.source.y}
                  x2={points.target.x}
                  y2={points.target.y}
                  stroke="hsl(var(--border))"
                  strokeWidth="5"
                />
              ) : null;
            })}
            {filteredNodes.map((node) => (
              <circle key={node.id} cx={node.x} cy={node.y} r="10" fill={nodeColor(node)} />
            ))}
          </svg>
        </div>

        {selected ? (
          <aside
            className="absolute bottom-4 right-4 w-[min(22rem,calc(100%-2rem))] rounded-xl border bg-card/95 p-5 shadow-xl backdrop-blur"
            aria-label="Concept details panel"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Concept detail</p>
                <h2 className="mt-1 text-lg font-semibold">{selected.name}</h2>
              </div>
              <button
                type="button"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close concept details"
                onClick={() => setSelectedId(null)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">{selected.subjectName}</Badge>
              <Badge variant="outline">{selected.difficulty}</Badge>
              <Badge variant={selected.locked ? "warning" : "success"}>
                {selected.locked ? (
                  <>
                    <LockKeyhole className="mr-1 h-3 w-3" aria-hidden="true" /> prerequisites
                  </>
                ) : (
                  <>
                    <UnlockKeyhole className="mr-1 h-3 w-3" aria-hidden="true" /> unlocked
                  </>
                )}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {selected.description ||
                "This concept is ready to be explained through linked content."}
            </p>
            <Link
              href={`/concepts/${selected.id}`}
              className="mt-4 inline-flex text-sm font-medium text-accent hover:underline"
            >
              Open concept page
            </Link>
          </aside>
        ) : null}
      </div>

      <details className="content-visibility-auto rounded-xl border bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold focus-visible:outline-none">
          View graph as a list
        </summary>
        <p className="mt-3 text-sm text-muted-foreground">
          Select a concept to open its details and highlight its prerequisite path.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNodes.map((node) => (
            <li key={`text-${node.id}`}>
              <button
                type="button"
                className="w-full rounded-lg border p-3 text-left text-sm hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-pressed={selectedId === node.id}
                onClick={() => setSelectedId(node.id)}
              >
                <span className="font-medium">{node.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {node.subjectName} · {node.masteryState}
                  {node.locked ? " · prerequisites required" : " · unlocked"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </details>

      {graph.orphanedConceptIds.length ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          {graph.orphanedConceptIds.length} concept
          {graph.orphanedConceptIds.length === 1 ? " is" : "s are"} currently orphaned from lessons,
          objectives, and relationships; content authors can review them in management.
        </p>
      ) : null}
      {graph.requiredCycle ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Required prerequisite cycle detected: {graph.requiredCycle.join(" → ")}
        </p>
      ) : null}
    </section>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-32 space-y-2">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-select"
      >
        {children}
      </select>
    </div>
  );
}
