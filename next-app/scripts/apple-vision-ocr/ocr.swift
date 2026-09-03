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

func runVisionOcr(on cgImage: CGImage, pageIndex: Int) -> OcrPage {
    var observations = [OcrObservation]()
    let semaphore = DispatchSemaphore(value: 0)
    
    let request = VNRecognizeTextRequest { request, error in
        defer { semaphore.signal() }
        if let error = error {
            print("OCR Error: \(error.localizedDescription)")
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
        print("Vision Handler Error: \(error.localizedDescription)")
    }
    
    return OcrPage(
        pageIndex: pageIndex,
        width: cgImage.width,
        height: cgImage.height,
        observations: observations
    )
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

// ─── Main Execution Entry ───
let args = CommandLine.arguments
guard args.count > 1 else {
    print("Error: Missing file path. Usage: apple-vision-ocr <file-path>")
    exit(1)
}

let filePath = args[1]
let fileURL = URL(fileURLWithPath: filePath)

guard FileManager.default.fileExists(atPath: filePath) else {
    print("Error: File not found at path: \(filePath)")
    exit(1)
}

// Handle PDF Document
if fileURL.pathExtension.lowercased() == "pdf" {
    guard let pdf = PDFDocument(url: fileURL) else {
        print("Error: Could not load PDF document")
        exit(1)
    }
    
    var pages = [OcrPage]()
    for pageIndex in 0..<pdf.pageCount {
        guard let page = pdf.page(at: pageIndex) else { continue }
        
        let resolutionScale: CGFloat = 3.0
        guard let rendered = renderPDFPage(page, scale: resolutionScale),
              let cgImg = normalizeImage(rendered) else {
            fputs("Error: Could not render PDF page \(pageIndex)\n", stderr)
            continue
        }
        pages.append(runVisionOcr(on: cgImg, pageIndex: pageIndex))
    }
    let fullText = pages.flatMap { $0.observations.map(\.text) }.joined(separator: "\n")
    let payload = OcrPayload(pages: pages, text: fullText.trimmingCharacters(in: .whitespacesAndNewlines))
    let data = try! JSONEncoder().encode(payload)
    print(String(data: data, encoding: .utf8)!)
    
} else {
    // Handle standard images through ImageIO so Vision receives the source CGImage directly.
    guard let source = CGImageSourceCreateWithURL(fileURL as CFURL, nil),
          let decoded = CGImageSourceCreateImageAtIndex(source, 0, nil),
          let cgImg = normalizeImage(decoded) else {
        print("Error: Could not load image file")
        exit(1)
    }
    let page = runVisionOcr(on: cgImg, pageIndex: 0)
    let payload = OcrPayload(pages: [page], text: page.observations.map(\.text).joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines))
    let data = try! JSONEncoder().encode(payload)
    print(String(data: data, encoding: .utf8)!)
}
