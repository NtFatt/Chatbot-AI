import { asyncHandler } from '../../utils/async-handler';
import { success } from '../../utils/api-response';
import type { ModelRegistryService } from './model-registry.service';

export const createModelRegistryController = (service: ModelRegistryService) => ({
  listVersions: asyncHandler(async (req, res) => {
    const versions = await service.listVersions();
    return success(req, res, { items: versions, total: versions.length });
  }),

  listActiveModels: asyncHandler(async (req, res) => {
    const models = await service.getActiveModels();
    return success(req, res, { items: models, total: models.length });
  }),

  activateVersion: asyncHandler(async (req, res) => {
    const params = (req.validated?.params as typeof req.params) ?? req.params;
    const version = await service.activateVersion(String(params.id));
    return success(req, res, version);
  }),
});
