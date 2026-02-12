import fetch from "node-fetch";
import { decideWritePlacement, scheduleReplication } from "./consistency.manager";
import { getAllNodes } from "./node.manager";
import { logger } from "../../config/logger";
import { config } from "../../config/env";

// Replication service glues together placement decisions with concrete HTTP calls
// to peer nodes. For this project we keep it very small and readable.

export interface ReplicationContext {
  storageKey: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface ReplicationDecision extends ReplicationContext {
  handledLocally: boolean;
  primaryNodeId: string;
  replicaNodeIds: string[];
}

export const planReplication = (ctx: ReplicationContext): ReplicationDecision => {
  const base = decideWritePlacement(ctx.storageKey);
  return {
    ...ctx,
    handledLocally: base.handledLocally,
    primaryNodeId: base.primaryNodeId,
    replicaNodeIds: base.replicaNodeIds
  };
};

// Best-effort asynchronous replication via HTTP. This assumes peer nodes expose
// a simple replication endpoint (not yet implemented) that can copy objects between stores.
export const triggerReplication = async (ctx: ReplicationDecision): Promise<void> => {
  if (!config.cluster.enabled || ctx.replicaNodeIds.length === 0) return;

  scheduleReplication(ctx.storageKey, ctx.replicaNodeIds);

  const nodes = getAllNodes();
  const targets = nodes.filter((n) => ctx.replicaNodeIds.includes(n.id) && n.baseUrl);

  await Promise.all(
    targets.map(async (node) => {
      try {
        const res = await fetch(`${node.baseUrl}/internal/replicate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storageKey: ctx.storageKey,
            mimeType: ctx.mimeType,
            sizeBytes: ctx.sizeBytes
          }),
          timeout: 3000 as any
        });

        if (!res.ok) {
          logger.warn("Replication call failed", { nodeId: node.id, status: res.status });
        }
      } catch (err) {
        logger.warn("Error while calling replication endpoint", { nodeId: node.id });
      }
    })
  );
};

