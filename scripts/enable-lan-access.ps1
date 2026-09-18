# Jalankan di PowerShell Windows sebagai Administrator.
# Meneruskan port 3000 dari Wi-Fi laptop ke server Next.js di WSL.

$ErrorActionPreference = "Stop"

$wslIp = (wsl -e hostname -I).Trim().Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries) |
  Where-Object { $_ -like "172.*" } |
  Select-Object -First 1

if (-not $wslIp) {
  throw "Tidak menemukan IP WSL. Pastikan WSL menyala dan npm run dev sudah jalan."
}

$lanIp = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.InterfaceAlias -like "Wi-Fi*" -and $_.IPAddress -notlike "172.*" }).IPAddress |
  Select-Object -First 1

netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIp

if (-not (Get-NetFirewallRule -DisplayName "SoalPintar LAN 3000" -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName "SoalPintar LAN 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private | Out-Null
}

Write-Host "WSL:     $wslIp"
Write-Host "Wi-Fi:   $lanIp"
Write-Host "Tablet:  http://$lanIp`:3000"
Write-Host "Selesai. Buka URL itu di tablet, di Wi-Fi yang sama."
