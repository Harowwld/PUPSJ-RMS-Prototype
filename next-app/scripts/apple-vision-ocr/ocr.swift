import Foundation
import Vision
import PDFKit
import AppKit

func runVisionOcr(on cgImage: CGImage) -> String {
    var recognizedText = ""
    let semaphore = DispatchSemaphore(value: 0)
    
    let request = VNRecognizeTextRequest { request, error in
        defer { semaphore.signal() }
        if let error = error {
            print("OCR Error: \(error.localizedDescription)")
            return
        }
        
        guard let results = request.results as? [VNRecognizedTextObservation] else { return }
        var lines = [String]()
        for result in results {
            if let candidate = result.topCandidates(1).first {
                lines.append(candidate.string)
            }
        }
        recognizedText = lines.joined(separator: "\n")
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
    
    return recognizedText
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
    
    var fullText = ""
    for pageIndex in 0..<pdf.pageCount {
        guard let page = pdf.page(at: pageIndex) else { continue }
        
        // Render PDF page to a CGImage for Vision analysis
        let bounds = page.bounds(for: .mediaBox)
        let resolutionScale: CGFloat = 3.0 // High-quality rendering
        let size = CGSize(width: bounds.width * resolutionScale, height: bounds.height * resolutionScale)
        
        let img = NSImage(size: size)
        img.lockFocus()
        if let ctx = NSGraphicsContext.current?.cgContext {
            ctx.setFillColor(NSColor.white.cgColor)
            ctx.fill(CGRect(origin: .zero, size: size))
            ctx.scaleBy(x: resolutionScale, y: resolutionScale)
            page.draw(with: .mediaBox, to: ctx)
        }
        img.unlockFocus()
        
        guard let cgImg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
        let pageText = runVisionOcr(on: cgImg)
        fullText += pageText + "\n"
    }
    print(fullText.trimmingCharacters(in: .whitespacesAndNewlines))
    
} else {
    // Handle standard Image (PNG/JPG/etc.)
    guard let img = NSImage(contentsOf: fileURL),
          let cgImg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        print("Error: Could not load image file")
        exit(1)
    }
    let text = runVisionOcr(on: cgImg)
    print(text.trimmingCharacters(in: .whitespacesAndNewlines))
}
