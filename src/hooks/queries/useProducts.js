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

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    }

    const createProduct = useMutation({
        mutationFn: (data) => productsAPI.create(data),
        onSuccess: invalidate
    })

    const updateProduct = useMutation({
        mutationFn: ({ id, data }) => productsAPI.update(id, data),
        onSuccess: invalidate
    })

    const deleteProduct = useMutation({
        mutationFn: (id) => productsAPI.delete(id),
        onSuccess: invalidate
    })

    return { createProduct, updateProduct, deleteProduct }
}
