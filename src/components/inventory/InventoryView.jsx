import {
  Plus,
  Edit,
  Trash2,
  Package2,
  Milk,
  Beef,
  Drumstick,
  ArrowDownCircle,
  Eye,
  EyeOff,
  Calendar,
  AlertTriangle,
  Scissors,
} from "lucide-react";
import { can } from "../../utils/permissions";
import { useGlobalContext } from "../../context/GlobalContext";
import { useProducts, useProductMutations } from "../../hooks/queries/useProducts";
import { useCategories, useCategoryMutations } from "../../hooks/queries/useCategories";
import { useSuppliers, useSupplierMutations } from "../../hooks/queries/useSuppliers";
import { useExpiringSoonProducts, useExpiredProducts } from "../../hooks/queries/useExpiration";
import { getExpirationStatus } from "../../utils/expiration";
import { useProducts as useProductActions } from "../../hooks/useProducts";
import { useTransform } from "../../hooks/queries/useTransform";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import ProductModal from "./ProductModal";
import CategoryModal from "./CategoryModal";
import SupplierModal from "./SupplierModal";
import OutputModal from "./OutputModal";
import { categoriesAPI } from "../../api/config";
import TransformModal from "./TransformModal";

function InventoryView({ searchTerm }) {
  const { currentUser, addToast } = useGlobalContext();

  const queryClient = useQueryClient();

  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useSuppliers();
  const { data: expiringSoon = [] } = useExpiringSoonProducts();
  const { data: expired = [] } = useExpiredProducts();

  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [expirationFilter, setExpirationFilter] = useState("Todos"); // 'Todos', 'Vencidos', 'ProximosVencer'
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [showOutputModal, setShowOutputModal] = useState(false);
  const [showInactiveProducts, setShowInactiveProducts] = useState(false);
  const [showInactiveCategories, setShowInactiveCategories] = useState(false);
  const [showTransformModal, setShowTransformModal] = useState(false);
  const { transform } = useTransform();

  // Function to refresh products data
  const loadProducts = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.refetchQueries({ queryKey: ["products"] });
  };

  // Replace custom hooks handling modals with internal state + mutations
  const {
    createProduct: saveProduct,
    deleteProduct: deleteProductMutation,
    updateProduct: toggleProductStatus,
  } = useProductMutations();
  const { createSupplier: saveSupplier, deleteSupplier } =
    useSupplierMutations();
  const {
    createCategory,
    updateCategory,
    reactivateCategory,
    deactivateCategory,
  } = useCategoryMutations();
  const { deleteProduct } = useProductActions({
    addToast,
    loadProducts,
    editingProduct,
    setEditingProduct,
    setShowProductModal,
  });

  const handleSaveCategory = async (categoryData) => {
    try {
      if (categoryData.id) {
        await updateCategory.mutateAsync({
          id: categoryData.id,
          data: {
            name: categoryData.name,
            description: categoryData.description || "",
            icon: categoryData.icon || "package",
          },
        });
        addToast("Categoría editada con éxito", "success");
      } else {
        await createCategory.mutateAsync({
          name: categoryData.name,
          description: categoryData.description || "",
          icon: categoryData.icon || "package",
        });
        addToast("Categoría creada", "success");
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
    } catch (error) {
      addToast(
        categoryData.id
          ? "Error al editar categoría"
          : "Error al crear categoría",
        "error",
      );
    }
  };

  const handleToggleCategoryStatus = async (category) => {
    try {
      if (category.is_active === false) {
        await reactivateCategory.mutateAsync(category.id);
        addToast("Categoría activada", "success");
      } else {
        await deactivateCategory.mutateAsync(category.id);
        addToast("Categoría desactivada", "success");
      }
    } catch (error) {
      addToast("Error al cambiar estado de categoría", "error");
    }
  };

  const handleRegisterOutput = async (outputData) => {
    try {
      const { inventoryAPI } = await import("../../api/config");
      await inventoryAPI.createOutput(outputData);

      // 1. Mostrar éxito y cerrar modal inmediatamente
      addToast("Salida registrada exitosamente", "success");
      setShowOutputModal(false);

      // 2. Actualizar productos en la UI
      loadProducts();

      // 3. Actualizar dashboard (no bloqueante)
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) {
      console.error("Error en registro de salida:", error);
      addToast("Error al registrar salida", "error");
    }
  };

  const canEdit = can(currentUser, "canEditProducts");
  const canDelete = can(currentUser, "canDeleteProducts");
  const canManageCats = can(currentUser, "canManageCategories");

  const maxProducts = currentUser?.tenant?.limits?.maxProducts;
  const isProductLimitReached =
    !!maxProducts &&
    products.filter((p) => p.is_active !== false).length >= maxProducts;

  const processedProducts = showInactiveProducts
    ? products
    : products.filter((p) => p.is_active !== false);

  // Crear mapas de IDs para filtros de vencimiento
  const expiredIds = new Set(expired.map((p) => p.id));
  const expiringSoonIds = new Set(expiringSoon.map((p) => p.id));

  const filteredProducts = processedProducts.filter((p) => {
    const matchesSearch = p.name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "Todos" ||
      p.category_id === selectedCategory ||
      p.category?.name === selectedCategory;

    // Filtro de vencimiento
    let matchesExpiration = true;
    if (expirationFilter === "Vencidos") {
      matchesExpiration = expiredIds.has(p.id);
    } else if (expirationFilter === "ProximosVencer") {
      matchesExpiration = expiringSoonIds.has(p.id);
    }

    return matchesSearch && matchesCategory && matchesExpiration;
  });

  const allCategories = ["Todos", ...categories.map((c) => c.name)];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Filtros de categorías */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div className="category-tabs" style={{ marginBottom: 0 }}>
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  className={`category-tab ${selectedCategory === cat ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
              {canManageCats && (
                <button
                  className="category-tab"
                  style={{ border: "1px dashed var(--border)" }}
                  onClick={() => setShowCategoryModal(true)}
                >
                  <Plus size={14} /> Nueva
                </button>
              )}
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowInactiveProducts(!showInactiveProducts)}
              title={
                showInactiveProducts ? "Ocultar inactivos" : "Mostrar inactivos"
              }
            >
              {showInactiveProducts ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Filtros de vencimiento */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                fontSize: "14px",
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              Vencimiento:
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { key: "Todos", label: "Todos", icon: null },
                {
                  key: "Vencidos",
                  label: `Vencidos (${expired.length})`,
                  icon: AlertTriangle,
                  color: "var(--danger)",
                },
                {
                  key: "ProximosVencer",
                  label: `Próximos (${expiringSoon.length})`,
                  icon: Calendar,
                  color: "var(--warning)",
                },
              ].map((filter) => (
                <button
                  key={filter.key}
                  className={`btn btn-sm ${expirationFilter === filter.key ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setExpirationFilter(filter.key)}
                  style={{
                    fontSize: "12px",
                    ...(filter.color &&
                      expirationFilter !== filter.key && {
                        borderColor: filter.color,
                        color: filter.color,
                      }),
                  }}
                >
                  {filter.icon && (
                    <filter.icon size={14} style={{ marginRight: "4px" }} />
                  )}
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {canEdit && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setShowOutputModal(true)}
              >
                <ArrowDownCircle size={18} />
                Registrar Salida
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowTransformModal(true)}
              >
                <Scissors size={18} /> Despiezar
              </button>
            </>
          )}
          {canEdit && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingProduct(null);
                setShowProductModal(true);
              }}
              disabled={isProductLimitReached}
              title={
                isProductLimitReached
                  ? `Límite de ${maxProducts} productos de tu plan alcanzado`
                  : undefined
              }
            >
              <Plus size={18} />
              {isProductLimitReached ? "Límite Alcanzado" : "Nuevo Producto"}
            </button>
          )}
        </div>
      </div>

      <div className="product-grid">
        {filteredProducts.map((product) => {
          // Determinar estado de vencimiento para cada producto
          const isExpired = expiredIds.has(product.id);
          const isExpiringSoon = expiringSoonIds.has(product.id);
          const expirationStatus = product.expiry_date
            ? getExpirationStatus(product)
            : null;

          return (
            <div
              key={product.id}
              className="product-card"
              style={{ position: "relative" }}
            >
              {/* Badge de estado de vencimiento */}
              {(isExpired || isExpiringSoon) && (
                <div
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "10px",
                    fontWeight: 600,
                    zIndex: 1,
                    background: isExpired ? "var(--danger)" : "var(--warning)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                >
                  {isExpired ? (
                    <AlertTriangle size={12} />
                  ) : (
                    <Calendar size={12} />
                  )}
                  {isExpired ? "VENCIDO" : "PRÓXIMO"}
                </div>
              )}

              <div className="product-image">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                  />
                ) : (
                  <>
                    {product.category?.name === "Pollo" && (
                      <Drumstick size={48} />
                    )}
                    {product.category?.name === "Quesos" && <Milk size={48} />}
                    {(product.category?.name === "Carnes Frías" ||
                      product.category?.name === "Embutidos") && (
                      <Beef size={48} />
                    )}
                    {!["Pollo", "Quesos", "Carnes Frías", "Embutidos"].includes(
                      product.category?.name,
                    ) && <Package2 size={48} />}
                  </>
                )}
              </div>
              <div className="product-name">{product.name}</div>
              <div className="product-category">
                {product.category?.name || product.category}
              </div>

              {/* Información de vencimiento */}
              {product.expiry_date && (
                <div
                  style={{
                    fontSize: "12px",
                    color: isExpired
                      ? "var(--danger)"
                      : isExpiringSoon
                        ? "var(--warning)"
                        : "var(--text-secondary)",
                    marginBottom: "8px",
                    fontWeight: isExpired || isExpiringSoon ? 600 : 400,
                  }}
                >
                  {expirationStatus
                    ? `${expirationStatus.message}`
                    : `Vence: ${new Date(product.expiry_date).toLocaleDateString()}`}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div className="product-price">
                  ${(product.price || 0).toLocaleString()}/{product.unit}
                </div>
                <div
                  className={`product-stock ${(product.stock || 0) <= (product.min_stock || product.minStock || 0) ? "stock-low" : "stock-ok"}`}
                >
                  Stock: {product.stock} {product.unit}
                </div>
              </div>
              {(canEdit || canDelete) && (
                <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                  {canEdit && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setEditingProduct(product);
                        setShowProductModal(true);
                      }}
                    >
                      <Edit size={14} /> Editar
                    </button>
                  )}
                  {canDelete && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteProduct(product.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modales locales */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          suppliers={suppliers}
          onSave={async (data) => {
            try {
              if (editingProduct) {
                await toggleProductStatus.mutateAsync({
                  id: editingProduct.id,
                  data,
                });
              } else {
                await saveProduct.mutateAsync(data);
              }

              // Refreso forzoso de productos
              loadProducts();

              addToast("Producto guardado", "success");
              setShowProductModal(false);
              setEditingProduct(null);

              // Actualizar dashboard también por si cambió el conteo de stock bajo
              queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            } catch (e) {
              console.error("Save error:", e);
              addToast("Error guardando producto", "error");
            }
          }}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
          onAddCategory={() => setShowCategoryModal(true)}
          onAddSupplier={() => setShowSupplierModal(true)}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onSave={handleSaveCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
        />
      )}

      {showSupplierModal && (
        <SupplierModal
          isOpen={showSupplierModal}
          editingSupplier={editingSupplier}
          onSave={async (data) => {
            // Supplier API structure logic here or inside SupplierModal depending on the saveSupplier shape
            try {
              await saveSupplier.mutateAsync(data);
              setShowSupplierModal(false);
              setEditingSupplier(null);
              addToast("Proveedor guardado", "success");
            } catch (e) {
              addToast("Error guardando", "error");
            }
          }}
          onClose={() => {
            setShowSupplierModal(false);
            setEditingSupplier(null);
          }}
        />
      )}

      {showTransformModal && (
        <TransformModal
          products={products}
          onSave={(data) => transform.mutateAsync(data)}
          onClose={() => setShowTransformModal(false)}
        />
      )}

      {showOutputModal && (
        <OutputModal
          products={products}
          onSave={handleRegisterOutput}
          onClose={() => setShowOutputModal(false)}
        />
      )}
    </div>
  );
}

export default InventoryView;
