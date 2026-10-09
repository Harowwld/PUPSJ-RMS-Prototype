using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
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
        sealed class WorkerRequest
        {
            public string? Id { get; set; }
            public string? FilePath { get; set; }
        }

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

        static async Task<string> RecognizeFileAsync(string filePath, OcrEngine[] engines)
        {
            filePath = Path.GetFullPath(filePath);
            if (!File.Exists(filePath)) throw new FileNotFoundException($"File not found at path: {filePath}");

            string ext = Path.GetExtension(filePath).ToLowerInvariant();
            StorageFile file = await StorageFile.GetFileFromPathAsync(filePath);
            StringBuilder fullText = new StringBuilder();

            if (ext == ".pdf")
            {
                PdfDocument pdfDoc = await PdfDocument.LoadFromFileAsync(file);
                int pageCount = checked((int)pdfDoc.PageCount);
                string[] pageTexts = new string[pageCount];
                var workers = Enumerable.Range(0, Math.Min(engines.Length, pageCount)).Select(async workerIndex =>
                {
                    OcrEngine workerEngine = engines[workerIndex];
                    for (int pageIndex = workerIndex; pageIndex < pageCount; pageIndex += engines.Length)
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
                    // Retry serially on the first initialized engine if either page worker fails.
                    for (uint pageIndex = 0; pageIndex < pdfDoc.PageCount; pageIndex++)
                    {
                        pageTexts[pageIndex] = await RecognizePdfPageAsync(pdfDoc, pageIndex, engines[0]);
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
                        if (rawBitmap.BitmapPixelFormat != BitmapPixelFormat.Bgra8 || rawBitmap.BitmapAlphaMode == BitmapAlphaMode.Straight)
                        {
                            compatibleBitmap = SoftwareBitmap.Convert(rawBitmap, BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied);
                            isConverted = true;
                        }
                        try
                        {
                            OcrResult result = await engines[0].RecognizeAsync(compatibleBitmap);
                            if (result != null && !string.IsNullOrWhiteSpace(result.Text)) fullText.Append(result.Text);
                        }
                        finally
                        {
                            if (isConverted) compatibleBitmap.Dispose();
                        }
                    }
                }
            }

            return fullText.ToString().Trim();
        }

        static async Task<int> RunServerAsync()
        {
            OcrEngine[] engines;
            try
            {
                // Keep both native engines alive so multipage scans retain bounded parallelism.
                engines = new[] { CreateOcrEngine(), CreateOcrEngine() };
                Console.Error.WriteLine("Windows OCR worker ready.");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"OCR engine initialization failed: {ex.Message}");
                return 1;
            }

            string? line;
            while ((line = await Console.In.ReadLineAsync()) != null)
            {
                WorkerRequest? request = null;
                try
                {
                    request = JsonSerializer.Deserialize<WorkerRequest>(line, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (request == null || string.IsNullOrWhiteSpace(request.Id) || string.IsNullOrWhiteSpace(request.FilePath))
                    {
                        throw new InvalidDataException("Worker request must include id and filePath.");
                    }
                    string text = await RecognizeFileAsync(request.FilePath, engines);
                    Console.WriteLine(JsonSerializer.Serialize(new { id = request.Id, ok = true, result = new { text } }));
                }
                catch (Exception ex)
                {
                    Console.WriteLine(JsonSerializer.Serialize(new { id = request?.Id, ok = false, error = ex.Message }));
                }
                Console.Out.Flush();
            }

            return 0;
        }

        static async Task<int> Main(string[] args)
        {
            if (args.Length > 0 && args[0] == "--server") return await RunServerAsync();
            if (args.Length < 1)
            {
                Console.Error.WriteLine("Error: Missing file path. Usage: windows-media-ocr [--server|<file-path>]");
                return 1;
            }

            try
            {
                string text = await RecognizeFileAsync(args[0], new[] { CreateOcrEngine(), CreateOcrEngine() });
                Console.WriteLine(text);
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
