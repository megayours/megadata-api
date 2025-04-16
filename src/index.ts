import createApp from './lib/create-app';
import configureOpenAPI from './lib/configure-open-api';
import megadataRoutes from './routes/megadata/megadata.index';
import megahubRoutes from './routes/megahub/megahub.index';
import moduleRoutes from './routes/module/module.index';
import configRoutes from './routes/config/config.index';
const app = createApp();

configureOpenAPI(app);

const routes = [
  megadataRoutes,
  megahubRoutes,
  moduleRoutes,
  configRoutes,
] as const;

routes.forEach((route) => {
  app.route("/", route);
});

export type AppType = typeof routes[number];

export default app;