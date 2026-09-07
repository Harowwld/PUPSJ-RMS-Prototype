Add-Type -AssemblyName System.Drawing
$filePath = "c:\Users\Chaoscedd\Programming\web-development\PUPSJ-RMS-Prototype\next-app\public\assets\pup\landing-1.jpg"
$img = [System.Drawing.Bitmap]::FromFile($filePath)
Write-Host "Image Size: $($img.Width) x $($img.Height)"

$midY = [int]($img.Height / 2)
for ($i = 0; $i -lt 40; $i++) {
    $x = $img.Width - 1 - $i
    $pixel = $img.GetPixel($x, $midY)
    Write-Host "Offset $i (x=$x): R=$($pixel.R) G=$($pixel.G) B=$($pixel.B)"
}
$img.Dispose()
