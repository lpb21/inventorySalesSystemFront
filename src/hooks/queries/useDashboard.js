import { useQuery } from '@tanstack/react-query'
import { salesAPI, reportsAPI } from '../../api/config'
import { useGlobalContext } from '../../context/GlobalContext'
import { can } from '../../utils/permissions'

export function useDashboardData(options = {}) {
    const { currentUser } = useGlobalContext()

    // Solo ejecutar si el usuario tiene permisos para ver reportes
    const canViewReports = can(currentUser, 'canViewFullReports')

    return useQuery({
        queryKey: ['dashboard'],
        queryFn: async () => {
            const [salesTodayRes, dashboardRes] = await Promise.all([
                salesAPI.getToday(),
                reportsAPI.getDashboard()
            ])

            const dashboardSummary = dashboardRes?.summary || {}
            const salesSummary = salesTodayRes?.summary || {}
            const recentSales = salesTodayRes?.sales || []

            return {
                metrics: {
                    todaySales: salesSummary.totalRevenue || dashboardSummary.todayRevenue || 0,
                    todayProfit: salesSummary.totalProfit || dashboardSummary.todayProfit || 0,
                    lowStockCount: dashboardSummary.lowStockCount || 0,
                    totalProducts: dashboardSummary.totalProducts || 0
                },
                recentSales
            }
        },
        ...options,
        enabled: canViewReports && (options.enabled ?? true), // el permiso SIEMPRE manda; respeta un enabled extra del consumidor
    })
}
