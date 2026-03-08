import { useState, useEffect, useRef } from "react"
import { getReviews, submitReview } from "./reviews.api"
import { getUserDataFromToken } from "@/lib/auth"
import { toast } from "sonner"

export function useReviews(productId: string) {
  const [reviews, setReviews] = useState<any[]>([])
  const [myReview, setMyReview] = useState<any | null>(null)
  const [ratingValue, setRatingValue] = useState(5)
  const [comment, setComment] = useState("")
  const [userData, setUserData] = useState<{ id: number; name: string } | null>(null)
  const commentRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    getUserDataFromToken().then(setUserData)
  }, [])

  useEffect(() => {
    async function loadReviews() {
      try {
        const res = await getReviews(Number(productId))
        setReviews(res)
        const u = await getUserDataFromToken()
        if (u) {
          const mine = res.find((r: any) => r.userId === u.id)
          if (mine) {
            setMyReview(mine)
            setRatingValue(mine.rating)
            setComment(mine.comment || "")
          }
        }
      } catch (err) {
        console.error("Error fetching reviews:", err)
      }
    }
    loadReviews()
  }, [productId])

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
      : 0
  const roundedRating = Math.round(averageRating)

  async function handleReviewSubmit() {
    if (!userData) return
    const text = commentRef.current?.value || ""
    try {
      await submitReview(Number(productId), ratingValue, text)
      const updated = await getReviews(Number(productId))
      setReviews(updated)
      const mine = updated.find((r: any) => r.userId === userData.id)
      setMyReview(mine)
      setComment(text)
      toast.success("Reseña guardada")
    } catch (err) {
      console.error(err)
      toast.error("Error al guardar la reseña")
    }
  }

  return {
    reviews,
    myReview,
    ratingValue,
    setRatingValue,
    comment,
    setComment,
    commentRef,
    userData,
    averageRating,
    roundedRating,
    handleReviewSubmit,
  }
}
