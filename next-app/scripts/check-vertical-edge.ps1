Add-Type -AssemblyName System.Drawing
$filePath = "c:\Users\Chaoscedd\Programming\web-development\PUPSJ-RMS-Prototype\next-app\public\assets\pup\landing-1.jpg"
$img = [System.Drawing.Bitmap]::FromFile($filePath)

Write-Host "Checking vertical white line at right edge across Y..."
$whiteRows = 0
for ($y = 0; $y -lt $img.Height; $y += 50) {
    $p = $img.GetPixel($img.Width - 5, $y)
    if ($p.R -gt 220 -and $p.G -gt 220 -and $p.B -gt 220) {
        $whiteRows++
    }
}
Write-Host "White samples: $whiteRows / $([int]($img.Height / 50))"
$img.Dispose()
