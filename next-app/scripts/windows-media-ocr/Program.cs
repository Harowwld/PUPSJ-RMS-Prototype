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
        static OcrEngine CreateOcrEngine()
        {
            OcrEngine? engine = OcrEngine.TryCreateFromUserProfileLanguages();
            if (engine == null && OcrEngine.IsLanguageSupported(new Language("en-US")))
            {
                engine = OcrEngine.TryCreateFromLanguage(new Language("en-US"));
            }
            return engine ?? throw new InvalidOperationException("OCR engine initialization failed (no supported languages installed).");
        }

        static async Task<string> RecognizePdfPageAsync(PdfDocument pdfDoc, uint pageIndex, OcrEngine ocrEngine)
        {
            using (PdfPage page = pdfDoc.GetPage(pageIndex))
            using (InMemoryRandomAccessStream stream = new InMemoryRandomAccessStream())
            {
                var options = new PdfPageRenderOptions
                {
                    DestinationWidth = (uint)(page.Size.Width * 3.0),
                    DestinationHeight = (uint)(page.Size.Height * 3.0)
                };
                await page.RenderToStreamAsync(stream, options);
                BitmapDecoder decoder = await BitmapDecoder.CreateAsync(stream);
                using (SoftwareBitmap rawBitmap = await decoder.GetSoftwareBitmapAsync())
                {
                    SoftwareBitmap compatibleBitmap = rawBitmap;
                    bool isConverted = false;
                    if (rawBitmap.BitmapPixelFormat != BitmapPixelFormat.Bgra8 || rawBitmap.BitmapAlphaMode == BitmapAlphaMode.Straight)
                    {
                        compatibleBitmap = SoftwareBitmap.Convert(rawBitmap, BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied);
                        isConverted = true;
                    }
                    try
                    {
                        OcrResult result = await ocrEngine.RecognizeAsync(compatibleBitmap);
                        return result?.Text ?? "";
                    }
                    finally
                    {
                        if (isConverted) compatibleBitmap.Dispose();
                    }
                }
            }
        }

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
                OcrEngine ocrEngine = CreateOcrEngine();
                StorageFile file = await StorageFile.GetFileFromPathAsync(filePath);
                StringBuilder fullText = new StringBuilder();

                if (ext == ".pdf")
                {
                    // Use two independent OCR engines so multipage scans can run concurrently
                    // without sharing mutable WinRT OCR engine state.
                    PdfDocument pdfDoc = await PdfDocument.LoadFromFileAsync(file);
                    int pageCount = checked((int)pdfDoc.PageCount);
                    string[] pageTexts = new string[pageCount];
                    var workers = Enumerable.Range(0, Math.Min(2, pageCount)).Select(async workerIndex =>
                    {
                        OcrEngine workerEngine = workerIndex == 0 ? ocrEngine : CreateOcrEngine();
                        for (int pageIndex = workerIndex; pageIndex < pageCount; pageIndex += 2)
                        {
                            pageTexts[pageIndex] = await RecognizePdfPageAsync(pdfDoc, (uint)pageIndex, workerEngine);
                        }
                    });
                    try
                    {
                        await Task.WhenAll(workers);
                    }
                    catch
                    {
                        // Retry the original quality path serially if a worker fails.
                        for (uint pageIndex = 0; pageIndex < pdfDoc.PageCount; pageIndex++)
                        {
                            pageTexts[pageIndex] = await RecognizePdfPageAsync(pdfDoc, pageIndex, ocrEngine);
                        }
                    }
                    foreach (string pageText in pageTexts)
                    {
                        if (!string.IsNullOrWhiteSpace(pageText)) fullText.AppendLine(pageText);
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
