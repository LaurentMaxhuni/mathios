"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, GitBranch, GripVertical } from "lucide-react";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { RoadmapNodeRecord } from "@/domain/roadmap/types";
import type { ActionState } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";
import { reorderRoadmapNodesAction } from "@/features/roadmaps/actions";
import { DeleteRoadmapNodeForm } from "@/features/roadmaps/components/roadmap-forms";

export function RoadmapNodeList({
  roadmapId,
  roadmapVersionId,
  nodes,
}: {
  roadmapId: string;
  roadmapVersionId: string;
  nodes: readonly RoadmapNodeRecord[];
}) {
  const [orderedNodes, setOrderedNodes] = React.useState(() => [...nodes]);
  const [draggedNodeId, setDraggedNodeId] = React.useState<string | null>(null);
  const [state, formAction, pending] = React.useActionState<ActionState, FormData>(
    reorderRoadmapNodesAction,
    initialActionState,
  );

  React.useEffect(() => {
    setOrderedNodes([...nodes]);
  }, [nodes]);

  function moveNode(targetNodeId: string) {
    if (!draggedNodeId || draggedNodeId === targetNodeId) return;
    const sourceIndex = orderedNodes.findIndex((node) => node.id === draggedNodeId);
    const targetIndex = orderedNodes.findIndex((node) => node.id === targetNodeId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...orderedNodes];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    setOrderedNodes(next);

    const formData = new FormData();
    formData.set("roadmapId", roadmapId);
    formData.set("roadmapVersionId", roadmapVersionId);
    for (const node of next) formData.append("nodeIds", node.id);
    formAction(formData);
  }

  return (
    <div className="space-y-3">
      <ActionFeedback state={state} />
      {pending ? <p className="text-xs text-muted-foreground">Saving node orderâ€¦</p> : null}
      {orderedNodes.map((node) => (
        <div
          key={node.id}
          draggable
          onDragStart={() => setDraggedNodeId(node.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            moveNode(node.id);
            setDraggedNodeId(null);
          }}
          onDragEnd={() => setDraggedNodeId(null)}
          aria-label={`Drag ${node.title}`}
          className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition ${draggedNodeId === node.id ? "border-accent bg-accent/5 opacity-60" : ""}`}
        >
          <div className="flex min-w-0 items-start gap-3">
            <GripVertical
              className="mt-0.5 h-5 w-5 shrink-0 cursor-grab text-muted-foreground"
              aria-hidden="true"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <GitBranch className="h-4 w-4 text-accent" aria-hidden="true" />
                <p className="font-medium">{node.title}</p>
                <Badge variant={node.isRequired ? "default" : "outline"}>
                  {node.isRequired ? "required" : "optional"}
                </Badge>
                {node.isCheckpoint ? <Badge variant="success">checkpoint</Badge> : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {node.nodeKey} Â· {node.type} Â· {node.referenceId ?? "milestone"} Â· order{" "}
                {node.sortOrder}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Link
              href={`/roadmaps/${roadmapId}/edit?node=${node.id}` as never}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Edit <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <DeleteRoadmapNodeForm roadmapId={roadmapId} nodeId={node.id} />
          </div>
        </div>
      ))}
    </div>
  );
}
