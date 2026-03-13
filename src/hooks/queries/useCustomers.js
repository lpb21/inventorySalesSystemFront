import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customersAPI, ApiNormalizers } from '../../api/config'

export function useCustomers(options = {}) {
    return useQuery({
        queryKey: ['customers'],
        queryFn: async () => {
            const response = await customersAPI.getAll()
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

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['customers'] })
        // También invalidar customers con crédito para cuentas por cobrar
        queryClient.invalidateQueries({ queryKey: ['customers', 'with-credit'] })
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

    return { createCustomer, updateCustomer, deleteCustomer, registerPayment }
}
