<#
  Met la clé de l'agent Acheteurs dans le presse-papiers, pour la coller chez
  Hostinger dans la variable AGENT_ACHETEURS_SECRET (puis redéployer). Elle
  n'est jamais affichée, ni gardée dans l'historique du presse-papiers
  (Windows + V), ni envoyée au presse-papiers en nuage. -Effacer : vide le
  presse-papiers une fois la clé collée. Guide : docs/AGENT-ACHETEURS.md.
#>
param([switch]$Effacer)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms

if ($Effacer) {
  [System.Windows.Forms.Clipboard]::Clear()
  Write-Output "Presse-papiers vidé."
  exit 0
}

$fichierConfig = Join-Path $env:USERPROFILE ".technolot\agent-acheteurs\config.xml"
if (-not (Test-Path $fichierConfig)) { throw "Agent non installé : lancez d'abord installer.ps1." }
$config = Import-Clixml $fichierConfig
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($config.Cle)
try {
  $donnees = New-Object System.Windows.Forms.DataObject
  $donnees.SetData([System.Windows.Forms.DataFormats]::UnicodeText, [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr))
  # Formats reconnus par Windows : pas d'historique, pas de nuage (comme les gestionnaires de mots de passe).
  $zero = [byte[]](0, 0, 0, 0)
  $donnees.SetData("CanIncludeInClipboardHistory", (New-Object IO.MemoryStream(, $zero)))
  $donnees.SetData("CanUploadToCloudClipboard", (New-Object IO.MemoryStream(, $zero)))
  $donnees.SetData("ExcludeClipboardContentFromMonitorProcessing", (New-Object IO.MemoryStream(, $zero)))
  [System.Windows.Forms.Clipboard]::SetDataObject($donnees, $true)
}
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
Write-Output "Clé de l'agent copiée dans le presse-papiers (elle n'est pas affichée)."
Write-Output "Chez Hostinger : variable AGENT_ACHETEURS_SECRET, collez (Ctrl+V), enregistrez, puis redéployez."
Write-Output "Ensuite : copier-cle.ps1 -Effacer vide le presse-papiers."
