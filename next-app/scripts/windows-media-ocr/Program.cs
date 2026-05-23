using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;
using Windows.Storage;
using Windows.Storage.Streams;
using Windows.Data.Pdf;
using Windows.Globalization;

namespace WindowsNativeOcr
{
    class Program
    {
        static async Task<int> Main(string[] args)
        {
            if (args.Length < 1)
            {
                Console.Error.WriteLine("Error: Missing file path. Usage: windows-media-ocr <file-path>");
                return 1;
            }

            string filePath = Path.GetFullPath(args[0]);
            if (!File.Exists(filePath))
            {
                Console.Error.WriteLine($"Error: File not found at: {filePath}");
                return 1;
            }

            string ext = Path.GetExtension(filePath).ToLowerInvariant();

            try
            {
                // Initialize UWP OcrEngine, starting with user languages and falling back to en-US
                OcrEngine? ocrEngine = OcrEngine.TryCreateFromUserProfileLanguages();
                if (ocrEngine == null)
                {
                    if (OcrEngine.IsLanguageSupported(new Language("en-US")))
                    {
                        ocrEngine = OcrEngine.TryCreateFromLanguage(new Language("en-US"));
                    }
                }

                if (ocrEngine == null)
                {
                    Console.Error.WriteLine("Error: OCR engine initialization failed (no supported languages installed).");
                    return 1;
                }

                StorageFile file = await StorageFile.GetFileFromPathAsync(filePath);
                StringBuilder fullText = new StringBuilder();

                if (ext == ".pdf")
                {
                    // Render and recognize multi-page PDF documents page by page
                    PdfDocument pdfDoc = await PdfDocument.LoadFromFileAsync(file);
                    for (uint i = 0; i < pdfDoc.PageCount; i++)
                    {
                        using (PdfPage page = pdfDoc.GetPage(i))
                        {
                            using (InMemoryRandomAccessStream stream = new InMemoryRandomAccessStream())
                            {
                                // Render page at a high resolution scale (3x scale) to ensure pristine OCR accuracy
                                var options = new PdfPageRenderOptions
                                {
                                    DestinationWidth = (uint)(page.Size.Width * 3.0),
                                    DestinationHeight = (uint)(page.Size.Height * 3.0)
                                };

                                await page.RenderToStreamAsync(stream, options);

                                BitmapDecoder decoder = await BitmapDecoder.CreateAsync(stream);
                                using (SoftwareBitmap rawBitmap = await decoder.GetSoftwareBitmapAsync())
                                {
                                    // OcrEngine requires specific pixel formats like Bgra8 or Rgba8.
                                    // Convert the bitmap automatically if it has an incompatible native layout.
                                    SoftwareBitmap compatibleBitmap = rawBitmap;
                                    bool isConverted = false;

                                    if (rawBitmap.BitmapPixelFormat != BitmapPixelFormat.Bgra8 ||
                                        rawBitmap.BitmapAlphaMode == BitmapAlphaMode.Straight)
                                    {
                                        compatibleBitmap = SoftwareBitmap.Convert(
                                            rawBitmap,
                                            BitmapPixelFormat.Bgra8,
                                            BitmapAlphaMode.Premultiplied
                                        );
                                        isConverted = true;
                                    }

                                    try
                                    {
                                        OcrResult result = await ocrEngine.RecognizeAsync(compatibleBitmap);
                                        if (result != null && !string.IsNullOrWhiteSpace(result.Text))
                                        {
                                            fullText.AppendLine(result.Text);
                                        }
                                    }
                                    finally
                                    {
                                        if (isConverted)
                                        {
                                            compatibleBitmap.Dispose();
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                else
                {
                    // Recognize standard image formats (PNG, JPEG, TIFF, BMP, GIF, etc.)
                    using (IRandomAccessStream stream = await file.OpenAsync(FileAccessMode.Read))
                    {
                        BitmapDecoder decoder = await BitmapDecoder.CreateAsync(stream);
                        using (SoftwareBitmap rawBitmap = await decoder.GetSoftwareBitmapAsync())
                        {
                            SoftwareBitmap compatibleBitmap = rawBitmap;
                            bool isConverted = false;

                            if (rawBitmap.BitmapPixelFormat != BitmapPixelFormat.Bgra8 ||
                                rawBitmap.BitmapAlphaMode == BitmapAlphaMode.Straight)
                            {
                                compatibleBitmap = SoftwareBitmap.Convert(
                                    rawBitmap,
                                    BitmapPixelFormat.Bgra8,
                                    BitmapAlphaMode.Premultiplied
                                );
                                isConverted = true;
                            }

                            try
                            {
                                OcrResult result = await ocrEngine.RecognizeAsync(compatibleBitmap);
                                if (result != null && !string.IsNullOrWhiteSpace(result.Text))
                                {
                                    fullText.Append(result.Text);
                                }
                            }
                            finally
                            {
                                if (isConverted)
                                {
                                    compatibleBitmap.Dispose();
                                }
                            }
                        }
                    }
                }

                // Output clean string to stdout for Node.js parser ingestion
                Console.WriteLine(fullText.ToString().Trim());
                return 0;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"OCR Process Error: {ex.Message}");
                return 1;
            }
        }
    }
}
