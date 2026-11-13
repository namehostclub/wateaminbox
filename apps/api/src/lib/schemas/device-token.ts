import { z } from "zod";

export const registerDeviceTokenSchema = z.object({
  token: z.string().min(1).max(512),
  platform: z.enum(["ios", "android", "web"]),
  deviceName: z.string().max(100).optional(),
});

export const deleteDeviceTokenSchema = z.object({
  token: z.string().min(1).max(512),
});

