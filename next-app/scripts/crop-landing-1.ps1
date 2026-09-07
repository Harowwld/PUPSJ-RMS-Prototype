Add-Type -AssemblyName System.Drawing

$filePath = "c:\Users\Chaoscedd\Programming\web-development\PUPSJ-RMS-Prototype\next-app\public\assets\pup\landing-1.jpg"
$backupPath = "c:\Users\Chaoscedd\Programming\web-development\PUPSJ-RMS-Prototype\next-app\public\assets\pup\landing-1.backup.jpg"

if (-not (Test-Path $backupPath)) {
    Copy-Item $filePath $backupPath
    Write-Host "Created backup at $backupPath"
}

$original = [System.Drawing.Bitmap]::FromFile($backupPath)
$cropWidth = $original.Width - 40
$cropHeight = $original.Height

Write-Host "Original: $($original.Width) x $($original.Height)"
Write-Host "Cropping to: $cropWidth x $cropHeight"

$rect = New-Object System.Drawing.Rectangle(0, 0, $cropWidth, $cropHeight)
$cropped = $original.Clone($rect, $original.PixelFormat)

$original.Dispose()

# Save with high quality JPEG encoder
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]95)

$cropped.Save($filePath, $encoder, $encoderParams)
$cropped.Dispose()
$encoderParams.Dispose()

Write-Host "Successfully cropped landing-1.jpg and saved!"
