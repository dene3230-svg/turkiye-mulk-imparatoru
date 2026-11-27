import { useState } from 'react';
import {
  Building2,
  Check,
  Gift,
  Handshake,
  Home,
  KeyRound,
  Megaphone,
  Percent,
  ShoppingBag,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import type {
  DailyBusinessOffer,
  EmpireState,
  HoldingPromoTierId,
} from '../types/game';
import { formatTL } from '../game/economy';
import {
  calculateDailyRentalIncome,
  calculateDailyRentalMaintenanceCost,
  ensureDailyOffersForDay,
  getMergedRentalProperties,
  getRentalNetMonthlyYieldPct,
  HOLDING_PROMO_TIERS,
  HOLDING_STORE_ITEMS,
} from '../game/quickActionsEngine';

/* ============================================================================
   1. REKLAM & TANITIM MODALI (Holding-Wide Ads & Brand Growth)
   ============================================================================ */

interface AdsPromotionModalProps {
  open: boolean;
  state: EmpireState;
  onLaunchPromo: (tierId: HoldingPromoTierId) => void;
  onClose: () => void;
}

export function AdsPromotionModal({
  open,
  state,
  onLaunchPromo,
  onClose,
}: AdsPromotionModalProps) {
  if (!open) return null;

  const currentMin = state.gameMinutes ?? 540;
  const activePromo =
    state.activeHoldingPromo && state.activeHoldingPromo.endsAtGameMin > currentMin
      ? state.activeHoldingPromo
      : null;
  const remainingDays = activePromo
    ? Math.max(1, Math.ceil((activePromo.endsAtGameMin - currentMin) / 1440))
    : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reklam ve Tanıtım Kampanyaları"
      data-testid="ads-promotion-modal"
      className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/70 p-3"
    >
      <div className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[20px] border border-[#334155] bg-[#181F29] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#334155] bg-[#222B38] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#A59BB8]/20 text-[#D4CBE6]">
              <Megaphone className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-slate-100 lg:text-base">
                REKLAM & TANITIM KAMPANYALARI
              </h2>
              <p className="text-xs text-slate-400">
                Holding tanınırlığını artırın, tüm şubelerinizin müşteri trafiğini büyütün
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-[11px] text-slate-400">Kasa · Tanınırlık</div>
              <div className="font-mono-num text-xs font-bold text-[#6EB288]">
                {formatTL(state.cash, true)} · %{Math.round(state.brandRecognition ?? 5)}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Reklam penceresini kapat"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#334155] bg-[#181F29] text-slate-300 hover:bg-[#2C3647] hover:text-white"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="panel-scroll flex-1 space-y-4 p-5">
          {activePromo && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[16px] border border-[#6EB288]/45 bg-[#222B38] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-[#C6B074]" strokeWidth={1.5} />
                <div>
                  <div className="text-xs font-bold text-slate-100">
                    Aktif Kampanya: {activePromo.name}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Tüm şubelerde +%{Math.round(activePromo.revenueBoost * 100)} müşteri ve ciro artışı · Kalan {remainingDays} gün
                  </div>
                </div>
              </div>
              <span className="font-mono-num text-xs font-bold text-[#6EB288]">
                AKTİF (+%{Math.round(activePromo.revenueBoost * 100)})
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
            {HOLDING_PROMO_TIERS.map((tier) => {
              const canAfford = state.cash >= tier.cost;
              const isCurrent = activePromo?.tierId === tier.id;
              return (
                <div
                  key={tier.id}
                  data-testid={`promo-tier-${tier.id}`}
                  className="flex flex-col justify-between rounded-[16px] border border-[#334155] bg-[#222B38] p-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#D4CBE6]">{tier.durationDays} Gün</span>
                      <span className="font-mono-num text-xs font-bold text-[#6EB288]">
                        +%{Math.round(tier.revenueBoost * 100)} Ciro
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-bold text-slate-100">{tier.name}</h3>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-400">{tier.tagline}</p>
                    <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                      {tier.description}
                    </p>
                  </div>

                  <div className="mt-4 space-y-2.5 border-t border-[#334155] pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Tanınırlık Katkısı</span>
                      <span className="font-mono-num font-bold text-[#D8A338]">
                        +%{tier.brandGain}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Kampanya Bütçesi</span>
                      <span className="font-mono-num font-bold text-slate-100">
                        {formatTL(tier.cost)}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={!canAfford}
                      data-testid={`launch-promo-${tier.id}`}
                      onClick={() => onLaunchPromo(tier.id)}
                      className={`w-full rounded-xl py-2 text-xs font-bold transition-colors ${
                        canAfford
                          ? 'bg-[#D8A338] text-[#181F29] hover:bg-[#E2AF48]'
                          : 'cursor-not-allowed bg-[#334155] text-slate-500'
                      }`}
                    >
                      {isCurrent
                        ? 'Kampanyayı Yenile'
                        : canAfford
                        ? 'Kampanyayı Başlat'
                        : 'Yetersiz Kasa'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   2. KİRALIK İLANLARI MODALI (Buy Empty Commercial/Residential Units & Lease)
   ============================================================================ */

interface RentalListingsModalProps {
  open: boolean;
  state: EmpireState;
  onBuyProperty: (catalogId: string) => void;
  onSignLease: (catalogId: string, offerId: string) => void;
  onTerminateLease: (catalogId: string) => void;
  onClose: () => void;
}

export function RentalListingsModal({
  open,
  state,
  onBuyProperty,
  onSignLease,
  onTerminateLease,
  onClose,
}: RentalListingsModalProps) {
  const [filterKind, setFilterKind] = useState<'all' | 'owned' | 'dukkan' | 'daire' | 'ofis'>('all');

  if (!open) return null;

  const properties = getMergedRentalProperties(state);
  const dailyPassive = calculateDailyRentalIncome(state);
  const dailyRentalMaint = calculateDailyRentalMaintenanceCost(state);
  const dailyNetPassive = dailyPassive - dailyRentalMaint;
  const ownedCount = properties.filter((p) => p.owned).length;
  const leasedCount = properties.filter((p) => p.owned && p.leasedTenantName).length;

  const filtered = properties.filter((p) => {
    if (filterKind === 'owned') return p.owned;
    if (filterKind === 'all') return true;
    return p.kind === filterKind;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kiralık İlanları ve Mülk Portföyü"
      data-testid="rental-listings-modal"
      className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/70 p-3"
    >
      <div className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[20px] border border-[#334155] bg-[#181F29] text-slate-100">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#334155] bg-[#222B38] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8592B2]/25 text-[#C1CBE2]">
              <KeyRound className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-slate-100 lg:text-base">
                KİRALIK İLANLARI & PASİF KİRA PORTFÖYÜ
              </h2>
              <p className="text-xs text-slate-400">
                Aylık %2.8–%4.1 net kira getirisi · Periyodik aidat, bakım ve kiracı değişim tadilat maliyetleri dahil
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] text-slate-400">
                {ownedCount} Mülk · {leasedCount} Kiracılı
                {dailyRentalMaint > 0 ? ` · Aidat -${formatTL(dailyRentalMaint, true)}/g` : ''}
              </div>
              <div
                data-testid="rental-daily-income"
                className={`font-mono-num text-xs font-bold ${
                  dailyNetPassive >= 0 ? 'text-[#7A9E7E]' : 'text-[#B86B5E]'
                }`}
              >
                {dailyNetPassive >= 0 ? '+' : '-'}
                {formatTL(Math.abs(dailyNetPassive))} / Gün Net Pasif Kira
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kiralık ilanları penceresini kapat"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#334155] bg-[#181F29] text-slate-300 hover:bg-[#2C3647] hover:text-white"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155] bg-[#181F29] px-5 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: 'Tümü' },
                { id: 'owned', label: `Mülklerim (${ownedCount})` },
                { id: 'dukkan', label: 'Dükkan' },
                { id: 'daire', label: 'Daire' },
                { id: 'ofis', label: 'Ofis' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterKind(tab.id)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                  filterKind === tab.id
                    ? 'bg-[#334155] text-white'
                    : 'text-slate-400 hover:bg-[#222B38] hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="font-mono-num text-xs text-slate-300">
            Kasa: <strong className="text-[#6EB288]">{formatTL(state.cash)}</strong>
          </div>
        </div>

        {/* Property list */}
        <div className="panel-scroll flex-1 p-5">
          {filtered.length === 0 ? (
            <div className="rounded-[16px] border border-[#334155] bg-[#222B38] p-6 text-center text-xs text-slate-400">
              Bu filtrede henüz mülk bulunmuyor. İlanlardan mülk satın alarak kira geliri oluşturabilirsiniz.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              {filtered.map((prop) => {
                const KindIcon =
                  prop.kind === 'dukkan' ? Store : prop.kind === 'daire' ? Home : Building2;
                const canBuy = state.cash >= prop.purchasePrice;
                const isLeased = Boolean(prop.owned && prop.leasedTenantName && (prop.leaseRemainingDays ?? 0) > 0);
                const vacancyDays = Math.max(0, prop.vacancyDaysRemaining ?? 0);
                const dailyAidat = Math.max(0, Math.round(prop.dailyMaintenanceCost ?? 0));
                const netYieldPct = getRentalNetMonthlyYieldPct(prop);
                return (
                  <div
                    key={prop.catalogId}
                    data-testid={`rental-card-${prop.catalogId}`}
                    className="flex flex-col justify-between rounded-[16px] border border-[#334155] bg-[#222B38] p-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#334155] bg-[#181F29] text-slate-200">
                            <KindIcon className="h-4.5 w-4.5" strokeWidth={1.5} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-100">{prop.name}</h3>
                            <p className="text-[11px] text-slate-400">{prop.cityLabel}</p>
                          </div>
                        </div>
                        <span
                          className={`text-[11px] font-bold ${
                            isLeased
                              ? 'text-[#7A9E7E]'
                              : vacancyDays > 0
                              ? 'text-[#B86B5E]'
                              : prop.owned
                              ? 'text-[#C8AE7D]'
                              : 'text-slate-400'
                          }`}
                        >
                          {isLeased
                            ? 'Kiracılı'
                            : vacancyDays > 0
                            ? `Tadilat (${vacancyDays}g)`
                            : prop.owned
                            ? 'Boş Mülk'
                            : 'Satılık'}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-1.5 border-y border-[#334155] py-2 text-xs">
                        <div>
                          <span className="text-slate-400">Değer: </span>
                          <span className="font-mono-num font-bold text-slate-100">
                            {formatTL(prop.purchasePrice)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400">Kira: </span>
                          <span className="font-mono-num font-bold text-[#7A9E7E]">
                            {formatTL(prop.baseMonthlyRent)}/ay
                          </span>
                        </div>
                        <div className="text-[11px]">
                          <span className="text-slate-400">Net Getiri: </span>
                          <span
                            data-testid={`rental-yield-${prop.catalogId}`}
                            className="font-mono-num font-bold text-[#C8AE7D]"
                          >
                            %{netYieldPct.toFixed(1)}/ay
                          </span>
                        </div>
                        <div className="text-right text-[11px]">
                          <span className="text-slate-400">Aidat/Bakım: </span>
                          <span className="font-mono-num font-bold text-[#B86B5E]">
                            -{formatTL(dailyAidat)}/gün
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Area */}
                    <div className="mt-3">
                      {!prop.owned ? (
                        <button
                          type="button"
                          disabled={!canBuy}
                          data-testid={`buy-rental-${prop.catalogId}`}
                          onClick={() => onBuyProperty(prop.catalogId)}
                          className={`w-full rounded-xl py-2 text-xs font-bold transition-colors ${
                            canBuy
                              ? 'bg-[#C8AE7D] text-[#181F29] hover:bg-[#D2BB8E]'
                              : 'cursor-not-allowed bg-[#334155] text-slate-500'
                          }`}
                        >
                          {canBuy
                            ? `Mülkü Satın Al (${formatTL(prop.purchasePrice)})`
                            : 'Yetersiz Bakiye'}
                        </button>
                      ) : isLeased ? (
                        <div className="space-y-2 rounded-xl border border-[#334155] bg-[#181F29] p-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-100">{prop.leasedTenantName}</span>
                            <span className="font-mono-num font-bold text-[#7A9E7E]">
                              +{formatTL(Math.round((prop.activeMonthlyRent ?? 0) / 30) - dailyAidat)}/gün net
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>{prop.leasedSectorLabel}</span>
                            <span>Kalan Sözleşme: {prop.leaseRemainingDays} gün</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onTerminateLease(prop.catalogId)}
                            className="w-full rounded-lg border border-[#475569] py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-[#2C3647] hover:text-white"
                          >
                            Sözleşmeyi Feshet (3 gün boşluk)
                          </button>
                        </div>
                      ) : vacancyDays > 0 ? (
                        <div
                          data-testid={`rental-vacancy-${prop.catalogId}`}
                          className="rounded-xl border border-[#B86B5E]/45 bg-[#181F29] p-3 text-xs text-slate-300"
                        >
                          <div className="font-bold text-[#C8AE7D]">
                            Tadilat & Kiracı Hazırlığı ({vacancyDays} gün kaldı)
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">
                            Kiracı değişimi sonrası tadilat tamamlanana kadar yeni sözleşme imzalanamaz; günlük aidat gideri işler.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-[11px] font-semibold text-slate-300">
                            Gelen Kiracı Teklifleri ({prop.tenantOffers.length})
                          </div>
                          {prop.tenantOffers.map((offer) => (
                            <div
                              key={offer.id}
                              className="flex items-center justify-between gap-2 rounded-xl border border-[#334155] bg-[#181F29] px-3 py-2"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-xs font-bold text-slate-100">
                                  {offer.tenantName}
                                </div>
                                <div className="text-[10.5px] text-slate-400">
                                  {offer.sectorLabel} · {offer.leaseDays} gün · Güven %{offer.reliabilityPct}
                                </div>
                              </div>
                              <button
                                type="button"
                                data-testid={`sign-lease-${offer.id}`}
                                onClick={() => onSignLease(prop.catalogId, offer.id)}
                                className="shrink-0 rounded-lg bg-[#7A9E7E] px-2.5 py-1.5 font-mono-num text-[11px] font-bold text-[#181F29] hover:bg-[#8BAE8F]"
                              >
                                Kirala ({formatTL(offer.monthlyRent, true)}/ay)
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   3. TEKLİFLER & GÜNLÜK FIRSATLAR MODALI
   ============================================================================ */

interface DailyOffersModalProps {
  open: boolean;
  state: EmpireState;
  onAcceptOffer: (offerId: string) => void;
  onDeclineOffer: (offerId: string) => void;
  onClose: () => void;
}

export function DailyOffersModal({
  open,
  state,
  onAcceptOffer,
  onDeclineOffer,
  onClose,
}: DailyOffersModalProps) {
  if (!open) return null;

  const offers: DailyBusinessOffer[] = ensureDailyOffersForDay(state);
  const currentDay = Math.floor((state.gameMinutes ?? 540) / 1440) + 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Günlük İş Fırsatları ve Teklifler"
      data-testid="daily-offers-modal"
      className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/70 p-3"
    >
      <div className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[20px] border border-[#334155] bg-[#181F29] text-slate-100">
        <div className="flex items-center justify-between gap-3 border-b border-[#334155] bg-[#222B38] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#9EB0C4]/20 text-[#C8D6E5]">
              <Handshake className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-slate-100 lg:text-base">
                GÜNLÜK TEKLİFLER & İŞ FIRSATLARI
              </h2>
              <p className="text-xs text-slate-400">
                Gün {currentDay} için gelen süreli tedarik, ortaklık ve indirimli mülk teklifleri
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Teklifler penceresini kapat"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#334155] bg-[#181F29] text-slate-300 hover:bg-[#2C3647] hover:text-white"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="panel-scroll flex-1 space-y-3 p-5">
          {offers.map((offer) => {
            const Icon =
              offer.kind === 'supply_discount'
                ? Percent
                : offer.kind === 'partnership_bonus'
                ? Gift
                : Building2;
            const canAfford = offer.cost <= 0 || state.cash >= offer.cost;
            const daysLeft = Math.max(1, offer.expiresOnDay - currentDay);

            return (
              <div
                key={offer.id}
                data-testid={`daily-offer-${offer.kind}`}
                className="flex flex-col justify-between gap-3 rounded-[16px] border border-[#334155] bg-[#222B38] p-4 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#334155] bg-[#181F29] text-[#D8A338]">
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">{offer.partnerName}</span>
                      <span>·</span>
                      <span>Süre: {daysLeft} gün</span>
                    </div>
                    <h3 className="mt-0.5 text-sm font-bold text-slate-100">{offer.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">
                      {offer.description}
                    </p>
                    <div className="mt-2 font-mono-num text-xs font-bold">
                      {offer.cost > 0 ? (
                        <span className="text-[#D8A338]">Maliyet: {formatTL(offer.cost)}</span>
                      ) : (
                        <span className="text-[#6EB288]">
                          Kazanç: +{formatTL(offer.cashReward ?? 0)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {offer.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onDeclineOffer(offer.id)}
                        className="rounded-xl border border-[#475569] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-[#2C3647]"
                      >
                        Reddet
                      </button>
                      <button
                        type="button"
                        disabled={!canAfford}
                        data-testid={`accept-offer-${offer.kind}`}
                        onClick={() => onAcceptOffer(offer.id)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold ${
                          canAfford
                            ? 'bg-[#6EB288] text-[#122019] hover:bg-[#7EC499]'
                            : 'cursor-not-allowed bg-[#334155] text-slate-500'
                        }`}
                      >
                        Kabul Et
                      </button>
                    </>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold ${
                        offer.status === 'accepted' ? 'text-[#6EB288]' : 'text-slate-500'
                      }`}
                    >
                      {offer.status === 'accepted' && <Check className="h-3.5 w-3.5" />}
                      {offer.status === 'accepted' ? 'Onaylandı' : 'Reddedildi'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   4. MAĞAZA MODALI (Holding Strategic Packs & Perks)
   ============================================================================ */

interface HoldingStoreModalProps {
  open: boolean;
  state: EmpireState;
  onPurchaseItem: (itemId: string) => void;
  onClose: () => void;
}

export function HoldingStoreModal({
  open,
  state,
  onPurchaseItem,
  onClose,
}: HoldingStoreModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Holding Mağazası"
      data-testid="holding-store-modal"
      className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/70 p-3"
    >
      <div className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[20px] border border-[#334155] bg-[#181F29] text-slate-100">
        <div className="flex items-center justify-between gap-3 border-b border-[#334155] bg-[#222B38] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D8A338]/20 text-[#E6BA5E]">
              <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-slate-100 lg:text-base">
                HOLDİNG MAĞAZASI & STRATEJİK PAKETLER
              </h2>
              <p className="text-xs text-slate-400">
                Kurumsal gelişim, personel motivasyonu ve finansal itibar paketleri
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono-num text-xs font-bold text-[#6EB288]">
              Kasa: {formatTL(state.cash, true)}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Mağaza penceresini kapat"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#334155] bg-[#181F29] text-slate-300 hover:bg-[#2C3647] hover:text-white"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="panel-scroll grid flex-1 grid-cols-1 gap-3.5 p-5 sm:grid-cols-2">
          {HOLDING_STORE_ITEMS.map((item) => {
            const canAfford = state.cash >= item.cost;
            return (
              <div
                key={item.id}
                data-testid={`store-item-${item.id}`}
                className="flex flex-col justify-between rounded-[16px] border border-[#334155] bg-[#222B38] p-4"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-400">{item.category}</span>
                    <span className="font-bold text-[#6EB288]">{item.effectLabel}</span>
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-slate-100">{item.name}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#334155] pt-3">
                  <span className="font-mono-num text-sm font-bold text-slate-100">
                    {formatTL(item.cost)}
                  </span>
                  <button
                    type="button"
                    disabled={!canAfford}
                    data-testid={`buy-store-${item.id}`}
                    onClick={() => onPurchaseItem(item.id)}
                    className={`rounded-xl px-4 py-1.5 text-xs font-bold ${
                      canAfford
                        ? 'bg-[#D8A338] text-[#181F29] hover:bg-[#E2AF48]'
                        : 'cursor-not-allowed bg-[#334155] text-slate-500'
                    }`}
                  >
                    {canAfford ? 'Satın Al' : 'Yetersiz Kasa'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
