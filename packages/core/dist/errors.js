const readRouteContext = (res) => {
    const route = res.locals.sculptorRoute;
    if (!route) {
        return undefined;
    }
    return {
        controller: route.controller,
        method: route.method,
        path: route.path,
        propertyKey: route.propertyKey
    };
};
export const createFrameworkErrorMiddleware = (onError) => (error, req, res, next) => {
    if (!onError) {
        next(error);
        return;
    }
    const context = {
        request: req,
        response: res,
        route: readRouteContext(res),
        timestamp: new Date(),
        controller: res.locals.sculptorRoute
            ? {
                name: res.locals.sculptorRoute.controller,
                propertyKey: res.locals.sculptorRoute.propertyKey
            }
            : undefined,
        context: req.ctx
    };
    void Promise.resolve(onError(error, context))
        .then(() => {
        if (res.headersSent) {
            return;
        }
        const message = error instanceof Error ? error.message : "Unhandled application error";
        res.status(res.statusCode >= 400 ? res.statusCode : 500).json({
            error: message
        });
    })
        .catch((hookError) => {
        if (!res.headersSent) {
            next(hookError);
            return;
        }
        next(hookError);
    });
};
//# sourceMappingURL=errors.js.map