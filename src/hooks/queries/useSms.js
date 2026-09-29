import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAPI, smsAPI, salesAPI, customersAPI } from '../../api/config'
import { useGlobalContext } from '../../context/GlobalContext'
import { can } from '../../utils/permissions'

const STATUS_KEY = ['sms-status']
const ADMIN_OVERVIEW_KEY = ['admin-sms-overview']

/**
 * Estado de SMS del tenant logueado: { sms_enabled, sms_balance, sent_this_month, packages }.
 * Superadmin sin empresa no tiene tenant: no consulta.
 */
export function useSmsStatus(options = {}) {
    const { isLoggedIn, currentUser } = useGlobalContext()
    return useQuery({
        queryKey: STATUS_KEY,
        queryFn: () => smsAPI.getStatus(),
        staleTime: 60 * 1000,
        ...options,
        enabled: isLoggedIn && !!currentUser?.tenant && (options.enabled ?? true),
    })
}

/**
 * Envío del aviso SMS al cliente desde el modal (el tendero decide si lo envía).
 * target: { type: 'sale', saleId } | { type: 'payment', customerId, paymentId }
 * Devuelve { sent, reason, message, to, sms_balance } y refresca el saldo de SMS.
 */
export function useSendSmsNotification() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (target) => target.type === 'sale'
            ? salesAPI.notifySms(target.saleId)
            : customersAPI.notifyPaymentSms(target.customerId, target.paymentId),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: STATUS_KEY })
        },
    })
}

// ---------------------------------------------------------------------------
// Superadmin
// ---------------------------------------------------------------------------

/**
 * Panel SMS del superadmin, paginado y filtrable.
 * filters: { page, limit, tenantId, sms, balance }
 */
export function useAdminSmsOverview(filters = {}, options = {}) {
    const user = JSON.parse(localStorage.getItem('invah_user') || 'null')
    return useQuery({
        queryKey: [...ADMIN_OVERVIEW_KEY, filters],
        queryFn: () => adminAPI.getSmsOverview(filters),
        // Mantiene la página anterior visible mientras carga la siguiente
        placeholderData: (previous) => previous,
        ...options,
        enabled: can(user, 'canManageAllTenants') && (options.enabled ?? true),
    })
}

export function useAdminTenantSmsHistory(tenantId) {
    return useQuery({
        queryKey: ['admin-sms-history', tenantId],
        queryFn: async () => {
            const [transactions, logs] = await Promise.all([
                adminAPI.getTenantSmsTransactions(tenantId),
                adminAPI.getTenantSmsLogs(tenantId),
            ])
            return {
                transactions: transactions?.transactions || [],
                logs: logs?.logs || [],
            }
        },
        enabled: !!tenantId,
    })
}

export function useAdminSmsMutations() {
    const queryClient = useQueryClient()
    const refresh = (tenantId) => {
        queryClient.invalidateQueries({ queryKey: ADMIN_OVERVIEW_KEY })
        if (tenantId) queryClient.invalidateQueries({ queryKey: ['admin-sms-history', tenantId] })
    }

    const setEnabled = useMutation({
        mutationFn: ({ tenantId, enabled }) => adminAPI.setTenantSmsEnabled(tenantId, enabled),
        onSuccess: (_, { tenantId }) => refresh(tenantId),
    })

    const grantWelcomeBonus = useMutation({
        mutationFn: ({ tenantId }) => adminAPI.grantSmsWelcomeBonus(tenantId),
        onSuccess: (_, { tenantId }) => refresh(tenantId),
    })

    const addCredits = useMutation({
        mutationFn: ({ tenantId, data }) => adminAPI.addTenantSmsCredits(tenantId, data),
        onSuccess: (_, { tenantId }) => refresh(tenantId),
    })

    const runBalanceCheck = useMutation({
        mutationFn: () => adminAPI.runSmsBalanceCheck(),
        onSuccess: () => refresh(),
    })

    return { setEnabled, grantWelcomeBonus, addCredits, runBalanceCheck }
}
