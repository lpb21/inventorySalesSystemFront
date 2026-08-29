import { useQuery } from '@tanstack/react-query'
import { recipesAPI, ApiNormalizers } from '../../api/config'

const QUERY_KEY = ['recipes']

/**
 * Trae la lista de recetas de despiece del tenant.
 * Cada receta trae su producto origen (sourceProduct).
 */
export function useRecipes(options = {}) {
    return useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const response = await recipesAPI.getAll()
            return ApiNormalizers.normalizeList(response, ['data', 'recipes'])
        },
        ...options
    })
}

/**
 * Trae UNA receta completa con sus items (cortes sugeridos).
 * Se usa al seleccionar una receta para pre-llenar el despiece.
 */
export function useRecipeDetail(recipeId, options = {}) {
    return useQuery({
        queryKey: ['recipe', recipeId],
        queryFn: async () => {
            const response = await recipesAPI.getById(recipeId)
            // El detalle viene en response.data (un objeto, no lista)
            return response?.data || response
        },
        enabled: !!recipeId,  // solo consulta si hay un id
        ...options
    })
}