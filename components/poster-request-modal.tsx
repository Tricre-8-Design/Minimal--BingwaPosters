"use client"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, X, Loader2, CheckCircle2 } from "lucide-react"
import { supabase, showToast } from "@/lib/supabase"
import { friendlyToastError } from "@/lib/client-errors"

interface PosterRequestModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PosterRequestModal({ isOpen, onClose }: PosterRequestModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        showToast("File size too large. Max 5MB.", "error")
        return
      }
      setFile(selectedFile)
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
    }
  }

  const removeFile = () => {
    setFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      showToast("Please upload a poster image.", "error")
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split(".").pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `requests/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("poster-requests")
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("poster-requests")
        .getPublicUrl(filePath)

      // 3. Submit to API
      const response = await fetch("/api/poster-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poster_url: publicUrl,
          description,
          phone_number: phoneNumber,
        }),
      })

      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      setIsSuccess(true)
      showToast("Request submitted successfully!", "success")
      
      // Reset form after a delay
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (error: any) {
      logError("components/poster-request-modal", error)
      friendlyToastError(undefined, "Failed to submit request. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreviewUrl(null)
    setDescription("")
    setPhoneNumber("")
    setIsSuccess(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:max-w-[480px] max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-md border-white/20 shadow-2xl p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl sm:text-2xl font-bold font-space text-primary">Request a Poster</DialogTitle>
          <DialogDescription className="font-inter text-text-secondary text-sm">
            Didn't find what you wanted? Upload a sample and we'll add it for you!
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-success animate-in zoom-in duration-300" />
            <p className="text-lg font-bold text-text-primary font-space">Asante! Request submitted.</p>
            <p className="text-sm text-text-secondary text-center">We'll notify you once it's added.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="font-semibold text-sm sm:text-base">Poster Image <span className="text-red-500">*</span></Label>
              <div 
                className={`relative border-2 border-dashed rounded-xl p-3 sm:p-4 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 ${
                  file ? "border-success/50 bg-success/5" : "border-white/20 bg-white/5"
                }`}
                onClick={() => !file && fileInputRef.current?.click()}
              >
                {previewUrl ? (
                  <div className="relative w-full max-h-[200px] flex justify-center overflow-hidden">
                    <img src={previewUrl} alt="Preview" className="max-w-full max-h-[200px] object-contain rounded-lg" />
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="p-2 sm:p-3 bg-primary/10 rounded-full mb-2">
                      <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium">Click to upload sample poster</p>
                    <p className="text-[10px] sm:text-xs text-text-muted mt-1">PNG, JPG up to 5MB</p>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="font-semibold text-sm sm:text-base">What would you like to see? (Optional)</Label>
              <Textarea 
                id="description"
                placeholder="e.g. A poster for weekend data offers..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white/5 border-white/20 focus:border-primary/50 min-h-[80px] text-sm"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="font-semibold text-sm sm:text-base">Phone Number (Optional)</Label>
              <Input 
                id="phone"
                type="tel"
                placeholder="0712 345 678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="bg-white/5 border-white/20 focus:border-primary/50 h-10 sm:h-12 text-sm"
              />
              <p className="text-[10px] text-text-muted">We'll notify you when the poster is ready.</p>
            </div>

            <DialogFooter className="pt-2">
              <Button 
                type="submit" 
                disabled={isSubmitting || !file}
                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-5 sm:py-6 rounded-xl shadow-glowOrange text-sm sm:text-base"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function logError(context: string, error: any) {
  console.error(`[${context}] Error:`, error)
}
