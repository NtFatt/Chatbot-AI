import type { ExternalProviderKey, ProviderKey } from '@chatbot-ai/shared';

import { asyncHandler } from '../../utils/async-handler';
import { success } from '../../utils/api-response';
import type { ProvidersService } from './providers.service';
import type { AIProvider } from '../../integrations/ai/ai.types';

export const createProvidersController = (
  providersService: ProvidersService,
  providersMap: Partial<Record<ProviderKey, AIProvider | null>>,
) => ({
  list: asyncHandler(async (req, res) => {
    const providers = await providersService.listProviders();
    return success(req, res, providers);
  }),
  test: asyncHandler(async (req, res) => {
    const provider =
      typeof req.query.provider === 'string' && ['GEMINI', 'OPENAI'].includes(req.query.provider)
        ? (req.query.provider as ExternalProviderKey)
        : undefined;
    const providers = await providersService.diagnoseProviders(providersMap, provider);
    return success(req, res, providers);
  }),
});
