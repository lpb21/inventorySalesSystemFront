import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesAPI, ApiNormalizers } from '../../api/config'

export function useCategories({ includeInactive = false, ...options } = {}) {
    return useQuery({
        queryKey: ['categories', includeInactive],
        queryFn: async () => {
            const response = includeInactive
                ? await categoriesAPI.getAllWithInactive()
                : await categoriesAPI.getAll()
            return ApiNormalizers.normalizeList(response, ['categories', 'data'])
        },
        ...options
    })
}

export function useCategoryMutations() {
    const queryClient = useQueryClient()

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['categories'] })
    }

    const createCategory = useMutation({
        mutationFn: (data) => categoriesAPI.create(data),
        onSuccess: invalidate
    })

    const updateCategory = useMutation({
        mutationFn: ({ id, data }) => categoriesAPI.update(id, data),
        onSuccess: invalidate
    })

    const reactivateCategory = useMutation({
        mutationFn: (id) => categoriesAPI.reactivate(id),
        onSuccess: invalidate
    })

    const deactivateCategory = useMutation({
        mutationFn: (id) => categoriesAPI.deactivate(id),
        onSuccess: invalidate
    })

    return { createCategory, updateCategory, reactivateCategory, deactivateCategory }
}
