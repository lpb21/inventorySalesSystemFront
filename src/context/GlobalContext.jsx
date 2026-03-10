import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { 
    productsAPI, categoriesAPI, salesAPI, usersAPI, 
    customersAPI, tenantAPI, reportsAPI, ApiNormalizers, 
    getToken, getUser 
} from '../api/config'
import { useToasts } from '../hooks/useToasts'
import { useCart } from '../hooks/useCart'

const GlobalContext = createContext()

export const useGlobalContext = () => {
    const context = useContext(GlobalContext)
    if (!context) {
        throw new Error('useGlobalContext must be used within a GlobalProvider')
    }
    return context
}

export const GlobalProvider = ({ children }) => {
    // Auth state (managed here for now, could be its own AuthContext)
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    const [authChecked, setAuthChecked] = useState(false)

    // Data state
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [users, setUsers] = useState([])
    const [customers, setCustomers] = useState([])
    const [sales, setSales] = useState([])
    const [businessData, setBusinessData] = useState(null)
    const [dashboardData, setDashboardData] = useState({
        todaySales: 0,
        todayProfit: 0,
        lowStockCount: 0,
        totalProducts: 0
    })

    // Loading & Status
    const [status, setStatus] = useState({
        products: { loading: false, error: null },
        categories: { loading: false, error: null },
        sales: { loading: false, error: null },
        users: { loading: false, error: null },
        customers: { loading: false, error: null },
        dashboard: { loading: false, error: null }
    })

    // Hooks
    const { toasts, addToast, removeToast } = useToasts()
    const cartState = useCart()

    // ── Auth Actions ────────────────────────────────────────────────────

    const checkAuth = useCallback(async () => {
        const token = getToken()
        const savedUser = getUser()

        if (token && savedUser) {
            setIsLoggedIn(true)
            setCurrentUser(savedUser)
            setAuthChecked(true)
        } else {
            setIsLoggedIn(false)
            setCurrentUser(null)
            setAuthChecked(true)
        }
    }, [])

    const login = useCallback((userData, token) => {
        // Assume getToken/setUser already handled by Login component for now, 
        // but we update context state
        setIsLoggedIn(true)
        setCurrentUser(userData)
    }, [])

    const logout = useCallback(() => {
        import('../api/config').then(api => api.clearSession())
        setIsLoggedIn(false)
        setCurrentUser(null)
    }, [])

    // ── Actions ──────────────────────────────────────────────────────────

    const loadProducts = useCallback(async () => {
        setStatus(prev => ({ ...prev, products: { loading: true, error: null } }))
        try {
            const response = await productsAPI.getAll({ limit: 100 })
            const data = ApiNormalizers.normalizeList(response, ['products'])
            setProducts(
                data.map(p => ({
                    ...p,
                    price: Number(p.price) || 0,
                    cost: Number(p.cost) || 0,
                    stock: Number(p.stock) || 0,
                    min_stock: Number(p.min_stock) || 0,
                    unit: p.unit || 'und'
                }))
            )
            setStatus(prev => ({ ...prev, products: { loading: false, error: null } }))
        } catch (error) {
            console.error('Error cargando productos:', error)
            setStatus(prev => ({ ...prev, products: { loading: false, error } }))
            addToast('Error al cargar productos', 'error')
        }
    }, [addToast])

    const loadCategories = useCallback(async (includeInactive = false) => {
        setStatus(prev => ({ ...prev, categories: { loading: true, error: null } }))
        try {
            const response = includeInactive ? await categoriesAPI.getAllWithInactive() : await categoriesAPI.getAll()
            const list = ApiNormalizers.normalizeList(response, ['categories', 'data'])
            setCategories(list)
            setStatus(prev => ({ ...prev, categories: { loading: false, error: null } }))
        } catch (error) {
            console.error('Error cargando categorías:', error)
            setStatus(prev => ({ ...prev, categories: { loading: false, error } }))
            addToast('Error al cargar categorías', 'error')
        }
    }, [addToast])

    const loadDashboardData = useCallback(async () => {
        setStatus(prev => ({ ...prev, dashboard: { loading: true, error: null } }))
        try {
            const [salesRes, summaryRes] = await Promise.all([
                salesAPI.getToday(),
                reportsAPI.getDashboard()
            ])

            const todaySalesList = ApiNormalizers.normalizeList(salesRes, ['sales'])
            const todaySales = todaySalesList.reduce((sum, s) => sum + (Number(s.total) || 0), 0)
            const todayProfit = todaySalesList.reduce((sum, s) => sum + (Number(s.profit) || 0), 0)

            // summaryRes is the dashboardData from backend (normalized by apiRequest)
            // It contains { summary: { todayRevenue, todayProfit, ..., lowStockCount, totalProducts }, ... }
            const summary = summaryRes?.summary || {}

            setDashboardData({
                todaySales: todaySales || summary.todayRevenue || 0,
                todayProfit: todayProfit || summary.todayProfit || 0,
                lowStockCount: summary.lowStockCount || 0,
                totalProducts: summary.totalProducts || 0
            })
            setStatus(prev => ({ ...prev, dashboard: { loading: false, error: null } }))
        } catch (error) {
            console.error('Error cargando dashboard:', error)
            setStatus(prev => ({ ...prev, dashboard: { loading: false, error } }))
        }
    }, [])

    const loadBusinessData = useCallback(async () => {
        try {
            const response = await tenantAPI.getCurrent()
            if (response && (response.data || response.id)) {
                setBusinessData(response.data || response)
            }
        } catch (error) {
            console.error('Error cargando datos del negocio:', error)
        }
    }, [])

    const loadUsers = useCallback(async () => {
        setStatus(prev => ({ ...prev, users: { loading: true, error: null } }))
        try {
            const response = await usersAPI.getAll()
            const list = ApiNormalizers.normalizeList(response, ['users'])
            setUsers(list)
            setStatus(prev => ({ ...prev, users: { loading: false, error: null } }))
        } catch (error) {
            console.error('Error cargando usuarios:', error)
            setStatus(prev => ({ ...prev, users: { loading: false, error } }))
        }
    }, [])

    const loadCustomers = useCallback(async () => {
        setStatus(prev => ({ ...prev, customers: { loading: true, error: null } }))
        try {
            const response = await customersAPI.getAll()
            const list = ApiNormalizers.normalizeList(response, ['customers'])
            setCustomers(list)
            setStatus(prev => ({ ...prev, customers: { loading: false, error: null } }))
        } catch (error) {
            console.error('Error cargando clientes:', error)
            setStatus(prev => ({ ...prev, customers: { loading: false, error } }))
        }
    }, [])

    const loadRecentSales = useCallback(async () => {
        setStatus(prev => ({ ...prev, sales: { loading: true, error: null } }))
        try {
            const response = await salesAPI.getAll({ limit: 50 })
            const list = ApiNormalizers.normalizeList(response, ['sales'])
            setSales(list)
            setStatus(prev => ({ ...prev, sales: { loading: false, error: null } }))
        } catch (error) {
            console.error('Error cargando ventas:', error)
            setStatus(prev => ({ ...prev, sales: { loading: false, error } }))
        }
    }, [])

    // Initial load
    useEffect(() => {
        checkAuth()
    }, [checkAuth])

    useEffect(() => {
        if (isLoggedIn) {
            loadProducts()
            loadCategories()
            loadDashboardData()
            loadBusinessData()
            loadUsers()
            loadCustomers()
            loadRecentSales()
        }
    }, [isLoggedIn, loadProducts, loadCategories, loadDashboardData, loadBusinessData, loadUsers, loadCustomers, loadRecentSales])

    const value = {
        isLoggedIn, setIsLoggedIn,
        currentUser, setCurrentUser,
        authChecked, setAuthChecked,
        checkAuth, login, logout,
        products, setProducts, loadProducts,
        categories, setCategories, loadCategories,
        users, setUsers, loadUsers,
        customers, setCustomers, loadCustomers,
        sales, setSales, loadRecentSales,
        businessData, setBusinessData, loadBusinessData,
        dashboardData, loadDashboardData,
        status, setStatus,
        toasts, addToast, removeToast,
        cart: cartState.cart,
        posKey: cartState.posKey,
        cartTotal: cartState.cartTotal,
        addToCart: cartState.addToCart,
        updateCartQuantity: cartState.updateCartQuantity,
        updateCartWeight: cartState.updateCartWeight,
        removeFromCart: cartState.removeFromCart,
        clearCart: cartState.clearCart
    }

    return (
        <GlobalContext.Provider value={value}>
            {children}
        </GlobalContext.Provider>
    )
}
