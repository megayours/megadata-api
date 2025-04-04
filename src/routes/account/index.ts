import { OpenAPIHono } from '@hono/zod-openapi';
import { AccountService } from '../../services/account.service';
import {
  getAccountsRoute,
  getAccountRoute,
  createAccountRoute,
  deleteAccountRoute
} from './openapi';

const app = new OpenAPIHono();

app.openapi({ ...getAccountsRoute, method: 'get', path: '' }, async (c) => {
  const result = await AccountService.getAllAccounts();
  
  if (result.isErr()) {
    return c.json({ error: result.error.context }, 500);
  }
  
  return c.json(result.value, 200);
});

app.openapi({ ...getAccountRoute, method: 'get', path: '/{id}' }, async (c) => {    
  const id = c.req.param('id')!;
  const result = await AccountService.getAccountById(id);
  
  if (result.isErr()) {
    return c.json({ error: result.error.context }, 500);
  }
  
  const account = result.value;
  if (!account) {
    return c.json({ error: "Account not found" }, 404);
  }
  
  return c.json(account, 200);
});

app.openapi({ ...createAccountRoute, method: 'post', path: '' }, async (c) => {
  const body = await c.req.json();
  const result = await AccountService.createAccount(body);
  
  if (result.isErr()) {
    return c.json({ error: result.error.context }, 500);
  }
  
  return c.json(result.value, 201);
});

app.openapi({ ...deleteAccountRoute, method: 'delete', path: '/{id}' }, async (c) => {
  const id = c.req.param('id')!;
  const result = await AccountService.deleteAccount(id);
  
  if (result.isErr()) {
    return c.json({ error: result.error.context }, 500);
  }
  
  const account = result.value;
  if (!account) {
    return c.json({ error: "Account not found" }, 404);
  }
  
  return c.json({ success: true }, 200);
});

export { app as accountRoutes }; 