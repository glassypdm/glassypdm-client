/* prettier-ignore-start */

/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file is auto-generated by TanStack Router

import { createFileRoute } from '@tanstack/react-router'

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as ServersetupImport } from './routes/serversetup'
import { Route as AppImport } from './routes/_app'
import { Route as IndexImport } from './routes/index'
import { Route as AppSignupImport } from './routes/_app/signup'
import { Route as AppSigninImport } from './routes/_app/signin'

// Create Virtual Routes

const AboutLazyImport = createFileRoute('/about')()

// Create/Update Routes

const AboutLazyRoute = AboutLazyImport.update({
  path: '/about',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/about.lazy').then((d) => d.Route))

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

const AppSignupRoute = AppSignupImport.update({
  path: '/signup',
  getParentRoute: () => AppRoute,
} as any)

const AppSigninRoute = AppSigninImport.update({
  path: '/signin',
  getParentRoute: () => AppRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/_app': {
      preLoaderRoute: typeof AppImport
      parentRoute: typeof rootRoute
    }
    '/serversetup': {
      preLoaderRoute: typeof ServersetupImport
      parentRoute: typeof rootRoute
    }
    '/about': {
      preLoaderRoute: typeof AboutLazyImport
      parentRoute: typeof rootRoute
    }
    '/_app/signin': {
      preLoaderRoute: typeof AppSigninImport
      parentRoute: typeof AppImport
    }
    '/_app/signup': {
      preLoaderRoute: typeof AppSignupImport
      parentRoute: typeof AppImport
    }
  }
}

// Create and export the route tree

export const routeTree = rootRoute.addChildren([
  IndexRoute,
  AppRoute.addChildren([AppSigninRoute, AppSignupRoute]),
  ServersetupRoute,
  AboutLazyRoute,
])

/* prettier-ignore-end */
