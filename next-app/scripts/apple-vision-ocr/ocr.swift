import Foundation
import Vision
import PDFKit
import AppKit
import ImageIO

struct OcrObservation: Codable {
    let text: String
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}

struct OcrPage: Codable {
    let pageIndex: Int
    let width: Int
    let height: Int
    let observations: [OcrObservation]
}

struct OcrPayload: Codable {
    let pages: [OcrPage]
    let text: String
}

struct OcrRecognition {
    let page: OcrPage
    let failed: Bool
    let error: String?
}

final class OcrRecognitionBatch {
    private let lock = NSLock()
    private var values: [OcrRecognition?]

    init(count: Int) {
        values = [OcrRecognition?](repeating: nil, count: count)
    }

    func set(_ value: OcrRecognition, at index: Int) {
        lock.lock()
        values[index] = value
        lock.unlock()
    }

    func get(_ index: Int) -> OcrRecognition? {
        lock.lock()
        defer { lock.unlock() }
        return values[index]
    }
}

func runVisionOcr(on cgImage: CGImage, pageIndex: Int) -> OcrRecognition {
    var observations = [OcrObservation]()
    var failed = false
    var failureMessage: String?
    let semaphore = DispatchSemaphore(value: 0)
    
    let request = VNRecognizeTextRequest { request, error in
        defer { semaphore.signal() }
        if let error = error {
            failed = true
            failureMessage = error.localizedDescription
            fputs("OCR Error: \(error.localizedDescription)\n", stderr)
            return
        }
        
        guard let results = request.results as? [VNRecognizedTextObservation] else { return }
        for result in results {
            if let candidate = result.topCandidates(1).first {
                // Vision uses a normalized bottom-left origin. The web client
                // uses a normalized top-left origin, so convert Y here.
                let box = result.boundingBox
                observations.append(OcrObservation(
                    text: candidate.string,
                    x: Double(box.origin.x),
                    y: Double(1.0 - box.origin.y - box.height),
                    width: Double(box.width),
                    height: Double(box.height)
                ))
            }
        }
    }
    
    // High accuracy configuration
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    do {
        try handler.perform([request])
        semaphore.wait()
    } catch {
        failed = true
        failureMessage = error.localizedDescription
        fputs("Vision Handler Error: \(error.localizedDescription)\n", stderr)
    }
    
    return OcrRecognition(
        page: OcrPage(
            pageIndex: pageIndex,
            width: cgImage.width,
            height: cgImage.height,
            observations: observations
        ),
        failed: failed,
        error: failureMessage
    )
}

func recognizeImages(_ images: [(Int, CGImage)]) -> [OcrRecognition] {
    let batch = OcrRecognitionBatch(count: images.count)
    let finished = DispatchSemaphore(value: 0)
    DispatchQueue.global(qos: .userInitiated).async {
        DispatchQueue.concurrentPerform(iterations: images.count) { index in
            let (pageIndex, image) = images[index]
            batch.set(runVisionOcr(on: image, pageIndex: pageIndex), at: index)
        }
        finished.signal()
    }
    finished.wait()

    return images.indices.compactMap { batch.get($0) }
}

func renderPDFPage(_ page: PDFPage, scale: CGFloat) -> CGImage? {
    let bounds = page.bounds(for: .mediaBox)
    let width = Int(ceil(bounds.width * scale))
    let height = Int(ceil(bounds.height * scale))
    guard width > 0, height > 0 else { return nil }

    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let context = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else { return nil }

    context.setFillColor(CGColor.white)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.saveGState()
    context.scaleBy(x: scale, y: scale)
    context.translateBy(x: -bounds.origin.x, y: -bounds.origin.y)
    page.draw(with: .mediaBox, to: context)
    context.restoreGState()
    return context.makeImage()
}

func normalizeImage(_ image: CGImage) -> CGImage? {
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let context = CGContext(
        data: nil,
        width: image.width,
        height: image.height,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else { return nil }

    context.setFillColor(CGColor.white)
    context.fill(CGRect(x: 0, y: 0, width: image.width, height: image.height))
    context.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
    return context.makeImage()
}

func recognizeFile(at filePath: String) throws -> OcrPayload {
    let fileURL = URL(fileURLWithPath: filePath)
    guard FileManager.default.fileExists(atPath: filePath) else {
        throw NSError(domain: "NativeOcr", code: 1, userInfo: [NSLocalizedDescriptionKey: "File not found at path: \(filePath)"])
    }

    if fileURL.pathExtension.lowercased() == "pdf" {
        guard let pdf = PDFDocument(url: fileURL) else {
            throw NSError(domain: "NativeOcr", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not load PDF document"])
        }

        var pages = [OcrPage]()
        for batchStart in stride(from: 0, to: pdf.pageCount, by: 2) {
            var images = [(Int, CGImage)]()
            for pageIndex in batchStart..<min(batchStart + 2, pdf.pageCount) {
                guard let page = pdf.page(at: pageIndex) else { continue }
                let resolutionScale: CGFloat = 3.0
                guard let rendered = renderPDFPage(page, scale: resolutionScale),
                      let cgImg = normalizeImage(rendered) else {
                    fputs("Error: Could not render PDF page \(pageIndex)\n", stderr)
                    continue
                }
                images.append((pageIndex, cgImg))
            }
            let recognized = recognizeImages(images)
            if let failedPage = recognized.first(where: { $0.failed }) {
                throw NSError(domain: "NativeOcr", code: 4, userInfo: [NSLocalizedDescriptionKey: "Vision recognition failed for page \(failedPage.page.pageIndex): \(failedPage.error ?? "unknown Vision error")"])
            }
            pages.append(contentsOf: recognized.map(\.page))
        }
        let fullText = pages.flatMap { $0.observations.map(\.text) }.joined(separator: "\n")
        return OcrPayload(pages: pages, text: fullText.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    // Handle standard images through ImageIO so Vision receives the source CGImage directly.
    guard let source = CGImageSourceCreateWithURL(fileURL as CFURL, nil),
          let decoded = CGImageSourceCreateImageAtIndex(source, 0, nil),
          let cgImg = normalizeImage(decoded) else {
        throw NSError(domain: "NativeOcr", code: 3, userInfo: [NSLocalizedDescriptionKey: "Could not load image file"])
    }
    let recognized = recognizeImages([(0, cgImg)])
    if let failedPage = recognized.first(where: { $0.failed }) {
        throw NSError(domain: "NativeOcr", code: 4, userInfo: [NSLocalizedDescriptionKey: "Vision recognition failed for page \(failedPage.page.pageIndex): \(failedPage.error ?? "unknown Vision error")"])
    }
    let page = recognized.first?.page ?? OcrPage(pageIndex: 0, width: cgImg.width, height: cgImg.height, observations: [])
    let text = page.observations.map(\.text).joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
    return OcrPayload(pages: [page], text: text)
}

struct WorkerCommand: Decodable {
    let id: String
    let type: String
    let filePath: String?
}

struct WorkerResponse: Encodable {
    let id: String
    let type: String
    let ok: Bool
    let result: OcrPayload?
    let error: String?
}

func writeWorkerLine<T: Encodable>(_ value: T) throws {
    var data = try JSONEncoder().encode(value)
    data.append(0x0A)
    FileHandle.standardOutput.write(data)
}

func makeWarmupImage() throws -> CGImage {
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let context = CGContext(
        data: nil,
        width: 32,
        height: 32,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        throw NSError(domain: "NativeOcr", code: 5, userInfo: [NSLocalizedDescriptionKey: "Could not create warmup image"])
    }
    context.setFillColor(CGColor.white)
    context.fill(CGRect(x: 0, y: 0, width: 32, height: 32))
    guard let image = context.makeImage() else {
        throw NSError(domain: "NativeOcr", code: 5, userInfo: [NSLocalizedDescriptionKey: "Could not create warmup image"])
    }
    return image
}

func runWarmup() throws {
    let result = runVisionOcr(on: try makeWarmupImage(), pageIndex: 0)
    if result.failed {
        throw NSError(domain: "NativeOcr", code: 6, userInfo: [NSLocalizedDescriptionKey: "Vision warmup request failed: \(result.error ?? "unknown Vision error")"])
    }
}

let args = CommandLine.arguments
if args.dropFirst().first == "--worker" {
    do {
        try writeWorkerLine(["type": "ready"])
        while let line = readLine() {
            do {
                let command = try JSONDecoder().decode(WorkerCommand.self, from: Data(line.utf8))
                do {
                    switch command.type {
                    case "warmup":
                        try autoreleasepool { try runWarmup() }
                        try writeWorkerLine(WorkerResponse(id: command.id, type: command.type, ok: true, result: nil, error: nil))
                    case "scan":
                        guard let filePath = command.filePath else {
                            throw NSError(domain: "NativeOcr", code: 7, userInfo: [NSLocalizedDescriptionKey: "Missing scan file path"])
                        }
                        let result = try autoreleasepool { try recognizeFile(at: filePath) }
                        try writeWorkerLine(WorkerResponse(id: command.id, type: command.type, ok: true, result: result, error: nil))
                    default:
                        throw NSError(domain: "NativeOcr", code: 8, userInfo: [NSLocalizedDescriptionKey: "Unknown OCR worker command"])
                    }
                } catch {
                    try writeWorkerLine(WorkerResponse(id: command.id, type: command.type, ok: false, result: nil, error: error.localizedDescription))
                }
            } catch {
                fputs("Invalid OCR worker command: \(error.localizedDescription)\n", stderr)
            }
        }
    } catch {
        fputs("OCR worker protocol failed: \(error.localizedDescription)\n", stderr)
        exit(1)
    }
} else {
    guard args.count > 1 else {
        print("Error: Missing file path. Usage: apple-vision-ocr <file-path>")
        exit(1)
    }
    do {
        let payload = try recognizeFile(at: args[1])
        let data = try JSONEncoder().encode(payload)
        print(String(data: data, encoding: .utf8) ?? "{}")
    } catch {
        fputs("\(error.localizedDescription)\n", stderr)
        exit(1)
    }
}
