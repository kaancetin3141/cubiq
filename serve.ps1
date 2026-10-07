$ErrorActionPreference = "Stop"
# Cubiq Tam Yigin Sunucu v2 — statik dosyalar + REST API + dosya tabanli veritabani
# Uzun soluklu gorev: oturum boyunca calisir, istekler arasinda periyodik yedekleme yapar.
# Kullanim: powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1

$root = "C:\Users\Erdem\.zcode\workspace\default\block-blast"
$port = 8137
$script:dataDir = Join-Path $root "data"
New-Item -ItemType Directory -Force $script:dataDir | Out-Null
New-Item -ItemType Directory -Force (Join-Path $script:dataDir "backup") | Out-Null
$script:lbFile = Join-Path $script:dataDir "leaderboard.jsonl"
$startedAt = Get-Date
$script:lastBackup = Get-Date

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Output "Cubiq sunucu → http://localhost:$port/ (REST API etkin, veritabani: data\)"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".json" = "application/json"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".ico"  = "image/x-icon"
}

function Send-Json($res, [int]$code, [string]$text) {
  $res.StatusCode = $code
  $res.ContentType = "application/json; charset=utf-8"
  $bytes = [Text.Encoding]::UTF8.GetBytes($text)
  $res.ContentLength64 = $bytes.Length
  $res.OutputStream.Write($bytes, 0, $bytes.Length)
  $res.Close()
}

function Send-Raw($res, [int]$code, [string]$ctype, [string]$text) {
  $res.StatusCode = $code
  $res.ContentType = $ctype
  $bytes = [Text.Encoding]::UTF8.GetBytes($text)
  $res.ContentLength64 = $bytes.Length
  $res.OutputStream.Write($bytes, 0, $bytes.Length)
  $res.Close()
}

function Read-Body($req) {
  $reader = New-Object System.IO.StreamReader($req.InputStream)
  return $reader.ReadToEnd()
}

# uzun soluklu bakim: her istekte kontrol, 10 dk'da bir veritabani yedegi (son 5 kopya)
function Backup-IfDue {
  if (((Get-Date) - $script:lastBackup).TotalMinutes -lt 10) { return }
  $script:lastBackup = Get-Date
  if (-not (Test-Path $script:lbFile)) { return }
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  Copy-Item $script:lbFile (Join-Path $script:dataDir ("backup\leaderboard_" + $stamp + ".jsonl"))
  $baks = @(Get-ChildItem (Join-Path $script:dataDir "backup") -Filter "leaderboard_*.jsonl" | Sort-Object Name -Descending)
  for ($i = 5; $i -lt $baks.Count; $i++) { Remove-Item $baks[$i].FullName }
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $req = $ctx.Request
    $res = $ctx.Response
    $path = $req.Url.AbsolutePath
    Backup-IfDue

    # ---------- SAĞLIK ----------
    if ($path -eq "/api/health") {
      $scores = 0
      if (Test-Path $script:lbFile) { $scores = @(Get-Content $script:lbFile).Count }
      Send-Json $res 200 (@{ ok = $true; uptimeSec = [int]((Get-Date) - $startedAt).TotalSeconds; scores = $scores; schema = 2 } | ConvertTo-Json -Compress)
    }
    # ---------- SKOR GÖNDER (POST) ----------
    elseif ($path -eq "/api/score" -and $req.HttpMethod -eq "POST") {
      $body = Read-Body $req
      $j = $body | ConvertFrom-Json
      $name = [string]$j.name
      $name = ($name -replace "[<>&]","").Trim()
      if ($name.Length -gt 12) { $name = $name.Substring(0, 12) }
      if ($name -eq "") { $name = "Konuk" }
      $entry = [ordered]@{
        name   = $name
        score  = [Math]::Max(0, [int]$j.score)
        mode   = [string]$j.mode
        lines  = [Math]::Max(0, [int]$j.lines)
        streak = [Math]::Max(0, [int]$j.streak)
        at     = (Get-Date).ToString("o")
      }
      Add-Content -Path $script:lbFile -Value ($entry | ConvertTo-Json -Compress)
      # veritabanı kırpma: en iyi 100 kayıt
      $all = @(Get-Content $script:lbFile | ForEach-Object { $_ | ConvertFrom-Json })
      $top = @($all | Sort-Object score -Descending | Select-Object -First 100)
      Set-Content -Path $script:lbFile -Value ($top | ForEach-Object { $_ | ConvertTo-Json -Compress })
      $rank = 1 + @($top | Where-Object { $_.score -gt $entry.score }).Count
      Send-Json $res 200 (@{ ok = $true; rank = $rank; total = $top.Count; at = $entry.at } | ConvertTo-Json -Compress)
    }
    # ---------- LİDERLİK (GET, NDJSON) ----------
    elseif ($path -eq "/api/leaderboard") {
      $mode = [string]$req.QueryString["mode"]
      $lines = ""
      if (Test-Path $script:lbFile) {
        $list = @(Get-Content $script:lbFile | ForEach-Object { $_ | ConvertFrom-Json } |
          Where-Object { [string]$_.mode -eq $mode } |
          Sort-Object score -Descending | Select-Object -First 10)
        foreach ($e in $list) { $lines += ($e | ConvertTo-Json -Compress) + "`n" }
      }
      Send-Raw $res 200 "application/x-ndjson; charset=utf-8" $lines
    }
    # ---------- BULUT YEDEK (POST) ----------
    elseif ($path -eq "/api/save" -and $req.HttpMethod -eq "POST") {
      $body = Read-Body $req
      $j = $body | ConvertFrom-Json
      $slot = ([string]$j.slot -replace "[^a-z0-9_-]", "")
      if ($slot -eq "") { $slot = "main" }
      Set-Content -Path (Join-Path $script:dataDir ("save_" + $slot + ".json")) -Value $body
      Send-Json $res 200 (@{ ok = $true; slot = $slot } | ConvertTo-Json -Compress)
    }
    # ---------- BULUT YEDEK (GET) ----------
    elseif ($path -eq "/api/save") {
      $slot = ([string]$req.QueryString["slot"] -replace "[^a-z0-9_-]", "")
      if ($slot -eq "") { $slot = "main" }
      $f = Join-Path $script:dataDir ("save_" + $slot + ".json")
      if (Test-Path $f) {
        Send-Raw $res 200 "application/json; charset=utf-8" ([IO.File]::ReadAllText($f))
      } else {
        Send-Json $res 404 (@{ ok = $false; error = "yedek yok" } | ConvertTo-Json -Compress)
      }
    }
    # ---------- STATİK DOSYALAR ----------
    else {
      $p = $path
      if ($p -eq "/") { $p = "/index.html" }
      $f = Join-Path $root ($p.TrimStart("/").Replace("/", "\"))
      if ((Test-Path $f -PathType Leaf) -and ($f.StartsWith($root))) {
        $bytes = [IO.File]::ReadAllBytes($f)
        $ext = [IO.Path]::GetExtension($f).ToLowerInvariant()
        if ($mime.ContainsKey($ext)) { $res.ContentType = $mime[$ext] }
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $res.StatusCode = 404
      }
      $res.Close()
    }
  } catch {
    try { $ctx.Response.StatusCode = 500; $ctx.Response.Close() } catch {}
  }
}
