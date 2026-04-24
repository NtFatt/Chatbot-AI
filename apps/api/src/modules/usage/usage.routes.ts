import { Router } from 'express';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../utils/async-handler';
import { success } from '../../utils/api-response';
import { UsageService } from './usage.service';

export const createUsageRoutes = (usageService: UsageService) => {
  const router = Router();

  router.use(authMiddleware);

  router.get(
    '/chat/usage',
    asyncHandler(async (req, res) => {
      const sessionId =
        typeof req.query.sessionId === 'string' && req.query.sessionId.trim().length > 0
          ? req.query.sessionId
          : undefined;
      const usage = await usageService.getChatUsage({
        userId: req.auth!.userId,
        sessionId,
      });
      return success(req, res, usage);
    }),
  );

  router.get(
    '/providers/metrics',
    asyncHandler(async (req, res) => {
      const metrics = await usageService.getProviderMetrics();
      return success(req, res, {
        items: metrics,
        total: metrics.length,
      });
    }),
  );

  router.get(
    '/providers/incidents',
    asyncHandler(async (req, res) => {
      const limit =
        typeof req.query.limit === 'string' && Number.isFinite(Number(req.query.limit))
          ? Number(req.query.limit)
          : 50;
      const incidents = await usageService.listProviderIncidents(limit);
      return success(req, res, {
        items: incidents.map((incident: (typeof incidents)[number]) => ({
          ...incident,
          createdAt: incident.createdAt.toISOString(),
        })),
        total: incidents.length,
      });
    }),
  );

  return router;
};
