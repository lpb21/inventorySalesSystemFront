import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsAPI, ApiNormalizers } from '../../api/config'

const QUERY_KEY = ['products']

export function useProducts(options = {}) {
    return useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const response = await productsAPI.getAll({ limit: 1000 })
            const data = ApiNormalizers.normalizeList(response, ['products', 'data'])
            return data.map(p => ({
                ...p,
                price: Number(p.price) || 0,
                cost: Number(p.cost) || 0,
                stock: Number(p.stock) || 0,
                min_stock: Number(p.min_stock) || 0,
                unit: p.unit || 'und'
            }))
        },
        ...options
    })
}

export function useProductMutations() {
    const queryClient = useQueryClient()

    const refreshProducts = async () => {
        await queryClient.invalidateQueries({ queryKey: QUERY_KEY })
        await queryClient.refetchQueries({ queryKey: QUERY_KEY, type: 'active' })
    }

    const extractProduct = (result) => {
        if (!result) return null
        if (result?.data?.product) return result.data.product
        if (result?.product) return result.product
        if (result?.id) return result
        return null
    }

    const normalizeProduct = (product) => {
        if (!product) return null
        return {
            ...product,
            price: Number(product.price) || 0,
            cost: Number(product.cost) || 0,
            stock: Number(product.stock) || 0,
            min_stock: Number(product.min_stock) || 0,
            unit: product.unit || 'und'
        }
    }

    const upsertProductInCache = (product, isEdit = false) => {
        if (!product?.id) return

        queryClient.setQueriesData({ queryKey: QUERY_KEY }, (old = []) => {
            if (!Array.isArray(old)) return old

            if (isEdit) {
                return old.map((item) => (item.id === product.id ? { ...item, ...product } : item))
            }

            const exists = old.some((item) => item.id === product.id)
            if (exists) return old
            return [product, ...old]
        })
    }

    const removeProductFromCache = (id) => {
        queryClient.setQueriesData({ queryKey: QUERY_KEY }, (old = []) => {
            if (!Array.isArray(old)) return old
            return old.filter((item) => item.id !== id)
        })
    }

    const createProduct = useMutation({
        mutationFn: (data) => productsAPI.create(data),
        onSuccess: async (result) => {
            const created = normalizeProduct(extractProduct(result))
            upsertProductInCache(created, false)
            await refreshProducts()
        }
    })

    const updateProduct = useMutation({
        mutationFn: ({ id, data }) => productsAPI.update(id, data),
        onSuccess: async (result, variables) => {
            const updated = normalizeProduct(extractProduct(result) || { id: variables?.id, ...(variables?.data || {}) })
            upsertProductInCache(updated, true)
            await refreshProducts()
        }
    })

    const deleteProduct = useMutation({
        mutationFn: (id) => productsAPI.delete(id),
        onSuccess: async (_result, id) => {
            removeProductFromCache(id)
            await refreshProducts()
        }
    })

    return { createProduct, updateProduct, deleteProduct }
}
