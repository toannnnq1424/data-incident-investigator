[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location -LiteralPath $repositoryRoot

$manifest = Get-Content -Raw "package.json" | ConvertFrom-Json
$pnpmMatch = [regex]::Match([string]$manifest.packageManager, "^pnpm@(?<version>\d+\.\d+\.\d+)$")
$nodeMatch = [regex]::Match([string]$manifest.engines.node, "^>=(?<major>\d+)$")

if (-not $pnpmMatch.Success -or -not $nodeMatch.Success) {
  throw "package.json must declare packageManager as pnpm@x.y.z and engines.node as >=major."
}

$expectedPnpmVersion = $pnpmMatch.Groups["version"].Value
$minimumNodeMajor = [int]$nodeMatch.Groups["major"].Value
$nodeCandidates = New-Object System.Collections.Generic.List[string]

function Add-NodeCandidate {
  param([string]$Path)

  if ($Path -and (Test-Path -LiteralPath $Path -PathType Leaf) -and -not $nodeCandidates.Contains($Path)) {
    $nodeCandidates.Add($Path)
  }
}

Add-NodeCandidate $env:CODEX_NODE_PATH

$pathNode = Get-Command node -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pathNode) {
  Add-NodeCandidate $pathNode.Source
}

if ($env:USERPROFILE) {
  $runtimeRoot = Join-Path $env:USERPROFILE ".cache\codex-runtimes"
  if (Test-Path -LiteralPath $runtimeRoot -PathType Container) {
    Get-ChildItem -LiteralPath $runtimeRoot -Directory |
      Sort-Object LastWriteTimeUtc -Descending |
      ForEach-Object {
        Add-NodeCandidate (Join-Path $_.FullName "dependencies\node\bin\node.exe")
      }
  }
}

$nodePath = $null
foreach ($candidate in $nodeCandidates) {
  $candidateVersion = & $candidate --version 2>$null
  if ($LASTEXITCODE -eq 0 -and $candidateVersion -match "^v(?<major>\d+)") {
    if ([int]$Matches["major"] -ge $minimumNodeMajor) {
      $nodePath = $candidate
      break
    }
  }
}

if (-not $nodePath) {
  throw "Node >=$minimumNodeMajor was not found on PATH, CODEX_NODE_PATH, or the verified Codex runtime root under USERPROFILE\.cache\codex-runtimes."
}

$nodeBin = Split-Path -Parent $nodePath
$env:PATH = "$nodeBin;$env:PATH"

$pnpmCandidates = New-Object System.Collections.Generic.List[string]
function Add-PnpmCandidate {
  param([string]$Path)

  if ($Path -and (Test-Path -LiteralPath $Path -PathType Leaf) -and -not $pnpmCandidates.Contains($Path)) {
    $pnpmCandidates.Add($Path)
  }
}

Add-PnpmCandidate $env:CODEX_PNPM_PATH

$pathPnpm = Get-Command pnpm -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pathPnpm) {
  Add-PnpmCandidate $pathPnpm.Source
}

$nodeRoot = Split-Path -Parent $nodeBin
$dependenciesRoot = Split-Path -Parent $nodeRoot
Add-PnpmCandidate (Join-Path $dependenciesRoot "bin\fallback\pnpm.cmd")

$pnpmPath = $null
foreach ($candidate in $pnpmCandidates) {
  $candidateVersion = & $candidate --version 2>$null
  if ($LASTEXITCODE -eq 0 -and $candidateVersion.Trim() -eq $expectedPnpmVersion) {
    $pnpmPath = $candidate
    break
  }
}

if (-not $pnpmPath) {
  throw "pnpm $expectedPnpmVersion was not found on PATH, CODEX_PNPM_PATH, or beside the selected Codex runtime. Install that exact host version; bootstrap will not fetch package-manager metadata."
}

$env:PATH = "$(Split-Path -Parent $pnpmPath);$env:PATH"
$resolvedNodeVersion = & node --version
$resolvedPnpmVersion = & pnpm --version

if ($LASTEXITCODE -ne 0 -or $resolvedPnpmVersion.Trim() -ne $expectedPnpmVersion) {
  throw "The selected Node/pnpm runtime could not be inherited by this setup process."
}

Write-Host "Node: $resolvedNodeVersion ($nodePath)"
Write-Host "pnpm: $resolvedPnpmVersion ($pnpmPath)"

& pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) {
  throw "pnpm install --frozen-lockfile failed with exit code $LASTEXITCODE."
}

& pnpm exec prettier --version
if ($LASTEXITCODE -ne 0) {
  throw "pnpm exec could not resolve the installed root Prettier binary."
}

& pnpm exec prettier --check package.json
if ($LASTEXITCODE -ne 0) {
  throw "The bootstrap static command failed."
}

Write-Host "Managed-worktree bootstrap completed."
