import { Request, Response } from 'express';
import * as customersService from './customers.service';

export async function listCustomers(req: Request, res: Response): Promise<void> {
  const { search, page, limit } = req.query;
  const result = await customersService.listCustomers(
    req.user!.tenantId,
    search as string | undefined,
    page ? parseInt(page as string, 10) : 1,
    limit ? parseInt(limit as string, 10) : 20
  );
  res.json(result);
}

export async function getCustomer(req: Request, res: Response): Promise<void> {
  const customer = await customersService.getCustomer(req.params.id, req.user!.tenantId);
  res.json(customer);
}

export async function getCustomerOrders(req: Request, res: Response): Promise<void> {
  const orders = await customersService.getCustomerOrders(req.params.id, req.user!.tenantId);
  res.json(orders);
}
