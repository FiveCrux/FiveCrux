"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { Star, MessageCircle, ThumbsUp, User, CheckCircle } from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/componentss/ui/card"
import { Textarea } from "@/componentss/ui/textarea"
import { Input } from "@/componentss/ui/input"
import { Badge } from "@/componentss/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/componentss/ui/avatar"

interface Review {
  id: number
  reviewer_name: string
  reviewer_email: string
  rating: number
  title?: string
  comment?: string
  verified_purchase?: boolean
  verified_participant?: boolean
  created_at: string
}

interface ReviewSectionProps {
  itemId: number
  itemType: "script" | "giveaway"
  itemTitle: string
  onReviewSubmitted?: () => void
}

export default function ReviewSection({ itemId, itemType, itemTitle, onReviewSubmitted }: ReviewSectionProps) {
  const { data: session } = useSession()
  const [reviews, setReviews] = useState<Review[]>([])
  const [userReview, setUserReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  
  const [formData, setFormData] = useState({
    rating: 0,
    title: "",
    comment: ""
  })

  const [hoveredRating, setHoveredRating] = useState(0)

  useEffect(() => {
    fetchReviews()
  }, [itemId, itemType])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const [reviewsRes, userReviewRes] = await Promise.all([
        fetch(`/api/${itemType}s/${itemId}/reviews`),
        session ? fetch(`/api/${itemType}s/${itemId}/reviews?userOnly=true`) : Promise.resolve(null)
      ])

      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json()
        setReviews(reviewsData.reviews || [])
      }

      if (userReviewRes?.ok) {
        const userReviewData = await userReviewRes.json()
        setUserReview(userReviewData.review)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/${itemType}s/${itemId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setFormData({ rating: 0, title: "", comment: "" })
        setShowReviewForm(false)
        await fetchReviews()
        onReviewSubmitted?.()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to submit review")
      }
    } catch (error) {
      console.error('Error submitting review:', error)
      alert("Failed to submit review")
    } finally {
      setSubmitting(false)
    }
  }

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? "button" : undefined}
            onClick={interactive ? () => onRatingChange?.(star) : undefined}
            onMouseEnter={interactive ? () => setHoveredRating(star) : undefined}
            onMouseLeave={interactive ? () => setHoveredRating(0) : undefined}
            className={`transition-colors ${
              interactive ? "cursor-pointer" : "cursor-default"
            }`}
            disabled={!interactive}
          >
            <Star
              className={`h-5 w-5 ${
                star <= (interactive ? hoveredRating : rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="bg-gray-800/30 border-gray-700/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded w-1/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Review Summary */}
      <Card className="bg-gray-800/30 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-400" />
            Reviews ({reviews.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{averageRating.toFixed(1)}</div>
              {renderStars(Math.round(averageRating))}
              <div className="text-sm text-gray-400 mt-1">{reviews.length} reviews</div>
            </div>
            <div className="flex-1">
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = reviews.filter(r => r.rating === rating).length
                  const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-sm text-gray-400 w-4">{rating}</span>
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-400 w-8">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {session && !userReview && (
            <Button
              onClick={() => setShowReviewForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Write a Review
            </Button>
          )}

          {userReview && (
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-blue-400" />
                <span className="text-blue-400 font-medium">You reviewed this {itemType}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                {renderStars(userReview.rating)}
                <span className="text-white font-medium">{userReview.title}</span>
              </div>
              {userReview.comment && (
                <p className="text-gray-300 text-sm">{userReview.comment}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Form */}
      <AnimatePresence>
        {showReviewForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-gray-800/30 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white">Write a Review</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Rating *
                    </label>
                    {renderStars(formData.rating, true, (rating) => 
                      setFormData(prev => ({ ...prev, rating }))
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Title
                    </label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Brief summary of your experience"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Comment
                    </label>
                    <Textarea
                      value={formData.comment}
                      onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                      placeholder="Share your detailed experience..."
                      rows={4}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={submitting || formData.rating === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {submitting ? "Submitting..." : "Submit Review"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowReviewForm(false)}
                      className="border-gray-600 text-gray-300 hover:text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-gray-800/30 border-gray-700/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-600 text-white">
                      {review.reviewer_name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-white">{review.reviewer_name}</span>
                      {review.verified_purchase && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified Purchase
                        </Badge>
                      )}
                      {review.verified_participant && (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                          <User className="h-3 w-3 mr-1" />
                          Participant
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      {renderStars(review.rating)}
                      {review.title && (
                        <span className="font-medium text-white">{review.title}</span>
                      )}
                    </div>
                    
                    {review.comment && (
                      <p className="text-gray-300 text-sm leading-relaxed">{review.comment}</p>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(review.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {reviews.length === 0 && (
        <Card className="bg-gray-800/30 border-gray-700/50">
          <CardContent className="p-8 text-center">
            <MessageCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No reviews yet</h3>
            <p className="text-gray-400">
              Be the first to review this {itemType}!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

