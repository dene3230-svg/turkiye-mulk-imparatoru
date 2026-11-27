import { useState } from 'react';
import {
  AlertTriangle,
  Award,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Landmark,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import type {
  EmpireState,
  MegaProjectId,
  OperationalCrisisEvent,
  WageRaiseRequest,
} from '../types/game';
import { formatTL } from '../game/economy';
import {
  MEGA_PROJECT_CATALOG,
  ensureBoardContracts,
  getPrestigeIpoStatus,
} from '../game/hardcoreEconomyEngine';

// ── 1. Operational Crisis Decision Modal ────────────────────────────────────

interface CrisisDecisionModalProps {
  crisis: OperationalCrisisEvent;
  cash: number;
  onResolve: (choiceId: string) => void;
  onClose: () => void;
}

export function CrisisDecisionModal({
  crisis,
  cash,
  onResolve,
  onClose,
}: CrisisDecisionModalProps) {
  return (
    <div
      data-testid="crisis-decision-modal"
      className="fixed inset-0 z-[1090] flex items-center justify-center bg-[#0B111A]/80 p-3 lg:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-[20px] border border-[#334155] bg-[#222B38]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#334155] bg-[#181F29] px-4 py-3 lg:px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#B86B5E]/50 bg-[#B86B5E]/15 text-[#B86B5E]">
              <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#B86B5E]">
                OPERASYONEL KRİZ KARARI · GÜN {crisis.createdOnDay}
              </div>
              <h3 className="text-sm font-bold text-slate-100 lg:text-base">{crisis.title}</h3>
            </div>
          </div>
          <button
            type="button"
            data-testid="crisis-modal-close"
            onClick={onClose}
            aria-label="Kriz penceresini kapat"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#334155] bg-[#222B38] text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-4 p-4 lg:p-5">
          <div className="rounded-[14px] border border-[#334155] bg-[#181F29] p-3.5 text-xs leading-relaxed text-slate-300 lg:text-sm">
            {crisis.description}
          </div>

          <div className="space-y-2.5">
            {crisis.choices.map((choice) => {
              const canAfford = choice.cost <= 0 || cash >= choice.cost;
              const accentClass =
                choice.tone === 'positive'
                  ? 'border-[#7A9E7E]/50 text-[#7A9E7E]'
                  : choice.tone === 'warning'
                  ? 'border-[#C8AE7D]/50 text-[#C8AE7D]'
                  : 'border-[#B86B5E]/50 text-[#B86B5E]';

              return (
                <button
                  key={choice.id}
                  type="button"
                  data-testid={`crisis-choice-${choice.id}`}
                  disabled={!canAfford}
                  onClick={() => onResolve(choice.id)}
                  className={`flex w-full flex-col gap-1.5 rounded-[16px] border p-3.5 text-left transition-colors ${
                    canAfford
                      ? 'border-[#334155] bg-[#1C2430] hover:border-slate-400 hover:bg-[#263140]'
                      : 'cursor-not-allowed border-[#334155]/60 bg-[#181F29]/70 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-100 lg:text-sm">
                      {choice.label}
                    </span>
                    <span className="font-mono-num text-xs font-bold text-[#C8AE7D]">
                      {choice.cost > 0 ? formatTL(choice.cost) : '₺0'}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-400">{choice.description}</p>
                  <div className="pt-0.5">
                    <span
                      className={`inline-block rounded-lg border bg-[#181F29] px-2 py-0.5 text-[10.5px] font-semibold ${accentClass}`}
                    >
                      {choice.effectSummary}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 2. 15-Day Staff Wage Raise Requests Modal ───────────────────────────────

interface RaiseRequestsModalProps {
  requests: WageRaiseRequest[];
  onResolve: (requestId: string, decision: 'approve' | 'reject') => void;
  onClose: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  calisan: 'Çalışan',
  mudur_yardimcisi: 'Müdür Yardımcısı',
  sube_muduru: 'Şube Müdürü',
  bolge_sorumlusu: 'Bölge Sorumlusu',
  genel_mudur: 'Genel Müdür',
};

export function RaiseRequestsModal({
  requests,
  onResolve,
  onClose,
}: RaiseRequestsModalProps) {
  return (
    <div
      data-testid="raise-requests-modal"
      className="fixed inset-0 z-[1090] flex items-center justify-center bg-[#0B111A]/80 p-3 lg:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] border border-[#334155] bg-[#222B38]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#334155] bg-[#181F29] px-4 py-3 lg:px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#C8AE7D]/50 bg-[#C8AE7D]/15 text-[#C8AE7D]">
              <UserCheck className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#C8AE7D]">
                15 GÜNLÜK PERSONEL ZAM TALEPLERİ ({requests.length})
              </div>
              <h3 className="text-sm font-bold text-slate-100 lg:text-base">
                Maaş Revizyonu & Moral Yönetimi
              </h3>
            </div>
          </div>
          <button
            type="button"
            data-testid="raise-modal-close"
            onClick={onClose}
            aria-label="Zam talepleri penceresini kapat"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#334155] bg-[#222B38] text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="panel-scroll space-y-3 p-4 lg:p-5">
          {requests.length === 0 ? (
            <div className="rounded-[16px] border border-[#334155] bg-[#181F29] p-6 text-center text-xs text-slate-400">
              Bekleyen personel zam talebi bulunmuyor. Personeller her 15 oyun gününde enflasyon ve kıdeme göre zam talep eder.
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                data-testid={`raise-request-card-${req.id}`}
                className="rounded-[16px] border border-[#334155] bg-[#1C2430] p-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-100 lg:text-sm">
                      {req.staffName}{' '}
                      <span className="font-normal text-slate-400">
                        · {ROLE_LABELS[req.role] ?? req.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#7E96B0]">{req.businessName}</div>
                  </div>
                  <span className="rounded-lg border border-[#C8AE7D]/45 bg-[#C8AE7D]/10 px-2 py-0.5 font-mono-num text-[11px] font-bold text-[#C8AE7D]">
                    +%{req.requestedRaisePct} Zam Talebi
                  </span>
                </div>

                <p className="mt-1.5 text-[11.5px] text-slate-400">{req.reason}</p>

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#334155]/80 bg-[#181F29] px-3 py-2 text-[11px]">
                  <span className="text-slate-400">
                    Mevcut Günlük:{' '}
                    <strong className="font-mono-num text-slate-200">
                      {formatTL(req.currentDailyWage)}
                    </strong>
                  </span>
                  <span className="text-slate-400">
                    Yeni Günlük:{' '}
                    <strong className="font-mono-num text-[#C8AE7D]">
                      {formatTL(req.proposedDailyWage)}
                    </strong>
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-testid={`raise-approve-${req.id}`}
                    onClick={() => onResolve(req.id, 'approve')}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-[#7A9E7E]/50 bg-[#7A9E7E]/15 py-2 text-xs font-semibold text-[#7A9E7E] hover:bg-[#7A9E7E]/25"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Zammı Onayla</span>
                  </button>
                  <button
                    type="button"
                    data-testid={`raise-reject-${req.id}`}
                    onClick={() => onResolve(req.id, 'reject')}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-[#B86B5E]/50 bg-[#B86B5E]/15 py-2 text-xs font-semibold text-[#B86B5E] hover:bg-[#B86B5E]/25"
                  >
                    <UserX className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Reddet (%30 Verim / İstifa)</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── 3. Strategic Hub Modal (Mega Projects · Board Contracts · IPO Prestige) ─

export type StrategicHubTab = 'mega_projects' | 'board_contracts' | 'ipo_prestige';

interface StrategicHubModalProps {
  state: EmpireState;
  netWorth: number;
  initialTab?: StrategicHubTab;
  onStartMegaProject: (projectId: MegaProjectId) => void;
  onClaimBoardContract: (contractId: string) => void;
  onTriggerPrestigeIpo: () => void;
  onClose: () => void;
}

export function StrategicHubModal({
  state,
  netWorth,
  initialTab = 'mega_projects',
  onStartMegaProject,
  onClaimBoardContract,
  onTriggerPrestigeIpo,
  onClose,
}: StrategicHubModalProps) {
  const [tab, setTab] = useState<StrategicHubTab>(initialTab);
  const currentDay = Math.max(1, Math.floor((state.gameMinutes ?? 540) / 1440) + 1);
  const contracts = ensureBoardContracts(state, currentDay);
  const prestigeStatus = getPrestigeIpoStatus(state, netWorth);

  return (
    <div
      data-testid="strategic-hub-modal"
      className="fixed inset-0 z-[1080] flex items-center justify-center bg-[#0B111A]/80 p-3 lg:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[20px] border border-[#334155] bg-[#222B38]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#334155] bg-[#181F29] px-4 py-3 lg:px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 text-[#C8AE7D]">
              <Landmark className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                HOLDİNG STRATEJİ & UZUN VADELİ HEDEFLER
              </div>
              <h3 className="text-sm font-bold text-slate-100 lg:text-base">
                Mega Projeler, Yönetim Kurulu Kontratları & Halka Arz Prestiji
              </h3>
            </div>
          </div>

          <button
            type="button"
            data-testid="strategic-hub-close"
            onClick={onClose}
            aria-label="Strateji merkezini kapat"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#334155] bg-[#222B38] text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* 3 Matte Tabs */}
        <div className="flex shrink-0 gap-2 border-b border-[#334155] bg-[#1C2430] px-4 py-2.5 lg:px-5">
          {[
            { id: 'mega_projects' as const, label: 'Mega Projeler', icon: Building2 },
            { id: 'board_contracts' as const, label: 'Kurul Kontratları', icon: ClipboardCheck },
            { id: 'ipo_prestige' as const, label: 'Halka Arz & Prestij', icon: Award },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`strategic-tab-${item.id}`}
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-[#C8AE7D]/60 bg-[#222B38] text-[#C8AE7D]'
                    : 'border-[#334155] bg-[#181F29] text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="panel-scroll min-h-0 flex-1 p-4 lg:p-5">
          {tab === 'mega_projects' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {MEGA_PROJECT_CATALOG.map((def) => {
                const owned = (state.megaProjects ?? []).find((p) => p.projectId === def.id);
                const canAfford = state.cash >= def.capitalCost;
                const progressPct = owned
                  ? owned.status === 'completed'
                    ? 100
                    : Math.max(
                        6,
                        Math.round(((owned.totalDays - owned.daysRemaining) / Math.max(1, owned.totalDays)) * 100)
                      )
                  : 0;

                return (
                  <div
                    key={def.id}
                    data-testid={`mega-project-card-${def.id}`}
                    className="flex flex-col justify-between rounded-[18px] border border-[#334155] bg-[#1C2430] p-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7E96B0]">
                            {def.categoryLabel}
                          </span>
                          <h4 className="text-sm font-bold text-slate-100">{def.name}</h4>
                        </div>
                        <span className="flex items-center gap-1 rounded-lg border border-[#334155] bg-[#181F29] px-2 py-0.5 font-mono-num text-[10.5px] text-slate-300">
                          <Clock className="h-3 w-3 text-[#C8AE7D]" strokeWidth={1.5} />
                          {def.buildDays} gün
                        </span>
                      </div>

                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-400">
                        {def.description}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-[#334155]/80 bg-[#181F29] p-2.5 text-[11px]">
                        <div>
                          <div className="text-slate-400">Sermaye Yatırımı</div>
                          <div className="font-mono-num font-bold text-[#C8AE7D]">
                            {formatTL(def.capitalCost, true)}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400">Günlük Net Gelir</div>
                          <div className="font-mono-num font-bold text-[#7A9E7E]">
                            +{formatTL(def.dailyNetIncome, true)}
                          </div>
                        </div>
                      </div>

                      {owned && (
                        <div className="mt-2.5 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-300">
                              {owned.status === 'completed'
                                ? 'Tamamlandı · Aktif Gelir Üretiyor'
                                : `İnşaat Devam Ediyor (${owned.daysRemaining} gün kaldı)`}
                            </span>
                            <span className="font-mono-num font-semibold text-[#7A9E7E]">
                              %{progressPct}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#181F29]">
                            <div
                              className="h-full rounded-full bg-[#7A9E7E]"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      data-testid={`start-mega-project-${def.id}`}
                      disabled={Boolean(owned) || !canAfford}
                      onClick={() => onStartMegaProject(def.id)}
                      className={`mt-3.5 w-full rounded-xl border py-2 text-xs font-bold transition-colors ${
                        owned?.status === 'completed'
                          ? 'cursor-default border-[#7A9E7E]/45 bg-[#7A9E7E]/15 text-[#7A9E7E]'
                          : owned
                          ? 'cursor-default border-[#C8AE7D]/45 bg-[#C8AE7D]/15 text-[#C8AE7D]'
                          : canAfford
                          ? 'border-[#C8AE7D]/60 bg-[#C8AE7D] text-[#181F29] hover:bg-[#D2BB8E]'
                          : 'cursor-not-allowed border-[#334155] bg-[#181F29] text-slate-500'
                      }`}
                    >
                      {owned?.status === 'completed'
                        ? 'AKTİF MEGA VARLIK'
                        : owned
                        ? `İNŞAATTA (${owned.daysRemaining} GÜN)`
                        : canAfford
                        ? `PROJEYİ BAŞLAT (${formatTL(def.capitalCost, true)})`
                        : 'YETERSİZ SERMAYE'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'board_contracts' && (
            <div className="space-y-3">
              {contracts.map((contract) => {
                const pct = Math.min(
                  100,
                  Math.round((contract.currentProgress / Math.max(1, contract.targetValue)) * 100)
                );
                const daysLeft = Math.max(0, contract.deadlineDay - currentDay);
                const ready = contract.status === 'completed';

                return (
                  <div
                    key={contract.id}
                    data-testid={`board-contract-card-${contract.kind}`}
                    className="rounded-[18px] border border-[#334155] bg-[#1C2430] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{contract.title}</h4>
                        <p className="mt-0.5 text-xs text-slate-400">{contract.description}</p>
                      </div>
                      <span className="rounded-lg border border-[#334155] bg-[#181F29] px-2.5 py-1 font-mono-num text-[11px] text-slate-300">
                        {ready ? 'Hedef Tamamlandı' : `Kalan: ${daysLeft} gün`}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">İlerleme</span>
                        <span className="font-mono-num font-semibold text-slate-200">
                          {contract.kind === 'grow_daily_revenue'
                            ? `${formatTL(contract.currentProgress, true)} / ${formatTL(contract.targetValue, true)}`
                            : `${contract.currentProgress} / ${contract.targetValue}`}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#181F29]">
                        <div
                          className={`h-full rounded-full ${ready ? 'bg-[#7A9E7E]' : 'bg-[#7E96B0]'}`}
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                        <span className="rounded-lg border border-[#7A9E7E]/40 bg-[#181F29] px-2 py-0.5 text-[#7A9E7E]">
                          +{formatTL(contract.rewardCash, true)}
                        </span>
                        <span className="rounded-lg border border-[#C8AE7D]/40 bg-[#181F29] px-2 py-0.5 text-[#C8AE7D]">
                          +%{contract.rewardBrand} Tanınırlık
                        </span>
                        <span className="rounded-lg border border-[#7E96B0]/40 bg-[#181F29] px-2 py-0.5 text-[#7E96B0]">
                          +{contract.rewardXp} XP
                        </span>
                      </div>
                      <button
                        type="button"
                        data-testid={`claim-contract-${contract.kind}`}
                        disabled={!ready}
                        onClick={() => onClaimBoardContract(contract.id)}
                        className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                          ready
                            ? 'border-[#7A9E7E] bg-[#7A9E7E] text-[#181F29] hover:opacity-90'
                            : 'cursor-not-allowed border-[#334155] bg-[#181F29] text-slate-500'
                        }`}
                      >
                        {ready ? 'ÖDÜLÜ TAHSİL ET' : 'DEVAM EDİYOR'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'ipo_prestige' && (
            <div className="space-y-4">
              <div className="rounded-[18px] border border-[#334155] bg-[#1C2430] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#C8AE7D]">
                      HALKA ARZ (IPO) & YENİ PAZAR PRESTİJİ
                    </div>
                    <h4 className="mt-0.5 text-base font-bold text-slate-100">
                      Mevcut Pazar Kademesi: Kademe {prestigeStatus.currentTier}
                    </h4>
                  </div>
                  <div className="rounded-xl border border-[#7A9E7E]/45 bg-[#181F29] px-3 py-1.5 text-right">
                    <div className="text-[10px] text-slate-400">Kalıcı Gelir Prestij Bonusu</div>
                    <div className="font-mono-num text-sm font-bold text-[#7A9E7E]">
                      +%{state.permanentPrestigeBonusPct ?? 0}
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Şehir ve şirket değeri hedeflerini tamamladığınızda Halka Arz / Yeni Pazar Prestiji tetikleyerek kalıcı gelir çarpanı ve nakit sermaye enjeksiyonu kazanırsınız. Her yeni kademe daha zorlu kurumlar vergisi (+%2) ve daha sert piyasa rekabeti getirir.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <div className="rounded-xl border border-[#334155] bg-[#181F29] p-3">
                    <div className="text-[11px] text-slate-400">Aktif Şube Şartı</div>
                    <div className="mt-1 font-mono-num text-sm font-bold text-slate-100">
                      {prestigeStatus.branchCount} / {prestigeStatus.requiredBranches}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#334155] bg-[#181F29] p-3">
                    <div className="text-[11px] text-slate-400">Farklı Şehir Şartı</div>
                    <div className="mt-1 font-mono-num text-sm font-bold text-slate-100">
                      {prestigeStatus.cityCount} / {prestigeStatus.requiredCities}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#334155] bg-[#181F29] p-3">
                    <div className="text-[11px] text-slate-400">Net Şirket Değeri</div>
                    <div className="mt-1 font-mono-num text-sm font-bold text-[#C8AE7D]">
                      {formatTL(netWorth, true)} / {formatTL(prestigeStatus.requiredNetWorth, true)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-xl border border-[#7A9E7E]/40 bg-[#181F29] p-3 text-xs text-[#7A9E7E]">
                    <TrendingUp className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span>
                      Sonraki Kademe Kalıcı Bonus: <strong>+%{prestigeStatus.nextPermanentBonusPct} Gelir</strong> & +10% Tanınırlık
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-[#B86B5E]/40 bg-[#181F29] p-3 text-xs text-[#B86B5E]">
                    <ShieldAlert className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span>
                      Zorluk Artışı: <strong>+%{prestigeStatus.nextTaxSurchargePct} Ek Kurumlar Vergisi</strong> & Sert Rekabet
                    </span>
                  </div>
                </div>

                {!prestigeStatus.eligible && prestigeStatus.reasons.length > 0 && (
                  <div className="mt-3 rounded-xl border border-[#334155] bg-[#181F29] p-3 text-[11.5px] text-slate-400">
                    {prestigeStatus.reasons.map((r) => (
                      <div key={r}>• {r}</div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  data-testid="trigger-prestige-ipo-btn"
                  disabled={!prestigeStatus.eligible}
                  onClick={onTriggerPrestigeIpo}
                  className={`mt-4 w-full rounded-xl border py-2.5 text-xs font-bold transition-colors ${
                    prestigeStatus.eligible
                      ? 'border-[#C8AE7D] bg-[#C8AE7D] text-[#181F29] hover:bg-[#D2BB8E]'
                      : 'cursor-not-allowed border-[#334155] bg-[#181F29] text-slate-500'
                  }`}
                >
                  {prestigeStatus.eligible
                    ? `HALKA ARZ & KADEME ${prestigeStatus.nextTier} PRESTİJİNİ BAŞLAT`
                    : 'HALKA ARZ PRESTİJ ŞARTLARI HENÜZ SAĞLANMADI'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
