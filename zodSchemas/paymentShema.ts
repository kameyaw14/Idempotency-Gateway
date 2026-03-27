// zodSchemas/paymentSchema.ts
import { z } from "zod";

export const processPaymentSchema = z.object({

  amount: z
    .number()
    .positive("Amount must be greater than zero")
    .refine(
      (val) => Number(val.toFixed(2)) === val,
      "Amount must have at most 2 decimal places",
    ),

 
  currency: z.enum(["GHS"], {
    errorMap: () => ({ message: "Currency must be GHS" }),
  }),
});

export type ProcessPaymentRequest = z.infer<typeof processPaymentSchema>;
