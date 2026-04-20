import type { ProviderKey } from '@chatbot-ai/shared';

import { asyncHandler } from '../../utils/async-handler';
import { success } from '../../utils/api-response';
import type { ProvidersService } from './providers.service';
import type { AIProvider } from '../../integrations/ai/ai.types';

export const createProvidersController = (
  providersService: ProvidersService,
  providersMap: Record<ProviderKey, AIProvider | null>,
) => ({
  list: asyncHandler(async (req, res) => {
    const providers = await providersService.listProviders();
    return success(req, res, providers);
  }),
  test: asyncHandler(async (req, res) => {
    const providers = await providersService.diagnoseProviders(providersMap);
    return success(req, res, providers);
  }),
});
