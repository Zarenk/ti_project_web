import { useState, useEffect, useCallback } from "react"
import { getProduct, getPublicProduct } from "../../dashboard/products/products.api"
import { getCategories } from "@/app/dashboard/categories/categories.api"
import { getAuthToken } from "@/utils/auth-token"

export function useProductEdit(
  product: any,
  fetchProduct: () => Promise<void>,
  setRelatedProducts: React.Dispatch<React.SetStateAction<any[]>>,
) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [productToEdit, setProductToEdit] = useState<any | null>(null)
  const [isLoadingProductToEdit, setIsLoadingProductToEdit] = useState(false)

  useEffect(() => {
    if (!isEditDialogOpen) return
    let isMounted = true
    setIsLoadingCategories(true)
    getCategories()
      .then((data) => {
        if (!isMounted) return
        setCategories(Array.isArray(data) ? data : [])
      })
      .catch((error) => {
        if (!isMounted) return
        console.error("Error fetching categories:", error)
        setCategories([])
      })
      .finally(() => {
        if (isMounted) setIsLoadingCategories(false)
      })
    return () => { isMounted = false }
  }, [isEditDialogOpen])

  useEffect(() => {
    if (!isEditDialogOpen) {
      setProductToEdit(null)
      setIsLoadingProductToEdit(false)
    }
  }, [isEditDialogOpen])

  const handleEditButtonClick = useCallback(() => {
    if (!product) return
    setProductToEdit(product)
    setIsLoadingProductToEdit(false)
    setIsEditDialogOpen(true)
  }, [product])

  const handleRelatedProductEditClick = useCallback(
    async (productId: number) => {
      setIsEditDialogOpen(true)
      if (product && product.id === productId) {
        setProductToEdit(product)
        setIsLoadingProductToEdit(false)
        return
      }
      setIsLoadingProductToEdit(true)
      setProductToEdit(null)
      try {
        const hasAuth = Boolean(await getAuthToken())
        const productData = hasAuth
          ? await getProduct(String(productId))
          : await getPublicProduct(String(productId))
        setProductToEdit(productData)
      } catch (error) {
        console.error("Error fetching product for edit:", error)
        setProductToEdit(null)
      } finally {
        setIsLoadingProductToEdit(false)
      }
    },
    [product],
  )

  const handleProductUpdateSuccess = useCallback(
    async (updatedProduct: any) => {
      setIsEditDialogOpen(false)
      setProductToEdit(null)
      try {
        await fetchProduct()
      } catch (error) {
        console.error("Error refreshing product after update:", error)
      }
      if (updatedProduct?.id != null) {
        setRelatedProducts((prev: any[]) =>
          prev.map((rp: any) =>
            rp.id === updatedProduct.id
              ? {
                  ...rp,
                  ...updatedProduct,
                  brand: updatedProduct.brand ?? rp.brand,
                  category:
                    typeof updatedProduct.category === "string"
                      ? updatedProduct.category
                      : updatedProduct.category?.name ?? rp.category,
                  images:
                    Array.isArray(updatedProduct.images) && updatedProduct.images.length > 0
                      ? updatedProduct.images
                      : rp.images,
                }
              : rp,
          ),
        )
      }
    },
    [fetchProduct, setRelatedProducts],
  )

  const handleImageUpdated = useCallback(
    (nextImages: string[]) => {
      setProductToEdit((prev: any) =>
        prev && product && prev.id === product.id
          ? { ...prev, images: nextImages }
          : prev,
      )
      void fetchProduct()
    },
    [fetchProduct, product],
  )

  const handleRelatedImageUpdated = useCallback(
    (productId: number, nextImages: string[]) => {
      setRelatedProducts((prev: any[]) =>
        prev.map((rp: any) =>
          rp.id === productId ? { ...rp, images: nextImages } : rp,
        ),
      )
      setProductToEdit((prev: any) =>
        prev && prev.id === productId ? { ...prev, images: nextImages } : prev,
      )
    },
    [setRelatedProducts],
  )

  return {
    isEditDialogOpen,
    setIsEditDialogOpen,
    categories,
    isLoadingCategories,
    productToEdit,
    isLoadingProductToEdit,
    handleEditButtonClick,
    handleRelatedProductEditClick,
    handleProductUpdateSuccess,
    handleImageUpdated,
    handleRelatedImageUpdated,
  }
}
