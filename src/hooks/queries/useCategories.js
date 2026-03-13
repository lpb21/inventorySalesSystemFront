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

    const refreshCategories = async () => {
        await queryClient.invalidateQueries({ queryKey: ['categories'] })
        await queryClient.refetchQueries({ queryKey: ['categories'], type: 'active' })
    }

    const extractCategory = (result) => {
        if (!result) return null
        if (result?.data?.category) return result.data.category
        if (result?.category) return result.category
        if (result?.id) return result
        return null
    }

    const upsertCategoryInCache = (category, isEdit = false) => {
        if (!category?.id) return

        queryClient.setQueriesData({ queryKey: ['categories'] }, (old = []) => {
            if (!Array.isArray(old)) return old

            if (isEdit) {
                return old.map((item) => (item.id === category.id ? { ...item, ...category } : item))
            }

            const exists = old.some((item) => item.id === category.id)
            if (exists) return old
            return [category, ...old]
        })
    }

    const updateCategoryStatusInCache = (id, isActive) => {
        queryClient.setQueriesData({ queryKey: ['categories'] }, (old = []) => {
            if (!Array.isArray(old)) return old
            return old.map((item) => (item.id === id ? { ...item, is_active: isActive } : item))
        })
    }

    const createCategory = useMutation({
        mutationFn: (data) => categoriesAPI.create(data),
        onSuccess: async (result) => {
            upsertCategoryInCache(extractCategory(result), false)
            await refreshCategories()
        }
    })

    const updateCategory = useMutation({
        mutationFn: ({ id, data }) => categoriesAPI.update(id, data),
        onSuccess: async (result, variables) => {
            upsertCategoryInCache(extractCategory(result) || { id: variables?.id, ...(variables?.data || {}) }, true)
            await refreshCategories()
        }
    })

    const reactivateCategory = useMutation({
        mutationFn: (id) => categoriesAPI.reactivate(id),
        onSuccess: async (_result, id) => {
            updateCategoryStatusInCache(id, true)
            await refreshCategories()
        }
    })

    const deactivateCategory = useMutation({
        mutationFn: (id) => categoriesAPI.deactivate(id),
        onSuccess: async (_result, id) => {
            updateCategoryStatusInCache(id, false)
            await refreshCategories()
        }
    })

    return { createCategory, updateCategory, reactivateCategory, deactivateCategory }
}
