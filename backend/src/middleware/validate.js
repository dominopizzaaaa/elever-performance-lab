/**
 * Zod validation middleware. Replaces `req.body` / `req.query` with the parsed
 * (and coerced) value so handlers only ever see trusted shapes.
 *
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body' | 'query'} source
 * @returns {import('express').RequestHandler}
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) return next(result.error);

    if (source === 'query') {
      // Express 5 makes req.query a getter; assign to a separate field instead.
      req.validatedQuery = result.data;
    } else {
      req.body = result.data;
    }
    next();
  };
}
