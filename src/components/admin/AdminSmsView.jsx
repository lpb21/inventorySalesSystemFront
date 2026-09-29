import { useState } from 'react'
import {
  MessageSquare, AlertTriangle, CheckCircle, RefreshCw, Gift, Plus, History,
  ToggleLeft, ToggleRight, X, Save, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useGlobalContext } from '../../context/GlobalContext'
import {
  useAdminSmsOverview, useAdminSmsMutations, useAdminTenantSmsHistory,
} from '../../hooks/queries/useSms'
import { useAdminTenants } from '../../hooks/queries/useAdminTenants'

const PAGE_SIZE = 20

const copFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const formatDateTime = (d) => d
  ? new Date(d).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
  : '—'
const errorMessage = (error) => error?.response?.data?.error?.message || error?.message || ''

const CHECK_STYLES = {
  ok: { color: '#00d9a5', bg: 'rgba(0,217,165,0.08)', border: 'rgba(0,217,165,0.25)', label: 'Saldo Twilio suficiente' },
  warning: { color: '#ffc107', bg: 'rgba(255,193,7,0.08)', border: 'rgba(255,193,7,0.3)', label: 'Saldo Twilio justo: recarga pronto' },
  critical: { color: '#f43f5e', bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.3)', label: 'Saldo Twilio NO cubre los créditos vendidos' },
  error: { color: '#f43f5e', bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.3)', label: 'No se pudo consultar el saldo de Twilio' },
}

const TRANSACTION_LABELS = {
  welcome_bonus: 'Bono de bienvenida',
  purchase: 'Compra de paquete',
  consumption: 'Consumo',
  adjustment: 'Ajuste manual',
}

const SUBSCRIPTION_LABELS = {
  trial: 'en prueba', active: 'activa', past_due: 'en mora', cancelled: 'cancelada', suspended: 'suspendida',
}

const LOG_STATUS_LABELS = { sent: 'Enviado', failed: 'Fallido', skipped: 'Omitido', pending: 'Enviando' }
const LOG_KIND_LABELS = { credit_charge: 'Fiado', credit_payment: 'Abono', admin_alert: 'Alerta admin' }

/**
 * AdminSmsView — Panel de superadmin para los SMS a clientes de fiado:
 * habilitar por tenant, acreditar paquetes/bono, ver consumo y la alerta de saldo Twilio.
 */
function AdminSmsView() {
  const { addToast } = useGlobalContext()

  // Filtros (al cambiar cualquiera se vuelve a la página 1)
  const [page, setPage] = useState(1)
  const [tenantFilter, setTenantFilter] = useState('')
  const [smsFilter, setSmsFilter] = useState('')
  const [balanceFilter, setBalanceFilter] = useState('')
  const hasFilters = !!(tenantFilter || smsFilter || balanceFilter)
  const withReset = (setter) => (value) => { setter(value); setPage(1) }
  const clearFilters = () => { setTenantFilter(''); setSmsFilter(''); setBalanceFilter(''); setPage(1) }

  const { data, isLoading, isFetching } = useAdminSmsOverview({
    page,
    limit: PAGE_SIZE,
    tenantId: tenantFilter,
    sms: smsFilter,
    balance: balanceFilter,
  })
  const { data: allTenants = [] } = useAdminTenants()
  const { setEnabled, grantWelcomeBonus, addCredits, runBalanceCheck } = useAdminSmsMutations()

  const [creditTenant, setCreditTenant] = useState(null)
  const [historyTenant, setHistoryTenant] = useState(null)

  const tenants = data?.tenants || []
  const totals = data?.totals || {}
  const packages = data?.packages || []
  const check = data?.balance_check
  const lowBalance = data?.low_balance ?? 5
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0, hasNextPage: false, hasPrevPage: false }

  const handleToggle = async (tenant) => {
    try {
      await setEnabled.mutateAsync({ tenantId: tenant.id, enabled: !tenant.sms_enabled })
      addToast(`SMS ${tenant.sms_enabled ? 'deshabilitado' : 'habilitado'} para ${tenant.name}`, 'success')
    } catch (error) {
      addToast('Error: ' + errorMessage(error), 'error')
    }
  }

  const handleWelcomeBonus = async (tenant) => {
    const bonus = data?.welcome_bonus ?? 10
    const confirmText = tenant.sms_enabled
      ? `¿Otorgar ${bonus} SMS de bienvenida a ${tenant.name}? Solo se puede una vez.`
      : `¿Otorgar ${bonus} SMS de bienvenida a ${tenant.name} y ACTIVAR el servicio de SMS? Solo se puede una vez.`
    if (!window.confirm(confirmText)) return
    try {
      await grantWelcomeBonus.mutateAsync({ tenantId: tenant.id })
      // Sin activar, los créditos no se pueden usar: el bono va de la mano con la activación
      if (!tenant.sms_enabled) {
        await setEnabled.mutateAsync({ tenantId: tenant.id, enabled: true })
      }
      addToast(`Bono de bienvenida otorgado a ${tenant.name}${tenant.sms_enabled ? '' : ' y SMS activado'}`, 'success')
    } catch (error) {
      addToast('Error: ' + errorMessage(error), 'error')
    }
  }

  const handleAddCredits = async (payload, { enableSms = false } = {}) => {
    try {
      const result = await addCredits.mutateAsync({ tenantId: creditTenant.id, data: payload })
      if (enableSms) {
        await setEnabled.mutateAsync({ tenantId: creditTenant.id, enabled: true })
      }
      addToast(`Créditos aplicados. Nuevo saldo: ${result?.sms_balance ?? '—'}${enableSms ? ' · SMS activado' : ''}`, 'success')
      setCreditTenant(null)
    } catch (error) {
      addToast('Error: ' + errorMessage(error), 'error')
    }
  }

  const handleRunCheck = async () => {
    try {
      const result = await runBalanceCheck.mutateAsync()
      addToast(`Chequeo completado: ${CHECK_STYLES[result?.status]?.label || result?.status}`, result?.status === 'ok' ? 'success' : 'warning')
    } catch (error) {
      addToast('Error en el chequeo: ' + errorMessage(error), 'error')
    }
  }

  return (
    <div className="view-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <MessageSquare size={28} style={{ color: 'var(--accent)' }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>SMS a clientes</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
            Habilita el servicio por tenant, acredita paquetes y controla el saldo de Twilio
          </p>
        </div>
        <button className="btn btn-secondary" onClick={handleRunCheck} disabled={runBalanceCheck.isPending}>
          <RefreshCw size={16} /> {runBalanceCheck.isPending ? 'Verificando...' : 'Verificar saldo Twilio'}
        </button>
      </div>

      {/* Alerta de saldo Twilio vs créditos vendidos */}
      {check ? (
        <div style={{
          marginBottom: '20px', padding: '14px', borderRadius: '8px',
          background: CHECK_STYLES[check.status]?.bg, border: `1px solid ${CHECK_STYLES[check.status]?.border}`,
          display: 'flex', gap: '12px', alignItems: 'flex-start',
        }}>
          {check.status === 'ok'
            ? <CheckCircle size={20} style={{ color: CHECK_STYLES.ok.color, flexShrink: 0 }} />
            : <AlertTriangle size={20} style={{ color: CHECK_STYLES[check.status]?.color, flexShrink: 0 }} />}
          <div style={{ fontSize: '14px' }}>
            <div style={{ fontWeight: 600 }}>{CHECK_STYLES[check.status]?.label || check.status}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              {check.provider_balance !== null
                ? <>Saldo Twilio: <strong>{check.provider_currency} {Number(check.provider_balance).toFixed(2)}</strong> · </>
                : null}
              Créditos vendidos sin usar: <strong>{check.committed_credits}</strong> (~USD {Number(check.committed_cost).toFixed(2)})
              {' · '}Última verificación: {formatDateTime(check.created_at)}
              {check.alert_sent && ' · Alerta SMS enviada a superadmins'}
            </div>
            {check.error_message && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Error: {check.error_message}</div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Aún no hay verificaciones de saldo Twilio. Usa "Verificar saldo Twilio" o espera el job automático.
        </div>
      )}

      {/* Totales del mes */}
      <div className="grid-3" style={{ gap: '16px', marginBottom: '20px' }}>
        <StatCard label="Tenants con SMS" value={totals.enabled_tenants ?? 0} />
        <StatCard label="Créditos vendidos sin usar" value={totals.committed_credits ?? 0} />
        <StatCard
          label="Este mes"
          value={totals.sent ?? 0}
          detail={`${totals.failed ?? 0} fallidos · ${totals.skipped ?? 0} omitidos por falta de saldo`}
        />
      </div>

      {/* Barra de filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          <Filter size={15} /> Filtrar:
        </div>
        <select
          className="form-select"
          value={tenantFilter}
          onChange={(e) => withReset(setTenantFilter)(e.target.value)}
          style={{ maxWidth: '240px' }}
        >
          <option value="">Todos los negocios</option>
          {allTenants.map(t => (
            <option key={t.id} value={t.id}>{t.business_name || t.name}</option>
          ))}
        </select>
        <select
          className="form-select"
          value={smsFilter}
          onChange={(e) => withReset(setSmsFilter)(e.target.value)}
          style={{ maxWidth: '200px' }}
        >
          <option value="">SMS: todos</option>
          <option value="enabled">SMS activo</option>
          <option value="disabled">SMS inactivo</option>
        </select>
        <select
          className="form-select"
          value={balanceFilter}
          onChange={(e) => withReset(setBalanceFilter)(e.target.value)}
          style={{ maxWidth: '220px' }}
        >
          <option value="">Saldo: todos</option>
          <option value="empty">Sin saldo (0)</option>
          <option value="low">Saldo bajo (1 a {lowBalance})</option>
          <option value="available">Con saldo (más de {lowBalance})</option>
        </select>
        {hasFilters && (
          <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
            Limpiar filtros
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando...</div>
      ) : (
        <>
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Servicio SMS</th>
                  <th style={{ textAlign: 'right' }}>Saldo</th>
                  <th style={{ textAlign: 'right' }}>Enviados (mes)</th>
                  <th style={{ textAlign: 'right' }}>Fallidos / sin saldo</th>
                  <th>Última compra</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{t.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Suscripción: {SUBSCRIPTION_LABELS[t.subscription_status] || t.subscription_status}
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleToggle(t)}
                        title={t.sms_enabled ? 'SMS activo — clic para desactivar' : 'SMS inactivo — clic para activar'}
                        disabled={setEnabled.isPending}
                      >
                        {t.sms_enabled
                          ? <><ToggleRight size={15} color="var(--success)" /> SMS activo</>
                          : <><ToggleLeft size={15} /> Activar SMS</>}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: t.sms_enabled && t.sms_balance <= 0 ? '#f43f5e' : undefined }}>
                      {t.sms_balance}
                    </td>
                    <td style={{ textAlign: 'right' }}>{t.month.sent}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {t.month.failed} / {t.month.skipped}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDateTime(t.last_purchase_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleWelcomeBonus(t)}
                          disabled={t.welcome_bonus_granted || grantWelcomeBonus.isPending}
                          title={t.welcome_bonus_granted ? 'Bono ya otorgado' : `Otorgar bono de bienvenida (${data?.welcome_bonus ?? 10} SMS)`}
                        >
                          <Gift size={15} />
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setCreditTenant(t)} title="Acreditar paquete o ajustar">
                          <Plus size={15} />
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setHistoryTenant(t)} title="Historial">
                          <History size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                      {hasFilters ? 'Ningún negocio coincide con los filtros' : 'No hay tenants'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Controles de paginación */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: '16px', gap: '12px', flexWrap: 'wrap'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {pagination.total} negocios · Página {pagination.page} de {Math.max(pagination.totalPages, 1)}
            {isFetching && <span style={{ marginLeft: '8px' }}>· actualizando...</span>}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!pagination.hasNextPage}
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </div>
        </>
      )}

      {creditTenant && (
        <AddCreditsModal
          tenant={creditTenant}
          packages={packages}
          saving={addCredits.isPending || setEnabled.isPending}
          onClose={() => setCreditTenant(null)}
          onSave={handleAddCredits}
        />
      )}

      {historyTenant && (
        <HistoryModal tenant={historyTenant} onClose={() => setHistoryTenant(null)} />
      )}
    </div>
  )
}

// .card no trae padding (tiene border-radius 16px + overflow hidden): sin este
// padding el borde redondeado se "come" la primera letra del texto.
function StatCard({ label, value, detail }) {
  return (
    <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 600, lineHeight: 1.2 }}>{value}</div>
      {detail && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{detail}</div>}
    </div>
  )
}

/**
 * Acreditar un paquete comprado o hacer un ajuste manual (+/-) con motivo.
 */
function AddCreditsModal({ tenant, packages, saving, onClose, onSave }) {
  const [mode, setMode] = useState('package')
  const [packageCode, setPackageCode] = useState(packages[0]?.code || '')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  // Un negocio con SMS inactivo no puede usar sus créditos: por defecto se activa al acreditar
  const [enableSms, setEnableSms] = useState(!tenant.sms_enabled)

  const amountValue = parseInt(amount, 10)
  const canSave = mode === 'package'
    ? !!packageCode
    : Number.isInteger(amountValue) && amountValue !== 0 && note.trim().length > 0

  const handleConfirm = () => {
    if (!canSave) return
    onSave(
      mode === 'package'
        ? { package_code: packageCode, note: note.trim() || null }
        : { amount: amountValue, note: note.trim() },
      { enableSms: !tenant.sms_enabled && enableSms }
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Créditos SMS · {tenant.name}</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <p style={{ marginTop: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Saldo actual: <strong>{tenant.sms_balance}</strong> SMS
          </p>

          {!tenant.sms_enabled && (
            <div style={{
              marginBottom: '16px', padding: '10px 12px', borderRadius: '8px',
              background: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.3)', fontSize: '13px',
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
                <AlertTriangle size={16} style={{ color: '#ffc107', flexShrink: 0, marginTop: '1px' }} />
                <span>Este negocio tiene el SMS <strong>inactivo</strong>: no podrá usar los créditos hasta activarlo.</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={enableSms} onChange={(e) => setEnableSms(e.target.checked)} />
                Activar SMS para este negocio al aplicar los créditos
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              className={`btn btn-sm ${mode === 'package' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('package')}
            >
              Paquete comprado
            </button>
            <button
              className={`btn btn-sm ${mode === 'adjustment' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('adjustment')}
            >
              Ajuste manual
            </button>
          </div>

          {mode === 'package' ? (
            <div className="form-group">
              <label className="form-label">Paquete</label>
              <select className="form-input" value={packageCode} onChange={(e) => setPackageCode(e.target.value)}>
                {packages.map(p => (
                  <option key={p.code} value={p.code}>
                    {p.name} · {p.credits} SMS · {copFmt.format(p.price_cop)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Cantidad (negativa para descontar)</label>
              <input
                type="number"
                step="1"
                className="form-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej: 20 o -5"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nota {mode === 'adjustment' ? '(obligatoria)' : '(opcional)'}</label>
            <input
              type="text"
              className="form-input"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={mode === 'package' ? 'Ej: Pago Nequi 28/09' : 'Ej: Compensación por SMS no entregados'}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={saving || !canSave}>
            {saving ? 'Guardando...' : (<><Save size={18} /> Aplicar</>)}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Movimientos de créditos y últimos envíos de un tenant.
 */
function HistoryModal({ tenant, onClose }) {
  const { data, isLoading } = useAdminTenantSmsHistory(tenant.id)
  const [tab, setTab] = useState('transactions')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '760px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Historial SMS · {tenant.name}</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              className={`btn btn-sm ${tab === 'transactions' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTab('transactions')}
            >
              Movimientos de créditos
            </button>
            <button
              className={`btn btn-sm ${tab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTab('logs')}
            >
              Últimos envíos
            </button>
          </div>

          {isLoading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Cargando...</p>
          ) : tab === 'transactions' ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: 'right' }}>Cantidad</th>
                    <th style={{ textAlign: 'right' }}>Saldo</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.transactions || []).map(tx => (
                    <tr key={tx.id}>
                      <td style={{ fontSize: '13px' }}>{formatDateTime(tx.created_at)}</td>
                      <td>{TRANSACTION_LABELS[tx.type] || tx.type}</td>
                      <td style={{ textAlign: 'right', color: tx.amount > 0 ? 'var(--success)' : '#f43f5e' }}>
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                      </td>
                      <td style={{ textAlign: 'right' }}>{tx.balance_after}</td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {[tx.price_cop ? copFmt.format(tx.price_cop) : null, tx.note, tx.creator?.email].filter(Boolean).join(' · ') || '—'}
                      </td>
                    </tr>
                  ))}
                  {(data?.transactions || []).length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Sin movimientos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Destino</th>
                    <th>Estado</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.logs || []).map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '13px' }}>{formatDateTime(log.created_at)}</td>
                      <td>{LOG_KIND_LABELS[log.kind] || log.kind}</td>
                      <td style={{ fontSize: '13px' }}>{log.to_masked || '—'}</td>
                      <td style={{ color: log.status === 'sent' ? 'var(--success)' : '#f43f5e' }}>
                        {LOG_STATUS_LABELS[log.status] || log.status}
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {[log.skip_reason, log.error_code, log.error_message].filter(Boolean).join(' · ') || '—'}
                      </td>
                    </tr>
                  ))}
                  {(data?.logs || []).length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Sin envíos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

export default AdminSmsView
