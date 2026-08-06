import Link from "next/link";
import { Bookmark, FileText, GitBranch, Link2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PersonalKnowledgeMap, PersonalKnowledgeMapNode } from "@/domain/notes/types";

function nodeColor(node: PersonalKnowledgeMapNode): string {
  if (node.kind === "note") return "hsl(var(--primary))";
  if (node.kind === "concept") return "hsl(var(--subject-mathematics))";
  if (node.kind === "lesson") return "hsl(var(--subject-physics))";
  if (node.kind === "bookmark") return "hsl(var(--accent))";
  return "hsl(var(--muted-foreground))";
}

export function KnowledgeMapView({ map }: { map: PersonalKnowledgeMap }) {
  const byId = new Map(map.nodes.map((node) => [node.id, node]));
  const maxX = Math.max(760, ...map.nodes.map((node) => node.x + 180));
  const maxY = Math.max(420, ...map.nodes.map((node) => node.y + 90));
  return (
    <section className="space-y-4" aria-label="Personal knowledge map">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Personal concept map</p>
          <h2 className="mt-1 text-xl font-semibold">See what your notes touch</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Notes, platform resources, and bookmarks are connected from your own knowledge base.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            <FileText className="mr-1 h-3 w-3" aria-hidden="true" /> Notes
          </Badge>
          <Badge variant="outline">
            <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" /> Concepts
          </Badge>
          <Badge variant="outline">
            <Bookmark className="mr-1 h-3 w-3" aria-hidden="true" /> Bookmarks
          </Badge>
        </div>
      </div>
      {!map.nodes.length ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Create a note or capture a resource to grow this map.
        </div>
      ) : (
        <>
          <div className="relative overflow-auto rounded-2xl border bg-card surface-grid">
            <svg
              className="min-h-[420px] min-w-[760px]"
              viewBox={`0 0 ${maxX} ${maxY}`}
              role="img"
              aria-label="Map of personal notes and learning resources"
            >
              <defs>
                <marker
                  id="personal-map-arrow"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                >
                  <path d="M0,0 L8,4 L0,8 z" fill="hsl(var(--muted-foreground))" />
                </marker>
              </defs>
              {map.edges.map((edge) => {
                const source = byId.get(edge.sourceId);
                const target = byId.get(edge.targetId);
                if (!source || !target) return null;
                return (
                  <g key={edge.id} opacity="0.72">
                    <line
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={edge.kind === "backlink" ? 3 : 2}
                      strokeDasharray={edge.kind === "bookmark" ? "6 5" : undefined}
                      markerEnd="url(#personal-map-arrow)"
                    />
                  </g>
                );
              })}
              {map.nodes.map((node) => {
                const label = node.label.length > 24 ? `${node.label.slice(0, 23)}…` : node.label;
                const content = (
                  <g key={node.id}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="31"
                      fill="hsl(var(--card))"
                      stroke={nodeColor(node)}
                      strokeWidth="4"
                    />
                    <circle cx={node.x} cy={node.y} r="23" fill={nodeColor(node)} opacity="0.88" />
                    <text
                      x={node.x}
                      y={node.y + 5}
                      textAnchor="middle"
                      className="fill-white text-[14px] font-bold"
                    >
                      {node.kind === "note" ? "N" : node.kind === "bookmark" ? "★" : "•"}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + 55}
                      textAnchor="middle"
                      className="fill-foreground text-[13px] font-semibold"
                    >
                      {label}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + 72}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px]"
                    >
                      {node.resourceType ?? node.kind}
                    </text>
                  </g>
                );
                return node.href ? (
                  <a key={node.id} href={node.href} aria-label={`Open ${node.label}`}>
                    {content}
                  </a>
                ) : (
                  content
                );
              })}
            </svg>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {map.edges.map((edge) => {
              const source = byId.get(edge.sourceId);
              const target = byId.get(edge.targetId);
              if (!source || !target) return null;
              const EdgeIcon =
                edge.kind === "bookmark" ? Bookmark : edge.kind === "backlink" ? GitBranch : Link2;
              return (
                <div
                  key={`edge-${edge.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-background p-3 text-sm"
                >
                  <EdgeIcon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span className="min-w-0 truncate">{source.label}</span>
                  <span className="text-xs text-muted-foreground">{edge.label}</span>
                  <span className="min-w-0 truncate font-medium">{target.label}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
      <Link
        href="/knowledge-graph"
        className="inline-flex text-sm font-medium text-accent hover:underline"
      >
        Open the platform concept graph
      </Link>
    </section>
  );
}
