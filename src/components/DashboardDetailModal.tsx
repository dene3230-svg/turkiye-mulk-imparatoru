import {
  Building2,
  Crown,
  FlaskConical,
  MapPin,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { EmpireState, StockQuote } from '../types/game';
import type {
  AccountCardId,
  ExecutiveDashboardMetrics,
  OperationCardId,
} from '../game/dashboardMetrics';
import {
  calculateBusinessHourlyIncome,
  formatTL,
  isBusinessUnderConstruction,
} from '../game/economy';
import { calculateBranchServiceQuality } from '../game/officeEngine';

export type DashboardDetailTarget =
  | { kind: 'operation'; id: OperationCardId }
  | { kind: 'account'; id: AccountCardId };

interface DashboardDetailModalProps {
  target: DashboardDetailTarget | null;
  state: EmpireState;
  quotes: StockQuote[];
  metrics: ExecutiveDashboardMetrics;
  now: number;
  onClose: () => void;
  onNavigateManage: (section: 'map' | 'finance' | 'businesses' | 'office') => void;
  onOpenBanking: () => void;
  onOpenAccounting: () => void;
  onOpenBorsa: () => void;
  onOpenFranchise: () => void;
  onFocusBusinessOnMap: (businessId: string) => void;
}

export function DashboardDetailModal({
  target,
  state,
  quotes,
  metrics,
  now,
  onClose,
  onNavigateManage,
  onOpenBanking,
  onOpenAccounting,
  onOpenBorsa,
  onOpenFranchise,
  onFocusBusinessOnMap,
}: DashboardDetailModalProps) {
  if (!target) return null;

  const isOp = target.kind === 'operation';
  const titleMap: Record<string, string> = {
    'operation:businesses': 'Aktif İşletmeler — Detaylı Durum',
    'operation:office': 'Ofis Prestiji & Firma Tanınırlığı',
    'operation:growth': 'Ar-Ge, Yatırım & Büyüme Projeleri',
    'account:cash': 'Ana İşletme Kasası — Nakit Akışı',
    'account:credit': 'Ticari Kredi & Banka Özeti',
    'account:investments': 'Yatırım, Borsa & Varlık Portföyü',
    'account:expenses': 'Günlük Operasyon Gider Dağılımı',
  };
  const key = `${target.kind}:${target.id}`;
  const title = titleMap[key] ?? 'Detay Görünümü';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="dashboard-detail-modal"
      className="fixed inset-0 z-[900] flex items-center justify-end bg-black/70"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-[460px] flex-col border-l border-[#334155] bg-[#0D1629] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#334155] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#334155] bg-[#7E96B0]/15 text-[#7E96B0]">
              {isOp && target.id === 'businesses' ? (
                <Building2 className="h-4.5 w-4.5" />
              ) : isOp && target.id === 'office' ? (
                <Crown className="h-4.5 w-4.5 text-[#C8AE7D]" />
              ) : isOp && target.id === 'growth' ? (
                <FlaskConical className="h-4.5 w-4.5 text-fuchsia-300" />
              ) : (
                <Wallet className="h-4.5 w-4.5" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-white">{title}</h2>
              <p className="text-[11px] text-slate-400">Canlı şirket verileri üzerinden özet</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-detail-modal"
            onClick={onClose}
            aria-label="Detay Penceresini Kapat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#334155] bg-[#1D2532] text-slate-300 hover:bg-[#2A3444] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="panel-scroll flex-1 space-y-4 p-5">
          {/* 1. BUSINESSES DETAIL */}
          {target.kind === 'operation' && target.id === 'businesses' && (
            <>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-[#334155] bg-[#222B38] p-3">
                  <div className="text-[11px] text-slate-400">Toplam Şube</div>
                  <div className="mt-1 font-mono-num text-lg font-extrabold text-[#7A9E7E]">
                    {metrics.branchCount}
                  </div>
                </div>
                <div className="rounded-xl border border-[#334155] bg-[#222B38] p-3">
                  <div className="text-[11px] text-slate-400">Ort. Kalite</div>
                  <div className="mt-1 flex items-center gap-1 font-mono-num text-lg font-extrabold text-[#C8AE7D]">
                    <Star className="h-4 w-4 fill-amber-400 text-[#C8AE7D]" />
                    {metrics.avgServiceQuality > 0 ? metrics.avgServiceQuality.toFixed(1) : '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-[#334155] bg-[#222B38] p-3">
                  <div className="text-[11px] text-slate-400">Personel</div>
                  <div className="mt-1 flex items-center gap-1 font-mono-num text-lg font-extrabold text-[#7E96B0]">
                    <Users className="h-4 w-4" />
                    {metrics.totalStaffCount}
                  </div>
                </div>
              </div>

              {state.businesses.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-[#334155] bg-[#222B38] p-5 text-center">
                  <p className="text-sm font-semibold text-slate-200">Henüz aktif şubeniz yok</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Harita ekranından 81 ilde dilediğiniz caddeye pin bırakarak ilk işletmenizi kurabilirsiniz.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateManage('map');
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 px-4 py-2 text-xs font-bold text-[#7A9E7E] hover:bg-[#7A9E7E]/15"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Haritada İlk Şubeyi Kur
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {state.businesses.map((biz) => {
                    const underConst = isBusinessUnderConstruction(biz);
                    const q = calculateBranchServiceQuality(
                      biz,
                      state.cityManagers ?? [],
                      state.businesses
                    );
                    const rawHourly = underConst
                      ? 0
                      : calculateBusinessHourlyIncome(
                          biz,
                          state.activeEvent,
                          now,
                          state.businesses,
                          state
                        );
                    const hourly =
                      typeof rawHourly === 'number' && Number.isFinite(rawHourly) ? rawHourly : 0;
                    return (
                      <div
                        key={biz.id}
                        className="rounded-xl border border-[#334155] bg-[#222B38] p-3.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-white">
                              {biz.customName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {biz.cityName} · {biz.districtName} · Sv.{biz.level}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onFocusBusinessOnMap(biz.id);
                            }}
                            className="shrink-0 rounded-lg border border-[#334155] bg-[#7E96B0]/15 px-2.5 py-1 text-[11px] font-bold text-[#7E96B0] hover:bg-[#7E96B0]/15"
                          >
                            Haritada Gör
                          </button>
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#334155] pt-2 text-[11px]">
                          {underConst ? (
                            <span className="font-semibold text-[#C8AE7D]">
                              İnşaat sürüyor ({biz.constructionDaysRemaining} gün kaldı)
                            </span>
                          ) : (
                            <span className="font-mono-num text-[#7A9E7E]">
                              Tahmini Günlük: {formatTL(hourly * 24, true)}
                            </span>
                          )}
                          <span className="font-mono-num text-slate-300">
                            Kalite {q.stars.toFixed(1)}★ · Trafik %{q.customerTrafficPct} ·{' '}
                            {biz.employees?.length ?? 0} Personel
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* 2. OFFICE DETAIL */}
          {target.kind === 'operation' && target.id === 'office' && (
            <>
              <div className="rounded-[20px] border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#C8AE7D]">Aktif Merkez Ofis</span>
                  <span className="font-mono-num text-xs font-bold text-[#C8AE7D]">
                    Kademe {metrics.officeTierNumber}/4
                  </span>
                </div>
                <div className="mt-1 text-lg font-extrabold text-white">
                  {metrics.officeTierName}
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#1D2532]">
                  <div
                    className="h-full rounded-full bg-[#C8AE7D]"
                    style={{ width: `${Math.max(6, metrics.officePrestige)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-slate-300">
                  <span>Ofis Prestiji</span>
                  <span className="font-mono-num font-bold text-[#C8AE7D]">
                    {metrics.officePrestige} / 100
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-[#334155] bg-[#222B38] p-3.5">
                  <div className="text-[11px] text-slate-400">Firma Tanınırlığı</div>
                  <div className="mt-1 font-mono-num text-xl font-extrabold text-[#7E96B0]">
                    %{metrics.brandRecognitionPct}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Müşteri trafiğini ve banka kredi onayını doğrudan etkiler.
                  </p>
                </div>
                <div className="rounded-xl border border-[#334155] bg-[#222B38] p-3.5">
                  <div className="text-[11px] text-slate-400">Tedarikçi İndirimi</div>
                  <div className="mt-1 font-mono-num text-xl font-extrabold text-[#7A9E7E]">
                    -%{metrics.supplyDiscountPct}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Kredi faiz indirimi: -%{metrics.loanInterestDiscountPct}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#334155] bg-[#222B38] p-3.5 text-xs text-slate-300">
                <div className="font-bold text-white">Kişisel Varlıklar & Donanım</div>
                <div className="mt-1.5 flex justify-between text-[11px]">
                  <span>Kurulu Ofis Donanımı</span>
                  <span className="font-mono-num font-bold text-[#7E96B0]">
                    {(state.officeUpgradeIds ?? []).length} Adet
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-[11px]">
                  <span>Kişisel Varlık Değeri</span>
                  <span className="font-mono-num font-bold text-[#C8AE7D]">
                    {formatTL(metrics.personalAssetsTotal)}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* 3. GROWTH & R&D DETAIL */}
          {target.kind === 'operation' && target.id === 'growth' && (
            <>
              <div className="rounded-[20px] border border-fuchsia-400/25 bg-fuchsia-500/10 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-fuchsia-200">Şirket Ölçeği</span>
                  <span className="font-mono-num font-bold text-fuchsia-300">
                    Seviye {metrics.companyLevel}
                  </span>
                </div>
                <div className="mt-1 text-lg font-extrabold text-white">{metrics.companyTitle}</div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#1D2532]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400"
                    style={{ width: `${metrics.tierProgressPct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-slate-300">
                  <span>Büyüme İlerlemesi</span>
                  <span className="font-mono-num font-bold text-[#7E96B0]">
                    %{metrics.tierProgressPct} · {(state.companyXp ?? 0).toLocaleString('tr-TR')} XP
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-[#334155] bg-[#222B38] px-3.5 py-2.5 text-xs">
                  <span className="text-slate-300">Devam Eden İnşaat / Tadilat</span>
                  <span className="font-mono-num font-bold text-[#C8AE7D]">
                    {metrics.underConstructionCount} Şube
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#334155] bg-[#222B38] px-3.5 py-2.5 text-xs">
                  <span className="text-slate-300">Tescilli Franchise Markaları</span>
                  <span className="font-mono-num font-bold text-[#7A9E7E]">
                    {(state.ownFranchises ?? []).length} Marka
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#334155] bg-[#222B38] px-3.5 py-2.5 text-xs">
                  <span className="text-slate-300">Borsa Portföy Değeri</span>
                  <span className="font-mono-num font-bold text-[#7E96B0]">
                    {formatTL(metrics.stockPortfolioValue)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#334155] bg-[#222B38] px-3.5 py-2.5 text-xs">
                  <span className="text-slate-300">Ayrılan Toplam Büyüme Bütçesi</span>
                  <span className="font-mono-num font-bold text-fuchsia-300">
                    {formatTL(metrics.growthBudget)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFranchise();
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/15 px-3 py-2.5 text-xs font-bold text-fuchsia-200 hover:bg-fuchsia-500/25"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Franchise Pazarı
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBorsa();
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[#334155] bg-[#7E96B0]/15 px-3 py-2.5 text-xs font-bold text-[#7E96B0] hover:bg-[#7E96B0]/15"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Borsa & Yatırım
                </button>
              </div>
            </>
          )}

          {/* 4. ACCOUNT CARD DETAIL */}
          {target.kind === 'account' && (
            <div className="space-y-3">
              {target.id === 'cash' && (
                <>
                  <div className="rounded-[20px] border border-[#334155] bg-[#7E96B0]/15 p-4">
                    <div className="text-xs text-[#7E96B0]">Likit Şirket Kasası</div>
                    <div className="mt-1 font-mono-num text-2xl font-extrabold text-white">
                      {formatTL(metrics.totalCash)}
                    </div>
                    <div className="mt-1 text-xs text-slate-300">
                      Tahmini Günlük Gelir: {formatTL(metrics.dailyEstimatedRevenue)} · Gider:{' '}
                      {formatTL(metrics.dailyOperatingExpenses)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAccounting();
                    }}
                    className="w-full rounded-xl border border-[#334155] bg-[#7E96B0]/15 py-2.5 text-xs font-bold text-cyan-100 hover:bg-[#7E96B0]/15"
                  >
                    Muhasebe & Bilançoyu Aç
                  </button>
                </>
              )}
              {target.id === 'credit' && (
                <>
                  <div className="rounded-[20px] border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 p-4">
                    <div className="text-xs text-[#C8AE7D]">
                      {metrics.activeLoanDebt > 0 ? 'Kalan Kredi Borcu' : 'Tahmini Maks. Kredi Limiti'}
                    </div>
                    <div className="mt-1 font-mono-num text-2xl font-extrabold text-white">
                      {formatTL(
                        metrics.activeLoanDebt > 0
                          ? metrics.activeLoanDebt
                          : metrics.availableCreditLimit
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-300">
                      Kredi Puanı: {state.creditScore} · Aktif Kredi: {metrics.activeLoanCount}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenBanking();
                    }}
                    className="w-full rounded-xl border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 py-2.5 text-xs font-bold text-amber-100 hover:bg-[#C8AE7D]/15"
                  >
                    Bankalar & Ticari Kredi Ekranını Aç
                  </button>
                </>
              )}
              {target.id === 'investments' && (
                <>
                  <div className="rounded-[20px] border border-[#334155] bg-[#7E96B0]/15 p-4">
                    <div className="text-xs text-[#7E96B0]">Toplam Yatırım & Varlık Değeri</div>
                    <div className="mt-1 font-mono-num text-2xl font-extrabold text-white">
                      {formatTL(metrics.investmentsTotal)}
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span>İşletme Değerlemeleri</span>
                        <span className="font-mono-num font-bold text-white">
                          {formatTL(metrics.businessValuationsTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Borsa Portföyü ({quotes.length} hisse)</span>
                        <span className="font-mono-num font-bold text-[#7E96B0]">
                          {formatTL(metrics.stockPortfolioValue)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kişisel Varlıklar</span>
                        <span className="font-mono-num font-bold text-[#C8AE7D]">
                          {formatTL(metrics.personalAssetsTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenBorsa();
                    }}
                    className="w-full rounded-xl border border-[#334155] bg-[#7E96B0]/15 py-2.5 text-xs font-bold text-indigo-100 hover:bg-[#7E96B0]/15"
                  >
                    Borsa & Portföy Ekranını Aç
                  </button>
                </>
              )}
              {target.id === 'expenses' && (
                <>
                  <div className="rounded-[20px] border border-[#B86B5E]/45 bg-[#B86B5E]/15 p-4">
                    <div className="text-xs text-[#B86B5E]">Günlük Toplam Operasyon Gideri</div>
                    <div className="mt-1 font-mono-num text-2xl font-extrabold text-white">
                      {formatTL(metrics.dailyOperatingExpenses)}
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span>Personel Yevmiye + %22.5 SGK</span>
                        <span className="font-mono-num font-bold text-[#B86B5E]">
                          {formatTL(metrics.dailyPayrollWithSgk)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Günlük Kira & Enerji</span>
                        <span className="font-mono-num font-bold text-white">
                          {formatTL(metrics.dailyRentUtilities)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hammadde & Tedarik</span>
                        <span className="font-mono-num font-bold text-white">
                          {formatTL(metrics.dailyEstimatedSupply)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAccounting();
                    }}
                    className="w-full rounded-xl border border-[#B86B5E]/45 bg-[#B86B5E]/15 py-2.5 text-xs font-bold text-rose-100 hover:bg-[#B86B5E]/15"
                  >
                    Gider & Vergi Bilançosunu İncele
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Primary Manage CTA */}
        {target.kind === 'operation' && (
          <div className="border-t border-[#334155] px-5 py-3.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (target.id === 'businesses') onNavigateManage('businesses');
                else if (target.id === 'office') onNavigateManage('office');
                else onNavigateManage('map');
              }}
              className="w-full rounded-xl border border-[#334155] bg-[#7E96B0]/15 py-2.5 text-xs font-extrabold tracking-wide text-cyan-100 hover:bg-[#7E96B0]/15"
            >
              {target.id === 'businesses'
                ? 'İŞLETME YÖNETİMİNE GİT'
                : target.id === 'office'
                ? 'OFİSİM EKRANINI AÇ'
                : 'HARİTADA YENİ BÜYÜME BAŞLAT'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
