import fetch from "node-fetch";
import { decideWritePlacement, scheduleReplication } from "./consistency.manager";
import { getAllNodes } from "./node.manager";
import { logger } from "../../config/logger";
import { config } from "../../config/env";
import { nativeReplicate } from "../storage/native.wrapper";

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

/**
 * Multithreaded Replication Engine call.
 * Rewritten in C++ for performance and reliable retries with exponential backoff.
 */
export const triggerReplication = async (ctx: ReplicationDecision): Promise<void> => {
  if (!config.cluster.enabled || ctx.replicaNodeIds.length === 0) return;

  scheduleReplication(ctx.storageKey, ctx.replicaNodeIds);

  const nodes = getAllNodes();
  const targetUrls = nodes
    .filter((n) => ctx.replicaNodeIds.includes(n.id) && n.baseUrl)
    .map(n => n.baseUrl);

  try {
    logger.info("Triggering C++ Multithreaded Replication Engine", {
      storageKey: ctx.storageKey,
      targets: targetUrls.length
    });

    // Call the C++ Engine (handles thread pool, work queue, and retries internally)
    nativeReplicate(ctx.storageKey, targetUrls);

  } catch (err) {
    logger.warn("Native replication failed, falling back to JS implementation", { error: (err as any).message });

    // Fallback to legacy JS implementation if native fails
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
            logger.warn("JS Replication fallback failed", { nodeId: node.id, status: res.status });
          }
        } catch (err) {
          logger.warn("Error in JS replication fallback", { nodeId: node.id });
        }
      })
    );
  }
};


