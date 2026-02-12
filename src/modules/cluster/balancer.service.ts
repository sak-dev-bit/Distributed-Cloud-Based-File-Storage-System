import crypto from "crypto";
import { ClusterNode, getAllNodes } from "./node.manager";
import { config } from "../../config/env";

// Very small consistent-hashing style balancer.
// Given a file id or storage key, it picks a primary node and a set of replicas.

const hashToInt = (value: string): number => {
  const hash = crypto.createHash("sha1").update(value).digest("hex");
  // Use first 8 hex chars -> 32-bit int
  return parseInt(hash.slice(0, 8), 16);
};

export interface Placement {
  primary: ClusterNode;
  replicas: ClusterNode[];
}

export const chooseNodesForKey = (key: string): Placement => {
  const all = getAllNodes().filter((n) => n.healthy);
  // In a small cluster it's better to serve something than nothing.
  const nodes = all.length > 0 ? all : getAllNodes();

  if (nodes.length === 0) {
    throw new Error("No cluster nodes configured");
  }

  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const h = hashToInt(key);
  const primaryIndex = h % sorted.length;

  const replicationFactor = Math.min(config.cluster.replicationFactor, sorted.length);
  const selected: ClusterNode[] = [];

  for (let i = 0; i < replicationFactor; i++) {
    const idx = (primaryIndex + i) % sorted.length;
    selected.push(sorted[idx]);
  }

  return {
    primary: selected[0],
    replicas: selected.slice(1)
  };
};

