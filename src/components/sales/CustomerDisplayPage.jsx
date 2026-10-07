import { useState, useEffect } from 'react'
import { useGlobalContext } from '../../context/GlobalContext'
import { getBusinessName } from '../../utils/lastBusiness'
import CustomerDisplay from './CustomerDisplay'
 
/**
 * CustomerDisplayPage — Página de la pantalla cliente (ventana aparte).
 * Escucha el carrito emitido por la ventana de ventas vía BroadcastChannel
 * y lo muestra en tiempo real. Sin menú ni layout: pantalla limpia para el cliente.
 */
function CustomerDisplayPage() {
  const { currentUser } = useGlobalContext()
  const [cart, setCart] = useState([])
  const [cartTotal, setCartTotal] = useState(0)
 
  useEffect(() => {
    // Canal de comunicación con la ventana de ventas
    const channel = new BroadcastChannel('pos-customer-display')
 
    // Cuando la ventana de ventas emite el carrito, actualizamos
    channel.onmessage = (event) => {
      if (event.data?.type === 'cart-update') {
        setCart(event.data.cart || [])
        setCartTotal(event.data.cartTotal || 0)
      }
    }
 
    // Al abrir, pedimos el estado actual (por si ya hay una venta en curso)
    channel.postMessage({ type: 'request-cart' })
 
    return () => channel.close()
  }, [])
 
  const handleClose = () => {
    window.close()
  }
 
  return (
    <CustomerDisplay
      business={{
        name: getBusinessName(currentUser),
        address: currentUser?.tenant?.address?.trim() || null,
        phone: currentUser?.tenant?.phone?.trim() || null,
      }}
      cart={cart}
      cartTotal={cartTotal}
      onClose={handleClose}
    />
  )
}
 
export default CustomerDisplayPage