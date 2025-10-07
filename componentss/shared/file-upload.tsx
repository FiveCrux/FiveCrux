"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Upload, X, Image as ImageIcon, File } from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Card, CardContent } from "@/componentss/ui/card"

interface FileUploadProps {
  onFileSelect: (file: File) => void
  onFileRemove: () => void
  selectedFile: File | null
  accept?: string
  maxSize?: number // in MB
  className?: string
  purpose?: string // "cover", "screenshot", "demo", "trailer"
}

export default function FileUpload({
  onFileSelect,
  onFileRemove,
  selectedFile,
  accept = "image/*",
  maxSize = 5,
  className = "",
  purpose = "screenshot"
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    setError("")

    // Check file type
    if (accept === "image/*" && !file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`)
      return
    }

    onFileSelect(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleRemoveFile = () => {
    onFileRemove()
    setError("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {!selectedFile ? (
        <Card
          className={`border-2 border-dashed transition-all duration-300 cursor-pointer ${
            isDragOver
              ? "border-orange-500 bg-orange-500/10"
              : "border-gray-600 hover:border-orange-500/50"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="p-6 text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-white font-medium">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-gray-400">
                  {accept === "image/*" ? "PNG, JPG, WebP up to" : "Files up to"} {maxSize}MB
                  {purpose && ` (${purpose})`}
                </p>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {selectedFile.type.startsWith("image/") ? (
                  <ImageIcon className="h-8 w-8 text-orange-400" />
                ) : (
                  <File className="h-8 w-8 text-orange-400" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-400">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="border-red-500/50 text-red-400 hover:text-red-300 hover:border-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-sm mt-2"
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}

