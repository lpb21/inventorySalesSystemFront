import { useQuery } from '@tanstack/react-query'
import { salesAPI, reportsAPI } from '../../api/config'

export function useDashboardData(options = {}) {
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
        ...options
    })
}
