# v278 : lance la vraie application et conserve le diagnostic même en échec.
# Ce script ne rend jamais un test MIDI muet/non terminé équivalent à un succès.
[CmdletBinding()]
param(
    [string]$Executable = "bureau/src-tauri/target/release/drm16.exe",
    [ValidateRange(30, 300)]
    [int]$DelaiSecondes = 120
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$racine = Split-Path -Parent $PSScriptRoot
$rapport = Join-Path $racine "autotest.txt"
$journal = Join-Path $racine "autotest-lancement.txt"
$ancienRapport = [Environment]::GetEnvironmentVariable("DRM16_AUTOTEST")
$ancienDossier = [Environment]::GetEnvironmentVariable("DRM16_DOSSIER")
$lignes = [System.Collections.Generic.List[string]]::new()
$p = $null

function Noter([string]$Message) {
    $texte = "{0:o} {1}" -f (Get-Date), $Message
    $lignes.Add($texte)
    Write-Host $texte
}

Push-Location $racine
try {
    # Un ancien rapport ne doit jamais valider le nouvel exécutable.
    foreach ($f in @($rapport, $journal)) {
        if (Test-Path -LiteralPath $f) { Remove-Item -LiteralPath $f -Force }
    }
    if (-not (Test-Path -LiteralPath $Executable -PathType Leaf)) {
        throw "Exécutable introuvable : $Executable"
    }
    $cheminExe = (Resolve-Path -LiteralPath $Executable).Path
    Noter "Exécutable : $cheminExe"
    Noter "Durée maximale : $DelaiSecondes secondes"
    $env:DRM16_AUTOTEST = $rapport
    $env:DRM16_DOSSIER = Join-Path $racine "autotest-dossier"
    $p = Start-Process -FilePath $cheminExe -WorkingDirectory $racine -PassThru
    $null = $p.Handle
    Noter "Processus lancé : $($p.Id)"
    if (-not $p.WaitForExit($DelaiSecondes * 1000)) {
        $p.Kill()
        $null = $p.WaitForExit(5000)
        throw "L'application n'a pas terminé son essai en $DelaiSecondes secondes."
    }
    $p.Refresh()
    Noter "Code de sortie : $($p.ExitCode)"
    if (-not (Test-Path -LiteralPath $rapport -PathType Leaf)) {
        throw "Aucun rapport écrit par l'application ; essai non validé."
    }
    $texte = [IO.File]::ReadAllText($rapport, [Text.Encoding]::UTF8)
    if ([string]::IsNullOrWhiteSpace($texte)) { throw "Rapport vide ; essai non validé." }
    if ($p.ExitCode -ne 0) { throw "Essai en échec (code $($p.ExitCode))." }
    if ($texte -match '(?m)^FAUX\s') { throw "Le rapport contient un contrôle en échec." }
    if ($texte -match 'NON CONCLUANT') {
        Write-Host "::warning::L'essai contient un contrôle MIDI non concluant (absence ou refus explicite du périphérique). Voir le rapport."
    }
    Noter "Essai terminé sans contrôle en échec."
}
catch {
    Noter ("ÉCHEC : " + $_.Exception.Message)
    throw
}
finally {
    # Le rapport et le journal du lanceur sont joints par le workflow,
    # indépendamment du résultat de cette étape.
    try {
        if (Test-Path -LiteralPath $rapport -PathType Leaf) {
            $texte = [IO.File]::ReadAllText($rapport, [Text.Encoding]::UTF8)
            Write-Host $texte
            $resume = [Environment]::GetEnvironmentVariable("GITHUB_STEP_SUMMARY")
            if ($resume) {
                $contenu = "### Essai automatique Windows`n" + '```text' + "`n" + $texte + "`n" + '```'
                Add-Content -LiteralPath $resume -Encoding utf8 -Value $contenu
            }
        }
    }
    finally {
        [IO.File]::WriteAllLines($journal, $lignes.ToArray(), [Text.Encoding]::UTF8)
        if ($null -ne $p) {
            try { if (-not $p.HasExited) { $p.Kill() } }
            finally { $p.Dispose() }
        }
        [Environment]::SetEnvironmentVariable("DRM16_AUTOTEST", $ancienRapport)
        [Environment]::SetEnvironmentVariable("DRM16_DOSSIER", $ancienDossier)
        Pop-Location
    }
}
