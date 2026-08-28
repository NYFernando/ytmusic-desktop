Add-Type -AssemblyName System.Drawing

$baseDir = "D:\Documents\Basics\ytmusic-desktop\public"
$pngPath = Join-Path $baseDir "icon.png"
$icoPath = Join-Path $baseDir "icon.ico"
$sidebarBmp = Join-Path $baseDir "installer-sidebar.bmp"
$headerBmp = Join-Path $baseDir "installer-header.bmp"

# 1. Generate icon.ico
$img = [System.Drawing.Image]::FromFile($pngPath)
$bmp256 = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($bmp256)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.DrawImage($img, 0, 0, 256, 256)
$g.Dispose()

$hIcon = $bmp256.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = [System.IO.File]::OpenWrite($icoPath)
$icon.Save($fs)
$fs.Close()
$bmp256.Dispose()
Write-Output "Generated icon.ico"

# 2. Generate NSIS Installer Sidebar Banner (164 x 314 px BMP) with Nethum Fernando Branding
$sideBmp = New-Object System.Drawing.Bitmap(164, 314)
$gSide = [System.Drawing.Graphics]::FromImage($sideBmp)
$gSide.Clear([System.Drawing.Color]::FromArgb(255, 12, 12, 16))

# Draw sleek red glow gradient
$brushGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point(164, 314)),
    [System.Drawing.Color]::FromArgb(255, 239, 68, 68),
    [System.Drawing.Color]::FromArgb(255, 15, 15, 20)
)
$gSide.FillRectangle($brushGrad, 0, 0, 164, 314)
$brushGrad.Dispose()

# Draw semi-dark overlay for modern contrast
$darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 9, 9, 11))
$gSide.FillRectangle($darkBrush, 0, 0, 164, 314)
$darkBrush.Dispose()

# Draw Logo
$logoSize = 80
$logoX = (164 - $logoSize) / 2
$gSide.DrawImage($img, $logoX, 35, $logoSize, $logoSize)

# Draw Title & Developer Credits
$fontTitle = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Regular)
$fontAuthor = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)

$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$grayBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 161, 161, 170))
$redBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 239, 68, 68))

$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center

$gSide.DrawString("YouTube Music", $fontTitle, $whiteBrush, 82, 130, $sf)
$gSide.DrawString("DESKTOP", $fontSub, $redBrush, 82, 152, $sf)

$gSide.DrawString("Developed by:", $fontSub, $grayBrush, 82, 210, $sf)
$gSide.DrawString("Nethum Fernando", $fontAuthor, $whiteBrush, 82, 230, $sf)

$gSide.DrawString("v1.0.0 Edition", $fontSub, $grayBrush, 82, 275, $sf)

$gSide.Dispose()
$sideBmp.Save($sidebarBmp, [System.Drawing.Imaging.ImageFormat]::Bmp)
$sideBmp.Dispose()
Write-Output "Generated installer-sidebar.bmp"

# 3. Generate NSIS Installer Header Banner (150 x 57 px BMP)
$headBmp = New-Object System.Drawing.Bitmap(150, 57)
$gHead = [System.Drawing.Graphics]::FromImage($headBmp)
$gHead.Clear([System.Drawing.Color]::FromArgb(255, 18, 18, 22))

$gHead.DrawImage($img, 10, 8, 40, 40)
$sfLeft = New-Object System.Drawing.StringFormat
$sfLeft.Alignment = [System.Drawing.StringAlignment]::Near

$gHead.DrawString("YouTube Music", $fontSub, $whiteBrush, 58, 12, $sfLeft)
$fontMini = New-Object System.Drawing.Font("Segoe UI", 7, [System.Drawing.FontStyle]::Regular)
$gHead.DrawString("By Nethum Fernando", $fontMini, $grayBrush, 58, 30, $sfLeft)

$gHead.Dispose()
$headBmp.Save($headerBmp, [System.Drawing.Imaging.ImageFormat]::Bmp)
$headBmp.Dispose()
Write-Output "Generated installer-header.bmp"

$img.Dispose()
