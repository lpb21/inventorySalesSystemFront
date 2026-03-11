/**
 * Exporta un listado de ventas (con detalle de productos) a un archivo CSV descargable.
 * Ideal para ser llamado después de obtener la data de /v1/sales/by-date
 * 
 * @param {Array} salesArray - El arreglo de ventas (data.data.sales)
 * @param {String} filename - Nombre del archivo a descargar (ej. 'reporte-ventas-marzo.csv')
 */
export const exportSalesToCSV = (salesArray, filename = 'reporte-ventas.csv') => {
    // 1. Validar que tengamos datos
    if (!salesArray || salesArray.length === 0) {
        console.warn("No hay datos de ventas para exportar");
        return;
    }

    // 2. Definir las Cabeceras de nuestro Excel (separadas por coma)
    const headers = [
        'ID Venta',
        'Fecha',
        'Cliente',
        'Método de Pago',
        'Total Venta',
        'Estado',
        'Producto',
        'Cantidad',
        'Precio Unitario',
        'Subtotal Producto'
    ].join(',');

    // 3. Transformar los datos: Por cada Venta -> Por cada Producto -> Crear una Fila
    const csvRows = [];
    csvRows.push(headers); // Añadimos la cabecera como primera fila

    salesArray.forEach(sale => {
        // Formatear la fecha para que sea legible en Excel
        const date = new Date(sale.created_at).toLocaleDateString('es-CO');

        // Normalizar algunos textos (quitar comas internas para no romper el CSV)
        const clientName = (sale.customer_name || 'Mostrador').replace(/,/g, '');
        const paymentMethod = sale.payment_method || 'Desconocido';

        // Si la venta por alguna razón no tiene productos, ponemos una fila genérica
        if (!sale.items || sale.items.length === 0) {
            const row = [
                sale.id, date, clientName, paymentMethod, sale.total, sale.status,
                'Sin productos', 0, 0, 0
            ].join(',');
            csvRows.push(row);
            return;
        }

        // Por cada producto comprado en esta factura, creamos UNA FILA detallada
        sale.items.forEach(item => {
            // Intentar obtener el nombre del producto
            const productName = item.product?.name ? item.product.name.replace(/,/g, '') : 'Producto Desconocido';

            const row = [
                sale.id,
                date,
                clientName,
                paymentMethod,
                sale.total, // El total de LA FACTURA completa
                sale.status,
                productName, // <-- El dato clave agregado hoy
                item.quantity,
                item.unit_price,
                item.subtotal // El total de ESTE ÍTEM específico
            ].join(',');

            csvRows.push(row);
        });
    });

    // 4. Unir todas las filas con saltos de línea y crear el contenido (BOM para soportar tildes/ñ en Excel)
    const csvString = '\uFEFF' + csvRows.join('\n'); // '\uFEFF' es crucial para que Excel lea los acentos UTF-8

    // 5. Crear el archivo Blob y detonar la descarga en el navegador
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click(); // Disparamos el clic falso

    // 6. Limpiar la memoria
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
};
