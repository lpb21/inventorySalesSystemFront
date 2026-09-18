import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { announcementsAPI, adminAPI } from '../../api/config'
import { useGlobalContext } from '../../context/GlobalContext'

/**
 * Anuncio activo del banner (visible para cualquier usuario logueado,
 * de cualquier tenant). Lo consume AnnouncementBanner.
 */
export function useActiveAnnouncement(options = {}) {
    const { isLoggedIn } = useGlobalContext()

    return useQuery({
        queryKey: ['announcement', 'active'],
        queryFn: () => announcementsAPI.getActive(),
        enabled: isLoggedIn && (options.enabled ?? true),
        staleTime: 60 * 1000, // 1 min - no hace falta refrescar más seguido
        ...options,
    })
}

/**
 * Lista completa de anuncios (activos e inactivos) para el panel de superadmin.
 */
export function useAnnouncementsList(options = {}) {
    return useQuery({
        queryKey: ['announcements', 'admin-list'],
        queryFn: async () => {
            const response = await adminAPI.listAnnouncements()
            return Array.isArray(response) ? response : (response?.data || [])
        },
        ...options,
    })
}

/**
 * Mutaciones de anuncios: crear, editar, activar/desactivar. Solo superadmin.
 */
export function useAnnouncementMutations() {
    const queryClient = useQueryClient()

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['announcements', 'admin-list'] })
        queryClient.invalidateQueries({ queryKey: ['announcement', 'active'] })
    }

    const create = useMutation({
        mutationFn: (data) => adminAPI.createAnnouncement(data),
        onSuccess: invalidate,
    })

    const update = useMutation({
        mutationFn: ({ id, data }) => adminAPI.updateAnnouncement(id, data),
        onSuccess: invalidate,
    })

    const toggle = useMutation({
        mutationFn: (id) => adminAPI.toggleAnnouncement(id),
        onSuccess: invalidate,
    })

    return { create, update, toggle }
}
