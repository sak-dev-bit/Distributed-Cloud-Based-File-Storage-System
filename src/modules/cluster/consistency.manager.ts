import { logger } from "../../config/logger";
import { chooseNodesForKey } from "./balancer.service";
import { getLocalNodeId } from "./node.manager";
import { config } from "../../config/env";

// This module describes how we think about consistency in the cluster.
// Model: eventual consistency.
// - Writes go to the primary node for a given key.
// - Primary immediately acknowledges once its own write succeeds.
// - Replication to other nodes happens asynchronously (e.g. via background jobs).

export interface WriteDecision {
  handledLocally: boolean;
  primaryNodeId: string;
  replicaNodeIds: string[];
}

export const decideWritePlacement = (storageKey: string): WriteDecision => {
  if (!config.cluster.enabled) {
    return {
      handledLocally: true,
      primaryNodeId: getLocalNodeId(),
      replicaNodeIds: []
    };
  }

  const placement = chooseNodesForKey(storageKey);
  const localId = getLocalNodeId();

  const handledLocally = placement.primary.id === localId;

  return {
    handledLocally,
    primaryNodeId: placement.primary.id,
    replicaNodeIds: placement.replicas.map((r) => r.id)
  };
};

// For this project we don't implement a full replication queue. Instead we expose
// a hook describing where replicas should go so that upload logic can enqueue
// "copy" work if needed (e.g. by hitting a peer's replication endpoint).
export const scheduleReplication = (storageKey: string, replicas: string[]): void => {
  if (!config.cluster.enabled || replicas.length === 0) return;

  // In a real system this would push messages onto a durable queue.
  // Here we just log the intent so the behavior is visible and testable.
  logger.info("Replication scheduled", {
    storageKey,
    replicas
  });
};

