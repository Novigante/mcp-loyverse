import { z } from 'zod';

export const idSchema = z.string().uuid();

export const storeIdSchema = z.string().uuid().optional();

export const receiptNumberSchema = z.string().min(1);

export const limitSchema = z.number().int().min(1).max(250).default(50);
