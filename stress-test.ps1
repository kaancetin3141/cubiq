# Cubiq - liderlik tablosu yuk testi (uzun soluklu arka plan gorevi)
# Sunucuya kademeli olarak sahte skor gonderir; API dayanikliligini dogrular.
# Not: PowerShell 5.1 uyumlulugu icin @() dizisi ve ASCII isimler kullanilir.
$ErrorActionPreference = "Continue"
$names = @("Erdem", "BloKral", "TetrisMaster", "Patlatici", "KubikBeyin", "MaviBalik", "HizliEller", "ComboUstasi", "GeceKusu", "NoktaAtisi")
$modes = @("classic", "time")

for ($i = 1; $i -le 40; $i++) {
  $body = @{
    name   = $names[(Get-Random -Maximum $names.Count)]
    score  = Get-Random -Minimum 120 -Maximum 6200
    mode   = $modes[(Get-Random -Maximum 2)]
    lines  = Get-Random -Minimum 1 -Maximum 40
    streak = Get-Random -Minimum 1 -Maximum 7
  } | ConvertTo-Json -Compress
  try {
    $r = Invoke-RestMethod -Uri "http://localhost:8137/api/score" -Method Post -Body $body -ContentType "application/json"
    Write-Output ("{0}/40 -> rank {1} (toplam {2})" -f $i, $r.rank, $r.total)
  } catch {
    Write-Output ("{0}/40 -> HATA: {1}" -f $i, $_.Exception.Message)
  }
  Start-Sleep -Milliseconds 180
}
Write-Output "Yuk testi tamamlandi."
