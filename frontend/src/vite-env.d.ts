/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOTRUE_URL: string
  readonly VITE_PGREST_URL: string
  readonly VITE_SITE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
