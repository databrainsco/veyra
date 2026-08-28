export function formatAppVersion(version: string = __APP_VERSION__): string {
  return `v${version}`
}

export function getAppVersion(): string {
  return __APP_VERSION__
}

export function getBuildHash(): string {
  return __BUILD_HASH__
}

export function getBuildTime(): string {
  return __BUILD_TIME__
}

export function getRepoUrl(): string {
  return __REPO_URL__
}

export function getShortBuildHash(): string {
  return __BUILD_HASH__.slice(0, 7)
}

export function formatBuildDateTime(
  isoDate: string = __BUILD_TIME__,
  locale = 'es-MX',
): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return 'Fecha desconocida'

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatDeploymentVersion(): string {
  const hash = getShortBuildHash()
  if (hash === 'dev') {
    return formatAppVersion()
  }
  return `${formatAppVersion()} · ${hash}`
}

export function formatUpToDateMessage(): string {
  return `Ya tienes la última versión (${formatDeploymentVersion()} · ${formatBuildDateTime()}).`
}

export function getCommitUrl(): string {
  const hash = __BUILD_HASH__
  if (hash === 'dev') return getRepoUrl()
  return `${getRepoUrl()}/commit/${hash}`
}
