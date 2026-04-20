import { asyncHandler } from '../../utils/async-handler';
import { success } from '../../utils/api-response';
import type { MaterialsService } from './materials.service';

export const createMaterialsController = (materialsService: MaterialsService) => ({
  search: asyncHandler(async (req, res) => {
    const query = (req.validated?.query as typeof req.query) ?? req.query;
    const materials = await materialsService.search(query);
    return success(req, res, {
      items: materials,
      total: materials.length,
    });
  }),
  recommend: asyncHandler(async (req, res) => {
    const query = (req.validated?.query as typeof req.query) ?? req.query;
    const materials = await materialsService.recommend({
      ...query,
      userId: req.auth!.userId,
      sessionId: typeof query.sessionId === 'string' ? query.sessionId : undefined,
    });
    return success(req, res, {
      items: materials,
      total: materials.length,
    });
  }),
});
