import { asyncHandler } from '../../utils/async-handler';
import { success } from '../../utils/api-response';
import type { AuthService } from './auth.service';

export const createAuthController = (authService: AuthService) => ({
  login: asyncHandler(async (req, res) => {
    const response = await authService.loginGuest(req.validated?.body as typeof req.body, req);
    return success(req, res, response, 201);
  }),
  refresh: asyncHandler(async (req, res) => {
    const body = (req.validated?.body as typeof req.body) ?? req.body;
    const response = await authService.refresh(body.refreshToken, req);
    return success(req, res, response);
  }),
  me: asyncHandler(async (req, res) => {
    const user = await authService.me(req.auth!.userId);
    return success(req, res, user);
  }),
  logout: asyncHandler(async (req, res) => {
    const body = (req.validated?.body as typeof req.body) ?? req.body;
    await authService.logout(body.refreshToken);
    return success(req, res, { loggedOut: true });
  }),
});
