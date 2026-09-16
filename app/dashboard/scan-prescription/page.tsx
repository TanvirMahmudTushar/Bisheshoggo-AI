import { Suspense } from "react"
import { PrescriptionScannerContent } from "@/components/prescription-scanner/prescription-scanner-content"

export default function ScanPrescriptionPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-16 items-center px-6">
          <h1 className="text-xl font-semibold">Scan Prescription</h1>
        </div>
      </div>
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        }
      >
        <PrescriptionScannerContent />
      </Suspense>
    </div>
  )
}
