import { config } from "../../config/env";
import { logger } from "../../config/logger";
import { redisClient } from "../../config/redis";

// Basic view of the cluster from this node's point of view.
// We don't try to solve distributed systems in general here; the goal is
// a pragmatic, understandable setup for a small number of nodes.

export interface ClusterNode {
  id: string;
  baseUrl: string;
  healthy: boolean;
  lastSeenAt?: number;
}

const nodes: Map<string, ClusterNode> = new Map();

// Register this node and its peers based on config.
export const initNodeRegistry = (): void => {
  // Self
  nodes.set(config.cluster.nodeId, {
    id: config.cluster.nodeId,
    baseUrl: "", // local node; controllers will call services directly
    healthy: true,
    lastSeenAt: Date.now()
  });

  // Peers
  for (const peer of config.cluster.peers) {
    const [id, url] = peer.split("@");
    if (!id || !url) {
      logger.warn("Invalid CLUSTER_PEERS entry, expected id@url", { peer });
      continue;
    }
    nodes.set(id, {
      id,
      baseUrl: url,
      healthy: true,
      lastSeenAt: 0
    });
  }
};

export const getAllNodes = (): ClusterNode[] => Array.from(nodes.values());

export const getLocalNodeId = (): string => config.cluster.nodeId;

export const markNodeHealth = (id: string, healthy: boolean): void => {
  const existing = nodes.get(id);
  if (!existing) return;
  nodes.set(id, {
    ...existing,
    healthy,
    lastSeenAt: Date.now()
  });
};

// Simple Redis-backed leader election using SETNX-style semantics.
// One node holds a "cluster:leader" key with its id and a TTL.

const LEADER_KEY = "cluster:leader";
const LEADER_TTL_SEC = 15;

export const tryBecomeLeader = async (): Promise<boolean> => {
  if (!config.cluster.enabled) return false;

  const result = await redisClient.set(LEADER_KEY, config.cluster.nodeId, {
    NX: true,
    EX: LEADER_TTL_SEC
  });

  const becameLeader = result === "OK";
  if (becameLeader) {
    logger.info("This node became leader", { nodeId: config.cluster.nodeId });
  }
  return becameLeader;
};

export const refreshLeaderLease = async (): Promise<boolean> => {
  if (!config.cluster.enabled) return false;

  const current = await redisClient.get(LEADER_KEY);
  if (current !== config.cluster.nodeId) {
    return false;
  }
  // Simple: set new expiry by re-setting the value if we are still leader.
  await redisClient.set(LEADER_KEY, config.cluster.nodeId, { EX: LEADER_TTL_SEC });
  return true;
};

export const getCurrentLeader = async (): Promise<string | null> => {
  if (!config.cluster.enabled) return null;
  const leader = await redisClient.get(LEADER_KEY);
  return leader;
};

