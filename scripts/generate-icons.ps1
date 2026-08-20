Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

function New-KJVentureIcon {
  param(
    [int]$Size,
    [string]$Destination,
    [bool]$Maskable = $false
  )

  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml($(if ($Maskable) { '#17324d' } else { '#fff8e8' })))

  $scale = $Size / 512.0
  $margin = [int](72 * $scale)
  $circleSize = $Size - (2 * $margin)
  $circle = [System.Drawing.Rectangle]::new($margin, $margin, $circleSize, $circleSize)
  $goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#fff1c7'))
  $goldPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#d99a21'), [float](24 * $scale))
  $graphics.FillEllipse($goldBrush, $circle)
  $graphics.DrawEllipse($goldPen, $circle)

  $navyPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#17324d'), [float](16 * $scale))
  $tealBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#2f8f80'))
  $left = [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF([float](132*$scale), [float](202*$scale))),
    (New-Object System.Drawing.PointF([float](195*$scale), [float](190*$scale))),
    (New-Object System.Drawing.PointF([float](256*$scale), [float](221*$scale))),
    (New-Object System.Drawing.PointF([float](256*$scale), [float](364*$scale))),
    (New-Object System.Drawing.PointF([float](194*$scale), [float](338*$scale))),
    (New-Object System.Drawing.PointF([float](132*$scale), [float](346*$scale)))
  )
  $right = [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF([float](380*$scale), [float](202*$scale))),
    (New-Object System.Drawing.PointF([float](317*$scale), [float](190*$scale))),
    (New-Object System.Drawing.PointF([float](256*$scale), [float](221*$scale))),
    (New-Object System.Drawing.PointF([float](256*$scale), [float](364*$scale))),
    (New-Object System.Drawing.PointF([float](318*$scale), [float](338*$scale))),
    (New-Object System.Drawing.PointF([float](380*$scale), [float](346*$scale)))
  )
  $graphics.FillPolygon($tealBrush, $left)
  $graphics.FillPolygon($tealBrush, $right)
  $graphics.DrawPolygon($navyPen, $left)
  $graphics.DrawPolygon($navyPen, $right)
  $graphics.DrawLine($navyPen, [float](256*$scale), [float](221*$scale), [float](256*$scale), [float](364*$scale))

  $directory = Split-Path -Parent $Destination
  New-Item -ItemType Directory -Force -Path $directory | Out-Null
  $temporaryDestination = "$Destination.tmp.png"
  if (Test-Path -LiteralPath $temporaryDestination) {
    Remove-Item -LiteralPath $temporaryDestination
  }
  $bitmap.Save($temporaryDestination, [System.Drawing.Imaging.ImageFormat]::Png)

  $navyPen.Dispose()
  $tealBrush.Dispose()
  $goldPen.Dispose()
  $goldBrush.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
  Copy-Item -LiteralPath $temporaryDestination -Destination $Destination -Force
  Remove-Item -LiteralPath $temporaryDestination
}

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$icons = Join-Path $root 'public\icons'
New-KJVentureIcon -Size 32 -Destination (Join-Path $icons 'kjventure-32.png')
New-KJVentureIcon -Size 180 -Destination (Join-Path $icons 'kjventure-180.png')
New-KJVentureIcon -Size 192 -Destination (Join-Path $icons 'kjventure-192.png')
New-KJVentureIcon -Size 512 -Destination (Join-Path $icons 'kjventure-512.png')
New-KJVentureIcon -Size 512 -Destination (Join-Path $icons 'kjventure-maskable-512.png') -Maskable $true
