import fetch from "node-fetch";
import { getAllNodes, markNodeHealth, getLocalNodeId } from "./node.manager";
import { logger } from "../../config/logger";
import { config } from "../../config/env";

// Periodically ping peer nodes to see if they are alive.
// For this project we keep it simple: hit /api/health on each peer.

export const checkPeerHealthOnce = async (): Promise<void> => {
  if (!config.cluster.enabled) return;

  const nodes = getAllNodes().filter((n) => n.id !== getLocalNodeId() && n.baseUrl);

  await Promise.all(
    nodes.map(async (node) => {
      try {
        const res = await fetch(`${node.baseUrl}/api/health`, { timeout: 2000 as any });
        const ok = res.ok;
        markNodeHealth(node.id, ok);
        if (!ok) {
          logger.warn("Peer health check failed", { nodeId: node.id, status: res.status });
        }
      } catch (err) {
        markNodeHealth(node.id, false);
        logger.warn("Peer unreachable during health check", { nodeId: node.id });
      }
    })
  );
};

