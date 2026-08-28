export function formatAppVersion(version: string = __APP_VERSION__): string {
  return `v${version}`
}

export function getAppVersion(): string {
  return __APP_VERSION__
}

export function getBuildHash(): string {
  return __BUILD_HASH__
}

export function getRepoUrl(): string {
  return __REPO_URL__
}
