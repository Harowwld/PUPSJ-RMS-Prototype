"use client"

import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

export default function SecurityQuestionsTab({
  loading,
  securityQuestions,
  setSecurityQuestions,
  securitySaving,
  handleSaveSecurityQuestions,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-6 font-inter">
      {loading ? (
        <div className="space-y-4 rounded-brand border border-gray-300 bg-white p-6 shadow-sm">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <Card className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm">
          <div className="flex shrink-0 flex-col items-center justify-between gap-4 rounded-t-brand border-b border-gray-100 bg-gray-50/50 p-6 sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon shadow-sm">
                <i className="ph-duotone ph-lock-key text-2xl"></i>
              </div>
              <div>
                <CardTitle className="text-xl leading-none font-black tracking-tight text-gray-900">
                  Global Security Questions
                </CardTitle>
                <CardDescription className="mt-1.5 text-sm font-medium text-gray-500">
                  Define up to 5 verification challenges for personnel account recovery and setup.
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={handleSaveSecurityQuestions}
              disabled={securitySaving}
              className="flex h-10 w-full items-center gap-2 bg-pup-maroon px-6 font-bold text-white shadow-sm transition-all hover:bg-red-900 active:scale-95 sm:w-auto"
            >
              <i className="ph-bold ph-floppy-disk"></i>
              {securitySaving ? "SAVING..." : "SAVE QUESTIONS"}
            </Button>
          </div>

          <CardContent className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl space-y-8">
              <div className="grid grid-cols-1 gap-6">
                 {securityQuestions.map((q, i) => {
                   const anyFilled = securityQuestions.some(sq => (sq || "").trim() !== "");
                   const showRed = !anyFilled && !loading;

                   return (
                     <div key={i} className="group space-y-2">
                       <div className="flex items-center gap-2">
                         <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${showRed ? "border-red-200 bg-red-50 text-red-600" : "border-gray-200 bg-gray-100 text-gray-500"} text-[10px] font-black transition-colors group-focus-within:border-red-100 group-focus-within:bg-red-50 group-focus-within:text-pup-maroon`}>
                           {i + 1}
                         </span>
                         <label className={`text-[11px] font-black tracking-widest ${showRed ? "text-red-600" : "text-gray-500"} uppercase transition-colors group-focus-within:text-gray-900`}>
                           Security Challenge Question
                           <span className="ml-1 text-gray-400 font-medium normal-case">(Any 2 Required)</span>
                         </label>
                       </div>
                       <Input
                         type="text"
                         placeholder="e.g. What was the name of your first elementary school?"
                         className={`h-12 rounded-brand border ${showRed ? "border-red-500 ring-1 ring-red-500 bg-red-50/30" : "border-gray-300 bg-white"} text-sm shadow-xs transition-all focus-visible:border-pup-maroon focus-visible:ring-pup-maroon`}
                         value={q}
                         onChange={(e) => {
                           const updated = [...securityQuestions]
                           updated[i] = e.target.value
                           setSecurityQuestions(updated)
                         }}
                       />
                     </div>
                   );
                 })}
              </div>


            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
