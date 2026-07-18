import { useEffect } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ContextMenu } from '../components/ContextMenu'
import { EmptyEditor } from '../components/EmptyEditor'
import { FileContentView } from '../components/FileContentView'
import { Resizer } from '../components/Resizer'
import { TradingModeGate } from '../components/TradingModeGate'
import { TabStrip } from '../components/TabStrip'
import { ToastProvider, useToast } from '../components/Toast'
import { CRYPTO_GUARD_TYPES, GuardsSection } from '../components/guards'
import { SchemaFormFields } from '../components/uta/SchemaFormFields'
import { EditUTADialog } from '../components/uta/EditUTADialog'
import { CreateWorkspaceDialog } from '../components/workspace/CreateWorkspaceDialog'
import { TemplateCard } from '../components/workspace/TemplateCard'
import { WorkspaceOffboardingDialog } from '../components/workspace/WorkspaceOffboardingDialog'

const noop = (): void => undefined

function ToastFixture() {
  const toast = useToast()
  useEffect(() => toast.success('Visual coverage notification'), [])
  return null
}

export function VisualCoverageHarness() {
  return (
    <main className="h-full overflow-auto bg-bg p-8 text-text">
      <h1 className="mb-6 text-xl font-semibold">Visual coverage harness</h1>
      <TabStrip />
      <ToastProvider><ToastFixture /></ToastProvider>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="min-h-40 rounded border border-border p-4"><EmptyEditor /></section>
        <section className="rounded border border-border p-4"><FileContentView path="missing.md" result={{ kind: 'file_missing' }} /></section>
        <section className="relative min-h-24 rounded border border-border p-4"><Resizer direction="horizontal" onResize={noop} className="absolute inset-y-0 right-0 w-2 bg-accent" /></section>
        <TradingModeGate title="Trading unavailable" description="Enable trading mode to use this surface." />
        <GuardsSection guards={[{ type: 'max-position-size', options: { maxPercentOfEquity: 25 } }]} guardTypes={CRYPTO_GUARD_TYPES} description="Runtime trading safeguards." onChange={noop} onChangeImmediate={noop} />
        <TemplateCard template={{ name: 'chat', displayName: 'Chat', description: 'Durable research workspace.', defaultAgents: ['codex'], version: '1.0.0', hasReadme: true }} agents={[]} onOpen={noop} />
        <SchemaFormFields fields={[{ key: 'endpoint', title: 'Endpoint', type: 'text', required: true }]} formData={{ endpoint: 'https://example.invalid' }} setField={noop} showSecrets={false} />
      </div>
      <ContextMenu anchor={{ x: 24, y: 72 }} items={[{ kind: 'item', label: 'Open', onClick: noop }, { kind: 'separator' }, { kind: 'item', label: 'Delete', danger: true, onClick: noop }]} onClose={noop} />
      <ConfirmDialog title="Confirm action" message="This visual unit is intentionally rendered." confirmLabel="Continue" variant="primary" onConfirm={noop} onClose={noop} />
      <CreateWorkspaceDialog templates={[{ name: 'chat', defaultAgents: ['codex'], version: '1.0.0', hasReadme: true }]} onCreated={noop} onClose={noop} />
      <EditUTADialog uta={{ id: 'visual-uta', label: 'Visual UTA', presetId: 'mock', enabled: true, guards: [], presetConfig: {}, readOnly: true, asVendor: false }} onSave={async () => undefined} onDelete={async () => undefined} onClose={noop} />
      <WorkspaceOffboardingDialog workspace={{ id: 'demo-ws', tag: 'demo', dir: '/demo', createdAt: '2026-07-18T00:00:00Z', agents: ['codex'], sessions: [] }} onOffboarded={noop} onClose={noop} />
    </main>
  )
}
