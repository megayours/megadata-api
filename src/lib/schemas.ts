import { z } from "zod";

export const error = (description: string) => {
  return {
    description,
    content: {
      'application/json': {
        schema: z.object({
          error: z.string()
        })
      }
    }
  }
}


export const SuccessResponseSchema = z.object({
  success: z.boolean()
});