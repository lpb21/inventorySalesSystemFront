import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customersAPI, ApiNormalizers } from '../../api/config'

export function useCustomers({ isActive, ...options } = {}) {
    return useQuery({
        queryKey: ['customers', isActive],
        queryFn: async () => {
            const params = typeof isActive === 'boolean' ? { is_active: String(isActive) } : {}
            const response = await customersAPI.getAll(params)
            return ApiNormalizers.normalizeList(response, ['customers', 'data'])
        },
        ...options
    })
}

export function useCustomersWithCredit(options = {}) {
    return useQuery({
        queryKey: ['customers', 'with-credit'],
        queryFn: async () => {
            const response = await customersAPI.getWithCredit()
            const rawList = ApiNormalizers.normalizeList(response, ['customers', 'data'])
            return rawList.map(c => ({
                ...c,
                credit_balance: c.credit_balance ?? c.total_credit ?? c.balance ?? 0
            }))
        },
        ...options
    })
}

export function useCustomerMutations() {
    const queryClient = useQueryClient()

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: ['customers'] })
        // También invalidar customers con crédito para cuentas por cobrar
        await queryClient.invalidateQueries({ queryKey: ['customers', 'with-credit'] })
        await queryClient.refetchQueries({ queryKey: ['customers'], type: 'active' })
        await queryClient.refetchQueries({ queryKey: ['customers', 'with-credit'], type: 'active' })
    }

    const createCustomer = useMutation({
        mutationFn: (data) => customersAPI.create(data),
        onSuccess: invalidate
    })

    const updateCustomer = useMutation({
        mutationFn: ({ id, data }) => customersAPI.update(id, data),
        onSuccess: invalidate
    })

    const deleteCustomer = useMutation({
        mutationFn: (id) => customersAPI.delete(id),
        onSuccess: invalidate
    })

    const registerPayment = useMutation({
        mutationFn: ({ id, data }) => customersAPI.registerPayment(id, data),
        onSuccess: async (_result, variables) => {
            await invalidate()

            if (variables?.id) {
                await queryClient.invalidateQueries({ queryKey: ['customers', variables.id, 'balance'] })
                await queryClient.invalidateQueries({ queryKey: ['customers', variables.id, 'credit-sales'] })
                await queryClient.refetchQueries({ queryKey: ['customers', variables.id, 'balance'], type: 'active' })
                await queryClient.refetchQueries({ queryKey: ['customers', variables.id, 'credit-sales'], type: 'active' })
            }
        }
    })

    return { createCustomer, updateCustomer, deleteCustomer, registerPayment }
}
