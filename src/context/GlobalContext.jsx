import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { 
    productsAPI, categoriesAPI, salesAPI, usersAPI, 
    customersAPI, tenantAPI, reportsAPI, suppliersAPI, ApiNormalizers, 
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
    // React Query client para limpiar cache
    const queryClient = useQueryClient()
    
    // Auth state (managed here for now, could be its own AuthContext)
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    const [authChecked, setAuthChecked] = useState(false)

    // Data state
    const [users, setUsers] = useState([])
    const [businessData, setBusinessData] = useState(null)

    // Loading & Status
    const [status, setStatus] = useState({
        users: { loading: false, error: null }
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
        // Limpiar cache previo para evitar datos de usuario anterior
        queryClient.clear()
        
        // Actualizar estado del contexto
        setIsLoggedIn(true)
        setCurrentUser(userData)
        setBusinessData(null) // Limpiar para que no muestre el negocio anterior mientras carga
    }, [queryClient])

    const logout = useCallback(() => {
        // Limpiar sesión del localStorage
        import('../api/config').then(api => api.clearSession())
        
        // Limpiar todo el cache de React Query al cambiar de usuario
        queryClient.clear()
        
        // Actualizar estado local
        setIsLoggedIn(false)
        setCurrentUser(null)
        setBusinessData(null) // Limpiar datos del negocio
    }, [queryClient])

    // ── Actions ──────────────────────────────────────────────────────────

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

    // Initial load
    useEffect(() => {
        checkAuth()
    }, [checkAuth])

    useEffect(() => {
        if (isLoggedIn) {
            loadBusinessData()
            loadUsers()
        }
    }, [isLoggedIn, loadBusinessData, loadUsers])

    const value = {
        isLoggedIn, setIsLoggedIn,
        currentUser, setCurrentUser,
        authChecked, setAuthChecked,
        checkAuth, login, logout,
        users, setUsers, loadUsers,
        businessData, setBusinessData, loadBusinessData,
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
