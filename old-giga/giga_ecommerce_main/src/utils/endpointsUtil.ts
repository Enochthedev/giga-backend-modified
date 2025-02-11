import { Router, Request, Response } from 'express';

interface Endpoint {
  method: string;
  path: string;
}

function getAllEndpoints(router: Router, parentPath = ''): Endpoint[] {
  const endpoints: Endpoint[] = [];

  router.stack.forEach((layer) => {
    if ((layer as any).route) {
      // If the layer has a route property, it is an endpoint
      const path = `${parentPath}${(layer as any).route.path}`;
      const method = (layer as any).route.stack[0].method;
      endpoints.push({ method, path });
    } else if (layer.name === 'router' && (layer as any).handle.stack) {
      // If the layer has a handle property with stack, it is a router
      const routerEndpoints = getAllEndpoints((layer as any).handle, `${parentPath}${layer.path}`);
      endpoints.push(...routerEndpoints);
    }
  });

  return endpoints;
}

function getAllEndpointsHandler(router: Router) {
  return (req: Request, res: Response) => {
    const allEndpoints = getAllEndpoints(router);
    res.json(allEndpoints);
  };
}

export { getAllEndpoints, getAllEndpointsHandler };
