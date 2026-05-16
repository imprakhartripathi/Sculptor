import { randomUUID } from "node:crypto";
export const createRequestContext = (req) => ({
    requestId: (typeof req.headers["x-request-id"] === "string" && req.headers["x-request-id"].trim()) ||
        randomUUID(),
    meta: {}
});
export const requestContextMiddleware = () => (req, _res, next) => {
    req.ctx = createRequestContext(req);
    next();
};
//# sourceMappingURL=context.js.map