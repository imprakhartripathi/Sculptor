import { randomUUID } from "node:crypto";
export const createRequestContext = (req) => ({
    requestId: (typeof req.headers["x-request-id"] === "string" && req.headers["x-request-id"].trim()) ||
        randomUUID(),
    meta: {}
});
export const ensureRequestContext = (req) => {
    if (req.ctx) {
        return req.ctx;
    }
    req.ctx = createRequestContext(req);
    return req.ctx;
};
export const requestContextMiddleware = () => (req, _res, next) => {
    ensureRequestContext(req);
    next();
};
//# sourceMappingURL=context.js.map