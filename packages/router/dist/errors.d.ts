export interface RouteCollisionRegistration {
    label: string;
}
export interface RouteCollisionDetails {
    method: string;
    path: string;
    registrations: RouteCollisionRegistration[];
}
export declare class RouteCollisionError extends Error {
    readonly details: RouteCollisionDetails;
    constructor(details: RouteCollisionDetails);
}
