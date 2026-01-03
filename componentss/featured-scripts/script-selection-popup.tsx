"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, Check, Search } from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Input } from "@/componentss/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/componentss/ui/dialog"
import { Badge } from "@/componentss/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useUserScripts } from "@/hooks/use-scripts-queries"
import Image from "next/image"

interface ScriptSelectionPopupProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (scriptId: number) => void
  slotUniqueId: string | null
}

export default function ScriptSelectionPopup({ isOpen, onClose, onSelect, slotUniqueId }: ScriptSelectionPopupProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedScriptId, setSelectedScriptId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch user's scripts - only approved ones
  const { data: scriptsData, isLoading } = useUserScripts(100, 0)
  const scripts = scriptsData?.scripts || []

  // Filter to only show approved scripts
  const approvedScripts = scripts.filter((script: any) => script.status === 'approved')
  
  // Filter scripts by search query
  const filteredScripts = approvedScripts.filter((script: any) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      script.title?.toLowerCase().includes(query) ||
      script.description?.toLowerCase().includes(query) ||
      script.category?.toLowerCase().includes(query)
    )
  })

  const handleSelect = async () => {
    if (!selectedScriptId) {
      toast({
        title: "Please select a script",
        description: "You need to select a script to feature.",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    try {
      onSelect(selectedScriptId)
      setSelectedScriptId(null)
      setSearchQuery("")
    } catch (error) {
      console.error("Error selecting script:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedScriptId(null)
    setSearchQuery("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            Select Script to Feature
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose one of your approved scripts to feature in this slot
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scripts by title, description, or category..."
              className="bg-gray-700 border-gray-600 text-white pl-10"
            />
          </div>

          {/* Scripts List */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
          ) : filteredScripts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">
                {approvedScripts.length === 0
                  ? "You don't have any approved scripts yet. Create and get a script approved first!"
                  : "No scripts match your search."}
              </p>
              {approvedScripts.length === 0 && (
                <Button
                  onClick={handleClose}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Close
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              {filteredScripts.map((script: any) => {
                const isSelected = selectedScriptId === script.id
                return (
                  <motion.div
                    key={script.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                    }`}
                    onClick={() => setSelectedScriptId(script.id)}
                  >
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-10">
                        <div className="bg-purple-500 rounded-full p-1">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}

                    <div className="p-4">
                      {/* Cover Image */}
                      {script.cover_image ? (
                        <div className="relative w-full h-32 mb-3 rounded-lg overflow-hidden">
                          <Image
                            src={script.cover_image}
                            alt={script.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-32 mb-3 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                          <span className="text-gray-500 text-sm">No Image</span>
                        </div>
                      )}

                      {/* Title */}
                      <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">
                        {script.title}
                      </h3>

                      {/* Description */}
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {script.description}
                      </p>

                      {/* Meta Info */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                          {script.category}
                        </Badge>
                        {script.framework && Array.isArray(script.framework) && script.framework.length > 0 && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                            {script.framework[0]}
                          </Badge>
                        )}
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                          {script.free || script.price === 0 ? "Free" : `${script.currency_symbol || "$"}${script.price}`}
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSelect}
              disabled={!selectedScriptId || isSubmitting || approvedScripts.length === 0}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Processing..." : "Select Script"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

