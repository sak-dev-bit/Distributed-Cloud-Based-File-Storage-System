import { Request, Response } from "express";
import { getMetricsSnapshot } from "./metrics.service";
import { config } from "../../config/env";
import { getAllNodes } from "../cluster/node.manager";

export const metricsHandler = (_req: Request, res: Response): void => {
  const snapshot = getMetricsSnapshot();
  res.status(200).json(snapshot);
};

export const healthSummaryHandler = (_req: Request, res: Response): void => {
  const nodes = getAllNodes();

  res.status(200).json({
    status: "ok",
    nodeId: config.cluster.nodeId,
    clusterEnabled: config.cluster.enabled,
    peers: nodes.map((n) => ({
      id: n.id,
      healthy: n.healthy,
      lastSeenAt: n.lastSeenAt ?? null
    })),
    metrics: getMetricsSnapshot()
  });
};

