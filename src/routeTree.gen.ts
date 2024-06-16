/* prettier-ignore-start */

/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file is auto-generated by TanStack Router

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as ServersetupImport } from './routes/serversetup'
import { Route as AppImport } from './routes/_app'
import { Route as IndexImport } from './routes/index'
import { Route as AppUploadImport } from './routes/_app/upload'
import { Route as AppSignupImport } from './routes/_app/signup'
import { Route as AppSigninImport } from './routes/_app/signin'
import { Route as AppDownloadImport } from './routes/_app/download'
import { Route as AppWorkbenchImport } from './routes/_app/_workbench'
import { Route as AppWorkbenchTeamsImport } from './routes/_app/_workbench/teams'
import { Route as AppWorkbenchSettingsImport } from './routes/_app/_workbench/settings'
import { Route as AppWorkbenchProjectsIndexImport } from './routes/_app/_workbench/projects.index'
import { Route as AppWorkbenchTeamsTeamidImport } from './routes/_app/_workbench/teams.$teamid'
import { Route as AppWorkbenchProjectsPidImport } from './routes/_app/_workbench/projects.$pid'
import { Route as AppWorkbenchProjectsPidSyncImport } from './routes/_app/_workbench/projects.$pid.sync'
import { Route as AppWorkbenchProjectsPidHistoryImport } from './routes/_app/_workbench/projects.$pid.history'
import { Route as AppWorkbenchProjectsPidFilesImport } from './routes/_app/_workbench/projects.$pid.files'

// Create/Update Routes

const ServersetupRoute = ServersetupImport.update({
  path: '/serversetup',
  getParentRoute: () => rootRoute,
} as any)

const AppRoute = AppImport.update({
  id: '/_app',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const AppUploadRoute = AppUploadImport.update({
  path: '/upload',
  getParentRoute: () => AppRoute,
} as any)

const AppSignupRoute = AppSignupImport.update({
  path: '/signup',
  getParentRoute: () => AppRoute,
} as any)

const AppSigninRoute = AppSigninImport.update({
  path: '/signin',
  getParentRoute: () => AppRoute,
} as any)

const AppDownloadRoute = AppDownloadImport.update({
  path: '/download',
  getParentRoute: () => AppRoute,
} as any)

const AppWorkbenchRoute = AppWorkbenchImport.update({
  id: '/_workbench',
  getParentRoute: () => AppRoute,
} as any)

const AppWorkbenchTeamsRoute = AppWorkbenchTeamsImport.update({
  path: '/teams',
  getParentRoute: () => AppWorkbenchRoute,
} as any)

const AppWorkbenchSettingsRoute = AppWorkbenchSettingsImport.update({
  path: '/settings',
  getParentRoute: () => AppWorkbenchRoute,
} as any)

const AppWorkbenchProjectsIndexRoute = AppWorkbenchProjectsIndexImport.update({
  path: '/projects/',
  getParentRoute: () => AppWorkbenchRoute,
} as any)

const AppWorkbenchTeamsTeamidRoute = AppWorkbenchTeamsTeamidImport.update({
  path: '/$teamid',
  getParentRoute: () => AppWorkbenchTeamsRoute,
} as any)

const AppWorkbenchProjectsPidRoute = AppWorkbenchProjectsPidImport.update({
  path: '/projects/$pid',
  getParentRoute: () => AppWorkbenchRoute,
} as any)

const AppWorkbenchProjectsPidSyncRoute =
  AppWorkbenchProjectsPidSyncImport.update({
    path: '/sync',
    getParentRoute: () => AppWorkbenchProjectsPidRoute,
  } as any)

const AppWorkbenchProjectsPidHistoryRoute =
  AppWorkbenchProjectsPidHistoryImport.update({
    path: '/history',
    getParentRoute: () => AppWorkbenchProjectsPidRoute,
  } as any)

const AppWorkbenchProjectsPidFilesRoute =
  AppWorkbenchProjectsPidFilesImport.update({
    path: '/files',
    getParentRoute: () => AppWorkbenchProjectsPidRoute,
  } as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/_app': {
      id: '/_app'
      path: ''
      fullPath: ''
      preLoaderRoute: typeof AppImport
      parentRoute: typeof rootRoute
    }
    '/serversetup': {
      id: '/serversetup'
      path: '/serversetup'
      fullPath: '/serversetup'
      preLoaderRoute: typeof ServersetupImport
      parentRoute: typeof rootRoute
    }
    '/_app/_workbench': {
      id: '/_app/_workbench'
      path: ''
      fullPath: ''
      preLoaderRoute: typeof AppWorkbenchImport
      parentRoute: typeof AppImport
    }
    '/_app/download': {
      id: '/_app/download'
      path: '/download'
      fullPath: '/download'
      preLoaderRoute: typeof AppDownloadImport
      parentRoute: typeof AppImport
    }
    '/_app/signin': {
      id: '/_app/signin'
      path: '/signin'
      fullPath: '/signin'
      preLoaderRoute: typeof AppSigninImport
      parentRoute: typeof AppImport
    }
    '/_app/signup': {
      id: '/_app/signup'
      path: '/signup'
      fullPath: '/signup'
      preLoaderRoute: typeof AppSignupImport
      parentRoute: typeof AppImport
    }
    '/_app/upload': {
      id: '/_app/upload'
      path: '/upload'
      fullPath: '/upload'
      preLoaderRoute: typeof AppUploadImport
      parentRoute: typeof AppImport
    }
    '/_app/_workbench/settings': {
      id: '/_app/_workbench/settings'
      path: '/settings'
      fullPath: '/settings'
      preLoaderRoute: typeof AppWorkbenchSettingsImport
      parentRoute: typeof AppWorkbenchImport
    }
    '/_app/_workbench/teams': {
      id: '/_app/_workbench/teams'
      path: '/teams'
      fullPath: '/teams'
      preLoaderRoute: typeof AppWorkbenchTeamsImport
      parentRoute: typeof AppWorkbenchImport
    }
    '/_app/_workbench/projects/$pid': {
      id: '/_app/_workbench/projects/$pid'
      path: '/projects/$pid'
      fullPath: '/projects/$pid'
      preLoaderRoute: typeof AppWorkbenchProjectsPidImport
      parentRoute: typeof AppWorkbenchImport
    }
    '/_app/_workbench/teams/$teamid': {
      id: '/_app/_workbench/teams/$teamid'
      path: '/$teamid'
      fullPath: '/teams/$teamid'
      preLoaderRoute: typeof AppWorkbenchTeamsTeamidImport
      parentRoute: typeof AppWorkbenchTeamsImport
    }
    '/_app/_workbench/projects/': {
      id: '/_app/_workbench/projects/'
      path: '/projects'
      fullPath: '/projects'
      preLoaderRoute: typeof AppWorkbenchProjectsIndexImport
      parentRoute: typeof AppWorkbenchImport
    }
    '/_app/_workbench/projects/$pid/files': {
      id: '/_app/_workbench/projects/$pid/files'
      path: '/files'
      fullPath: '/projects/$pid/files'
      preLoaderRoute: typeof AppWorkbenchProjectsPidFilesImport
      parentRoute: typeof AppWorkbenchProjectsPidImport
    }
    '/_app/_workbench/projects/$pid/history': {
      id: '/_app/_workbench/projects/$pid/history'
      path: '/history'
      fullPath: '/projects/$pid/history'
      preLoaderRoute: typeof AppWorkbenchProjectsPidHistoryImport
      parentRoute: typeof AppWorkbenchProjectsPidImport
    }
    '/_app/_workbench/projects/$pid/sync': {
      id: '/_app/_workbench/projects/$pid/sync'
      path: '/sync'
      fullPath: '/projects/$pid/sync'
      preLoaderRoute: typeof AppWorkbenchProjectsPidSyncImport
      parentRoute: typeof AppWorkbenchProjectsPidImport
    }
  }
}

// Create and export the route tree

export const routeTree = rootRoute.addChildren({
  IndexRoute,
  AppRoute: AppRoute.addChildren({
    AppWorkbenchRoute: AppWorkbenchRoute.addChildren({
      AppWorkbenchSettingsRoute,
      AppWorkbenchTeamsRoute: AppWorkbenchTeamsRoute.addChildren({
        AppWorkbenchTeamsTeamidRoute,
      }),
      AppWorkbenchProjectsPidRoute: AppWorkbenchProjectsPidRoute.addChildren({
        AppWorkbenchProjectsPidFilesRoute,
        AppWorkbenchProjectsPidHistoryRoute,
        AppWorkbenchProjectsPidSyncRoute,
      }),
      AppWorkbenchProjectsIndexRoute,
    }),
    AppDownloadRoute,
    AppSigninRoute,
    AppSignupRoute,
    AppUploadRoute,
  }),
  ServersetupRoute,
})

/* prettier-ignore-end */

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/_app",
        "/serversetup"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/_app": {
      "filePath": "_app.tsx",
      "children": [
        "/_app/_workbench",
        "/_app/download",
        "/_app/signin",
        "/_app/signup",
        "/_app/upload"
      ]
    },
    "/serversetup": {
      "filePath": "serversetup.tsx"
    },
    "/_app/_workbench": {
      "filePath": "_app/_workbench.tsx",
      "parent": "/_app",
      "children": [
        "/_app/_workbench/settings",
        "/_app/_workbench/teams",
        "/_app/_workbench/projects/$pid",
        "/_app/_workbench/projects/"
      ]
    },
    "/_app/download": {
      "filePath": "_app/download.tsx",
      "parent": "/_app"
    },
    "/_app/signin": {
      "filePath": "_app/signin.tsx",
      "parent": "/_app"
    },
    "/_app/signup": {
      "filePath": "_app/signup.tsx",
      "parent": "/_app"
    },
    "/_app/upload": {
      "filePath": "_app/upload.tsx",
      "parent": "/_app"
    },
    "/_app/_workbench/settings": {
      "filePath": "_app/_workbench/settings.tsx",
      "parent": "/_app/_workbench"
    },
    "/_app/_workbench/teams": {
      "filePath": "_app/_workbench/teams.tsx",
      "parent": "/_app/_workbench",
      "children": [
        "/_app/_workbench/teams/$teamid"
      ]
    },
    "/_app/_workbench/projects/$pid": {
      "filePath": "_app/_workbench/projects.$pid.tsx",
      "parent": "/_app/_workbench",
      "children": [
        "/_app/_workbench/projects/$pid/files",
        "/_app/_workbench/projects/$pid/history",
        "/_app/_workbench/projects/$pid/sync"
      ]
    },
    "/_app/_workbench/teams/$teamid": {
      "filePath": "_app/_workbench/teams.$teamid.tsx",
      "parent": "/_app/_workbench/teams"
    },
    "/_app/_workbench/projects/": {
      "filePath": "_app/_workbench/projects.index.tsx",
      "parent": "/_app/_workbench"
    },
    "/_app/_workbench/projects/$pid/files": {
      "filePath": "_app/_workbench/projects.$pid.files.tsx",
      "parent": "/_app/_workbench/projects/$pid"
    },
    "/_app/_workbench/projects/$pid/history": {
      "filePath": "_app/_workbench/projects.$pid.history.tsx",
      "parent": "/_app/_workbench/projects/$pid"
    },
    "/_app/_workbench/projects/$pid/sync": {
      "filePath": "_app/_workbench/projects.$pid.sync.tsx",
      "parent": "/_app/_workbench/projects/$pid"
    }
  }
}
ROUTE_MANIFEST_END */
